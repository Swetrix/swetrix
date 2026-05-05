import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { randomUUID } from 'crypto'
import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  ParseIntPipe,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ServiceUnavailableException,
  Query,
  Logger,
  Headers,
  Ip,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'

import { CurrentUserId } from '../auth/decorators/current-user-id.decorator'
import { Auth } from '../auth/decorators'
import { ProjectService } from '../project/project.service'
import { DataImportService } from './data-import.service'
import { Ga4ImportService, Ga4Property } from './ga4-import.service'
import { UploadImportDto, StartGa4ImportDto } from './dto'
import { getMapper, SUPPORTED_PROVIDERS } from './mappers'
import { DataImportJobData, DATA_IMPORT_QUEUE } from './data-import.processor'
import { getIPFromHeaders } from '../common/utils'

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100 MB
const IMPORT_TMP_DIR = path.resolve(os.tmpdir(), 'swetrix-imports')

@ApiTags('Data Import')
@Controller('data-import')
export class DataImportController {
  private readonly logger = new Logger(DataImportController.name)

  constructor(
    private readonly dataImportService: DataImportService,
    private readonly projectService: ProjectService,
    private readonly ga4ImportService: Ga4ImportService,
    @InjectQueue(DATA_IMPORT_QUEUE)
    private readonly importQueue: Queue<DataImportJobData>,
  ) {}

  @Get('ga4/configured')
  @Auth()
  async ga4Configured() {
    return { configured: this.ga4ImportService.isConfigured() }
  }

  @Post(':projectId/ga4/connect')
  @Auth()
  async ga4Connect(
    @Param('projectId') projectId: string,
    @CurrentUserId() uid: string,
  ) {
    return this.ga4ImportService.generateConnectURL(uid, projectId)
  }

  @Post('ga4/callback')
  @Auth()
  async ga4Callback(
    @CurrentUserId() uid: string,
    @Body() body: { code: string; state: string },
  ) {
    if (!body.code || !body.state) {
      throw new BadRequestException('Missing code or state parameter')
    }
    return this.ga4ImportService.handleOAuthCallback(uid, body.code, body.state)
  }

  @Get(':projectId/ga4/properties')
  @Auth()
  async ga4Properties(
    @Param('projectId') projectId: string,
    @CurrentUserId() uid: string,
  ): Promise<Ga4Property[]> {
    return this.ga4ImportService.listProperties(uid, projectId)
  }

  @Post(':projectId/ga4/start')
  @Auth()
  async ga4Start(
    @Param('projectId') projectId: string,
    @CurrentUserId() uid: string,
    @Body() dto: StartGa4ImportDto,
    @Headers() headers: Record<string, string>,
    @Ip() requestIp: string,
  ) {
    const project = await this.projectService.getFullProject(projectId)
    this.projectService.allowedToManage(project, uid)

    const dataImport = await this.dataImportService.create(
      projectId,
      'google-analytics',
    )

    const { encryptedRefreshToken, clientId, clientSecret } =
      await this.ga4ImportService.consumeTokenForImport(uid, projectId)

    try {
      await this.importQueue.add(
        'process-import',
        {
          importId: dataImport.id,
          projectId,
          provider: 'google-analytics',
          fileName: '',
          ip: getIPFromHeaders(headers) || requestIp || '',
          userAgent: headers['user-agent'] || '',
          ga4PropertyId: dto.propertyId,
          encryptedRefreshToken,
          ga4ClientId: clientId,
          ga4ClientSecret: clientSecret,
        },
        {
          attempts: 1,
          removeOnComplete: true,
          removeOnFail: false,
        },
      )
    } catch (error) {
      this.logger.error(`Failed to enqueue GA4 import job: ${error.message}`)
      await this.dataImportService.deleteImportRecord(projectId, dataImport.id)
      await this.ga4ImportService.restoreToken(
        uid,
        projectId,
        encryptedRefreshToken,
      )
      throw new ServiceUnavailableException(
        'Failed to start import. Please try again later.',
      )
    }

    return dataImport
  }

  @Post(':projectId/upload')
  @Auth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: [...SUPPORTED_PROVIDERS] },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE },
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          fs.mkdirSync(IMPORT_TMP_DIR, { recursive: true })
          cb(null, IMPORT_TMP_DIR)
        },
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname).toLowerCase()
          cb(null, `${Date.now()}-${randomUUID()}${ext}`)
        },
      }),
    }),
  )
  async upload(
    @Param('projectId') projectId: string,
    @CurrentUserId() uid: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadImportDto,
  ) {
    const project = await this.projectService.getFullProject(projectId)
    this.projectService.allowedToManage(project, uid)

    if (!file?.filename) {
      throw new BadRequestException('No file uploaded')
    }

    const mapper = getMapper(dto.provider)
    if (!mapper) {
      this.cleanupFile(file.filename)
      throw new BadRequestException(
        `Unsupported provider: ${dto.provider}. Supported: ${SUPPORTED_PROVIDERS.join(', ')}`,
      )
    }

    if (!mapper.expectedFileExtension) {
      this.cleanupFile(file.filename)
      throw new BadRequestException(
        `${dto.provider} does not support file uploads. Use the dedicated import endpoint instead.`,
      )
    }

    const ext = path.extname(file.originalname).toLowerCase()
    if (ext !== mapper.expectedFileExtension) {
      this.cleanupFile(file.filename)
      throw new BadRequestException(
        `Invalid file type. Expected a ${mapper.expectedFileExtension} file for ${dto.provider} import.`,
      )
    }

    let dataImport
    try {
      dataImport = await this.dataImportService.create(projectId, dto.provider)
    } catch (error) {
      this.cleanupFile(file.filename)
      throw error
    }

    try {
      await this.importQueue.add(
        'process-import',
        {
          importId: dataImport.id,
          projectId,
          provider: dto.provider,
          fileName: file.filename,
        },
        {
          attempts: 1,
          removeOnComplete: true,
          removeOnFail: false,
        },
      )
    } catch (error) {
      this.logger.error(`Failed to enqueue import job: ${error.message}`)
      await this.dataImportService.deleteImportRecord(projectId, dataImport.id)
      this.cleanupFile(file.filename)
      throw new ServiceUnavailableException(
        'Failed to start import. Please try again later.',
      )
    }

    return dataImport
  }

  @Get(':projectId')
  @Auth()
  async list(
    @Param('projectId') projectId: string,
    @CurrentUserId() uid: string,
  ) {
    const project = await this.projectService.getFullProject(projectId)
    this.projectService.allowedToManage(project, uid)
    return this.dataImportService.findAllByProject(projectId)
  }

  @Get(':projectId/has-imported-data')
  @Auth()
  async hasImportedData(
    @Param('projectId') projectId: string,
    @CurrentUserId() uid: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const project = await this.projectService.getFullProject(projectId)
    this.projectService.allowedToView(project, uid)

    if (!from || !to) {
      throw new BadRequestException('"from" and "to" query params are required')
    }

    const hasImported = await this.dataImportService.hasImportedDataInRange(
      projectId,
      from,
      to,
    )

    return { hasImportedData: hasImported }
  }

  @Get(':projectId/:importId')
  @Auth()
  async getOne(
    @Param('projectId') projectId: string,
    @Param('importId', ParseIntPipe) importId: number,
    @CurrentUserId() uid: string,
  ) {
    const project = await this.projectService.getFullProject(projectId)
    this.projectService.allowedToManage(project, uid)
    return this.dataImportService.findOne(projectId, importId)
  }

  @Delete(':projectId/:importId')
  @Auth()
  async deleteImport(
    @Param('projectId') projectId: string,
    @Param('importId', ParseIntPipe) importId: number,
    @CurrentUserId() uid: string,
  ) {
    const project = await this.projectService.getFullProject(projectId)
    this.projectService.allowedToManage(project, uid)
    await this.dataImportService.deleteImport(projectId, importId)
    return { success: true }
  }

  private cleanupFile(fileName: string): void {
    try {
      const resolvedPath = this.getImportFilePath(fileName)
      if (!resolvedPath) {
        this.logger.warn(
          `Skipped cleanup for invalid import file name: ${fileName}`,
        )
        return
      }

      if (fs.existsSync(resolvedPath) && fs.lstatSync(resolvedPath).isFile()) {
        fs.unlinkSync(resolvedPath)
      }
    } catch {
      //
    }
  }

  private getImportFilePath(fileName: string): string | null {
    if (
      !fileName ||
      fileName !== path.basename(fileName) ||
      /[\\/]/.test(fileName)
    ) {
      return null
    }

    return path.join(IMPORT_TMP_DIR, fileName)
  }
}

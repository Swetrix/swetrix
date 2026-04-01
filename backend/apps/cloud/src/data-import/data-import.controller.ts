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
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ServiceUnavailableException,
  Query,
  Logger,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { ApiBearerAuth, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'

import { Auth } from '../auth/decorators'
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator'
import { AuthenticationGuard } from '../auth/guards/authentication.guard'
import { ProjectService } from '../project/project.service'
import { DataImportService } from './data-import.service'
import { UploadImportDto } from './dto'
import { getMapper, SUPPORTED_PROVIDERS } from './mappers'
import { DataImportJobData, DATA_IMPORT_QUEUE } from './data-import.processor'

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100 MB
const IMPORT_TMP_DIR = path.resolve(os.tmpdir(), 'swetrix-imports')

@ApiTags('Data Import')
@UseGuards(AuthenticationGuard)
@Controller('data-import')
export class DataImportController {
  private readonly logger = new Logger(DataImportController.name)

  constructor(
    private readonly dataImportService: DataImportService,
    private readonly projectService: ProjectService,
    @InjectQueue(DATA_IMPORT_QUEUE)
    private readonly importQueue: Queue<DataImportJobData>,
  ) {}

  @Post(':projectId/upload')
  @Auth()
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
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

    if (!file?.path) {
      throw new BadRequestException('No file uploaded')
    }

    const mapper = getMapper(dto.provider)
    if (!mapper) {
      this.cleanupFile(file.path)
      throw new BadRequestException(
        `Unsupported provider: ${dto.provider}. Supported: ${SUPPORTED_PROVIDERS.join(', ')}`,
      )
    }

    const ext = path.extname(file.originalname).toLowerCase()
    if (ext !== mapper.expectedFileExtension) {
      this.cleanupFile(file.path)
      throw new BadRequestException(
        `Invalid file type. Expected a ${mapper.expectedFileExtension} file for ${dto.provider} import.`,
      )
    }

    let dataImport
    try {
      dataImport = await this.dataImportService.create(projectId, dto.provider)
    } catch (error) {
      this.cleanupFile(file.path)
      throw error
    }

    try {
      await this.importQueue.add(
        'process-import',
        {
          id: dataImport.id,
          importId: dataImport.importId,
          projectId,
          provider: dto.provider,
          filePath: file.path,
        },
        {
          attempts: 1,
          removeOnComplete: true,
          removeOnFail: false,
        },
      )
    } catch (error) {
      this.logger.error(`Failed to enqueue import job: ${error.message}`)
      await this.dataImportService.deleteImportRecord(dataImport.id)
      this.cleanupFile(file.path)
      throw new ServiceUnavailableException(
        'Failed to start import. Please try again later.',
      )
    }

    return dataImport
  }

  @Get(':projectId')
  @Auth()
  @ApiBearerAuth()
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
  @ApiBearerAuth()
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
  @ApiBearerAuth()
  async getOne(
    @Param('projectId') projectId: string,
    @Param('importId') importId: number,
    @CurrentUserId() uid: string,
  ) {
    const project = await this.projectService.getFullProject(projectId)
    this.projectService.allowedToManage(project, uid)
    return this.dataImportService.findOne(projectId, importId)
  }

  @Delete(':projectId/:importId')
  @Auth()
  @ApiBearerAuth()
  async deleteImport(
    @Param('projectId') projectId: string,
    @Param('importId') importId: number,
    @CurrentUserId() uid: string,
  ) {
    const project = await this.projectService.getFullProject(projectId)
    this.projectService.allowedToManage(project, uid)
    await this.dataImportService.deleteImport(projectId, importId)
    return { success: true }
  }

  private cleanupFile(filePath: string): void {
    try {
      const resolvedPath = path.resolve(filePath)
      const relativePath = path.relative(IMPORT_TMP_DIR, resolvedPath)
      const isImportTempFile =
        relativePath !== '' &&
        !relativePath.startsWith('..') &&
        !path.isAbsolute(relativePath)

      if (!isImportTempFile) {
        this.logger.warn(
          `Skipped cleanup outside import temp dir: ${resolvedPath}`,
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
}

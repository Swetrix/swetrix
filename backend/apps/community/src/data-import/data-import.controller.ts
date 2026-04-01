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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
  Logger,
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
import { UploadImportDto } from './dto'
import { getMapper, SUPPORTED_PROVIDERS } from './mappers'
import { DataImportJobData } from './data-import.processor'

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100 MB

@ApiTags('Data Import')
@Controller('data-import')
export class DataImportController {
  private readonly logger = new Logger(DataImportController.name)

  constructor(
    private readonly dataImportService: DataImportService,
    private readonly projectService: ProjectService,
    @InjectQueue('data-import')
    private readonly importQueue: Queue<DataImportJobData>,
  ) {}

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
          const dir = path.join(os.tmpdir(), 'swetrix-imports')
          fs.mkdirSync(dir, { recursive: true })
          cb(null, dir)
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
          importId: dataImport.id,
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
      await this.dataImportService.deleteImportRecord(projectId, dataImport.id)
      this.cleanupFile(file.path)
      throw new BadRequestException(
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
    @Param('importId') importId: number,
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
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    } catch {
      //
    }
  }
}

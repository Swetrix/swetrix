import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Put,
  Query,
  Res,
  StreamableFile,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { Response } from 'express'
import { Readable } from 'stream'
import { Auth } from '../auth/decorators'
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator'
import { ApiKeyAccess } from '../api-key/api-key-access.decorator'
import { DataExportService } from './data-export.service'
import { WarehouseSourceService } from './warehouse-source.service'
import {
  ExportEventsDto,
  SaveDataExportDto,
  validateExportDate,
} from './data-export.dto'

@ApiTags('Data Warehouse')
@ApiBearerAuth()
@Controller('data-export')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    validationError: { target: false, value: false },
  }),
)
export class DataExportController {
  constructor(
    private readonly exports: DataExportService,
    private readonly source: WarehouseSourceService,
  ) {}

  @Get(':projectId')
  @Auth()
  @Header('Cache-Control', 'no-store')
  get(@Param('projectId') projectId: string, @CurrentUserId() uid: string) {
    return this.exports.get(projectId, uid)
  }

  @Put(':projectId')
  @Auth()
  save(
    @Param('projectId') projectId: string,
    @CurrentUserId() uid: string,
    @Body() dto: SaveDataExportDto,
  ) {
    return this.exports.save(projectId, uid, dto)
  }

  @Post(':projectId/test')
  @Auth()
  test(
    @Param('projectId') projectId: string,
    @CurrentUserId() uid: string,
    @Body() dto: SaveDataExportDto,
  ) {
    return this.exports.test(projectId, uid, dto)
  }

  @Post(':projectId/sync')
  @Auth()
  sync(@Param('projectId') projectId: string, @CurrentUserId() uid: string) {
    return this.exports.sync(projectId, uid)
  }

  @Delete(':projectId')
  @Auth()
  remove(@Param('projectId') projectId: string, @CurrentUserId() uid: string) {
    return this.exports.remove(projectId, uid)
  }

  @Get(':projectId/events')
  @Auth(true)
  @ApiKeyAccess('analytics:read', 'params', 'projectId', ['events:read'])
  async events(
    @Param('projectId') projectId: string,
    @CurrentUserId() uid: string,
    @Query() query: ExportEventsDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.exports.authorizeExport(projectId, uid)
    validateExportDate(query.date)
    const abort = new AbortController()
    response.once('close', () => abort.abort())
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('X-Accel-Buffering', 'no')
    const rows = this.source.rows(
      projectId,
      query.date,
      query.type,
      abort.signal,
    )
    const stream = Readable.from(
      (async function* () {
        try {
          for await (const row of rows) yield `${JSON.stringify(row)}\n`
        } finally {
          abort.abort()
        }
      })(),
    )
    return new StreamableFile(stream, {
      type: 'application/x-ndjson',
      disposition: `attachment; filename="swetrix-${query.type}-${query.date}.ndjson"`,
    }).setErrorHandler(() => response.destroy())
  }
}

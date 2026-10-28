import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BullModule } from '@nestjs/bullmq'
import { ProjectModule } from '../project/project.module'
import { DataExport } from './entity/data-export.entity'
import { DATA_EXPORT_QUEUE, DataExportService } from './data-export.service'
import { DataExportController } from './data-export.controller'
import { DataExportProcessor } from './data-export.processor'
import { WarehouseSourceService } from './warehouse-source.service'
import { BigQueryService } from './bigquery.service'

@Module({
  imports: [
    ProjectModule,
    TypeOrmModule.forFeature([DataExport]),
    BullModule.registerQueue({ name: DATA_EXPORT_QUEUE }),
  ],
  providers: [
    DataExportService,
    WarehouseSourceService,
    BigQueryService,
    DataExportProcessor,
  ],
  controllers: [DataExportController],
})
export class DataExportModule {}

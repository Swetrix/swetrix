import { Module, forwardRef } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'

import { ProjectModule } from '../project/project.module'
import { DataImportService } from './data-import.service'
import { DataImportController } from './data-import.controller'
import { DataImportProcessor, DATA_IMPORT_QUEUE } from './data-import.processor'

@Module({
  imports: [
    BullModule.registerQueue({ name: DATA_IMPORT_QUEUE }),
    forwardRef(() => ProjectModule),
  ],
  providers: [DataImportService, DataImportProcessor],
  controllers: [DataImportController],
  exports: [DataImportService],
})
export class DataImportModule {}

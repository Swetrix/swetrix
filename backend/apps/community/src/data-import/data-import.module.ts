import { Module, forwardRef } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'

import { ProjectModule } from '../project/project.module'
import { DataImportService } from './data-import.service'
import { DataImportController } from './data-import.controller'
import { DataImportProcessor } from './data-import.processor'

@Module({
  imports: [
    BullModule.registerQueue({ name: 'data-import' }),
    forwardRef(() => ProjectModule),
  ],
  providers: [DataImportService, DataImportProcessor],
  controllers: [DataImportController],
  exports: [DataImportService],
})
export class DataImportModule {}

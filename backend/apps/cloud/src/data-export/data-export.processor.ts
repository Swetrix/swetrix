import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Job } from 'bullmq'
import {
  DATA_EXPORT_QUEUE,
  DataExportJob,
  DataExportService,
} from './data-export.service'

@Processor(DATA_EXPORT_QUEUE, { concurrency: 2 })
export class DataExportProcessor extends WorkerHost {
  constructor(private readonly exports: DataExportService) {
    super()
  }

  async process(job: Job<DataExportJob>) {
    await this.exports.process(job.data)
  }
}

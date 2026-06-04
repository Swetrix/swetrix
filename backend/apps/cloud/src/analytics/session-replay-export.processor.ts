import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Job } from 'bullmq'

import {
  SESSION_REPLAY_EXPORT_QUEUE,
  SessionReplayExportJobData,
  SessionReplayExportService,
} from './session-replay-export.service'

const concurrencyValue = Number(process.env.SESSION_REPLAY_EXPORT_CONCURRENCY)
const concurrency =
  Number.isFinite(concurrencyValue) && concurrencyValue > 0
    ? Math.floor(concurrencyValue)
    : 1

@Processor(SESSION_REPLAY_EXPORT_QUEUE, { concurrency })
export class SessionReplayExportProcessor extends WorkerHost {
  constructor(
    private readonly sessionReplayExportService: SessionReplayExportService,
  ) {
    super()
  }

  async process(job: Job<SessionReplayExportJobData>): Promise<void> {
    if (job.data.type === 'cleanup') {
      await this.sessionReplayExportService.cleanupExportJob(job.data)
      return
    }

    await this.sessionReplayExportService.processExportJob(job.data)
  }
}

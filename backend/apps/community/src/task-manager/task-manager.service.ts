import { AnalyticsService } from '../analytics/analytics.service'
import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'

import { SaltService } from '../analytics/salt.service'

@Injectable()
export class TaskManagerService {
  private readonly logger = new Logger(TaskManagerService.name)

  constructor(
    private readonly saltService: SaltService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async regenerateGlobalSalts() {
    await this.saltService.regenerateExpiredSalts()
  }

  @Cron(CronExpression.EVERY_10_MINUTES, { waitForCompletion: true })
  async cleanupExpiredSessionReplays() {
    try {
      await this.analyticsService.cleanupExpiredSessionReplays()
    } catch (reason) {
      this.logger.error('Failed to clean up expired session replays', reason)
    }
  }
}

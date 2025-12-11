import { Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'

import { AppLoggerService } from '../logger/logger.service'
import { SaltService } from '../analytics/salt.service'

@Injectable()
export class TaskManagerService {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly saltService: SaltService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async regenerateGlobalSalts() {
    await this.saltService.regenerateExpiredSalts()
  }
}

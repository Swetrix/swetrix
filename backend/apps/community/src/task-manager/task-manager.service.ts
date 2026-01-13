import { Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'

import { SaltService } from '../analytics/salt.service'

@Injectable()
export class TaskManagerService {
  constructor(private readonly saltService: SaltService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async regenerateGlobalSalts() {
    await this.saltService.regenerateExpiredSalts()
  }
}

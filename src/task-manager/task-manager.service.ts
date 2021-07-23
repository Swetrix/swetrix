import { Injectable, HttpService } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import * as _isEmpty from 'lodash/isEmpty'
import * as _join from 'lodash/join'

import { MailerService } from '../mailer/mailer.service'
import { clickhouse, REDIS_LOG_DATA_CACHE_KEY, redis } from '../common/constants'

@Injectable()
export class TaskManagerService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly httpService: HttpService
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async someTask(): Promise<void> {
    const data = await redis.lrange(REDIS_LOG_DATA_CACHE_KEY, 0, -1)

    if (!_isEmpty(data)) {
      await redis.del(REDIS_LOG_DATA_CACHE_KEY)
      const query = `INSERT INTO analytics (*) VALUES ${_join(data, ',')}`
      await clickhouse.query(query).toPromise()
    }
  }
}

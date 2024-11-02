import { Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import bcrypt from 'bcrypt'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import _size from 'lodash/size'
import _map from 'lodash/map'
import _now from 'lodash/now'

import { redis, REDIS_SESSION_SALT_KEY } from '../common/constants'
import { clickhouse } from '../common/integrations/clickhouse'
import { AppLoggerService } from '../logger/logger.service'

dayjs.extend(utc)

@Injectable()
export class TaskManagerService {
  constructor(private readonly logger: AppLoggerService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateSessionSalt() {
    const salt = await bcrypt.genSalt(10)
    await redis.set(REDIS_SESSION_SALT_KEY, salt, 'EX', 87000)
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processSessionDuration() {
    const keys = await redis.keys('sd:*')
    const keysToDelete = []
    const toSave = []
    const now = _now()

    const promises = _map(keys, async key => {
      const [start, last] = (await redis.get(key)).split(':')
      const duration = now - Number(last)

      // storing to the DB if last interaction was more than 1 minute ago
      if (duration > 60000) {
        const [, psid, pid] = key.split(':')
        toSave.push({
          psid,
          pid,
          duration: Math.floor((Number(last) - Number(start)) / 1000), // convert to seconds
        })
        keysToDelete.push(key)
      }
    })

    await Promise.allSettled(promises).catch(reason => {
      this.logger.error(
        `[CRON WORKER](processSessionDuration) Error occured: ${reason}`,
      )
    })

    if (_size(toSave) > 0) {
      await redis.del(...keysToDelete)

      await clickhouse.insert({
        table: 'session_durations',
        values: toSave,
        format: 'JSONEachRow',
      })
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async dropClickhouseLogs() {
    const queries = [
      'DROP TABLE IF EXISTS system.asynchronous_metric_log',
      'DROP TABLE IF EXISTS system.metric_log',
      'DROP TABLE IF EXISTS system.query_log',
      'DROP TABLE IF EXISTS system.trace_log',
      'DROP TABLE IF EXISTS system.part_log',
    ]

    const promises = _map(queries, async query => {
      await clickhouse.command({
        query,
      })
    })

    await Promise.allSettled(promises).catch(reason => {
      this.logger.error(
        `[CRON WORKER](dropClickhouseLogs) Error occured: ${reason}`,
      )
    })
  }
}

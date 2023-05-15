import { Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import * as bcrypt from 'bcrypt'
import * as dayjs from 'dayjs'
import * as utc from 'dayjs/plugin/utc'
import * as _isEmpty from 'lodash/isEmpty'
import * as _join from 'lodash/join'
import * as _size from 'lodash/size'
import * as _map from 'lodash/map'
import * as _now from 'lodash/now'

import {
  clickhouse,
  redis,
  REDIS_LOG_DATA_CACHE_KEY,
  REDIS_LOG_CUSTOM_CACHE_KEY,
  REDIS_SESSION_SALT_KEY,
  REDIS_LOG_PERF_CACHE_KEY,
  REDIS_LOG_CAPTCHA_CACHE_KEY,
} from '../common/constants'
import { AppLoggerService } from '../logger/logger.service'

dayjs.extend(utc)

@Injectable()
export class TaskManagerService {
  constructor(private readonly logger: AppLoggerService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async saveLogData(): Promise<void> {
    const data = await redis.lrange(REDIS_LOG_DATA_CACHE_KEY, 0, -1)
    const customData = await redis.lrange(REDIS_LOG_CUSTOM_CACHE_KEY, 0, -1)
    const perfData = await redis.lrange(REDIS_LOG_PERF_CACHE_KEY, 0, -1)
    const captchaData = await redis.lrange(REDIS_LOG_CAPTCHA_CACHE_KEY, 0, -1)

    if (!_isEmpty(data)) {
      await redis.del(REDIS_LOG_DATA_CACHE_KEY)
      const query = `INSERT INTO analytics (*) VALUES ${_join(data, ',')}`
      try {
        await clickhouse.query(query).toPromise()
      } catch (e) {
        console.error(`[CRON WORKER] Error whilst saving log data: ${e}`)
      }
    }

    if (!_isEmpty(captchaData)) {
      await redis.del(REDIS_LOG_CAPTCHA_CACHE_KEY)
      const query = `INSERT INTO captcha (*) VALUES ${_join(captchaData, ',')}`
      try {
        await clickhouse.query(query).toPromise()
      } catch (e) {
        console.error(
          `[CRON WORKER] Error whilst saving CAPTCHA log data: ${e}`,
        )
      }
    }

    if (!_isEmpty(customData)) {
      await redis.del(REDIS_LOG_CUSTOM_CACHE_KEY)
      const query = `INSERT INTO customEV (*) VALUES ${_join(customData, ',')}`

      try {
        await clickhouse.query(query).toPromise()
      } catch (e) {
        console.error(
          `[CRON WORKER] Error whilst saving custom events data: ${e}`,
        )
      }
    }

    if (!_isEmpty(perfData)) {
      await redis.del(REDIS_LOG_PERF_CACHE_KEY)

      const query = `INSERT INTO performance (*) VALUES ${_join(perfData, ',')}`

      try {
        await clickhouse.query(query).toPromise()
      } catch (e) {
        console.error(
          `[CRON WORKER] Error whilst saving performance data: ${e}`,
        )
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateSessionSalt(): Promise<void> {
    const salt = await bcrypt.genSalt(10)
    await redis.set(REDIS_SESSION_SALT_KEY, salt, 'EX', 87000)
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanUpSessions(): Promise<void> {
    const delSidQuery = `ALTER TABLE analytics UPDATE sid = NULL WHERE created < '${dayjs
      .utc()
      .subtract(20, 'm')
      .format('YYYY-MM-DD HH:mm:ss')}'`

    await clickhouse.query(delSidQuery).toPromise()
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processSessionDuration(): Promise<void> {
    const keys = await redis.keys('sd:*')
    const toSave = []
    const now = _now()

    const promises = _map(keys, async key => {
      const [start, last] = (await redis.get(key)).split(':')
      const duration = now - Number(last)

      // storing to the DB if last interaction was more than 1 minute ago
      if (duration > 60000) {
        toSave.push([key, Number(last) - Number(start)])
      }
    })

    await Promise.allSettled(promises).catch(reason => {
      this.logger.error(
        `[CRON WORKER](processSessionDuration) Error occured: ${reason}`,
      )
    })

    if (_size(toSave) > 0) {
      await redis.del(..._map(toSave, ([key]) => key))

      const setSdurQuery = `ALTER TABLE analytics UPDATE sdur = sdur + CASE ${_map(
        toSave,
        ([key, duration]) =>
          `WHEN sid = '${key.split(':')[1]}' THEN ${duration / 1000}`, // converting to seconds
      ).join(' ')} END WHERE sid IN (${_map(
        toSave,
        ([key]) => `'${key.split(':')[1]}'`,
      ).join(',')})`

      await clickhouse.query(setSdurQuery).toPromise()
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async dropClickhouseLogs(): Promise<void> {
    const queries = [
      'DROP TABLE IF EXISTS system.asynchronous_metric_log',
      'DROP TABLE IF EXISTS system.metric_log',
      'DROP TABLE IF EXISTS system.query_log',
      'DROP TABLE IF EXISTS system.trace_log',
      'DROP TABLE IF EXISTS system.part_log',
    ]

    const promises = _map(queries, async query => {
      await clickhouse.query(query).toPromise()
    })

    await Promise.allSettled(promises).catch(reason => {
      this.logger.error(
        `[CRON WORKER](dropClickhouseLogs) Error occured: ${reason}`,
      )
    })
  }
}

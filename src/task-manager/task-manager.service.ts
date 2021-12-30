import { Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
// import * as bcrypt from 'bcrypt'
import * as dayjs from 'dayjs'
import * as utc from 'dayjs/plugin/utc'
import * as _isEmpty from 'lodash/isEmpty'
import * as _isNull from 'lodash/isNull'
import * as _join from 'lodash/join'
import * as _size from 'lodash/size'
import * as _map from 'lodash/map'

import { MailerService } from '../mailer/mailer.service'
import { UserService } from '../user/user.service'
import { ProjectService } from '../project/project.service'
import { LetterTemplate } from '../mailer/letter'
import { AnalyticsService } from '../analytics/analytics.service'
import { ReportFrequency } from '../user/entities/user.entity'
import {
  clickhouse, redis, REDIS_LOG_DATA_CACHE_KEY, REDIS_LOG_CUSTOM_CACHE_KEY, isSelfhosted, // REDIS_SESSION_SALT_KEY,
  REDIS_USERS_COUNT_KEY, REDIS_PROJECTS_COUNT_KEY,
} from '../common/constants'
import { getRandomTip } from '../common/utils'

dayjs.extend(utc)

@Injectable()
export class TaskManagerService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly userService: UserService,
    private readonly analyticsService: AnalyticsService,
    private readonly projectService: ProjectService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async saveLogData(): Promise<void> {
    const data = await redis.lrange(REDIS_LOG_DATA_CACHE_KEY, 0, -1)
    const customData = await redis.lrange(REDIS_LOG_CUSTOM_CACHE_KEY, 0, -1)

    if (!_isEmpty(data)) {
      await redis.del(REDIS_LOG_DATA_CACHE_KEY)
      const query = `INSERT INTO analytics (*) VALUES ${_join(data, ',')}`
      try {
        await clickhouse.query(query).toPromise()
      } catch (e) {
        console.error(`[CRON WORKER] Error whilst saving log data: ${e}`)
      }
    }

    if (!_isEmpty(customData)) {
      await redis.del(REDIS_LOG_CUSTOM_CACHE_KEY)
      const query = `INSERT INTO customEV (*) VALUES ${_join(customData, ',')}`
      try {
        await clickhouse.query(query).toPromise()
      } catch (e) {
        console.error(`[CRON WORKER] Error whilst saving log data: ${e}`)
      }
    }
  }

  // @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  // async generateSessionSalt(): Promise<void> {
  //   const salt = await bcrypt.genSalt(10)
  //   await redis.set(REDIS_SESSION_SALT_KEY, salt, 'EX', 87000)
  // }

  // EVERY SUNDAY AT 2:30 AM
  @Cron('30 02 * * 0')
  async weeklyReportsHandler(): Promise<void> {
    if (isSelfhosted) {
      return
    }

    const users = await this.userService.find({
      where: {
        reportFrequency: ReportFrequency.Weekly,
      },
      relations: ['projects'],
      select: ['email'],
    })
    const now = dayjs.utc().format('DD.MM.YYYY')
    const weekAgo = dayjs.utc().subtract(1, 'w').format('DD.MM.YYYY')
    const date = `${weekAgo} - ${now}`
    const tip = getRandomTip()

    for (let i = 0; i < _size(users); ++i) {
      if (_isEmpty(users[i]?.projects) || _isNull(users[i]?.projects)) {
        continue
      }

      const ids = _map(users[i].projects, (p) => p.id)
      const data = await this.analyticsService.getSummary(ids, 'w', true)

      const result = {
        type: 'w', // week
        date,
        projects: _map(ids, (pid, index) => ({
          data: data[pid],
          name: users[i].projects[index].name,
        })),
        tip,
      }

      // todo: maybe this should be sent as a broadcast stream
      await this.mailerService.sendEmail(users[i].email, LetterTemplate.ProjectReport, result)
    }
  }

  // ON THE FIRST DAY OF EVERY MONTH AT 2 AM
  @Cron('0 02 1 * *')
  async monthlyReportsHandler(): Promise<void> {
    if (isSelfhosted) {
      return
    }

    const users = await this.userService.find({
      where: {
        reportFrequency: ReportFrequency.Monthly,
      },
      relations: ['projects'],
      select: ['email'],
    })
    const now = dayjs.utc().format('DD.MM.YYYY')
    const weekAgo = dayjs.utc().subtract(1, 'M').format('DD.MM.YYYY')
    const date = `${weekAgo} - ${now}`
    const tip = getRandomTip()

    for (let i = 0; i < _size(users); ++i) {
      if (_isEmpty(users[i]?.projects) || _isNull(users[i]?.projects)) {
        continue
      }

      const ids = _map(users[i].projects, (p) => p.id)
      const data = await this.analyticsService.getSummary(ids, 'M', true)

      const result = {
        type: 'M', // month
        date,
        projects: _map(ids, (pid, index) => ({
          data: data[pid],
          name: users[i].projects[index].name,
        })),
        tip,
      }

      // todo: maybe this should be sent as a broadcast stream
      await this.mailerService.sendEmail(users[i].email, LetterTemplate.ProjectReport, result)
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async getGeneralStats(): Promise<object> {
    if (isSelfhosted) {
      return
    }

    const users = await this.userService.count()
    const projects = await this.projectService.count()
    await redis.set(REDIS_USERS_COUNT_KEY, users, 'EX', 630)
    await redis.set(REDIS_PROJECTS_COUNT_KEY, projects, 'EX', 630)

    return {
      users, projects,
    }
  }
}

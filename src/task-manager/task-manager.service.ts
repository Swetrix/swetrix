import { Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { IsNull, LessThan } from 'typeorm'
import * as bcrypt from 'bcrypt'
import * as dayjs from 'dayjs'
import * as utc from 'dayjs/plugin/utc'
import * as _isEmpty from 'lodash/isEmpty'
import * as _isNull from 'lodash/isNull'
import * as _join from 'lodash/join'
import * as _size from 'lodash/size'
import * as _map from 'lodash/map'
import * as _now from 'lodash/now'

import { MailerService } from '../mailer/mailer.service'
import { UserService } from '../user/user.service'
import { ProjectService } from '../project/project.service'
import { ActionTokensService } from '../action-tokens/action-tokens.service'
import { ActionTokenType } from '../action-tokens/action-token.entity'
import { LetterTemplate } from '../mailer/letter'
import { AnalyticsService } from '../analytics/analytics.service'
import { ReportFrequency, ACCOUNT_PLANS } from '../user/entities/user.entity'
import {
  clickhouse,
  redis,
  REDIS_LOG_DATA_CACHE_KEY,
  REDIS_LOG_CUSTOM_CACHE_KEY,
  isSelfhosted,
  REDIS_SESSION_SALT_KEY,
  REDIS_USERS_COUNT_KEY,
  REDIS_PROJECTS_COUNT_KEY,
  REDIS_PAGEVIEWS_COUNT_KEY,
  REDIS_LOG_PERF_CACHE_KEY,
  SEND_WARNING_AT_PERC,
  PROJECT_INVITE_EXPIRE,
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
    private readonly actionTokensService: ActionTokensService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async saveLogData(): Promise<void> {
    const data = await redis.lrange(REDIS_LOG_DATA_CACHE_KEY, 0, -1)
    const customData = await redis.lrange(REDIS_LOG_CUSTOM_CACHE_KEY, 0, -1)
    const perfData = await redis.lrange(REDIS_LOG_PERF_CACHE_KEY, 0, -1)

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

      try {
        const parsed = _map(customData, JSON.parse)
        const query = `INSERT INTO customEV (id, pid, ev, created)`
        await clickhouse.query(query, parsed).toPromise()
      } catch (e) {
        console.error(`[CRON WORKER] Error whilst saving custom events data: ${e}`)
      }
    }

    if (!_isEmpty(perfData)) {
      await redis.del(REDIS_LOG_PERF_CACHE_KEY)

      const query = `INSERT INTO performance (*) VALUES ${_join(perfData, ',')}`

      try {
        await clickhouse.query(query).toPromise()
      } catch (e) {
        console.error(`[CRON WORKER] Error whilst saving performance data: ${e}`)
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkLeftEvents(): Promise<void> {
    const thisMonth = dayjs.utc().format('YYYY-MM-01')
    const users = await this.userService.find({
      where: [
        {
          evWarningSentOn: IsNull(),
          isActive: true,
        },
        {
          evWarningSentOn: LessThan(thisMonth),
          isActive: true,
        },
      ],
      relations: ['projects'],
      select: ['id', 'email', 'planCode'],
    })
    const emailParams = {
      amount: SEND_WARNING_AT_PERC,
      url: 'https://swetrix.com/billing',
    }

    for (let i = 0; i < _size(users); ++i) {
      const { id, email, planCode, projects } = users[i]

      if (_isEmpty(projects) || _isNull(projects)) {
        continue
      }

      const maxEventsCount = ACCOUNT_PLANS[planCode].monthlyUsageLimit || 0
      const totalMonthlyEvents = await this.projectService.getRedisCount(id)

      const usedEV = (totalMonthlyEvents * 100) / maxEventsCount

      if (usedEV >= SEND_WARNING_AT_PERC) {
        await this.mailerService.sendEmail(
          email,
          LetterTemplate.TierWarning,
          emailParams,
          'broadcast',
        )
        await this.userService.update(id, {
          evWarningSentOn: dayjs.utc().format('YYYY-MM-DD HH:mm:ss'),
        })
      }
    }
  }

  @Cron(CronExpression.EVERY_2_HOURS)
  async deleteOldShareInvitations(): Promise<void> {
    const minDate = dayjs
      .utc()
      .subtract(PROJECT_INVITE_EXPIRE, 'h')
      .format('YYYY-MM-DD HH:mm:ss')
    await this.actionTokensService.deleteMultiple(
      `action="${ActionTokenType.PROJECT_SHARE}" AND created<"${minDate}"`,
    )
    await this.projectService.deleteMultipleShare(
      `confirmed=0 AND created<"${minDate}"`,
    )
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

      const ids = _map(users[i].projects, p => p.id)
      const data = await this.analyticsService.getSummary(ids, 'w')

      const result = {
        type: 'w', // week
        date,
        projects: _map(ids, (pid, index) => ({
          data: data[pid],
          name: users[i].projects[index].name,
        })),
        tip,
      }

      await this.mailerService.sendEmail(
        users[i].email,
        LetterTemplate.ProjectReport,
        result,
        'broadcast',
      )
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

      const ids = _map(users[i].projects, p => p.id)
      const data = await this.analyticsService.getSummary(ids, 'M')

      const result = {
        type: 'M', // month
        date,
        projects: _map(ids, (pid, index) => ({
          data: data[pid],
          name: users[i].projects[index].name,
        })),
        tip,
      }

      await this.mailerService.sendEmail(
        users[i].email,
        LetterTemplate.ProjectReport,
        result,
        'broadcast',
      )
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async getGeneralStats(): Promise<object> {
    if (isSelfhosted) {
      return
    }

    const PVquery = 'SELECT count(*) from analytics'
    const CEquery = 'SELECT count(*) from customEV'
    const users = await this.userService.count()
    const projects = await this.projectService.count()
    const pageviews =
      (await clickhouse.query(PVquery).toPromise())[0]['count()'] +
      (await clickhouse.query(CEquery).toPromise())[0]['count()']

    await redis.set(REDIS_USERS_COUNT_KEY, users, 'EX', 630)
    await redis.set(REDIS_PROJECTS_COUNT_KEY, projects, 'EX', 630)
    await redis.set(REDIS_PAGEVIEWS_COUNT_KEY, pageviews, 'EX', 630)

    return {
      users,
      projects,
      pageviews,
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processSessionDuration(): Promise<void> {
    const keys = await redis.keys('sd:*')
    const toSave = []
    const now = _now()

    for (let i = 0; i < _size(keys); ++i) {
      const [start, last] = (await redis.get(keys[i])).split(':')
      const duration = now - Number(last)

      // storing to the DB if last interaction was more than 1 minute ago
      if (duration > 60000) {
        toSave.push([keys[i], Number(last) - Number(start)])
      }
    }

    if (_size(toSave) > 0) {
      await redis.del(..._map(toSave, ([key]) => key))

      const setSdurQuery = `ALTER TABLE analytics UPDATE sdur = sdur + CASE ${_map(
        toSave,
        ([key, duration]) => `WHEN sid = '${key.split(':')[1]}' THEN ${duration / 1000}`, // converting to seconds
      ).join(' ')} END WHERE sid IN (${_map(
        toSave,
        ([key]) => `'${key.split(':')[1]}'`,
      ).join(',')})`

      await clickhouse.query(setSdurQuery).toPromise()
    }
  }
}

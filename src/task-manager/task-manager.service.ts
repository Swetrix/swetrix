import { Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { IsNull, LessThan, In, Not, Between } from 'typeorm'
import * as bcrypt from 'bcrypt'
import * as dayjs from 'dayjs'
import * as utc from 'dayjs/plugin/utc'
import * as _isEmpty from 'lodash/isEmpty'
import * as _isNull from 'lodash/isNull'
import * as _join from 'lodash/join'
import * as _size from 'lodash/size'
import * as _map from 'lodash/map'
import * as _now from 'lodash/now'
import * as _find from 'lodash/find'

import { MailerService } from '../mailer/mailer.service'
import { UserService } from '../user/user.service'
import { ProjectService } from '../project/project.service'
import { ActionTokensService } from '../action-tokens/action-tokens.service'
import { AlertService } from 'src/alert/alert.service'
import { ActionTokenType } from '../action-tokens/action-token.entity'
import { LetterTemplate } from '../mailer/letter'
import { AnalyticsService } from '../analytics/analytics.service'
import {
  ReportFrequency, ACCOUNT_PLANS, PlanCode, BillingFrequency, TRIAL_DURATION,
} from '../user/entities/user.entity'
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
  REDIS_PERFORMANCE_COUNT_KEY,
} from '../common/constants'
import { getRandomTip } from '../common/utils'
import { InjectBot } from 'nestjs-telegraf'
import { TelegrafContext } from 'src/user/user.controller'
import { Telegraf } from 'telegraf'
import {
  QueryCondition,
  QueryMetric,
  QueryTime,
} from 'src/alert/dto/alert.dto'

dayjs.extend(utc)

const getQueryTime = (time: QueryTime): number => {
  if (time === QueryTime.LAST_15_MINUTES) return 15 * 60
  if (time === QueryTime.LAST_30_MINUTES) return 30 * 60
  if (time === QueryTime.LAST_1_HOUR) return 60 * 60
  if (time === QueryTime.LAST_4_HOURS) return 4 * 60 * 60
  if (time === QueryTime.LAST_24_HOURS) return 24 * 60 * 60
  if (time === QueryTime.LAST_48_HOURS) return 48 * 60 * 60
  return 0
}

const getQueryTimeString = (time: QueryTime): string => {
  if (time === QueryTime.LAST_15_MINUTES) return '15 minutes'
  if (time === QueryTime.LAST_30_MINUTES) return '30 minutes'
  if (time === QueryTime.LAST_1_HOUR) return '1 hour'
  if (time === QueryTime.LAST_4_HOURS) return '4 hours'
  if (time === QueryTime.LAST_24_HOURS) return '24 hours'
  if (time === QueryTime.LAST_48_HOURS) return '48 hours'
  return '0'
}

const getQueryCondition = (condition: QueryCondition): string => {
  if (condition === QueryCondition.LESS_THAN) return '<'
  if (condition === QueryCondition.LESS_EQUAL_THAN) return '<='
  if (condition === QueryCondition.GREATER_THAN) return '>'
  if (condition === QueryCondition.GREATER_EQUAL_THAN) return '>='
  return ''
}

@Injectable()
export class TaskManagerService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly userService: UserService,
    private readonly analyticsService: AnalyticsService,
    private readonly projectService: ProjectService,
    private readonly actionTokensService: ActionTokensService,
    private readonly alertService: AlertService,
    @InjectBot() private bot: Telegraf<TelegrafContext>,
  ) { }

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
    const PFquery = 'SELECT count(*) from performance'

    const users = await this.userService.count()
    const projects = await this.projectService.count()
    const pageviews =
      (await clickhouse.query(PVquery).toPromise())[0]['count()'] +
      (await clickhouse.query(CEquery).toPromise())[0]['count()']
    const performance = (await clickhouse.query(PFquery).toPromise())[0]['count()']

    await redis.set(REDIS_USERS_COUNT_KEY, users, 'EX', 630)
    await redis.set(REDIS_PROJECTS_COUNT_KEY, projects, 'EX', 630)
    await redis.set(REDIS_PAGEVIEWS_COUNT_KEY, pageviews, 'EX', 630)
    await redis.set(REDIS_PERFORMANCE_COUNT_KEY, performance, 'EX', 630)

    return {
      users,
      projects,
      pageviews,
      performance,
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
        ([key, duration]) =>
          `WHEN sid = '${key.split(':')[1]}' THEN ${duration / 1000}`, // converting to seconds
      ).join(' ')} END WHERE sid IN (${_map(
        toSave,
        ([key]) => `'${key.split(':')[1]}'`,
      ).join(',')})`

      await clickhouse.query(setSdurQuery).toPromise()
    }
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async checkIsTelegramChatIdConfirmed(): Promise<void> {
    const users = await this.userService.find({
      where: {
        isTelegramChatIdConfirmed: false,
      },
      select: ['id', 'telegramChatId'],
    })

    for (let i = 0; i < _size(users); ++i) {
      await this.userService.update(users[i].id, {
        telegramChatId: null,
      })
    }
  }

  @Cron(CronExpression.EVERY_2_HOURS)
  async cleanUpUnpaidSubUsers(): Promise<void> {
    const users = await this.userService.find({
      where: {
        cancellationEffectiveDate: Not(IsNull()),
      }
    })

    for (let i = 0; i < _size(users); ++i) {
      const user = users[i]
      const cancellationEffectiveDate = new Date(user.cancellationEffectiveDate)
      const now = new Date()

      if (now > cancellationEffectiveDate) {
        await this.userService.update(user.id, {
          cancellationEffectiveDate: null,
          planCode: PlanCode.none,
          nextBillDate: null,
          billingFrequency: BillingFrequency.Monthly,
        })
        await this.projectService.clearProjectsRedisCache(user.id)
      }
    }
  }

  @Cron(CronExpression.EVERY_4_HOURS)
  async trialReminder(): Promise<void> {
    const users = await this.userService.find({
      where: {
        planCode: PlanCode.trial,
        trialEndDate: Between( // between today & tomorrow
          new Date(),
          new Date(new Date().getTime() + 24 * 60 * 60 * 1000),
        ),
        trialReminderSent: false,
      }
    })

    for (let i = 0; i < _size(users); ++i) {
      await this.userService.update(users[i].id, {
        trialReminderSent: true,
      })
      await this.mailerService.sendEmail(
        users[i].email,
        LetterTemplate.TrialEndsTomorrow,
      )
    }
  }

  // A temporary fix for a bug that was causing trialEndDate to be null
  @Cron(CronExpression.EVERY_10_MINUTES)
  async fixAFuckingTrialEndDateNullBug(): Promise<void> {
    const users = await this.userService.find({
      where: {
        planCode: PlanCode.trial,
        trialEndDate: IsNull(),
      }
    })

    for (let i = 0; i < _size(users); ++i) {
      await this.userService.update(users[i].id, {
        trialEndDate: new Date(new Date(users[i].created).getTime() + TRIAL_DURATION * 24 * 60 * 60 * 1000),
      })
    }
  }

  @Cron(CronExpression.EVERY_2_HOURS)
  async trialEnd(): Promise<void> {
    const users = await this.userService.find({
      where: [{
        planCode: PlanCode.trial,
        trialEndDate: LessThan(new Date()),
      },
      {
        planCode: PlanCode.trial,
        trialEndDate: IsNull(),
      }]
    })

    for (let i = 0; i < _size(users); ++i) {
      const { id, email } = users[i]

      await this.userService.update(id, {
        planCode: PlanCode.none,
        // trialEndDate: null,
      })
      await this.mailerService.sendEmail(
        email,
        LetterTemplate.TrialExpired,
      )
      await this.projectService.clearProjectsRedisCache(id)
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  // @Cron(CronExpression.EVERY_5_SECONDS)
  async checkOnlineUsersAlerts(): Promise<void> {
    const projects = await this.projectService.findWhere(
      {
        admin: {
          isTelegramChatIdConfirmed: true,
          planCode: Not(PlanCode.none),
        },
      },
      ['admin'],
    )

    const alerts = await this.alertService.findWhere({
      project: In(_map(projects, 'id')),
      active: true,
      queryMetric: QueryMetric.ONLINE_USERS,
    }, ['project'])

    for (let i = 0; i < _size(alerts); ++i) {
      const alert = alerts[i]
      const project = _find(projects, { id: alert.project.id })

      if (alert.lastTriggered !== null) {
        const lastTriggered = new Date(alert.lastTriggered)
        const now = new Date()

        if (now.getTime() - lastTriggered.getTime() < 24 * 60 * 60 * 1000) {
          return
        }
      }

      const online = await this.analyticsService.getOnlineUserCount(
        project.id,
      )

      if (online >= alert.queryValue) {
        // @ts-ignore
        await this.alertService.update(alert.id, {
          lastTriggered: new Date(),
        })

        this.bot.telegram.sendMessage(
          project.admin.telegramChatId,
          `🔔 Alert *${alert.name}* got triggered!\nYour project *${project.name}* has *${online}* online users right now!`,
          {
            parse_mode: 'Markdown',
          },
        )
      }
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  // @Cron(CronExpression.EVERY_5_SECONDS)
  async checkMetricAlerts(): Promise<void> {
    const projects = await this.projectService.findWhere(
      {
        admin: {
          isTelegramChatIdConfirmed: true,
          planCode: Not(PlanCode.none),
        },
      },
      ['admin'],
    )

    const alerts = await this.alertService.findWhere({
      project: In(_map(projects, 'id')),
      active: true,
      queryMetric: Not(QueryMetric.ONLINE_USERS),
    }, ['project'])

    for (let i = 0; i < _size(alerts); ++i) {
      const alert = alerts[i]
      const project = _find(projects, { id: alert.project.id })

      if (alert.lastTriggered !== null) {
        const lastTriggered = new Date(alert.lastTriggered)
        const now = new Date()

        if (now.getTime() - lastTriggered.getTime() < 24 * 60 * 60 * 1000) {
          return
        }
      }

      const isUnique = Number(alert.queryMetric === QueryMetric.UNIQUE_PAGE_VIEWS)
      const time = getQueryTime(alert.queryTime)
      const createdCondition = getQueryCondition(alert.queryCondition)
      const query = `SELECT count() FROM analytics WHERE pid = '${project.id}' AND unique = '${isUnique}' AND created ${createdCondition} now() - ${time}`
      const queryResult = await clickhouse.query(query).toPromise()

      const count = Number(queryResult[0]['count()'])

      if (count >= alert.queryValue) {
        // @ts-ignore
        await this.alertService.update(alert.id, {
          lastTriggered: new Date(),
        })

        const queryMetric = alert.queryMetric === QueryMetric.UNIQUE_PAGE_VIEWS
          ? 'unique page views'
          : 'page views'
        const text = `🔔 Alert *${alert.name}* got triggered!\nYour project *${project.name}* has had *${count}* ${queryMetric} in the last ${getQueryTimeString(alert.queryTime)}!`

        this.bot.telegram.sendMessage(project.admin.telegramChatId, text, {
          parse_mode: 'Markdown',
        })
      }
    }
  }
}

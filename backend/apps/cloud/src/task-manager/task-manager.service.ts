import { Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { IsNull, LessThan, In, Not, Between, MoreThan, Like } from 'typeorm'
import { ConfigService } from '@nestjs/config'
import Paypal from '@paypal/payouts-sdk'
import bcrypt from 'bcrypt'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import _isEmpty from 'lodash/isEmpty'
import _isNull from 'lodash/isNull'
import _size from 'lodash/size'
import _map from 'lodash/map'
import _now from 'lodash/now'
import _find from 'lodash/find'
import _includes from 'lodash/includes'
import _toNumber from 'lodash/toNumber'
import _reduce from 'lodash/reduce'
import _filter from 'lodash/filter'

import { AlertService } from '../alert/alert.service'
import { QueryCondition, QueryMetric, QueryTime } from '../alert/dto/alert.dto'
import { ExtensionsService } from '../marketplace/extensions/extensions.service'
import { Extension } from '../marketplace/extensions/entities/extension.entity'
import { ReportFrequency } from '../project/enums'
import { TelegramService } from '../integrations/telegram/telegram.service'
import { MailerService } from '../mailer/mailer.service'
import { UserService } from '../user/user.service'
import { ProjectService } from '../project/project.service'
import { ActionTokensService } from '../action-tokens/action-tokens.service'
import { ActionTokenType } from '../action-tokens/action-token.entity'
import { LetterTemplate } from '../mailer/letter'
import { AnalyticsService } from '../analytics/analytics.service'
import { SaltService } from '../analytics/salt.service'
import { PayoutsService } from '../payouts/payouts.service'
import { PayoutStatus } from '../payouts/entities/payouts.entity'
import {
  ACCOUNT_PLANS,
  PlanCode,
  BillingFrequency,
  TRIAL_DURATION,
  User,
  getNextPlan,
  DashboardBlockReason,
  ReportFrequency as UserReportFrequency,
} from '../user/entities/user.entity'
import {
  redis,
  REDIS_SESSION_SALT_KEY,
  SEND_WARNING_AT_PERC,
  PROJECT_INVITE_EXPIRE,
  JWT_REFRESH_TOKEN_LIFETIME,
  PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET,
  TRAFFIC_SPIKE_ALLOWED_PERCENTAGE,
  isDevelopment,
} from '../common/constants'
import { clickhouse } from '../common/integrations/clickhouse'
import { CHPlanUsage } from './interfaces'
import { getRandomTip } from '../common/utils'
import { AppLoggerService } from '../logger/logger.service'
import { DiscordService } from '../integrations/discord/discord.service'
import { SlackService } from '../integrations/slack/slack.service'

dayjs.extend(utc)

let paypalClient

if (PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET) {
  const environment = new Paypal.core.SandboxEnvironment(
    PAYPAL_CLIENT_ID,
    PAYPAL_CLIENT_SECRET,
  )
  paypalClient = new Paypal.core.PayPalHttpClient(environment)
}

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

const checkQueryCondition = (
  a: number,
  b: number,
  condition: QueryCondition,
) => {
  if (condition === QueryCondition.LESS_THAN) {
    return a < b
  }
  if (condition === QueryCondition.LESS_EQUAL_THAN) {
    return a <= b
  }
  if (condition === QueryCondition.GREATER_THAN) {
    return a > b
  }
  if (condition === QueryCondition.GREATER_EQUAL_THAN) {
    return a >= b
  }
  return false
}

const CHUNK_SIZE = 5000

// TODO: Count for other tables like captcha, errors, customEV too
const generatePlanUsageQueryForUser = (
  user: User,
  getFromDate: (user?: User) => string,
  getToDate: (user?: User) => string,
): string => {
  return `
    SELECT '${user.id}' AS id, count(*) AS "count" 
    FROM analytics 
    WHERE pid IN ({pids:Array(FixedString(12))}) 
    AND created BETWEEN '${getFromDate(user)}' AND '${getToDate(user)}'
  `
}

const executeChunkedQueries = async (
  users: User[],
  getFromDate: (user?: User) => string,
  getToDate: (user?: User) => string,
): Promise<CHPlanUsage[]> => {
  const results: CHPlanUsage[] = []

  for (const user of users) {
    if (_isEmpty(user.projects)) {
      continue
    }

    const pids = _map(user.projects, p => p.id)
    let totalCount = 0

    // Process project IDs in chunks
    for (let i = 0; i < pids.length; i += CHUNK_SIZE) {
      const pidChunk = pids.slice(i, i + CHUNK_SIZE)
      const query = generatePlanUsageQueryForUser(user, getFromDate, getToDate)

      const { data } = await clickhouse
        .query({ query, query_params: { pids: pidChunk } })
        .then(resultSet => resultSet.json<CHPlanUsage>())

      totalCount += data[0]?.count || 0
    }

    results.push({
      id: user.id,
      count: totalCount,
    })
  }

  return results
}

const getUsersThatExceedPlanUsage = (
  users: User[],
  usage: CHPlanUsage[],
  allowedExceed = TRAFFIC_SPIKE_ALLOWED_PERCENTAGE,
): (User & { usage: number })[] => {
  const usageMap = _reduce(
    usage,
    (acc, value: CHPlanUsage) => ({
      ...acc,
      [value.id]: value.count,
    }),
    {},
  )
  const exceedingUsers = []

  for (let i = 0; i < _size(users); ++i) {
    const user = users[i]
    const allowedEvents = ACCOUNT_PLANS[user.planCode].monthlyUsageLimit

    if (usageMap[user.id] > allowedEvents + allowedEvents * allowedExceed) {
      exceedingUsers.push({
        ...user,
        usage: usageMap[user.id],
      })
    }
  }

  return exceedingUsers
}

const getUserIDsThatExceedPlanUsage = (
  users: User[],
  usage: CHPlanUsage[],
  allowedExceed = TRAFFIC_SPIKE_ALLOWED_PERCENTAGE,
): string[] => {
  const usageMap = _reduce(
    usage,
    (acc, value: CHPlanUsage) => ({
      ...acc,
      [value.id]: value.count,
    }),
    {},
  )
  const exceedingUsers = []

  for (let i = 0; i < _size(users); ++i) {
    const user = users[i]
    const allowedEvents = ACCOUNT_PLANS[user.planCode].monthlyUsageLimit

    if (usageMap[user.id] > allowedEvents + allowedEvents * allowedExceed) {
      exceedingUsers.push(user.id)
    }
  }

  return exceedingUsers
}

const getUsersThatExceedContinuously = (
  users: User[],
  usage: CHPlanUsage[][],
): (User & { usage: any[] })[] => {
  const transformedUsage = _map(usage, (el: CHPlanUsage[]) => {
    return _reduce(
      el,
      (acc, value: CHPlanUsage) => ({
        ...acc,
        [value.id]: value.count,
      }),
      {},
    )
  })

  const exceedingUsers = []

  for (let i = 0; i < _size(users); ++i) {
    let exceedingTimes = 0
    const user = users[i]
    const allowedEvents = ACCOUNT_PLANS[user.planCode].monthlyUsageLimit
    const userUsage = []

    for (let x = 0; x < _size(transformedUsage); ++x) {
      userUsage.push(transformedUsage[x][user.id])
      if (transformedUsage[x][user.id] > allowedEvents) {
        exceedingTimes++
      }
    }

    if (exceedingTimes === _size(usage)) {
      exceedingUsers.push({
        ...user,
        usage: userUsage,
      })
    }
  }

  return exceedingUsers
}

const EMAIL_REPORTS_MAP = {
  [ReportFrequency.WEEKLY]: {
    type: 'w',
    dayjsParams: [1, 'w'],
    analyticsParam: '7d',
  },
  [ReportFrequency.MONTHLY]: {
    type: 'M',
    dayjsParams: [1, 'M'],
    analyticsParam: '4w',
  },
  [ReportFrequency.QUARTERLY]: {
    type: 'M',
    dayjsParams: [3, 'M'],
    analyticsParam: '3M',
  },
} as const

@Injectable()
export class TaskManagerService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly userService: UserService,
    private readonly analyticsService: AnalyticsService,
    private readonly projectService: ProjectService,
    private readonly actionTokensService: ActionTokensService,
    private readonly alertService: AlertService,
    private readonly extensionsService: ExtensionsService,
    private readonly logger: AppLoggerService,
    private readonly telegramService: TelegramService,
    private readonly payoutsService: PayoutsService,
    private readonly configService: ConfigService,
    private readonly discordService: DiscordService,
    private readonly slackService: SlackService,
    private readonly saltService: SaltService,
  ) {}

  generateUnsubscribeUrl(
    id: string,
    type: '3rdparty' | 'user-reports',
  ): string {
    if (type === '3rdparty') {
      const token = this.projectService.createUnsubscribeKey(id)
      return `${this.configService.get(
        'CLIENT_URL',
      )}/3rd-party-unsubscribe/${token}`
    }

    const token = this.userService.createUnsubscribeKey(id)
    return `${this.configService.get(
      'CLIENT_URL',
    )}/reports-unsubscribe/${token}`
  }

  async handleUserReports(
    reportFrequency:
      | ReportFrequency.WEEKLY
      | ReportFrequency.MONTHLY
      | ReportFrequency.QUARTERLY,
  ) {
    const params = EMAIL_REPORTS_MAP[reportFrequency]

    const users = await this.userService.getReportUsers(reportFrequency)

    const now = dayjs.utc().format('DD.MM.YYYY')
    const timeAgo = dayjs
      .utc()
      // @ts-expect-error
      .subtract(...params.dayjsParams)
      .format('DD.MM.YYYY')
    const date = `${timeAgo} - ${now}`
    const tip = getRandomTip()

    const promises = _map(users, async user => {
      const { id, email, projects } = user

      const unsubscribeUrl = this.generateUnsubscribeUrl(id, 'user-reports')

      const ids = _map(projects, p => p.id)
      const data = this.analyticsService.convertSummaryToObsoleteFormat(
        await this.analyticsService.getAnalyticsSummary(
          ids,
          undefined,
          params.analyticsParam,
        ),
      )

      const result = {
        type: params.type,
        date,
        projects: _map(ids, (pid, index) => ({
          data: data[pid],
          name: projects[index].name,
        })),
        tip,
        unsubscribeUrl,
      }

      await this.mailerService.sendEmail(
        email,
        LetterTemplate.ProjectReport,
        result,
      )
    })

    await Promise.allSettled(promises).catch(reason => {
      this.logger.error(
        `[CRON WORKER](handleUserReports) Frequency: ${reportFrequency}; Error occured: ${reason}`,
      )
    })
  }

  async handleSubscriberReports(
    reportFrequency:
      | ReportFrequency.WEEKLY
      | ReportFrequency.MONTHLY
      | ReportFrequency.QUARTERLY,
  ) {
    const params = EMAIL_REPORTS_MAP[reportFrequency]

    const subscribers =
      await this.projectService.getSubscribersForReports(reportFrequency)
    const now = dayjs.utc().format('DD.MM.YYYY')
    const timeAgo = dayjs
      .utc()
      // @ts-expect-error
      .subtract(...params.dayjsParams)
      .format('DD.MM.YYYY')
    const date = `${timeAgo} - ${now}`
    const tip = getRandomTip()

    const promises = _map(subscribers, async subscriber => {
      const { id, email } = subscriber
      const projects = await this.projectService.getSubscriberProjects(id)

      const unsubscribeUrl = this.generateUnsubscribeUrl(id, '3rdparty')

      const ids = projects.map(project => project.id)
      const data = this.analyticsService.convertSummaryToObsoleteFormat(
        await this.analyticsService.getAnalyticsSummary(
          ids,
          undefined,
          params.analyticsParam,
        ),
      )

      const result = {
        type: params.type,
        date,
        projects: _map(ids, (pid, index) => ({
          data: data[pid],
          name: projects[index].name,
        })),
        tip,
        unsubscribeUrl,
      }

      await this.mailerService.sendEmail(
        email,
        LetterTemplate.ProjectReport,
        result,
      )
    })

    await Promise.allSettled(promises).catch(reason => {
      this.logger.error(
        `[CRON WORKER](handleSubscriberReports) Frequency: ${reportFrequency}; Error: ${reason}`,
      )
    })
  }

  @Cron(CronExpression.EVERY_DAY_AT_5PM)
  async lockDashboards() {
    const users = await this.userService.getUsersForLockDashboards()

    if (_isEmpty(users)) {
      return
    }

    // This stuff is used solely to calculate whether the user has exceeded their limit > 30% or continuously for 2 months
    const monthlyUsage = await executeChunkedQueries(
      users,
      user =>
        dayjs.utc(user.planExceedContactedAt).format('YYYY-MM-01 00:00:00'),
      user =>
        dayjs
          .utc(user.planExceedContactedAt)
          .endOf('month')
          .format('YYYY-MM-DD 23:59:59'),
    )

    const exceedingUserIds = getUserIDsThatExceedPlanUsage(users, monthlyUsage)

    await Promise.allSettled(
      _map(users, async (user: User) => {
        const { id, email, planCode } = user

        const suggestedPlanLimit = getNextPlan(planCode)

        const data = {
          user,
          hitPercentageLimit: _includes(exceedingUserIds, user.id),
          percentageLimit: TRAFFIC_SPIKE_ALLOWED_PERCENTAGE * 100,
          billingUrl: 'https://swetrix.com/billing',
          suggestedPlanLimit: suggestedPlanLimit?.monthlyUsageLimit,
        }

        await this.mailerService.sendEmail(
          email,
          LetterTemplate.DashboardLockedExceedingLimits,
          data,
        )
        await this.userService.update(id, {
          dashboardBlockReason: DashboardBlockReason.exceeding_plan_limits,
        })
      }),
    ).catch(reason => {
      this.logger.error(
        `[CRON WORKER](lockDashboards) Error occured: ${reason}`,
      )
    })
  }

  @Cron(CronExpression.EVERY_DAY_AT_4PM)
  async checkPlanUsage() {
    const users = await this.userService.getUsersForPlanUsageCheck()

    if (_isEmpty(users)) {
      return
    }

    const planExceedContactedAt = dayjs.utc().format('YYYY-MM-DD HH:mm:ss')

    const thisMonthStart = dayjs.utc().format('YYYY-MM-01 00:00:00')
    const thisMonthEnd = dayjs
      .utc()
      .endOf('month')
      .format('YYYY-MM-DD 23:59:59')

    const thisMonthUsage = await executeChunkedQueries(
      users,
      () => thisMonthStart,
      () => thisMonthEnd,
    )

    const exceedingUsers = getUsersThatExceedPlanUsage(users, thisMonthUsage)

    // if there are exceeding users, contact them and let them know that their usage is > than 30% their tier allows
    if (!_isEmpty(exceedingUsers)) {
      const percExceedingUsagePromises = _map(exceedingUsers, async user => {
        const { id, email, usage, planCode } = user

        const suggestedPlanLimit = getNextPlan(planCode)

        const data = {
          user,
          hitPercentageLimit: true,
          upgradePeriodDays: 7,
          thisMonthUsage: usage,
          percentageLimit: TRAFFIC_SPIKE_ALLOWED_PERCENTAGE * 100,
          billingUrl: 'https://swetrix.com/billing',
          suggestedPlanLimit: suggestedPlanLimit?.monthlyUsageLimit,
        }

        await this.mailerService.sendEmail(
          email,
          LetterTemplate.UsageOverLimit,
          data,
        )
        await this.userService.update(id, {
          planExceedContactedAt,
        })
      })

      await Promise.allSettled(percExceedingUsagePromises).catch(reason => {
        this.logger.error(
          `[CRON WORKER](checkPlanUsage - percExceedingUsagePromises) Error occured: ${reason}`,
        )
      })
    }

    const filteredUsers = _filter(
      users,
      user =>
        !_find(exceedingUsers, exceedingUser => exceedingUser.id === user.id),
    )

    if (_isEmpty(filteredUsers)) {
      return
    }

    const lastMonthStart = dayjs
      .utc()
      .subtract(1, 'M')
      .format('YYYY-MM-01 00:00:00')
    const lastMonthEnd = dayjs
      .utc()
      .subtract(1, 'M')
      .endOf('month')
      .format('YYYY-MM-DD 23:59:59')

    const lastMonthUsage = await executeChunkedQueries(
      users,
      () => lastMonthStart,
      () => lastMonthEnd,
    )

    const continuousExceedingUsers = getUsersThatExceedContinuously(users, [
      // the order should be kept like this
      thisMonthUsage,
      lastMonthUsage,
    ])

    // if there are exceeding users, contact them and let them know that their usage more then what their tier allows for two consequetive months
    if (!_isEmpty(continuousExceedingUsers)) {
      const continuousExceedingUsagePromises = _map(
        continuousExceedingUsers,
        async user => {
          const { id, email, usage, planCode } = user

          const [userThisMonthUsage, userLastMonthUsage] = usage || []

          const suggestedPlanLimit = getNextPlan(planCode)

          const data = {
            user,
            hitPercentageLimit: false,
            upgradePeriodDays: 7,
            thisMonthUsage: userThisMonthUsage,
            lastMonthUsage: userLastMonthUsage,
            percentageLimit: TRAFFIC_SPIKE_ALLOWED_PERCENTAGE * 100,
            billingUrl: 'https://swetrix.com/billing',
            suggestedPlanLimit: suggestedPlanLimit?.monthlyUsageLimit,
          }

          await this.mailerService.sendEmail(
            email,
            LetterTemplate.UsageOverLimit,
            data,
          )
          await this.userService.update(id, {
            planExceedContactedAt,
          })
        },
      )

      await Promise.allSettled(continuousExceedingUsagePromises).catch(
        reason => {
          this.logger.error(
            `[CRON WORKER](checkPlanUsage - continuousExceedingUsagePromises) Error occured: ${reason}`,
          )
        },
      )
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkLeftEvents() {
    const thisMonth = dayjs.utc().format('YYYY-MM-01')
    const users = await this.userService.find({
      where: [
        {
          evWarningSentOn: IsNull(),
          isActive: true,
          planCode: Not(PlanCode.none),
          dashboardBlockReason: IsNull(),
        },
        {
          evWarningSentOn: LessThan(thisMonth),
          isActive: true,
          planCode: Not(PlanCode.none),
          dashboardBlockReason: IsNull(),
        },
      ],
      relations: ['projects'],
      select: ['id', 'email', 'planCode'],
    })
    const emailParams = {
      amount: SEND_WARNING_AT_PERC,
      url: 'https://swetrix.com/billing',
    }

    const promises = _map(users, async user => {
      const { id, email, planCode, projects } = user

      if (_isEmpty(projects) || _isNull(projects)) {
        return
      }

      const maxEventsCount = ACCOUNT_PLANS[planCode].monthlyUsageLimit || 0
      const totalMonthlyEvents = await this.projectService.getRedisCount(id)

      const usedEV = (totalMonthlyEvents * 100) / maxEventsCount

      if (usedEV >= SEND_WARNING_AT_PERC) {
        await this.mailerService.sendEmail(
          email,
          LetterTemplate.TierWarning,
          emailParams,
        )
        await this.userService.update(id, {
          evWarningSentOn: dayjs.utc().format('YYYY-MM-DD HH:mm:ss'),
        })
      }
    })

    await Promise.allSettled(promises).catch(reason => {
      this.logger.error(
        `[CRON WORKER](checkLeftEvents) Error occured: ${reason}`,
      )
    })
  }

  @Cron(CronExpression.EVERY_2_HOURS)
  async deleteOldShareInvitations() {
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

  // Legacy global salt rotation (kept for backward compatibility with older clients)
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateSessionSalt() {
    const salt = await bcrypt.genSalt(10)
    await redis.set(REDIS_SESSION_SALT_KEY, salt, 'EX', 87000)
  }

  // Ensure global salts exist for all rotation periods (daily/weekly/monthly)
  // Salts auto-expire via Redis TTL, this just ensures they're regenerated if missing
  @Cron(CronExpression.EVERY_HOUR)
  async regenerateGlobalSalts() {
    await this.saltService.regenerateExpiredSalts()
  }

  // EVERY SUNDAY AT 2:30 AM
  @Cron('30 02 * * 0')
  async weeklyReportsHandler() {
    await this.handleUserReports(ReportFrequency.WEEKLY)
  }

  // ON THE FIRST DAY OF EVERY MONTH AT 2 AM
  @Cron('0 02 1 * *')
  async monthlyReportsHandler() {
    await this.handleUserReports(ReportFrequency.MONTHLY)
  }

  @Cron(CronExpression.EVERY_QUARTER)
  async quarterlyReportsHandler() {
    await this.handleUserReports(ReportFrequency.QUARTERLY)
  }

  // EMAIL REPORTS, BUT FOR MULTIPLE PROJECT SUBSCRIBERS

  @Cron(CronExpression.EVERY_QUARTER)
  async handleQuarterlyReports() {
    await this.handleSubscriberReports(ReportFrequency.QUARTERLY)
  }

  // ON THE FIRST DAY OF EVERY MONTH AT 3 AM
  @Cron('0 03 1 * *')
  async handleMonthlyReports() {
    await this.handleSubscriberReports(ReportFrequency.MONTHLY)
  }

  // EVERY SUNDAY AT 3 AM
  @Cron('0 03 * * 0')
  async handleWeeklyReports() {
    await this.handleSubscriberReports(ReportFrequency.WEEKLY)
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
          duration: Math.max(
            0,
            Math.floor((Number(last) - Number(start)) / 1000),
          ), // convert to seconds, ensure non-negative
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

  @Cron(CronExpression.EVERY_30_MINUTES)
  async checkIsTelegramChatIdConfirmed() {
    const users = await this.userService.find({
      where: {
        isTelegramChatIdConfirmed: false,
      },
      select: ['id', 'telegramChatId'],
    })

    const promises = _map(users, async user => {
      const { id } = user

      await this.userService.update(id, {
        telegramChatId: null,
      })
    })

    await Promise.allSettled(promises).catch(reason => {
      this.logger.error(
        `[CRON WORKER](checkIsTelegramChatIdConfirmed) Error occured: ${reason}`,
      )
    })
  }

  @Cron(CronExpression.EVERY_2_HOURS)
  async cleanUpUnpaidSubUsers() {
    const users = await this.userService.find({
      where: {
        cancellationEffectiveDate: Not(IsNull()),
      },
    })

    const promises = _map(users, async user => {
      const cancellationEffectiveDate = new Date(user.cancellationEffectiveDate)
      const now = new Date()

      if (now > cancellationEffectiveDate) {
        await this.userService.update(user.id, {
          cancellationEffectiveDate: null,
          planCode: PlanCode.none,
          dashboardBlockReason: DashboardBlockReason.subscription_cancelled,
          planExceedContactedAt: user.cancellationEffectiveDate,
          nextBillDate: null,
          subID: null,
          subUpdateURL: null,
          subCancelURL: null,
          billingFrequency: BillingFrequency.Monthly,
        })
        await this.projectService.clearProjectsRedisCache(user.id)
      }
    })

    await Promise.allSettled(promises).catch(reason => {
      this.logger.error(
        `[CRON WORKER](cleanUpUnpaidSubUsers) Error occured: ${reason}`,
      )
    })
  }

  @Cron(CronExpression.EVERY_4_HOURS)
  async trialReminder() {
    const users = await this.userService.find({
      where: {
        planCode: PlanCode.trial,
        trialEndDate: Between(
          // between today & tomorrow
          new Date(),
          new Date(new Date().getTime() + 24 * 60 * 60 * 1000),
        ),
        trialReminderSent: false,
      },
    })

    const promises = _map(users, async user => {
      const { id, email } = user

      await this.userService.update(id, {
        trialReminderSent: true,
      })
      await this.mailerService.sendEmail(
        email,
        LetterTemplate.TrialEndsTomorrow,
        {
          url: 'https://swetrix.com/billing',
        },
      )
    })

    await Promise.allSettled(promises).catch(reason => {
      this.logger.error(`[CRON WORKER](trialReminder) Error occured: ${reason}`)
    })
  }

  // A temporary fix for a bug that was causing trialEndDate to be null
  @Cron(CronExpression.EVERY_10_MINUTES)
  async fixAFuckingTrialEndDateNullBug() {
    const users = await this.userService.find({
      where: {
        planCode: PlanCode.trial,
        trialEndDate: IsNull(),
      },
    })

    const promises = _map(users, async user => {
      const { id, created } = user

      await this.userService.update(id, {
        trialEndDate: new Date(
          new Date(created).getTime() + TRIAL_DURATION * 24 * 60 * 60 * 1000,
        ),
      })
    })

    await Promise.allSettled(promises).catch(reason => {
      this.logger.error(
        `[CRON WORKER](fixAFuckingTrialEndDateNullBug) Error occured: ${reason}`,
      )
    })
  }

  @Cron(CronExpression.EVERY_2_HOURS)
  async trialEnd() {
    const users = await this.userService.find({
      where: [
        {
          planCode: PlanCode.trial,
          trialEndDate: LessThan(new Date()),
        },
        {
          planCode: PlanCode.trial,
          trialEndDate: IsNull(),
        },
      ],
    })

    const promises = _map(users, async user => {
      const { id, email } = user

      await this.userService.update(id, {
        planCode: PlanCode.none,
        dashboardBlockReason: DashboardBlockReason.trial_ended,
        // trialEndDate: null,
      })
      await this.mailerService.sendEmail(email, LetterTemplate.TrialExpired, {
        url: 'https://swetrix.com/billing',
      })
      await this.projectService.clearProjectsRedisCache(id)
    })

    await Promise.allSettled(promises).catch(reason => {
      this.logger.error(`[CRON WORKER](trialEnd) Error occured: ${reason}`)
    })
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkOnlineUsersAlerts() {
    const projects = await this.projectService.find({
      where: [
        {
          admin: {
            isTelegramChatIdConfirmed: true,
            planCode: Not(PlanCode.none),
            dashboardBlockReason: IsNull(),
          },
        },
        {
          admin: {
            slackWebhookUrl: Not(IsNull()),
            planCode: Not(PlanCode.none),
            dashboardBlockReason: IsNull(),
          },
        },
        {
          admin: {
            discordWebhookUrl: Not(IsNull()),
            planCode: Not(PlanCode.none),
            dashboardBlockReason: IsNull(),
          },
        },
      ],
      relations: ['admin'],
    })

    const alerts = await this.alertService.find({
      where: {
        project: In(_map(projects, 'id')),
        active: true,
        queryMetric: QueryMetric.ONLINE_USERS,
      },
      relations: ['project'],
    })

    const promises = _map(alerts, async alert => {
      const project = _find(projects, { id: alert.project.id })

      if (alert.lastTriggered !== null) {
        const lastTriggered = new Date(alert.lastTriggered)
        const now = new Date()

        if (now.getTime() - lastTriggered.getTime() < 24 * 60 * 60 * 1000) {
          return
        }
      }

      const online = await this.analyticsService.getOnlineUserCount(project.id)
      const text = `🔔 Alert *${alert.name}* got triggered!\nYour project *${project.name}* has *${online}* online users right now!`

      if (checkQueryCondition(online, alert.queryValue, alert.queryCondition)) {
        // @ts-expect-error
        await this.alertService.update(alert.id, {
          lastTriggered: new Date(),
        })
        if (project.admin && project.admin.isTelegramChatIdConfirmed) {
          this.telegramService.addMessage(project.admin.telegramChatId, text, {
            parse_mode: 'Markdown',
          })
        }
        if (project.admin.discordWebhookUrl) {
          await this.discordService.sendWebhook(
            project.admin.discordWebhookUrl,
            text,
          )
        }

        if (project.admin.slackWebhookUrl) {
          await this.slackService.sendWebhook(
            project.admin.slackWebhookUrl,
            text,
          )
        }
      }
    })

    await Promise.allSettled(promises).catch(reason => {
      this.logger.error(
        `[CRON WORKER](checkOnlineUsersAlerts) Error occured: ${reason}`,
      )
    })
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkMetricAlerts() {
    const CRON_INTERVAL_SECONDS = 300

    const projects = await this.projectService.find({
      where: {
        admin: {
          planCode: Not(PlanCode.none),
          dashboardBlockReason: IsNull(),
        },
      },
      relations: ['admin'],
    })

    const alerts = await this.alertService.find({
      where: {
        project: In(_map(projects, 'id')),
        active: true,
        queryMetric: Not(QueryMetric.ONLINE_USERS),
      },
      relations: ['project'],
    })

    const promises = _map(alerts, async alert => {
      const project = _find(projects, { id: alert.project.id })

      if (
        alert.lastTriggered !== null &&
        alert.queryMetric !== QueryMetric.ERRORS &&
        !(
          alert.queryMetric === QueryMetric.CUSTOM_EVENTS &&
          alert.alertOnEveryCustomEvent
        )
      ) {
        const lastTriggered = new Date(alert.lastTriggered)
        const now = new Date()

        if (now.getTime() - lastTriggered.getTime() < 24 * 60 * 60 * 1000) {
          return
        }
      }

      let query: string
      const queryParams: Record<string, any> = { pid: project.id }

      const nowUnix = dayjs.utc().unix()
      let lastEventSubtractSeconds = 0

      if (alert.lastTriggered) {
        lastEventSubtractSeconds =
          nowUnix - dayjs.utc(alert.lastTriggered).unix()
      } else {
        lastEventSubtractSeconds =
          nowUnix - dayjs.utc().subtract(CRON_INTERVAL_SECONDS, 'second').unix()
      }

      const subtractSecondsTimeframe =
        alert.queryMetric === QueryMetric.ERRORS ||
        (alert.queryMetric === QueryMetric.CUSTOM_EVENTS &&
          alert.alertOnEveryCustomEvent)
          ? lastEventSubtractSeconds
          : getQueryTime(alert.queryTime as QueryTime)

      if (alert.queryMetric === QueryMetric.ERRORS) {
        if (alert.alertOnNewErrorsOnly) {
          query = `
            SELECT
              count()
            FROM (
              SELECT eid, min(created) as first_seen
              FROM errors
              WHERE pid = {pid:FixedString(12)}
              GROUP BY eid
            )
            WHERE first_seen >= now() - ${subtractSecondsTimeframe}
          `
        } else {
          query = `
            SELECT
              count()
            FROM errors
            WHERE
              pid = {pid:FixedString(12)}
              AND created >= now() - ${subtractSecondsTimeframe}
          `
        }
      } else if (alert.queryMetric === QueryMetric.CUSTOM_EVENTS) {
        query = `
          SELECT
            count()
          FROM customEV
          WHERE
            pid = {pid:FixedString(12)}
            AND ev = {ev:String}
            AND created >= now() - ${subtractSecondsTimeframe}
        `
        queryParams.ev = alert.queryCustomEvent
      } else {
        const isUnique = alert.queryMetric === QueryMetric.UNIQUE_PAGE_VIEWS
        query = `
          SELECT
            count(${isUnique ? 'DISTINCT psid' : '*'})
          FROM analytics
          WHERE
            pid = {pid:FixedString(12)}
            AND created >= now() - ${subtractSecondsTimeframe}
        `
      }

      const { data: queryResult } = await clickhouse
        .query({
          query,
          query_params: queryParams,
        })
        .then(resultSet => resultSet.json())

      const count = Number(queryResult[0]['count()']) || 0

      const conditionMet =
        alert.queryMetric === QueryMetric.ERRORS
          ? count > 0
          : alert.queryMetric === QueryMetric.CUSTOM_EVENTS &&
              alert.alertOnEveryCustomEvent
            ? count > 0
            : checkQueryCondition(
                count,
                alert.queryValue as number,
                alert.queryCondition as QueryCondition,
              )

      if (!conditionMet) {
        return
      }

      let errorDetails: {
        eid: string
        name: string
        message?: string | null
        lineno?: number | null
        colno?: number | null
        filename?: string | null
      } | null = null

      if (alert.queryMetric === QueryMetric.ERRORS && count > 0) {
        let detailQuery: string
        const detailQueryParams: Record<string, any> = {
          pid: project.id,
        }

        if (alert.alertOnNewErrorsOnly) {
          detailQuery = `
            SELECT eid, name, message, lineno, colno, filename
            FROM errors
            WHERE pid = {pid:FixedString(12)} AND eid IN (
              SELECT eid
              FROM (
                SELECT eid, min(created) AS first_seen_for_eid
                FROM errors
                WHERE pid = {pid:FixedString(12)}
                GROUP BY eid
              )
              WHERE first_seen_for_eid >= now() - ${subtractSecondsTimeframe}
            )
            ORDER BY created DESC
            LIMIT 1
          `
        } else {
          detailQuery = `
            SELECT eid, name, message, lineno, colno, filename
            FROM errors
            WHERE
              pid = {pid:FixedString(12)}
              AND created >= now() - ${subtractSecondsTimeframe}
            ORDER BY created DESC
            LIMIT 1
          `
        }
        try {
          const { data: errorDetailResult } = await clickhouse
            .query({ query: detailQuery, query_params: detailQueryParams })
            .then(resultSet => resultSet.json())
          if (errorDetailResult && errorDetailResult.length > 0) {
            errorDetails = errorDetailResult[0] as typeof errorDetails
          }
        } catch (reason) {
          this.logger.error(
            `[CRON WORKER](checkMetricAlerts) Error fetching error details: ${reason}`,
          )
        }
      }

      // @ts-expect-error
      await this.alertService.update(alert.id, {
        lastTriggered: new Date(),
      })

      let queryMetricString = ''
      switch (alert.queryMetric) {
        case QueryMetric.CUSTOM_EVENTS:
          queryMetricString = 'custom events'
          break
        case QueryMetric.UNIQUE_PAGE_VIEWS:
          queryMetricString = 'unique page views'
          break
        case QueryMetric.PAGE_VIEWS:
          queryMetricString = 'page views'
          break
        case QueryMetric.ERRORS:
          queryMetricString = alert.alertOnNewErrorsOnly
            ? 'new errors'
            : 'errors'
          break
        default:
          queryMetricString = alert.queryMetric
      }

      const effectiveQueryTimeString =
        alert.queryMetric === QueryMetric.ERRORS
          ? `${CRON_INTERVAL_SECONDS / 60} minutes`
          : alert.queryMetric === QueryMetric.CUSTOM_EVENTS &&
              alert.alertOnEveryCustomEvent
            ? `${CRON_INTERVAL_SECONDS / 60} minutes`
            : getQueryTimeString(alert.queryTime as QueryTime)

      let text = ``

      const clientUrl = this.configService.get('CLIENT_URL')
      const escapedProjectLink = this.telegramService.escapeTelegramMarkdown(
        `${clientUrl}/projects/${project.id}`,
      )

      if (alert.queryMetric === QueryMetric.ERRORS) {
        if (!errorDetails) {
          console.error(
            `[CRON WORKER](checkMetricAlerts) Error details not found for alert ${alert.id}`,
          )
          console.error(queryResult)
          return
        }

        const escapedErrorLink = this.telegramService.escapeTelegramMarkdown(
          `${clientUrl}/projects/${project.id}?tab=errors&eid=${errorDetails.eid}`,
        )

        const alertName = this.telegramService.escapeTelegramMarkdown(
          alert.name,
        )
        const projectName = this.telegramService.escapeTelegramMarkdown(
          project.name,
        )
        const errorName = this.telegramService.escapeTelegramMarkdown(
          errorDetails.name || 'N/A',
        )
        const errorMessage = this.telegramService.escapeTelegramMarkdown(
          errorDetails.message || 'N/A',
        )
        const filename = this.telegramService.escapeTelegramMarkdown(
          errorDetails.filename || 'N/A',
        )

        let locationInfo = 'Location: Not available'
        if (
          errorDetails.filename ||
          errorDetails.lineno !== null ||
          errorDetails.colno !== null
        ) {
          const ln =
            errorDetails.lineno !== null
              ? errorDetails.lineno.toString()
              : 'N/A'
          const cn =
            errorDetails.colno !== null ? errorDetails.colno.toString() : 'N/A'
          locationInfo = `File: ${filename}, Line: ${ln}, Col: ${cn}`
        }

        text =
          `🐞 Error alert *${alertName}* triggered!\n\n` +
          `Project: [${projectName}](${escapedProjectLink})\n` +
          `Error: \`${errorName}\`\n` +
          `Message: \`${errorMessage}\`\n\n` +
          `${locationInfo}\n\n` +
          `[View error](${escapedErrorLink})`
      } else {
        const alertName = this.telegramService.escapeTelegramMarkdown(
          alert.name,
        )
        const projectName = this.telegramService.escapeTelegramMarkdown(
          project.name,
        )

        let customEventInfo = ''
        if (
          alert.queryMetric === QueryMetric.CUSTOM_EVENTS &&
          alert.queryCustomEvent
        ) {
          customEventInfo = ` "${alert.queryCustomEvent}"`
        }

        if (
          alert.queryMetric === QueryMetric.CUSTOM_EVENTS &&
          alert.alertOnEveryCustomEvent
        ) {
          text =
            `🔔 Alert *${alertName}* triggered!\n\n` +
            `Your project [${projectName}](${escapedProjectLink}) has had *${count}${customEventInfo}* ${queryMetricString} occur in the last *${effectiveQueryTimeString}*!`
        } else {
          text =
            `🔔 Alert *${alertName}* triggered!\n\n` +
            `Your project [${projectName}](${escapedProjectLink}) has had *${count}${customEventInfo}* ${queryMetricString} in the last *${effectiveQueryTimeString}*!`
        }
      }

      if (project.admin?.isTelegramChatIdConfirmed) {
        this.telegramService.addMessage(project.admin.telegramChatId, text, {
          parse_mode: 'Markdown',
          // @ts-expect-error It's not typed
          disable_web_page_preview: true,
        })
      }

      if (project.admin?.discordWebhookUrl) {
        await this.discordService.sendWebhook(
          project.admin.discordWebhookUrl,
          text,
        )
      }

      if (project.admin?.slackWebhookUrl) {
        await this.slackService.sendWebhook(project.admin.slackWebhookUrl, text)
      }
    })

    await Promise.allSettled(promises).catch(reason => {
      this.logger.error(
        `[CRON WORKER](checkMetricAlerts) Error occured: ${reason}`,
      )
    })
  }

  @Cron('0 * * * *')
  async handleNewExtensions() {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    const newExtensions = await this.extensionsService.find({
      where: {
        createdAt: MoreThan(twoWeeksAgo),
      },
    })

    const newExtensionsPromise = _map(newExtensions, async extension => {
      if (!extension.tags.includes('New')) {
        extension.tags.push('New')
        await this.extensionsService.save(extension)
      }
    })

    await Promise.allSettled(newExtensionsPromise).catch(reason => {
      this.logger.error(
        `[CRON WORKER](handleNewExtensions) Error occured: ${reason}`,
      )
    })

    const oldExtensions = await this.extensionsService.find({
      where: {
        createdAt: LessThan(twoWeeksAgo),
        tags: Like('%New%'),
      },
    })

    const oldExtensionsPromise = _map(oldExtensions, async extension => {
      extension.tags = extension.tags.filter(tag => tag !== 'New')
      await this.extensionsService.save(extension)
    })

    await Promise.allSettled(oldExtensionsPromise).catch(reason => {
      this.logger.error(
        `[CRON WORKER](handleNewExtensions) Error occured: ${reason}`,
      )
    })
  }

  @Cron('0 * * * *')
  async handleTrendingExtensions() {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    const extensions = await this.extensionsService.find({
      where: {
        createdAt: MoreThan(twoWeeksAgo),
      },
    })

    const promises = _map(extensions, async extension => {
      const currentInstalls =
        await this.extensionsService.getExtensionInstallCount(extension.id)
      const twoWeeksBeforeInstalls =
        await this.extensionsService.getExtensionInstallCount(
          extension.id,
          twoWeeksAgo,
        )

      if (
        currentInstalls > twoWeeksBeforeInstalls * 2 &&
        currentInstalls > 0.9 * (await this.getAverageInstalls(extensions))
      ) {
        if (!extension.tags.includes('Trending')) {
          extension.tags.push('Trending')
          await this.extensionsService.save(extension)
        }
      } else if (extension.tags.includes('Trending')) {
        extension.tags = extension.tags.filter(tag => tag !== 'Trending')
        await this.extensionsService.save(extension)
      }
    })

    await Promise.allSettled(promises).catch(reason => {
      this.logger.error(
        `[CRON WORKER](handleTrendingExtensions) Error occured: ${reason}`,
      )
    })
  }

  private async getAverageInstalls(
    extensions: Extension[],
    twoWeeksAgo?: Date,
  ) {
    let totalInstalls = 0

    const promises = _map(extensions, async extension => {
      totalInstalls += await this.extensionsService.getExtensionInstallCount(
        extension.id,
        twoWeeksAgo,
      )
    })

    await Promise.allSettled(promises).catch(reason => {
      this.logger.error(
        `[CRON WORKER](getAverageInstalls) Error occured: ${reason}`,
      )
      return 0
    })

    return totalInstalls / extensions.length
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async sendTelegramMessages() {
    try {
      const messages = await this.telegramService.getMessages()

      messages.forEach(async message => {
        try {
          await this.telegramService.sendMessage(
            message.id,
            message.chatId,
            message.text,
            message.extra,
          )
        } catch (reason) {
          this.logger.error(
            `[CRON WORKER](sendTelegramMessages) Error occured while sending message: ${reason}`,
          )
        } finally {
          await this.telegramService.deleteMessage(message.id)
        }
      })
    } catch (error) {
      this.logger.error(
        `[CRON WORKER](sendTelegramMessages) Error occured: ${error}`,
      )
    }
  }

  // Disable reports for inactive users
  // Some people stop using Swetrix but keep the account (and don't disable the email reports in settings), so why keep spamming them?
  // EVERY SUNDAY AT 2:00 AM (right before we send weekly reports)
  @Cron('0 02 * * 0')
  async disableReportsForInactiveUsers() {
    const users = await this.userService.find({
      where: {
        reportFrequency: Not(UserReportFrequency.Never),
      },
      relations: ['projects'],
      select: ['id'],
    })
    const now = dayjs.utc().format('YYYY-MM-DD')
    // a bit more than 2 months ago
    const nineWeeksAgo = dayjs.utc().subtract(9, 'w').format('YYYY-MM-DD')

    const promises = _map(users, async user => {
      const { id, projects } = user

      if (_isEmpty(projects) || _isNull(projects)) {
        return
      }

      const pidsStringified = _map(projects, p => `'${p.id}'`).join(',')
      // No need to check for performance activity because it's not tracked without tracking analytics
      const queryAnalytics = `SELECT count() FROM analytics WHERE pid IN (${pidsStringified}) AND created BETWEEN '${nineWeeksAgo}' AND '${now}'`
      const queryCaptcha = `SELECT count() FROM captcha WHERE pid IN (${pidsStringified}) AND created BETWEEN '${nineWeeksAgo}' AND '${now}'`
      const queryCustomEvents = `SELECT count() FROM customEV WHERE pid IN (${pidsStringified}) AND created BETWEEN '${nineWeeksAgo}' AND '${now}'`

      const { data: analyticsResult } = await clickhouse
        .query({
          query: queryAnalytics,
        })
        .then(resultSet => resultSet.json<{ 'count()': number }>())

      if (analyticsResult[0]['count()'] > 0) {
        return
      }

      const { data: captchaResult } = await clickhouse
        .query({
          query: queryCaptcha,
        })
        .then(resultSet => resultSet.json<{ 'count()': number }>())

      if (captchaResult[0]['count()'] > 0) {
        return
      }

      const { data: customEventsResult } = await clickhouse
        .query({
          query: queryCustomEvents,
        })
        .then(resultSet => resultSet.json<{ 'count()': number }>())

      if (customEventsResult[0]['count()'] > 0) {
        return
      }

      await this.userService.update(id, {
        reportFrequency: ReportFrequency.NEVER,
      })
    })

    await Promise.allSettled(promises).catch(reason => {
      this.logger.error(
        '[CRON WORKER](disableReportsForInactiveUsers) Error occured:',
        reason,
      )
    })
  }

  // Delete old refresh tokens
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async deleteOldRefreshTokens() {
    const minDate = dayjs
      .utc()
      .subtract(JWT_REFRESH_TOKEN_LIFETIME, 's')
      .format('YYYY-MM-DD HH:mm:ss')

    const where: Record<string, unknown> = {
      created: LessThan(minDate),
    }

    await this.userService.deleteRefreshTokensWhere(where)
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_NOON)
  async payReferrers() {
    if (isDevelopment || !paypalClient) {
      return
    }

    const payoutsToProcess = await this.payoutsService.find({
      where: {
        status: PayoutStatus.processing,
      },
      relations: ['user'],
    })

    if (_isEmpty(payoutsToProcess)) {
      return
    }

    // A map of emails to pay and their amounts
    const payouts = {}

    for (let i = 0; i < _size(payoutsToProcess); ++i) {
      const key = payoutsToProcess[i].user.paypalPaymentsEmail

      if (!key) {
        continue
      }

      if (!payouts[key]) {
        payouts[key] = {
          amount: 0,
          payoutsIds: [],
        }
      }

      payouts[key].amount += _toNumber(payoutsToProcess[i].amount)
      payouts[key].payoutsIds.push(payoutsToProcess[i].id)
    }

    const requestBody = {
      sender_batch_header: {
        recipient_type: 'EMAIL',
        email_message: 'Swetrix referral program payout.',
        note: 'Swetrix referral program payout.',
      },
      items: _reduce(
        payouts,
        (acc, value: any, key) => {
          acc.push({
            recipient_type: 'EMAIL',
            amount: {
              value: value.amount.toFixed(2),
              currency: 'USD',
            },
            receiver: key,
            note: `Your Swetrix $${value.amount.toFixed(2)} payout.`,
          })

          return acc
        },
        [],
      ),
    }

    // Send the request to PayPal
    const request = new Paypal.payouts.PayoutsPostRequest()
    request.requestBody(requestBody)

    const response = await paypalClient.execute(request)

    if (response.statusCode !== 201) {
      console.error(
        `[CRON](payReferrers) An error occured while executing a request to pay referrers: ${JSON.stringify(
          response,
          null,
          2,
        )}`,
      )
      console.error(`Payouts: ${JSON.stringify(payouts, null, 2)}`)

      // Update the payouts in the DB
      await this.payoutsService.update(
        {
          where: {
            id: In(_map(payoutsToProcess, 'id')),
          },
        },
        {
          status: PayoutStatus.suspended,
        },
      )
      return
    }

    // Update the payouts in the DB
    await this.payoutsService.update(
      {
        where: {
          id: In(_map(payoutsToProcess, 'id')),
        },
      },
      {
        status: PayoutStatus.paid,
        transactionId: response.result?.batch_header?.payout_batch_id,
      },
    )
  }
}

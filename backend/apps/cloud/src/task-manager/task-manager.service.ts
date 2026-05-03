import { Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { IsNull, LessThan, Not, Between } from 'typeorm'
import { ConfigService } from '@nestjs/config'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import _isEmpty from 'lodash/isEmpty'
import _isNull from 'lodash/isNull'
import _size from 'lodash/size'
import _map from 'lodash/map'
import _find from 'lodash/find'
import _includes from 'lodash/includes'
import _toNumber from 'lodash/toNumber'
import _reduce from 'lodash/reduce'
import _filter from 'lodash/filter'

import { AlertService } from '../alert/alert.service'
import { QueryCondition, QueryMetric, QueryTime } from '../alert/dto/alert.dto'
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
import { TimeBucketType } from '../analytics/dto/getData.dto'
import { GoalService } from '../goal/goal.service'
import { Goal, GoalType, GoalMatchType } from '../goal/entity/goal.entity'
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
  SEND_WARNING_AT_PERC,
  PROJECT_INVITE_EXPIRE,
  JWT_REFRESH_TOKEN_LIFETIME,
  TRAFFIC_SPIKE_ALLOWED_PERCENTAGE,
} from '../common/constants'
import { clickhouse } from '../common/integrations/clickhouse'
import { CHPlanUsage } from './interfaces'
import {
  getRandomTip,
  isPrimaryClusterNode,
  isPrimaryNode,
} from '../common/utils'
import { AppLoggerService } from '../logger/logger.service'
import { DiscordService } from '../integrations/discord/discord.service'
import { SlackService } from '../integrations/slack/slack.service'
import { RevenueService } from '../revenue/revenue.service'
import { PaddleAdapter } from '../revenue/adapters/paddle.adapter'
import { StripeAdapter } from '../revenue/adapters/stripe.adapter'
import { ProxyDomainService } from '../project/proxy-domain.service'
import { ChannelDispatcherService } from '../notification-channel/dispatchers/channel-dispatcher.service'
import {
  TemplateRendererService,
  DEFAULT_EMAIL_SUBJECT_TEMPLATE,
} from '../notification-channel/template-renderer.service'
import {
  AlertContext,
  AlertContextErrors,
  QUERY_CONDITION_LABEL,
  QUERY_TIME_LABEL,
} from '../notification-channel/alert-context'
import { NotificationChannelType } from '../notification-channel/entity/notification-channel.entity'

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
const REPORTS_USERS_CONCURRENCY = 3
const REPORTS_PROJECTS_CONCURRENCY = 5
const NO_EVENTS_REMINDER_DELAY_DAYS = 2
const TELEGRAM_MARKDOWN_URL_KEYS = new Set(['dashboard_url', 'errors_url'])

const mapLimit = async <T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> => {
  const results: R[] = new Array(items.length)
  const concurrency = Math.max(1, Math.min(limit, items.length))
  let nextIndex = 0

  const workers = Array.from({ length: concurrency }).map(async () => {
    while (true) {
      const current = nextIndex++
      if (current >= items.length) {
        break
      }
      results[current] = await fn(items[current], current)
    }
  })

  await Promise.all(workers)
  return results
}

const generatePlanUsageQueryForUser = (): string => {
  // NOTE: keep all values parameterized to avoid injection and formatting issues.
  // Counts every billable event kind (pageview, custom_event, error, captcha)
  // in a single scan over the unified events table.
  return `
    SELECT {uid:String} AS id, count(*) AS "count"
    FROM events
    WHERE pid IN ({pids:Array(FixedString(12))})
    AND type IN ('pageview', 'custom_event', 'error', 'captcha')
    AND created BETWEEN {from:String} AND {to:String}
  `
}

const executeChunkedQueries = async (
  users: User[],
  getFromDate: (user?: User) => string,
  getToDate: (user?: User) => string,
): Promise<CHPlanUsage[]> => {
  return mapLimit(users, 5, async (user) => {
    if (_isEmpty(user.projects)) {
      return {
        id: user.id,
        count: 0,
      }
    }

    const pids = _map(user.projects, (p) => p.id)
    let totalCount = 0
    const from = getFromDate(user)
    const to = getToDate(user)

    // Process project IDs in chunks
    for (let i = 0; i < pids.length; i += CHUNK_SIZE) {
      const pidChunk = pids.slice(i, i + CHUNK_SIZE)
      const query = generatePlanUsageQueryForUser()

      const { data } = await clickhouse
        .query({
          query,
          query_params: { pids: pidChunk, uid: user.id, from, to },
        })
        .then((resultSet) => resultSet.json<CHPlanUsage>())

      totalCount += data[0]?.count || 0
    }

    return {
      id: user.id,
      count: totalCount,
    }
  })
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
  // In-memory re-entrancy guards: the verifier batches up to 200 domains at
  // a time and a single slow DNS/TLS probe can stretch a tick past the
  // 60s cron interval. Without these flags the next tick would re-fire
  // duplicate probes for everything still in flight.
  private verifyingPendingProxyDomains = false

  private recheckingLiveProxyDomains = false

  constructor(
    private readonly mailerService: MailerService,
    private readonly userService: UserService,
    private readonly analyticsService: AnalyticsService,
    private readonly projectService: ProjectService,
    private readonly actionTokensService: ActionTokensService,
    private readonly alertService: AlertService,
    private readonly logger: AppLoggerService,
    private readonly telegramService: TelegramService,
    private readonly configService: ConfigService,
    private readonly discordService: DiscordService,
    private readonly slackService: SlackService,
    private readonly saltService: SaltService,
    private readonly goalService: GoalService,
    private readonly revenueService: RevenueService,
    private readonly paddleAdapter: PaddleAdapter,
    private readonly stripeAdapter: StripeAdapter,
    private readonly proxyDomainService: ProxyDomainService,
    private readonly channelDispatcher: ChannelDispatcherService,
    private readonly templateRenderer: TemplateRendererService,
  ) {}

  // Build a rendered alert message from a raw AlertContext using the alert's
  // per-channel templates (falling back to the metric's default template).
  private renderAlertMessage(
    alert: {
      messageTemplate: string | null
      emailSubjectTemplate: string | null
      name: string
    },
    context: AlertContext,
    hasEmailChannel: boolean,
  ) {
    const template =
      alert.messageTemplate?.trim() ||
      this.templateRenderer.getDefaultTemplate(context.metric)
    const ctxRecord = context as unknown as Record<string, unknown>
    const body = this.templateRenderer.render(template, ctxRecord)
    const telegramContext = Object.fromEntries(
      Object.entries(ctxRecord).map(([key, value]) => {
        if (typeof value !== 'string' || TELEGRAM_MARKDOWN_URL_KEYS.has(key)) {
          return [key, value]
        }
        return [key, this.telegramService.escapeTelegramMarkdown(value)]
      }),
    )
    const telegramBody = this.templateRenderer.render(template, telegramContext)
    const subject = hasEmailChannel
      ? this.templateRenderer.render(
          alert.emailSubjectTemplate?.trim() || DEFAULT_EMAIL_SUBJECT_TEMPLATE,
          ctxRecord,
        )
      : alert.name
    return { body, telegramBody, subject, context: ctxRecord }
  }

  /**
   * Build goal match condition for querying conversions
   */
  private buildGoalMatchCondition(
    goal: Goal,
    paramKey: string,
  ): { condition: string; params: Record<string, string> } {
    const goalValue = (goal.value ?? '').toString()

    const params: Record<string, string> = {}
    const column = goal.type === GoalType.CUSTOM_EVENT ? 'event_name' : 'pg'
    const appendMetadataFilters = (condition: string) => {
      if (!goal.metadataFilters || goal.metadataFilters.length === 0) {
        return { condition, params }
      }

      const metaConditions: string[] = []

      goal.metadataFilters.forEach((filter, index) => {
        const keyParam = `${paramKey}_metaKey${index}`
        const valueParam = `${paramKey}_metaValue${index}`
        params[keyParam] = filter.key
        params[valueParam] = filter.value
        metaConditions.push(
          `has(meta.key, {${keyParam}:String}) AND meta.value[indexOf(meta.key, {${keyParam}:String})] = {${valueParam}:String}`,
        )
      })

      return {
        condition: `(${condition}) AND (${metaConditions.join(' AND ')})`,
        params,
      }
    }

    if (goal.matchType === GoalMatchType.EXACT) {
      params[paramKey] = goalValue
      return appendMetadataFilters(`${column} = {${paramKey}:String}`)
    }

    if (goal.matchType === GoalMatchType.CONTAINS) {
      // Avoid wildcard goals matching every row via LIKE '%%'.
      if (goalValue.trim() === '') {
        return { condition: '1=0', params: {} }
      }

      params[paramKey] = `%${goalValue}%`
      return appendMetadataFilters(`${column} ILIKE {${paramKey}:String}`)
    }

    // Regex goal
    params[paramKey] = goalValue
    return appendMetadataFilters(`match(${column}, {${paramKey}:String})`)
  }

  /**
   * Get goal conversions for a specific period (batched per table using UNION ALL).
   */
  private async getGoalsWithConversionsForReport(
    pid: string,
    projectGoals: Goal[],
    groupFrom: string,
    groupTo: string,
    totalSessions: number,
  ): Promise<
    Array<{ goalId: string; conversions: number; conversionRate: number }>
  > {
    if (_isEmpty(projectGoals)) {
      return []
    }

    const total = Number(totalSessions) || 0

    const buildUnionQuery = (
      eventType: 'pageview' | 'custom_event',
      goals: Goal[],
    ): { query: string; params: Record<string, any> } | null => {
      if (_isEmpty(goals)) {
        return null
      }

      const params: Record<string, any> = { pid, groupFrom, groupTo }
      const parts: string[] = []
      let idx = 0

      for (const goal of goals) {
        const goalIdKey = `goalId${idx}`
        const goalValueKey = `goalValue${idx}`
        const { condition, params: matchParams } = this.buildGoalMatchCondition(
          goal,
          goalValueKey,
        )

        // Skip blanks / never-matching goals
        if (condition === '1=0') {
          continue
        }

        params[goalIdKey] = goal.id
        Object.assign(params, matchParams)

        parts.push(`
          SELECT
            {${goalIdKey}:String} as goalId,
            count(*) as conversions,
            uniqExact(psid) as uniqueSessions
          FROM events
          WHERE
            pid = {pid:FixedString(12)}
            AND type = '${eventType}'
            AND ${condition}
            AND created BETWEEN {groupFrom:String} AND {groupTo:String}
        `)

        idx += 1
      }

      if (_isEmpty(parts)) {
        return null
      }

      return {
        query: parts.join('\nUNION ALL\n'),
        params,
      }
    }

    const analyticsGoals = _filter(
      projectGoals,
      (g) => g.type === GoalType.PAGEVIEW,
    )
    const customEventGoals = _filter(
      projectGoals,
      (g) => g.type === GoalType.CUSTOM_EVENT,
    )

    const analyticsQuery = buildUnionQuery('pageview', analyticsGoals)
    const customEventQuery = buildUnionQuery('custom_event', customEventGoals)

    const [analyticsRes, customEventRes] = await Promise.all([
      analyticsQuery
        ? clickhouse
            .query({
              query: analyticsQuery.query,
              query_params: analyticsQuery.params,
            })
            .then((resultSet) =>
              resultSet.json<{
                goalId: string
                conversions: any
                uniqueSessions: any
              }>(),
            )
        : Promise.resolve({ data: [] as any[] }),
      customEventQuery
        ? clickhouse
            .query({
              query: customEventQuery.query,
              query_params: customEventQuery.params,
            })
            .then((resultSet) =>
              resultSet.json<{
                goalId: string
                conversions: any
                uniqueSessions: any
              }>(),
            )
        : Promise.resolve({ data: [] as any[] }),
    ])

    const combined = [
      ...(analyticsRes.data || []),
      ...(customEventRes.data || []),
    ]
    const result: Array<{
      goalId: string
      conversions: number
      conversionRate: number
    }> = []

    for (const row of combined) {
      const conversions = Number(row.conversions) || 0
      const uniqueSessions = Number(row.uniqueSessions) || 0
      const conversionRate =
        total > 0 ? Math.round((uniqueSessions / total) * 100) : 0

      result.push({
        goalId: row.goalId,
        conversions,
        conversionRate,
      })
    }

    return result
  }

  generateUnsubscribeUrl(
    id: string,
    type: '3rdparty' | 'user-reports',
  ): string {
    if (type === '3rdparty') {
      const token = this.projectService.createUnsubscribeKey(id)
      return `${this.configService.get('CLIENT_URL')}/3rd-party-unsubscribe/${token}`
    }

    const token = this.userService.createUnsubscribeKey(id)
    return `${this.configService.get('CLIENT_URL')}/reports-unsubscribe/${token}`
  }

  async getUserEventsCountSinceSignup(userId: string): Promise<number> {
    const pids = await this.projectService.getProjectIdsByAdminId(userId)

    if (_isEmpty(pids)) {
      return 0
    }

    let totalEvents = 0

    for (let i = 0; i < pids.length; i += CHUNK_SIZE) {
      const pidChunk = pids.slice(i, i + CHUNK_SIZE)
      const query = `
        SELECT count() AS totalEvents
        FROM events
        WHERE pid IN ({pids:Array(FixedString(12))})
          AND type IN ('pageview', 'custom_event', 'error', 'captcha', 'performance')
      `

      const { data } = await clickhouse
        .query({
          query,
          query_params: { pids: pidChunk },
        })
        .then((resultSet) => resultSet.json<{ totalEvents: any }>())

      totalEvents += Number(data[0]?.totalEvents) || 0
    }

    return totalEvents
  }

  async handleUserReports(
    reportFrequency:
      | ReportFrequency.WEEKLY
      | ReportFrequency.MONTHLY
      | ReportFrequency.QUARTERLY,
  ) {
    const params = EMAIL_REPORTS_MAP[reportFrequency]

    const users = await this.userService.getReportUsers(reportFrequency)

    const now = dayjs.utc()
    const nowFormatted = now.format('DD.MM.YYYY')
    const timeAgo = dayjs
      .utc()
      // @ts-expect-error
      .subtract(...params.dayjsParams)
    const timeAgoFormatted = timeAgo.format('DD.MM.YYYY')
    const date = `${timeAgoFormatted} - ${nowFormatted}`
    const tip = getRandomTip()

    // Date range for additional queries (must match summary period + cron execution timestamp)
    const safeTimezone = this.analyticsService.getSafeTimezone(undefined)
    const { groupFrom, groupTo } = this.analyticsService.getGroupFromTo(
      '',
      '',
      TimeBucketType.DAY,
      params.analyticsParam,
      safeTimezone,
      undefined,
      false,
      now,
    )

    await mapLimit(users, REPORTS_USERS_CONCURRENCY, async (user) => {
      const { id, email, projects } = user

      try {
        const unsubscribeUrl = this.generateUnsubscribeUrl(id, 'user-reports')
        const ids = _map(projects, (p) => p.id)

        const [summary, topCountries, errorCounts, totalSessions] =
          await Promise.all([
            this.analyticsService.getAnalyticsSummary(
              ids,
              undefined,
              params.analyticsParam,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              now,
            ),
            this.analyticsService.getTopCountriesForReport(
              ids,
              groupFrom,
              groupTo,
            ),
            this.analyticsService.getErrorCountsForReport(
              ids,
              groupFrom,
              groupTo,
            ),
            this.analyticsService.getTotalSessionsForReport(
              ids,
              groupFrom,
              groupTo,
            ),
          ])

        const data = this.analyticsService.convertSummaryToReportFormat(summary)

        const projectsWithExtraData = await mapLimit(
          ids,
          REPORTS_PROJECTS_CONCURRENCY,
          async (pid, index) => {
            const projectData = data[pid] || {}
            const topCountry = topCountries[pid]?.cc || null
            const errorStats = errorCounts[pid] || { count: 0, uniqueErrors: 0 }
            const pidTotalSessions = totalSessions[pid] || 0

            const projectGoals = await this.goalService.findByProject(pid)
            const conversions = await this.getGoalsWithConversionsForReport(
              pid,
              projectGoals,
              groupFrom,
              groupTo,
              pidTotalSessions,
            )

            const conversionsById = _reduce(
              conversions,
              (acc, row) => ({ ...acc, [row.goalId]: row }),
              {},
            ) as Record<
              string,
              { goalId: string; conversions: number; conversionRate: number }
            >

            const goalsWithConversions = _map(projectGoals, (goal) => {
              const stats = conversionsById[goal.id]
              return {
                name: goal.name,
                conversions: stats?.conversions || 0,
                conversionRate: stats?.conversionRate || 0,
              }
            })

            const activeGoals = _filter(
              goalsWithConversions,
              (g) => g.conversions > 0,
            )

            return {
              data: projectData,
              name: projects[index].name,
              topCountry,
              errors:
                errorStats.count > 0
                  ? {
                      count: errorStats.count,
                      uniqueErrors: errorStats.uniqueErrors,
                    }
                  : null,
              goals: activeGoals.length > 0 ? activeGoals : null,
            }
          },
        )

        const result = {
          type: params.type,
          date,
          projects: projectsWithExtraData,
          tip,
          unsubscribeUrl,
        }

        await this.mailerService.sendEmail(
          email,
          LetterTemplate.ProjectReport,
          result,
        )
      } catch (reason) {
        this.logger.error(
          `[CRON WORKER](handleUserReports) Frequency: ${reportFrequency}; Error occured: ${reason}`,
        )
      }
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
    const now = dayjs.utc()
    const nowFormatted = now.format('DD.MM.YYYY')
    const timeAgo = dayjs
      .utc()
      // @ts-expect-error
      .subtract(...params.dayjsParams)
    const timeAgoFormatted = timeAgo.format('DD.MM.YYYY')
    const date = `${timeAgoFormatted} - ${nowFormatted}`
    const tip = getRandomTip()

    // Date range for additional queries (must match summary period + cron execution timestamp)
    const safeTimezone = this.analyticsService.getSafeTimezone(undefined)
    const { groupFrom, groupTo } = this.analyticsService.getGroupFromTo(
      '',
      '',
      TimeBucketType.DAY,
      params.analyticsParam,
      safeTimezone,
      undefined,
      false,
      now,
    )

    await mapLimit(
      subscribers,
      REPORTS_USERS_CONCURRENCY,
      async (subscriber) => {
        const { id, email } = subscriber

        try {
          const projects = await this.projectService.getSubscriberProjects(id)

          if (_isEmpty(projects)) {
            return
          }

          const unsubscribeUrl = this.generateUnsubscribeUrl(id, '3rdparty')
          const ids = projects.map((project) => project.id)

          const [summary, topCountries, errorCounts, totalSessions] =
            await Promise.all([
              this.analyticsService.getAnalyticsSummary(
                ids,
                undefined,
                params.analyticsParam,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                now,
              ),
              this.analyticsService.getTopCountriesForReport(
                ids,
                groupFrom,
                groupTo,
              ),
              this.analyticsService.getErrorCountsForReport(
                ids,
                groupFrom,
                groupTo,
              ),
              this.analyticsService.getTotalSessionsForReport(
                ids,
                groupFrom,
                groupTo,
              ),
            ])

          const data =
            this.analyticsService.convertSummaryToReportFormat(summary)

          const projectsWithExtraData = await mapLimit(
            ids,
            REPORTS_PROJECTS_CONCURRENCY,
            async (pid, index) => {
              const projectData = data[pid] || {}
              const topCountry = topCountries[pid]?.cc || null
              const errorStats = errorCounts[pid] || {
                count: 0,
                uniqueErrors: 0,
              }
              const pidTotalSessions = totalSessions[pid] || 0

              const projectGoals = await this.goalService.findByProject(pid)
              const conversions = await this.getGoalsWithConversionsForReport(
                pid,
                projectGoals,
                groupFrom,
                groupTo,
                pidTotalSessions,
              )

              const conversionsById = _reduce(
                conversions,
                (acc, row) => ({ ...acc, [row.goalId]: row }),
                {},
              ) as Record<
                string,
                { goalId: string; conversions: number; conversionRate: number }
              >

              const goalsWithConversions = _map(projectGoals, (goal) => {
                const stats = conversionsById[goal.id]
                return {
                  name: goal.name,
                  conversions: stats?.conversions || 0,
                  conversionRate: stats?.conversionRate || 0,
                }
              })

              const activeGoals = _filter(
                goalsWithConversions,
                (g) => g.conversions > 0,
              )

              return {
                data: projectData,
                name: projects[index].name,
                topCountry,
                errors:
                  errorStats.count > 0
                    ? {
                        count: errorStats.count,
                        uniqueErrors: errorStats.uniqueErrors,
                      }
                    : null,
                goals: activeGoals.length > 0 ? activeGoals : null,
              }
            },
          )

          const result = {
            type: params.type,
            date,
            projects: projectsWithExtraData,
            tip,
            unsubscribeUrl,
          }

          await this.mailerService.sendEmail(
            email,
            LetterTemplate.ProjectReport,
            result,
          )
        } catch (reason) {
          this.logger.error(
            `[CRON WORKER](handleSubscriberReports) Frequency: ${reportFrequency}; Error: ${reason}`,
          )
        }
      },
    )
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
      (user) =>
        dayjs.utc(user.planExceedContactedAt).format('YYYY-MM-01 00:00:00'),
      (user) =>
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
          billingUrl: 'https://swetrix.com/user-settings?tab=billing',
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
    ).catch((reason) => {
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
      const percExceedingUsagePromises = _map(exceedingUsers, async (user) => {
        const { id, email, usage, planCode } = user

        const suggestedPlanLimit = getNextPlan(planCode)

        const data = {
          user,
          hitPercentageLimit: true,
          upgradePeriodDays: 7,
          thisMonthUsage: usage,
          percentageLimit: TRAFFIC_SPIKE_ALLOWED_PERCENTAGE * 100,
          billingUrl: 'https://swetrix.com/user-settings?tab=billing',
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

      await Promise.allSettled(percExceedingUsagePromises).catch((reason) => {
        this.logger.error(
          `[CRON WORKER](checkPlanUsage - percExceedingUsagePromises) Error occured: ${reason}`,
        )
      })
    }

    const filteredUsers = _filter(
      users,
      (user) =>
        !_find(exceedingUsers, (exceedingUser) => exceedingUser.id === user.id),
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
        async (user) => {
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
            billingUrl: 'https://swetrix.com/user-settings?tab=billing',
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
        (reason) => {
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
      select: ['id', 'email', 'planCode'],
    })
    const emailParams = {
      amount: SEND_WARNING_AT_PERC,
      url: 'https://swetrix.com/user-settings?tab=billing',
    }

    const promises = _map(users, async (user) => {
      const { id, email, planCode } = user

      const hasProjects = (await this.projectService.countByAdminId(id)) > 0

      if (!hasProjects) {
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

    await Promise.allSettled(promises).catch((reason) => {
      this.logger.error(
        `[CRON WORKER](checkLeftEvents) Error occured: ${reason}`,
      )
    })
  }

  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async remindUsersWithoutEventsAfterSignup() {
    const weekAgo = dayjs.utc().subtract(1, 'week').toDate()
    const twoDaysAgo = dayjs
      .utc()
      .subtract(NO_EVENTS_REMINDER_DELAY_DAYS, 'days')
      .toDate()
    const users = await this.userService.find({
      where: {
        isActive: true,
        planCode: Not(PlanCode.none),
        created: Between(weekAgo, twoDaysAgo),
        noEventsReminderSentOn: IsNull(),
      },
      select: ['id', 'email'],
    })

    if (_isEmpty(users)) {
      return
    }

    const dashboardUrl = `${this.configService.get('CLIENT_URL')}/dashboard`
    const setupGuideUrl = 'https://swetrix.com/docs/install-script'
    const sentOn = dayjs.utc().format('YYYY-MM-DD HH:mm:ss')

    await mapLimit(users, REPORTS_USERS_CONCURRENCY, async (user) => {
      try {
        const hasProjects =
          (await this.projectService.countByAdminId(user.id)) > 0

        if (!hasProjects) {
          return
        }

        const totalEvents = await this.getUserEventsCountSinceSignup(user.id)

        if (totalEvents > 0) {
          return
        }

        await this.mailerService.sendEmail(
          user.email,
          LetterTemplate.NoEventsAfterSignup,
          {
            dashboardUrl,
            setupGuideUrl,
          },
        )
        await this.userService.update(user.id, {
          noEventsReminderSentOn: sentOn,
        })
      } catch (reason) {
        this.logger.error(
          `[CRON WORKER](remindUsersWithoutEventsAfterSignup) Failed to process user ${user.id}: ${reason}`,
        )
      }
    })
  }

  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async remindUsersToSubscribe() {
    const weekAgo = dayjs.utc().subtract(1, 'week').toDate()
    const twoDaysAgo = dayjs
      .utc()
      .subtract(NO_EVENTS_REMINDER_DELAY_DAYS, 'days')
      .toDate()

    const users = await this.userService.find({
      where: {
        isActive: true,
        planCode: PlanCode.none,
        hasCompletedOnboarding: true,
        created: Between(weekAgo, twoDaysAgo),
        subscribeReminderSentOn: IsNull(),
      },
      select: ['id', 'email'],
    })

    if (_isEmpty(users)) {
      return
    }

    const subscribeUrl = `${this.configService.get('CLIENT_URL')}/subscribe`
    const sentOn = dayjs.utc().format('YYYY-MM-DD HH:mm:ss')

    await mapLimit(users, REPORTS_USERS_CONCURRENCY, async (user) => {
      try {
        await this.mailerService.sendEmail(
          user.email,
          LetterTemplate.SubscribeReminder,
          { subscribeUrl },
        )
        await this.userService.update(user.id, {
          subscribeReminderSentOn: sentOn,
        })
      } catch (reason) {
        this.logger.error(
          `[CRON WORKER](remindUsersToSubscribe) Failed to process user ${user.id}: ${reason}`,
        )
      }
    })
  }

  @Cron(CronExpression.EVERY_2_HOURS)
  async deleteOldShareInvitations() {
    const minDate = dayjs.utc().subtract(PROJECT_INVITE_EXPIRE, 'h').toDate()
    await this.actionTokensService.deleteMultiple({
      action: ActionTokenType.PROJECT_SHARE,
      created: LessThan(minDate),
    })
    await this.projectService.deleteMultipleShare({
      confirmed: false,
      created: LessThan(minDate),
    })
  }

  @Cron(CronExpression.EVERY_HOUR)
  async regenerateGlobalSalts() {
    await this.saltService.regenerateExpiredSalts()
  }

  // Sync revenue data from payment providers every 30 minutes
  @Cron(CronExpression.EVERY_30_MINUTES)
  async syncRevenueData() {
    // Find all projects with Paddle or Stripe connected
    const projects = await this.projectService.find({
      where: [
        {
          paddleApiKeyEnc: Not(IsNull()),
          admin: {
            planCode: Not(PlanCode.none),
            dashboardBlockReason: IsNull(),
          },
        },
        {
          stripeApiKeyEnc: Not(IsNull()),
          admin: {
            planCode: Not(PlanCode.none),
            dashboardBlockReason: IsNull(),
          },
        },
      ],
      select: [
        'id',
        'paddleApiKeyEnc',
        'stripeApiKeyEnc',
        'revenueCurrency',
        'revenueLastSyncAt',
      ],
    })

    if (_isEmpty(projects)) {
      return
    }

    const promises = _map(projects, async (project) => {
      try {
        if (project.paddleApiKeyEnc) {
          const apiKey = this.revenueService.getPaddleApiKey(project)
          if (!apiKey) {
            this.logger.warn(
              `[CRON WORKER](syncRevenueData) Failed to decrypt Paddle API key for project ${project.id}`,
            )
            return
          }

          await this.paddleAdapter.syncTransactions(
            project.id,
            apiKey,
            project.revenueCurrency || 'USD',
            project.revenueLastSyncAt || undefined,
          )
        } else if (project.stripeApiKeyEnc) {
          const apiKey = this.revenueService.getStripeApiKey(project)
          if (!apiKey) {
            this.logger.warn(
              `[CRON WORKER](syncRevenueData) Failed to decrypt Stripe API key for project ${project.id}`,
            )
            return
          }

          await this.stripeAdapter.syncTransactions(
            project.id,
            apiKey,
            project.revenueCurrency || 'USD',
            project.revenueLastSyncAt || undefined,
          )
        }

        await this.revenueService.updateLastSyncAt(project.id)
      } catch (error) {
        this.logger.error(
          `[CRON WORKER](syncRevenueData) Error syncing project ${project.id}: ${error}`,
        )
      }
    })

    await Promise.allSettled(promises).catch((reason) => {
      this.logger.error(
        `[CRON WORKER](syncRevenueData) Error occured: ${reason}`,
      )
    })
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

  @Cron(CronExpression.EVERY_30_MINUTES)
  async checkIsTelegramChatIdConfirmed() {
    const users = await this.userService.find({
      where: {
        isTelegramChatIdConfirmed: false,
      },
      select: ['id', 'telegramChatId'],
    })

    const promises = _map(users, async (user) => {
      const { id } = user

      await this.userService.update(id, {
        telegramChatId: null,
      })
    })

    await Promise.allSettled(promises).catch((reason) => {
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
      select: ['id', 'cancellationEffectiveDate'],
    })

    const promises = _map(users, async (user) => {
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

    await Promise.allSettled(promises).catch((reason) => {
      this.logger.error(
        `[CRON WORKER](cleanUpUnpaidSubUsers) Error occured: ${reason}`,
      )
    })
  }

  @Cron(CronExpression.EVERY_4_HOURS)
  async trialReminder() {
    const users = await this.userService.find({
      where: {
        planCode: Not(PlanCode.none),
        trialEndDate: Between(
          new Date(),
          new Date(new Date().getTime() + 48 * 60 * 60 * 1000),
        ),
        trialReminderSent: false,
      },
      select: ['id', 'email', 'cancellationEffectiveDate'],
    })

    const promises = _map(users, async (user) => {
      const { id, email, cancellationEffectiveDate } = user

      await this.userService.update(id, {
        trialReminderSent: true,
      })

      const template = cancellationEffectiveDate
        ? LetterTemplate.TrialEndingCancelled
        : LetterTemplate.TrialEndsTomorrow

      await this.mailerService.sendEmail(email, template, {
        url: 'https://swetrix.com/user-settings?tab=billing',
      })
    })

    await Promise.allSettled(promises).catch((reason) => {
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
      select: ['id', 'created'],
    })

    const promises = _map(users, async (user) => {
      const { id, created } = user

      await this.userService.update(id, {
        trialEndDate: new Date(
          new Date(created).getTime() + TRIAL_DURATION * 24 * 60 * 60 * 1000,
        ),
      })
    })

    await Promise.allSettled(promises).catch((reason) => {
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
      select: ['id', 'email'],
    })

    const promises = _map(users, async (user) => {
      const { id, email } = user

      await this.userService.update(id, {
        planCode: PlanCode.none,
        dashboardBlockReason: DashboardBlockReason.trial_ended,
        // trialEndDate: null,
      })
      await this.mailerService.sendEmail(email, LetterTemplate.TrialExpired, {
        url: 'https://swetrix.com/user-settings?tab=billing',
      })
      await this.projectService.clearProjectsRedisCache(id)
    })

    await Promise.allSettled(promises).catch((reason) => {
      this.logger.error(`[CRON WORKER](trialEnd) Error occured: ${reason}`)
    })
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkOnlineUsersAlerts() {
    // Pull all online_users alerts on active accounts. Channel verification is
    // enforced per-channel by the dispatcher (skip unverified/unsubscribed).
    const alerts = await this.alertService.find({
      where: {
        active: true,
        queryMetric: QueryMetric.ONLINE_USERS,
        project: {
          admin: {
            planCode: Not(PlanCode.none),
            dashboardBlockReason: IsNull(),
          },
        },
      },
      relations: ['project', 'project.admin', 'channels'],
    })

    const promises = _map(alerts, async (alert) => {
      try {
        const project = alert.project
        if (!project) return
        if (!alert.channels || alert.channels.length === 0) return

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

        if (
          !checkQueryCondition(online, alert.queryValue, alert.queryCondition)
        ) {
          return
        }

        // @ts-expect-error TypeORM typing for partial update
        await this.alertService.update(alert.id, { lastTriggered: new Date() })

        const clientUrl =
          this.configService.get<string>('CLIENT_URL') || 'https://swetrix.com'
        const context: AlertContext = {
          alert_name: alert.name,
          project_name: project.name,
          project_id: project.id,
          dashboard_url: `${clientUrl}/projects/${project.id}`,
          metric: QueryMetric.ONLINE_USERS,
          value: online,
          threshold: alert.queryValue,
          condition: QUERY_CONDITION_LABEL[alert.queryCondition] || null,
          time_window: 'now',
          online_count: online,
        } as AlertContext

        const hasEmail = alert.channels.some(
          (c) => c.type === NotificationChannelType.EMAIL,
        )
        const message = this.renderAlertMessage(alert, context, hasEmail)
        await this.channelDispatcher.dispatch(alert.channels, message)
      } catch (reason) {
        this.logger.error(
          `[CRON WORKER](checkOnlineUsersAlerts) Failed to process alert ${alert.id}: ${reason}`,
        )
      }
    })

    const results = await Promise.allSettled(promises)
    for (const r of results) {
      if (r.status === 'rejected') {
        this.logger.error(
          `[CRON WORKER](checkOnlineUsersAlerts) Alert promise rejected: ${r.reason}`,
        )
      }
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkMetricAlerts() {
    const CRON_INTERVAL_SECONDS = 300

    const alerts = await this.alertService.find({
      where: {
        active: true,
        queryMetric: Not(QueryMetric.ONLINE_USERS),
        project: {
          admin: {
            planCode: Not(PlanCode.none),
            dashboardBlockReason: IsNull(),
          },
        },
      },
      relations: ['project', 'project.admin', 'channels'],
    })

    const promises = _map(alerts, async (alert) => {
      try {
        const project = alert.project
        if (!project) return
        if (!alert.channels || alert.channels.length === 0) return

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
            nowUnix -
            dayjs.utc().subtract(CRON_INTERVAL_SECONDS, 'second').unix()
        }

        const subtractSecondsTimeframeRaw =
          alert.queryMetric === QueryMetric.ERRORS ||
          (alert.queryMetric === QueryMetric.CUSTOM_EVENTS &&
            alert.alertOnEveryCustomEvent)
            ? lastEventSubtractSeconds
            : getQueryTime(alert.queryTime as QueryTime)
        const subtractSecondsTimeframe = Number.isFinite(
          subtractSecondsTimeframeRaw,
        )
          ? Math.max(0, Math.floor(subtractSecondsTimeframeRaw))
          : CRON_INTERVAL_SECONDS

        if (alert.queryMetric === QueryMetric.ERRORS) {
          if (alert.alertOnNewErrorsOnly) {
            query = `
            SELECT
              count()
            FROM (
              SELECT eid, min(created) as first_seen
              FROM events
              WHERE pid = {pid:FixedString(12)} AND type = 'error'
              GROUP BY eid
            )
            WHERE first_seen >= now() - ${subtractSecondsTimeframe}
          `
          } else {
            query = `
            SELECT
              count()
            FROM events
            WHERE
              pid = {pid:FixedString(12)}
              AND type = 'error'
              AND created >= now() - ${subtractSecondsTimeframe}
          `
          }
        } else if (alert.queryMetric === QueryMetric.CUSTOM_EVENTS) {
          query = `
          SELECT
            count()
          FROM events
          WHERE
            pid = {pid:FixedString(12)}
            AND type = 'custom_event'
            AND event_name = {ev:String}
            AND created >= now() - ${subtractSecondsTimeframe}
        `
          queryParams.ev = alert.queryCustomEvent
        } else {
          const isUnique = alert.queryMetric === QueryMetric.UNIQUE_PAGE_VIEWS
          query = `
          SELECT
            count(${isUnique ? 'DISTINCT psid' : '*'})
          FROM events
          WHERE
            pid = {pid:FixedString(12)}
            AND type = 'pageview'
            AND created >= now() - ${subtractSecondsTimeframe}
        `
        }

        const { data: queryResult } = await clickhouse
          .query({
            query,
            query_params: queryParams,
          })
          .then((resultSet) => resultSet.json())

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
            SELECT eid, error_name AS name, error_message AS message, lineno, colno, error_filename AS filename
            FROM events
            WHERE pid = {pid:FixedString(12)} AND type = 'error' AND eid IN (
              SELECT eid
              FROM (
                SELECT eid, min(created) AS first_seen_for_eid
                FROM events
                WHERE pid = {pid:FixedString(12)} AND type = 'error'
                GROUP BY eid
              )
              WHERE first_seen_for_eid >= now() - ${subtractSecondsTimeframe}
            )
            ORDER BY created DESC
            LIMIT 1
          `
          } else {
            detailQuery = `
            SELECT eid, error_name AS name, error_message AS message, lineno, colno, error_filename AS filename
            FROM events
            WHERE
              pid = {pid:FixedString(12)}
              AND type = 'error'
              AND created >= now() - ${subtractSecondsTimeframe}
            ORDER BY created DESC
            LIMIT 1
          `
          }
          try {
            const { data: errorDetailResult } = await clickhouse
              .query({ query: detailQuery, query_params: detailQueryParams })
              .then((resultSet) => resultSet.json())
            if (errorDetailResult && errorDetailResult.length > 0) {
              errorDetails = errorDetailResult[0] as typeof errorDetails
            }
          } catch (reason) {
            this.logger.error(
              `[CRON WORKER](checkMetricAlerts) Error fetching error details: ${reason}`,
            )
          }
        }

        const effectiveQueryTimeString =
          alert.queryMetric === QueryMetric.ERRORS
            ? `${CRON_INTERVAL_SECONDS / 60} minutes`
            : alert.queryMetric === QueryMetric.CUSTOM_EVENTS &&
                alert.alertOnEveryCustomEvent
              ? `${CRON_INTERVAL_SECONDS / 60} minutes`
              : QUERY_TIME_LABEL[alert.queryTime as QueryTime] ||
                getQueryTimeString(alert.queryTime as QueryTime)

        const clientUrl =
          this.configService.get<string>('CLIENT_URL') || 'https://swetrix.com'
        const dashboardUrl = `${clientUrl}/projects/${project.id}`

        if (alert.queryMetric === QueryMetric.ERRORS && !errorDetails) {
          this.logger.warn(
            `[CRON WORKER](checkMetricAlerts) Error details not found for alert ${alert.id}`,
          )
        }

        let context: AlertContext

        if (alert.queryMetric === QueryMetric.ERRORS) {
          const errors_url = errorDetails?.eid
            ? `${dashboardUrl}?tab=errors&eid=${errorDetails.eid}`
            : `${dashboardUrl}?tab=errors`
          context = {
            alert_name: alert.name,
            project_name: project.name,
            project_id: project.id,
            dashboard_url: dashboardUrl,
            metric: QueryMetric.ERRORS,
            value: count,
            threshold: null,
            condition: null,
            time_window: effectiveQueryTimeString,
            error_count: count,
            error_message: errorDetails?.message || '',
            error_name: errorDetails?.name || '',
            errors_url,
            is_new_only: !!alert.alertOnNewErrorsOnly,
          } as AlertContextErrors
        } else if (alert.queryMetric === QueryMetric.CUSTOM_EVENTS) {
          context = {
            alert_name: alert.name,
            project_name: project.name,
            project_id: project.id,
            dashboard_url: dashboardUrl,
            metric: QueryMetric.CUSTOM_EVENTS,
            value: count,
            threshold: alert.queryValue ?? null,
            condition: alert.queryCondition
              ? QUERY_CONDITION_LABEL[alert.queryCondition]
              : null,
            time_window: effectiveQueryTimeString,
            event_name: alert.queryCustomEvent || '',
            event_count: count,
            every_event_mode: !!alert.alertOnEveryCustomEvent,
          } as AlertContext
        } else {
          const isUnique = alert.queryMetric === QueryMetric.UNIQUE_PAGE_VIEWS
          context = {
            alert_name: alert.name,
            project_name: project.name,
            project_id: project.id,
            dashboard_url: dashboardUrl,
            metric: alert.queryMetric,
            value: count,
            threshold: alert.queryValue ?? null,
            condition: alert.queryCondition
              ? QUERY_CONDITION_LABEL[alert.queryCondition]
              : null,
            time_window: effectiveQueryTimeString,
            ...(isUnique ? { unique_views: count } : { views: count }),
          } as AlertContext
        }

        const hasEmail = alert.channels.some(
          (c) => c.type === NotificationChannelType.EMAIL,
        )
        // @ts-expect-error TypeORM typing for partial update
        await this.alertService.update(alert.id, {
          lastTriggered: new Date(),
        })

        const message = this.renderAlertMessage(alert, context, hasEmail)
        await this.channelDispatcher.dispatch(alert.channels, message)
      } catch (reason) {
        this.logger.error(
          `[CRON WORKER](checkMetricAlerts) Failed to process alert ${alert.id}: ${reason}`,
        )
      }
    })

    const results = await Promise.allSettled(promises)
    for (const r of results) {
      if (r.status === 'rejected') {
        this.logger.error(
          `[CRON WORKER](checkMetricAlerts) Alert promise rejected: ${r.reason}`,
        )
      }
    }
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async sendTelegramMessages() {
    try {
      // Only one instance should process Telegram message queue; otherwise messages
      // may be deleted by nodes that don't have the bot launched.
      if (!(isPrimaryNode() && isPrimaryClusterNode())) {
        return
      }

      const messages = await this.telegramService.getMessages()

      const promises = messages.map(async (message) => {
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

      await Promise.allSettled(promises)
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
      select: ['id'],
    })
    const now = dayjs.utc().format('YYYY-MM-DD HH:mm:ss')
    // a bit more than 2 months ago
    const nineWeeksAgo = dayjs
      .utc()
      .subtract(9, 'w')
      .format('YYYY-MM-DD HH:mm:ss')

    await mapLimit(users, REPORTS_USERS_CONCURRENCY, async (user) => {
      const { id } = user

      try {
        const pids = await this.projectService.getProjectIdsByAdminId(id)

        if (_isEmpty(pids)) {
          return
        }

        const queryEvents = `SELECT count() FROM events WHERE pid IN ({pids:Array(FixedString(12))}) AND type IN ('pageview', 'captcha', 'custom_event', 'error', 'performance') AND created BETWEEN {nineWeeksAgo:String} AND {now:String}`

        // Process project IDs in chunks to avoid ClickHouse field value limit
        let totalEvents = 0

        for (let i = 0; i < pids.length; i += CHUNK_SIZE) {
          const pidChunk = pids.slice(i, i + CHUNK_SIZE)
          const queryParams = {
            pids: pidChunk,
            nineWeeksAgo,
            now,
          }

          const { data: eventsResult } = await clickhouse
            .query({
              query: queryEvents,
              query_params: queryParams,
            })
            .then((resultSet) => resultSet.json<{ 'count()': number }>())

          totalEvents += eventsResult[0]['count()']

          // Early return if we found activity
          if (totalEvents > 0) {
            return
          }
        }

        await this.userService.update(id, {
          reportFrequency: ReportFrequency.NEVER,
        })
      } catch (reason) {
        this.logger.error(
          '[CRON WORKER](disableReportsForInactiveUsers) Error occured:',
          reason,
        )
      }
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

  // Verify managed reverse proxy domains: resolve CNAME -> probe TLS to advance
  // the row's status (waiting -> issuing -> live).
  @Cron(CronExpression.EVERY_MINUTE)
  async verifyPendingProxyDomains() {
    if (!isPrimaryNode()) {
      return
    }

    if (this.verifyingPendingProxyDomains) {
      return
    }
    this.verifyingPendingProxyDomains = true

    try {
      const pending =
        await this.proxyDomainService.findPendingForVerification(200)

      if (_isEmpty(pending)) {
        return
      }

      await mapLimit(pending, 8, async (domain) => {
        try {
          await this.proxyDomainService.verifyDomain(domain)
        } catch (err) {
          this.logger.error(
            `[CRON WORKER](verifyPendingProxyDomains) ${domain.hostname}: ${err}`,
          )
        }
      })
    } catch (err) {
      this.logger.error(
        `[CRON WORKER](verifyPendingProxyDomains) Error: ${err}`,
      )
    } finally {
      this.verifyingPendingProxyDomains = false
    }
  }

  // Periodically re-check live domains so we notice when DNS / cert breaks
  // (e.g. user removed the CNAME or revoked the cert).
  @Cron(CronExpression.EVERY_6_HOURS)
  async recheckLiveProxyDomains() {
    if (!isPrimaryNode()) {
      return
    }

    if (this.recheckingLiveProxyDomains) {
      return
    }
    this.recheckingLiveProxyDomains = true

    try {
      const cutoff = dayjs.utc().subtract(6, 'hour').toDate()
      const domains = await this.proxyDomainService.findLiveForRecheck(
        cutoff,
        500,
      )

      if (_isEmpty(domains)) {
        return
      }

      await mapLimit(domains, 8, async (domain) => {
        try {
          await this.proxyDomainService.verifyDomain(domain)
        } catch (err) {
          this.logger.error(
            `[CRON WORKER](recheckLiveProxyDomains) ${domain.hostname}: ${err}`,
          )
        }
      })
    } catch (err) {
      this.logger.error(`[CRON WORKER](recheckLiveProxyDomains) Error: ${err}`)
    } finally {
      this.recheckingLiveProxyDomains = false
    }
  }
}

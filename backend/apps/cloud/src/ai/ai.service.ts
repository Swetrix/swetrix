import { Injectable } from '@nestjs/common'
import { createOpenAI } from '@ai-sdk/openai'
import { streamText, tool, CoreMessage } from 'ai'
import { z } from 'zod'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import _pick from 'lodash/pick'
import dayjs from 'dayjs'

import { ProjectService } from '../project/project.service'
import {
  AnalyticsService,
  getLowestPossibleTimeBucket,
} from '../analytics/analytics.service'
import { GoalService } from '../goal/goal.service'
import { AppLoggerService } from '../logger/logger.service'
import { clickhouse } from '../common/integrations/clickhouse'
import { Project } from '../project/entity/project.entity'
import { TimeBucketType } from '../analytics/dto/getData.dto'

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

@Injectable()
export class AiService {
  private openrouter: ReturnType<typeof createOpenAI>

  constructor(
    private readonly projectService: ProjectService,
    private readonly analyticsService: AnalyticsService,
    private readonly goalService: GoalService,
    private readonly logger: AppLoggerService,
  ) {
    this.openrouter = createOpenAI({
      baseURL: OPENROUTER_BASE_URL,
      apiKey: process.env.OPENROUTER_API_KEY,
    })
  }

  async chat(
    project: Project,
    messages: CoreMessage[],
    timezone: string = 'UTC',
  ) {
    const systemPrompt = this.buildSystemPrompt(project, timezone)

    const result = streamText({
      model: this.openrouter('openai/gpt-oss-120b'),
      system: systemPrompt,
      messages,
      tools: this.buildTools(project, timezone),
      maxSteps: 10,
    })

    return result
  }

  private buildSystemPrompt(project: Project, timezone: string): string {
    const currentDate = dayjs().tz(timezone).format('YYYY-MM-DD HH:mm:ss')

    return `You are an AI assistant for Swetrix, a privacy-focused web analytics platform. You help users understand their website analytics data.

Current context:
- Project: "${project.name}" (ID: ${project.id})
- Current date/time: ${currentDate} (timezone: ${timezone})

You have access to tools that can query analytics data for this project. Use them to answer user questions about:
- Traffic and pageviews
- Visitors and sessions
- Performance metrics
- Custom events
- Goals and conversions
- Errors
- Geographic data
- Device and browser statistics
- Referrer sources

Guidelines:
1. Always use tools to fetch real data before answering questions about analytics
2. When presenting data, be clear and concise
3. If the user asks for charts or visualizations, include a chart in your response using the special JSON format
4. Use appropriate time periods based on context (default to last 7 days if not specified)
5. Round percentages and large numbers for readability
6. Explain trends and provide actionable insights when relevant

To include a chart in your response, use this exact JSON format on its own line:
{"type":"chart","chartType":"line","title":"Chart Title","data":{"x":["2024-01-01","2024-01-02"],"pageviews":[100,150],"visitors":[80,120]}}

Supported chart types: "line", "bar", "area"
The data object should have "x" for x-axis labels and named arrays for each series.`
  }

  private buildTools(project: Project, timezone: string) {
    return {
      getProjectInfo: tool({
        description:
          'Get basic information about the current project including name, settings, and available funnels/goals',
        parameters: z.object({}),
        execute: async () => {
          return this.getProjectInfo(project)
        },
      }),

      getData: tool({
        description: `Query analytics data for the project. Returns chart data and panel breakdowns (top pages, countries, browsers, etc.).
        
Available columns for filters:
- pg: page path
- cc: country code (2-letter ISO)
- rg: region
- ct: city
- br: browser name
- os: operating system
- dv: device type (desktop, mobile, tablet)
- ref: referrer
- so: source
- me: medium
- ca: campaign
- lc: locale/language
- host: hostname`,
        parameters: z.object({
          dataType: z
            .enum(['analytics', 'performance', 'captcha', 'errors'])
            .describe('Type of data to query'),
          period: z
            .string()
            .optional()
            .describe(
              'Time period: 1h, today, yesterday, 1d, 7d, 4w, 3M, 12M, 24M',
            ),
          from: z
            .string()
            .optional()
            .describe('Start date (YYYY-MM-DD format)'),
          to: z.string().optional().describe('End date (YYYY-MM-DD format)'),
          timeBucket: z
            .enum(['minute', 'hour', 'day', 'month'])
            .optional()
            .describe('Time bucket for chart aggregation'),
          filters: z
            .array(
              z.object({
                column: z.string().describe('Column to filter'),
                filter: z.string().describe('Filter value'),
                isExclusive: z
                  .boolean()
                  .optional()
                  .describe('If true, exclude this value'),
              }),
            )
            .optional()
            .describe('Filters to apply'),
          measure: z
            .enum(['average', 'median', 'p95'])
            .optional()
            .describe('Measure type for performance data'),
        }),
        execute: async params => {
          if (!params.dataType) {
            return { error: 'dataType is required' }
          }
          return this.getData(
            project.id,
            { ...params, dataType: params.dataType },
            timezone,
          )
        },
      }),

      getGoalStats: tool({
        description:
          'Get goal conversion statistics including conversions, conversion rate, and trends',
        parameters: z.object({
          goalId: z
            .string()
            .optional()
            .describe('Specific goal ID, or omit to get all goals'),
          period: z.string().optional().describe('Time period (default: 7d)'),
          from: z
            .string()
            .optional()
            .describe('Start date (YYYY-MM-DD format)'),
          to: z.string().optional().describe('End date (YYYY-MM-DD format)'),
        }),
        execute: async params => {
          return this.getGoalStats(project.id, params, timezone)
        },
      }),

      getFunnelData: tool({
        description:
          'Get funnel analysis data showing step-by-step conversions',
        parameters: z.object({
          funnelId: z.string().describe('Funnel ID to query'),
          period: z.string().optional().describe('Time period (default: 7d)'),
          from: z
            .string()
            .optional()
            .describe('Start date (YYYY-MM-DD format)'),
          to: z.string().optional().describe('End date (YYYY-MM-DD format)'),
        }),
        execute: async params => {
          if (!params.funnelId) {
            return { error: 'funnelId is required' }
          }
          return this.getFunnelData(
            project.id,
            { ...params, funnelId: params.funnelId },
            timezone,
          )
        },
      }),
    }
  }

  private async getProjectInfo(project: Project) {
    // Get funnels
    const funnels = await this.projectService.getFunnels(project.id)

    // Get goals
    const goals = await this.goalService.find({
      where: { project: { id: project.id }, active: true },
      order: { name: 'ASC' },
    })

    return {
      id: project.id,
      name: project.name,
      created: project.created,
      isAnalyticsProject: project.isAnalyticsProject,
      captchaEnabled: !!project.captchaSecretKey,
      funnels: _map(funnels, f => ({ id: f.id, name: f.name, steps: f.steps })),
      goals: _map(goals, g => ({
        id: g.id,
        name: g.name,
        type: g.type,
        value: g.value,
      })),
    }
  }

  private async getData(
    pid: string,
    params: {
      dataType: 'analytics' | 'performance' | 'captcha' | 'errors'
      period?: string
      from?: string
      to?: string
      timeBucket?: string
      filters?: Array<{
        column?: string
        filter?: string
        isExclusive?: boolean
      }>
      measure?: 'average' | 'median' | 'p95'
    },
    timezone: string,
  ) {
    const {
      dataType,
      period = '7d',
      from,
      to,
      timeBucket: requestedTimeBucket,
      filters: rawFilters = [],
      measure = 'median',
    } = params

    // Filter out invalid filter entries
    const filters = rawFilters.filter(
      (f): f is { column: string; filter: string; isExclusive?: boolean } =>
        typeof f.column === 'string' && typeof f.filter === 'string',
    )

    try {
      const safeTimezone = this.analyticsService.getSafeTimezone(timezone)
      const timeBucket =
        (requestedTimeBucket as TimeBucketType) ||
        getLowestPossibleTimeBucket(period, from, to)

      const { groupFromUTC, groupToUTC } = this.analyticsService.getGroupFromTo(
        from,
        to,
        timeBucket,
        period,
        safeTimezone,
      )

      if (dataType === 'analytics') {
        return this.getAnalyticsData(
          pid,
          groupFromUTC,
          groupToUTC,
          timeBucket,
          safeTimezone,
          filters,
        )
      }

      if (dataType === 'performance') {
        return this.getPerformanceData(
          pid,
          groupFromUTC,
          groupToUTC,
          timeBucket,
          safeTimezone,
          filters,
          measure,
        )
      }

      if (dataType === 'errors') {
        return this.getErrorsData(pid, groupFromUTC, groupToUTC, safeTimezone)
      }

      return { error: 'Unsupported data type' }
    } catch (error) {
      this.logger.error({ error, pid, params }, 'Error fetching data for AI')
      return { error: 'Failed to fetch data' }
    }
  }

  private async getAnalyticsData(
    pid: string,
    groupFrom: string,
    groupTo: string,
    timeBucket: TimeBucketType,
    timezone: string,
    filters: Array<{
      column: string
      filter: string
      isExclusive?: boolean
    }>,
  ) {
    const filterConditions = this.buildFilterConditions(filters)

    // Get overall stats
    const overallQuery = `
      SELECT
        count(*) as pageviews,
        uniqExact(psid) as sessions,
        uniqExact(uid) as visitors,
        countIf(unique = 1) as uniquePageviews,
        round(avg(sdur), 2) as avgSessionDuration,
        round(countIf(unique = 1 AND sdur <= 0) * 100.0 / nullIf(countIf(unique = 1), 0), 2) as bounceRate
      FROM analytics
      WHERE pid = {pid:FixedString(12)}
        AND created BETWEEN {groupFrom:String} AND {groupTo:String}
        ${filterConditions.where}
    `

    const { data: overallData } = await clickhouse
      .query({
        query: overallQuery,
        query_params: {
          pid,
          groupFrom,
          groupTo,
          ...filterConditions.params,
        },
      })
      .then(r => r.json())

    // Get chart data
    const chartQuery = `
      SELECT
        ${this.getTimeBucketSelect(timeBucket, timezone)} as date,
        count(*) as pageviews,
        uniqExact(psid) as sessions,
        uniqExact(uid) as visitors
      FROM analytics
      WHERE pid = {pid:FixedString(12)}
        AND created BETWEEN {groupFrom:String} AND {groupTo:String}
        ${filterConditions.where}
      GROUP BY date
      ORDER BY date
    `

    const { data: chartData } = await clickhouse
      .query({
        query: chartQuery,
        query_params: {
          pid,
          groupFrom,
          groupTo,
          timezone,
          ...filterConditions.params,
        },
      })
      .then(r => r.json())

    // Get top pages
    const pagesQuery = `
      SELECT pg as name, count(*) as count
      FROM analytics
      WHERE pid = {pid:FixedString(12)}
        AND created BETWEEN {groupFrom:String} AND {groupTo:String}
        ${filterConditions.where}
      GROUP BY pg
      ORDER BY count DESC
      LIMIT 10
    `

    const { data: topPages } = await clickhouse
      .query({
        query: pagesQuery,
        query_params: { pid, groupFrom, groupTo, ...filterConditions.params },
      })
      .then(r => r.json())

    // Get top countries
    const countriesQuery = `
      SELECT cc as name, uniqExact(psid) as count
      FROM analytics
      WHERE pid = {pid:FixedString(12)}
        AND created BETWEEN {groupFrom:String} AND {groupTo:String}
        AND cc IS NOT NULL AND cc != ''
        ${filterConditions.where}
      GROUP BY cc
      ORDER BY count DESC
      LIMIT 10
    `

    const { data: topCountries } = await clickhouse
      .query({
        query: countriesQuery,
        query_params: { pid, groupFrom, groupTo, ...filterConditions.params },
      })
      .then(r => r.json())

    // Get top referrers
    const referrersQuery = `
      SELECT ref as name, uniqExact(psid) as count
      FROM analytics
      WHERE pid = {pid:FixedString(12)}
        AND created BETWEEN {groupFrom:String} AND {groupTo:String}
        AND ref IS NOT NULL AND ref != ''
        ${filterConditions.where}
      GROUP BY ref
      ORDER BY count DESC
      LIMIT 10
    `

    const { data: topReferrers } = await clickhouse
      .query({
        query: referrersQuery,
        query_params: { pid, groupFrom, groupTo, ...filterConditions.params },
      })
      .then(r => r.json())

    // Get browsers
    const browsersQuery = `
      SELECT br as name, uniqExact(psid) as count
      FROM analytics
      WHERE pid = {pid:FixedString(12)}
        AND created BETWEEN {groupFrom:String} AND {groupTo:String}
        AND br IS NOT NULL AND br != ''
        ${filterConditions.where}
      GROUP BY br
      ORDER BY count DESC
      LIMIT 10
    `

    const { data: topBrowsers } = await clickhouse
      .query({
        query: browsersQuery,
        query_params: { pid, groupFrom, groupTo, ...filterConditions.params },
      })
      .then(r => r.json())

    // Get devices
    const devicesQuery = `
      SELECT dv as name, uniqExact(psid) as count
      FROM analytics
      WHERE pid = {pid:FixedString(12)}
        AND created BETWEEN {groupFrom:String} AND {groupTo:String}
        AND dv IS NOT NULL AND dv != ''
        ${filterConditions.where}
      GROUP BY dv
      ORDER BY count DESC
    `

    const { data: devices } = await clickhouse
      .query({
        query: devicesQuery,
        query_params: { pid, groupFrom, groupTo, ...filterConditions.params },
      })
      .then(r => r.json())

    return {
      overall: overallData[0] || {},
      chart: {
        x: _map(chartData, (d: any) => d.date),
        pageviews: _map(chartData, (d: any) => d.pageviews),
        sessions: _map(chartData, (d: any) => d.sessions),
        visitors: _map(chartData, (d: any) => d.visitors),
      },
      topPages,
      topCountries,
      topReferrers,
      topBrowsers,
      devices,
      period: { from: groupFrom, to: groupTo },
    }
  }

  private async getPerformanceData(
    pid: string,
    groupFrom: string,
    groupTo: string,
    timeBucket: TimeBucketType,
    timezone: string,
    filters: Array<{
      column: string
      filter: string
      isExclusive?: boolean
    }>,
    measure: string,
  ) {
    const filterConditions = this.buildFilterConditions(filters)
    const measureFn =
      measure === 'average'
        ? 'avg'
        : measure === 'p95'
          ? 'quantileExact(0.95)'
          : 'median'

    // Get overall performance stats
    const overallQuery = `
      SELECT
        round(${measureFn}(pageLoad) / 1000, 2) as pageLoad,
        round(${measureFn}(dns) / 1000, 2) as dns,
        round(${measureFn}(tls) / 1000, 2) as tls,
        round(${measureFn}(conn) / 1000, 2) as connection,
        round(${measureFn}(response) / 1000, 2) as response,
        round(${measureFn}(render) / 1000, 2) as render,
        round(${measureFn}(domLoad) / 1000, 2) as domLoad,
        round(${measureFn}(ttfb) / 1000, 2) as ttfb
      FROM performance
      WHERE pid = {pid:FixedString(12)}
        AND created BETWEEN {groupFrom:String} AND {groupTo:String}
        ${filterConditions.where}
    `

    const { data: overallData } = await clickhouse
      .query({
        query: overallQuery,
        query_params: {
          pid,
          groupFrom,
          groupTo,
          ...filterConditions.params,
        },
      })
      .then(r => r.json())

    // Get chart data
    const chartQuery = `
      SELECT
        ${this.getTimeBucketSelect(timeBucket, timezone)} as date,
        round(${measureFn}(pageLoad) / 1000, 2) as pageLoad,
        round(${measureFn}(ttfb) / 1000, 2) as ttfb
      FROM performance
      WHERE pid = {pid:FixedString(12)}
        AND created BETWEEN {groupFrom:String} AND {groupTo:String}
        ${filterConditions.where}
      GROUP BY date
      ORDER BY date
    `

    const { data: chartData } = await clickhouse
      .query({
        query: chartQuery,
        query_params: {
          pid,
          groupFrom,
          groupTo,
          timezone,
          ...filterConditions.params,
        },
      })
      .then(r => r.json())

    return {
      overall: overallData[0] || {},
      chart: {
        x: _map(chartData, (d: any) => d.date),
        pageLoad: _map(chartData, (d: any) => d.pageLoad),
        ttfb: _map(chartData, (d: any) => d.ttfb),
      },
      measure,
      period: { from: groupFrom, to: groupTo },
    }
  }

  private async getErrorsData(
    pid: string,
    groupFrom: string,
    groupTo: string,
    _timezone: string,
  ) {
    // Get error counts
    const overallQuery = `
      SELECT
        count(*) as totalErrors,
        uniqExact(eid) as uniqueErrors
      FROM errors
      WHERE pid = {pid:FixedString(12)}
        AND created BETWEEN {groupFrom:String} AND {groupTo:String}
    `

    const { data: overallData } = await clickhouse
      .query({
        query: overallQuery,
        query_params: { pid, groupFrom, groupTo },
      })
      .then(r => r.json())

    // Get top errors
    const topErrorsQuery = `
      SELECT
        name,
        message,
        count(*) as count,
        max(created) as lastSeen
      FROM errors
      WHERE pid = {pid:FixedString(12)}
        AND created BETWEEN {groupFrom:String} AND {groupTo:String}
      GROUP BY name, message
      ORDER BY count DESC
      LIMIT 10
    `

    const { data: topErrors } = await clickhouse
      .query({
        query: topErrorsQuery,
        query_params: { pid, groupFrom, groupTo },
      })
      .then(r => r.json())

    return {
      overall: overallData[0] || {},
      topErrors,
      period: { from: groupFrom, to: groupTo },
    }
  }

  private async getGoalStats(
    pid: string,
    params: {
      goalId?: string
      period?: string
      from?: string
      to?: string
    },
    timezone: string,
  ) {
    const { goalId, period = '7d', from, to } = params

    try {
      const safeTimezone = this.analyticsService.getSafeTimezone(timezone)
      const timeBucket = getLowestPossibleTimeBucket(period, from, to)
      const { groupFromUTC, groupToUTC } = this.analyticsService.getGroupFromTo(
        from,
        to,
        timeBucket,
        period,
        safeTimezone,
      )

      if (goalId) {
        const goal = await this.goalService.findOne({ where: { id: goalId } })
        if (!goal) {
          return { error: 'Goal not found' }
        }

        // Query specific goal stats
        const table = goal.type === 'custom_event' ? 'customEV' : 'analytics'
        const matchCondition =
          goal.matchType === 'exact'
            ? goal.type === 'custom_event'
              ? `ev = {goalValue:String}`
              : `pg = {goalValue:String}`
            : goal.type === 'custom_event'
              ? `ev ILIKE concat('%', {goalValue:String}, '%')`
              : `pg ILIKE concat('%', {goalValue:String}, '%')`

        const query = `
          SELECT
            count(*) as conversions,
            uniqExact(psid) as uniqueSessions
          FROM ${table}
          WHERE pid = {pid:FixedString(12)}
            AND ${matchCondition}
            AND created BETWEEN {groupFrom:String} AND {groupTo:String}
        `

        const { data } = await clickhouse
          .query({
            query,
            query_params: {
              pid,
              goalValue: goal.value || '',
              groupFrom: groupFromUTC,
              groupTo: groupToUTC,
            },
          })
          .then(r => r.json())

        return {
          goal: { id: goal.id, name: goal.name, type: goal.type },
          stats: data[0] || { conversions: 0, uniqueSessions: 0 },
          period: { from: groupFromUTC, to: groupToUTC },
        }
      }

      // Get all goals for the project
      const goals = await this.goalService.find({
        where: { project: { id: pid }, active: true },
      })

      const results = await Promise.all(
        goals.map(async goal => {
          const table = goal.type === 'custom_event' ? 'customEV' : 'analytics'
          const matchCondition =
            goal.matchType === 'exact'
              ? goal.type === 'custom_event'
                ? `ev = {goalValue:String}`
                : `pg = {goalValue:String}`
              : goal.type === 'custom_event'
                ? `ev ILIKE concat('%', {goalValue:String}, '%')`
                : `pg ILIKE concat('%', {goalValue:String}, '%')`

          const query = `
            SELECT count(*) as conversions
            FROM ${table}
            WHERE pid = {pid:FixedString(12)}
              AND ${matchCondition}
              AND created BETWEEN {groupFrom:String} AND {groupTo:String}
          `

          const { data } = await clickhouse
            .query({
              query,
              query_params: {
                pid,
                goalValue: goal.value || '',
                groupFrom: groupFromUTC,
                groupTo: groupToUTC,
              },
            })
            .then(r => r.json())

          return {
            id: goal.id,
            name: goal.name,
            type: goal.type,
            conversions: (data[0] as any)?.conversions || 0,
          }
        }),
      )

      return {
        goals: results,
        period: { from: groupFromUTC, to: groupToUTC },
      }
    } catch (error) {
      this.logger.error({ error, pid, params }, 'Error fetching goal stats')
      return { error: 'Failed to fetch goal stats' }
    }
  }

  private async getFunnelData(
    pid: string,
    params: {
      funnelId: string
      period?: string
      from?: string
      to?: string
    },
    timezone: string,
  ) {
    const { funnelId, period = '7d', from, to } = params

    try {
      const funnel = await this.projectService.getFunnel(funnelId, pid)
      if (!funnel) {
        return { error: 'Funnel not found' }
      }

      const safeTimezone = this.analyticsService.getSafeTimezone(timezone)
      const timeBucket = getLowestPossibleTimeBucket(period, from, to)
      const { groupFromUTC, groupToUTC } = this.analyticsService.getGroupFromTo(
        from,
        to,
        timeBucket,
        period,
        safeTimezone,
      )

      const funnelData = await this.analyticsService.getFunnel(funnel.steps, {
        pid,
        groupFrom: groupFromUTC,
        groupTo: groupToUTC,
      })

      return {
        funnel: {
          id: funnel.id,
          name: funnel.name,
          steps: funnel.steps,
        },
        data: funnelData,
        period: { from: groupFromUTC, to: groupToUTC },
      }
    } catch (error) {
      this.logger.error({ error, pid, params }, 'Error fetching funnel data')
      return { error: 'Failed to fetch funnel data' }
    }
  }

  private getTimeBucketSelect(timeBucket: TimeBucketType, timezone: string) {
    const conversionMap: Record<TimeBucketType, string> = {
      minute: `formatDateTime(toStartOfMinute(toTimeZone(created, '${timezone}')), '%Y-%m-%d %H:%M:00')`,
      hour: `formatDateTime(toStartOfHour(toTimeZone(created, '${timezone}')), '%Y-%m-%d %H:00:00')`,
      day: `formatDateTime(toStartOfDay(toTimeZone(created, '${timezone}')), '%Y-%m-%d')`,
      month: `formatDateTime(toStartOfMonth(toTimeZone(created, '${timezone}')), '%Y-%m')`,
      year: `formatDateTime(toStartOfYear(toTimeZone(created, '${timezone}')), '%Y')`,
    }
    return conversionMap[timeBucket] || conversionMap.day
  }

  private buildFilterConditions(
    filters: Array<{
      column: string
      filter: string
      isExclusive?: boolean
    }>,
  ): { where: string; params: Record<string, string> } {
    if (_isEmpty(filters)) {
      return { where: '', params: {} }
    }

    const conditions: string[] = []
    const params: Record<string, string> = {}

    filters.forEach((f, index) => {
      const paramName = `filter_${index}`
      params[paramName] = f.filter
      const operator = f.isExclusive ? '!=' : '='
      conditions.push(`${f.column} ${operator} {${paramName}:String}`)
    })

    return {
      where: conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '',
      params,
    }
  }
}

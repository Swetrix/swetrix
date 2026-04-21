import { Injectable } from '@nestjs/common'
import { createOpenAI } from '@ai-sdk/openai'
import {
  streamText,
  tool,
  generateText,
  ModelMessage,
  StreamTextResult,
  stepCountIs,
} from 'ai'
import { z } from 'zod'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import dayjs from 'dayjs'

import { ProjectService } from '../project/project.service'
import {
  AnalyticsService,
  getLowestPossibleTimeBucket,
} from '../analytics/analytics.service'
import { GoalService } from '../goal/goal.service'
import { FeatureFlagService } from '../feature-flag/feature-flag.service'
import { ExperimentService } from '../experiment/experiment.service'
import { AppLoggerService } from '../logger/logger.service'
import { clickhouse } from '../common/integrations/clickhouse'
import { Project } from '../project/entity/project.entity'
import { TimeBucketType } from '../analytics/dto/getData.dto'

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

const PRIMARY_MODEL = 'anthropic/claude-haiku-4.5'
const TITLE_MODEL = 'google/gemini-3.1-flash-lite-preview'

const ALLOWED_FILTER_COLUMNS = new Set([
  'pg',
  'cc',
  'rg',
  'ct',
  'br',
  'os',
  'dv',
  'ref',
  'so',
  'me',
  'ca',
  'te',
  'co',
  'lc',
  'host',
])

const ALLOWED_CHART_LINK_TABS = new Set([
  'traffic',
  'performance',
  'errors',
  'sessions',
  'funnels',
  'goals',
  'experiments',
  'featureFlags',
  'captcha',
  'profiles',
])

const ALLOWED_CHART_LINK_PERIODS = new Set([
  '1h',
  'today',
  'yesterday',
  '1d',
  '7d',
  '4w',
  '3M',
  '12M',
  '24M',
  'all',
])

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

interface SanitisedChartLink {
  tab: string
  period?: string
  from?: string
  to?: string
  filters?: Array<{
    column: string
    filter: string
    isExclusive?: boolean
    isContains?: boolean
  }>
}

/**
 * Defensively validates an AI-emitted chart `link` object. Returns null when the
 * link is missing/invalid/unsafe so the frontend simply hides the affordance.
 */
const sanitiseChartLink = (raw: unknown): SanitisedChartLink | null => {
  if (!raw || typeof raw !== 'object') return null
  const link = raw as Record<string, unknown>

  const tab = typeof link.tab === 'string' ? link.tab : null
  if (!tab || !ALLOWED_CHART_LINK_TABS.has(tab)) return null

  const out: SanitisedChartLink = { tab }

  if (
    typeof link.period === 'string' &&
    ALLOWED_CHART_LINK_PERIODS.has(link.period)
  ) {
    out.period = link.period
  }

  if (typeof link.from === 'string' && ISO_DATE_PATTERN.test(link.from)) {
    out.from = link.from
  }
  if (typeof link.to === 'string' && ISO_DATE_PATTERN.test(link.to)) {
    out.to = link.to
  }

  if (Array.isArray(link.filters)) {
    const filters = link.filters
      .filter((f): f is Record<string, unknown> => !!f && typeof f === 'object')
      .map((f) => ({
        column: typeof f.column === 'string' ? f.column : '',
        filter: typeof f.filter === 'string' ? f.filter : '',
        isExclusive: f.isExclusive === true ? true : undefined,
        isContains: f.isContains === true ? true : undefined,
      }))
      .filter(
        (f) =>
          f.column &&
          f.filter &&
          ALLOWED_FILTER_COLUMNS.has(f.column) &&
          f.filter.length <= 500,
      )
      .slice(0, 10)

    if (filters.length > 0) out.filters = filters
  }

  return out
}

/**
 * Scans a piece of assistant content for embedded chart JSON blobs and rewrites
 * each one to strip invalid/unknown chart `link` fields. Charts without a valid
 * link will simply lack the field (rendering hides the affordance gracefully).
 */
export const sanitiseAssistantContent = (content: string): string => {
  if (!content || !content.includes('{"type":"chart"')) return content

  let cursor = 0
  let result = ''

  while (cursor < content.length) {
    const start = content.indexOf('{"type":"chart"', cursor)
    if (start === -1) {
      result += content.slice(cursor)
      break
    }

    result += content.slice(cursor, start)

    let braceCount = 0
    let inString = false
    let escape = false
    let end = -1
    for (let i = start; i < content.length; i++) {
      const ch = content[i]
      if (escape) {
        escape = false
        continue
      }
      if (ch === '\\') {
        escape = true
        continue
      }
      if (ch === '"') {
        inString = !inString
        continue
      }
      if (inString) continue
      if (ch === '{') braceCount++
      else if (ch === '}') {
        braceCount--
        if (braceCount === 0) {
          end = i
          break
        }
      }
    }

    if (end === -1) {
      result += content.slice(start)
      break
    }

    const jsonStr = content.substring(start, end + 1)
    try {
      const parsed = JSON.parse(jsonStr)
      if (parsed && typeof parsed === 'object' && parsed.type === 'chart') {
        const safeLink = sanitiseChartLink(parsed.link)
        if (safeLink) {
          parsed.link = safeLink
        } else if ('link' in parsed) {
          delete parsed.link
        }
        result += JSON.stringify(parsed)
      } else {
        result += jsonStr
      }
    } catch {
      result += jsonStr
    }
    cursor = end + 1
  }

  return result
}

// Regex pattern to validate timezone strings (only allows safe characters)
// Valid timezones: UTC, America/New_York, Europe/London, Asia/Tokyo, etc.
const SAFE_TIMEZONE_PATTERN =
  /^[A-Za-z_][A-Za-z0-9_+-]*(\/[A-Za-z_][A-Za-z0-9_+-]*)*$/

/**
 * Validates and sanitizes a timezone string to prevent SQL injection.
 * Returns 'UTC' if the timezone is invalid or contains suspicious characters.
 */
const validateTimezoneForSQL = (timezone: string): string => {
  if (!timezone || typeof timezone !== 'string') {
    return 'UTC'
  }

  // Check against safe pattern
  if (!SAFE_TIMEZONE_PATTERN.test(timezone)) {
    return 'UTC'
  }

  // Additional length check (longest IANA timezone is ~30 chars)
  if (timezone.length > 50) {
    return 'UTC'
  }

  return timezone
}

@Injectable()
export class AiService {
  private openrouter: ReturnType<typeof createOpenAI>

  constructor(
    private readonly projectService: ProjectService,
    private readonly analyticsService: AnalyticsService,
    private readonly goalService: GoalService,
    private readonly featureFlagService: FeatureFlagService,
    private readonly experimentService: ExperimentService,
    private readonly logger: AppLoggerService,
  ) {
    this.openrouter = createOpenAI({
      baseURL: OPENROUTER_BASE_URL,
      apiKey: process.env.OPENROUTER_API_KEY,
    })
  }

  async chat(
    project: Project,
    messages: ModelMessage[],
    timezone: string = 'UTC',
  ): Promise<
    StreamTextResult<
      typeof this.buildTools extends (...args: any[]) => infer R ? R : never,
      never
    >
  > {
    const systemPrompt = this.buildSystemPrompt(project, timezone)

    const last = messages[messages.length - 1]?.content as unknown
    const lastMessagePreview =
      typeof last === 'string' ? last.slice(0, 100) : undefined

    this.logger.log(
      {
        pid: project.id,
        messageCount: messages.length,
        lastMessage: lastMessagePreview,
        timezone,
      },
      'AI chat request',
    )

    const result = streamText({
      model: this.openrouter.chat(PRIMARY_MODEL),
      system: systemPrompt,
      messages,
      tools: this.buildTools(project, timezone),
      stopWhen: stepCountIs(15),
    })

    return result
  }

  /**
   * Generates 0-3 short, project-specific follow-up prompts based on the just-completed
   * assistant turn. Uses TITLE_MODEL so it doesn't add noticeable latency.
   * Always resolves; on failure returns an empty array.
   */
  async generateFollowUps(
    messages: ModelMessage[],
    project: Project,
  ): Promise<string[]> {
    if (!process.env.OPENROUTER_API_KEY) {
      return []
    }

    if (!messages || messages.length === 0) {
      return []
    }

    // Take the tail of the conversation to keep the prompt cheap
    const tail = messages.slice(-8)
    const transcript = tail
      .map((m) => {
        const role =
          m.role === 'user'
            ? 'User'
            : m.role === 'assistant'
              ? 'Assistant'
              : m.role === 'system'
                ? 'System'
                : 'Tool'
        const raw = m.content
        let content: string
        if (typeof raw === 'string') {
          content = raw
        } else if (Array.isArray(raw)) {
          content = raw
            .map((part: any) => {
              if (typeof part === 'string') return part
              if (part?.type === 'text' && typeof part.text === 'string')
                return part.text
              return ''
            })
            .join(' ')
        } else {
          content = ''
        }
        content = content.trim().replace(/\s+/g, ' ')
        if (content.length > 800) content = `${content.slice(0, 800)}...`
        return `${role}: ${content}`
      })
      .filter((line) => line.length > line.indexOf(':') + 2)
      .join('\n\n')

    if (!transcript) return []

    try {
      const { text } = await generateText({
        model: this.openrouter.chat(TITLE_MODEL),
        system:
          'Given this analytics conversation, suggest up to 3 short follow-up questions the user might naturally ask next. Each must be a complete question under 70 chars, specific to the data discussed, and answerable by the same toolset (analytics, performance, errors, goals, funnels, sessions, profiles, feature flags, A/B experiments, custom events). Avoid duplicates and avoid restating questions the user already asked. Return STRICT JSON: {"followUps": string[]}. Do not wrap in markdown.',
        prompt: `Project: "${project.name}"\n\nConversation:\n${transcript}`,
        temperature: 0.4,
      })

      const cleaned = (text || '').trim().replace(/^```(?:json)?|```$/g, '')
      const jsonStart = cleaned.indexOf('{')
      const jsonEnd = cleaned.lastIndexOf('}')
      if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
        return []
      }

      let parsed: { followUps?: unknown }
      try {
        parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1))
      } catch {
        return []
      }

      if (!Array.isArray(parsed?.followUps)) return []

      const seen = new Set<string>()
      const followUps: string[] = []
      for (const item of parsed.followUps) {
        if (typeof item !== 'string') continue
        const trimmed = item.trim().replace(/\s+/g, ' ')
        if (!trimmed || trimmed.length > 120) continue
        const key = trimmed.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        followUps.push(trimmed)
        if (followUps.length === 3) break
      }
      return followUps
    } catch (error) {
      this.logger.warn(
        { error, pid: project.id },
        'Failed to generate follow-up suggestions',
      )
      return []
    }
  }

  /**
   * Generates a short, descriptive chat title from the first user message
   * using a small/fast model so it doesn't slow down the main response.
   */
  async generateChatTitle(firstUserMessage: string): Promise<string> {
    const trimmed = firstUserMessage.trim()
    if (!trimmed) return 'New conversation'

    const fallback =
      trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed

    if (!process.env.OPENROUTER_API_KEY) {
      return fallback
    }

    try {
      const { text } = await generateText({
        model: this.openrouter.chat(TITLE_MODEL),
        system:
          'You are a title generator. Produce a concise, descriptive chat title (max 6 words, no quotes, no trailing punctuation, Title Case) that captures the essence of the user message. Reply with the title only.',
        prompt: trimmed.slice(0, 800),
        temperature: 0.3,
      })

      const cleaned = (text || '')
        .replace(/^["'`]+|["'`]+$/g, '')
        .replace(/[\r\n]+/g, ' ')
        .trim()

      if (!cleaned) return fallback
      return cleaned.length > 80 ? `${cleaned.slice(0, 77)}...` : cleaned
    } catch (error) {
      this.logger.warn(
        { error, preview: trimmed.slice(0, 80) },
        'Failed to generate chat title, falling back',
      )
      return fallback
    }
  }

  private buildSystemPrompt(project: Project, timezone: string): string {
    const currentDate = dayjs().tz(timezone).format('YYYY-MM-DD HH:mm:ss')

    return `You are Swetrix Copilot, the in-product AI assistant for Swetrix - a privacy-focused, GDPR-compliant web analytics platform. You act as a senior product analyst and growth advisor for the user, helping them understand their data and make decisions.

Current context:
- Project: "${project.name}" (ID: ${project.id})
- Current date/time: ${currentDate} (timezone: ${timezone})

You have tools that can query the project's analytics data. Use them to answer questions about:
- Traffic, pageviews, sessions, unique visitors
- Performance metrics (page load, TTFB, DNS, etc.)
- Custom events
- Goals & conversions
- Funnels (step-by-step conversion analysis)
- Errors / exceptions
- CAPTCHA challenges (if enabled)
- Feature flags (configuration + evaluation stats)
- A/B Experiments (variants, exposures, conversions)
- User sessions (recent sessions list)
- Geographic, device, browser, OS, referrer breakdowns

Time periods:
- Predefined: 1h, today, yesterday, 1d, 7d, 4w, 3M, 12M, 24M, all
- Custom range: pass "from" and "to" as YYYY-MM-DD (or full ISO timestamps). When the user mentions a specific date range ("between Jan 1 and Mar 5", "since last Tuesday", "for Q1", "from 2025-01-01 to 2025-03-31"), translate it to from/to and pass them. Use this for any range that doesn't map cleanly to a preset.

Guidelines:
1. ALWAYS use tools to fetch real data before answering questions about analytics. NEVER make up, hallucinate, or estimate numbers.
2. If a tool call fails or returns an error, tell the user there was an issue fetching the data. Do not invent numbers.
3. Be concise, but proactive. Summarise key takeaways, surface anomalies/trends, and suggest follow-ups.
4. Default to the last 7 days when the user doesn't specify a period.
5. Prefer charts when comparing series, showing trends over time, or breaking down distributions. Use tables/lists for short rankings.
6. Round large numbers and percentages for readability.
7. If no data is available for the requested period or feature isn't configured (e.g. no CAPTCHA, no experiments), say so clearly.
8. If the user asks how to set up tracking or platform features, refer them to https://swetrix.com/docs/
9. Place each chart inline at the point in your response where it is most relevant. Do NOT batch all charts at the end of the message.

To include a chart, emit this exact JSON on its own line at the position you want it rendered:

Time-series (line, bar, area):
{"type":"chart","chartType":"line","title":"Chart Title","data":{"x":["2024-01-01","2024-01-02"],"pageviews":[100,150],"visitors":[80,120]},"link":{"tab":"traffic","period":"7d"}}

Pie / donut (proportions):
{"type":"chart","chartType":"pie","title":"Device Distribution","data":{"labels":["Desktop","Mobile","Tablet"],"values":[650,280,70]},"link":{"tab":"traffic","period":"7d"}}
{"type":"chart","chartType":"donut","title":"Traffic Sources","data":{"labels":["Organic","Direct","Referral"],"values":[450,300,150]},"link":{"tab":"traffic","period":"7d"}}

Supported chart types: "line", "bar", "area", "pie", "donut"
- For line/bar/area: "x" for x-axis labels and named numeric arrays for each series.
- For pie/donut: "labels" + "values" (raw numbers, NOT percentages).

Chart "link" field (REQUIRED whenever the chart corresponds to data the user can drill into in the dashboard):
- ALWAYS include "link" so the chart can be opened in the project dashboard.
- Mirror the EXACT period/from/to and filters used in the originating tool call so the dashboard view shows the same data.
- Schema: { "tab": "traffic" | "performance" | "errors" | "sessions" | "funnels" | "goals" | "experiments" | "featureFlags" | "captcha" | "profiles", "period"?: "1h"|"today"|"yesterday"|"1d"|"7d"|"4w"|"3M"|"12M"|"24M"|"all", "from"?: "YYYY-MM-DD", "to"?: "YYYY-MM-DD", "filters"?: [{"column": string, "filter": string, "isExclusive"?: boolean, "isContains"?: boolean}] }
- Pick the most relevant tab: pageviews/visitors/sessions/geo/devices => "traffic"; performance metrics => "performance"; errors => "errors"; user sessions => "sessions"; funnel charts => "funnels"; goal conversions => "goals"; A/B experiments => "experiments"; feature flags => "featureFlags"; CAPTCHA => "captcha"; profiles overview => "profiles".
- Use either "period" OR ("from" + "to"), never both.
- ALWAYS pass through every filter you used in the originating getData/tool call. If the chart is "Top countries in North America" and you filtered by cc=US, cc=CA, cc=MX, the link MUST include all three filter entries — never drop them. Same rule for any breakdown chart (e.g. "Top pages on /blog" must carry the pg filter).
- Filters are an ARRAY: include one entry per value, even when filtering on the same column multiple times. Example for the North America case: "filters":[{"column":"cc","filter":"US"},{"column":"cc","filter":"CA"},{"column":"cc","filter":"MX"}].
- Allowed filter columns and what they mean:
  - pg: page path (e.g. "/blog", "/pricing")
  - cc: country code, 2-letter ISO 3166-1 alpha-2 (e.g. "US", "GB", "DE")
  - rg: region / state / province name
  - ct: city name
  - br: browser name (e.g. "Chrome", "Safari", "Firefox")
  - os: operating system name (e.g. "Windows", "macOS", "iOS", "Android")
  - dv: device type — one of "desktop", "mobile", "tablet", "smarttv", "wearable", "console", "xr", "embedded"
  - ref: full referrer URL
  - so: UTM source (utm_source)
  - me: UTM medium (utm_medium)
  - ca: UTM campaign (utm_campaign)
  - te: UTM term (utm_term)
  - co: UTM content (utm_content)
  - lc: locale / language code (e.g. "en-US", "de-DE")
  - host: hostname (e.g. "example.com")
- Filter modifiers (combine freely):
  - "isExclusive": true => EXCLUDE this value (NOT equal / NOT contains).
  - "isContains": true => substring match (case-insensitive). Use this when filtering by a partial value such as "/blog" matching "/blog/foo", or referrers containing "google".
  - Default (both omitted) is exact-match, include.
- Omit "link" only for hypothetical/illustrative charts that don't map to real dashboard data.`
  }

  private buildTools(project: Project, timezone: string) {
    const periodSchema = z
      .enum([
        '1h',
        'today',
        'yesterday',
        '1d',
        '7d',
        '4w',
        '3M',
        '12M',
        '24M',
        'all',
      ])
      .optional()
      .describe(
        'Predefined time period. Omit when using a custom from/to range.',
      )

    const fromSchema = z
      .string()
      .optional()
      .describe(
        'Start of custom range (YYYY-MM-DD or full ISO datetime). Pair with "to".',
      )

    const toSchema = z
      .string()
      .optional()
      .describe(
        'End of custom range (YYYY-MM-DD or full ISO datetime). Pair with "from".',
      )

    return {
      getProjectInfo: tool({
        description:
          'Get basic information about the current project: name, created date, whether CAPTCHA is enabled, plus the available funnels, goals, feature flags and experiments. Call this early in a conversation to discover what entities exist before asking for stats on them.',
        inputSchema: z.object({}),
        execute: async () => {
          this.logger.log({ pid: project.id }, 'Tool: getProjectInfo called')

          try {
            const result = await this.getProjectInfo(project)

            this.logger.log(
              {
                pid: project.id,
                funnelCount: result.funnels?.length,
                goalCount: result.goals?.length,
                flagCount: result.featureFlags?.length,
                experimentCount: result.experiments?.length,
              },
              'Tool: getProjectInfo completed',
            )
            return result
          } catch (error) {
            this.logger.error(
              { error, pid: project.id },
              'Tool getProjectInfo failed',
            )
            return { error: 'Failed to fetch project information.' }
          }
        },
      }),

      getData: tool({
        description: `Query analytics-style data for the project. Returns overall counts plus chart data and panel breakdowns (top pages, countries, browsers, etc.).

Use dataType to choose the dataset:
- "analytics": pageviews, sessions, geo/device/referrer breakdowns
- "performance": page load timings (pageLoad, ttfb, etc.)
- "captcha": CAPTCHA challenge events (only meaningful if CAPTCHA is enabled for the project)
- "errors": error events with totals + top errors
- "customEvents": top custom event names with counts

Supports either a predefined period OR a custom from/to range.

Available filter columns:
- pg: page path
- cc: country code (2-letter ISO)
- rg: region
- ct: city
- br: browser name
- os: operating system
- dv: device type (desktop, mobile, tablet)
- ref: referrer
- so: utm_source
- me: utm_medium
- ca: utm_campaign
- te: utm_term
- co: utm_content
- lc: locale/language
- host: hostname

Filter modifiers:
- isExclusive: true => exclude this value (NOT equal / NOT contains)
- isContains: true => case-insensitive substring match (e.g. pg contains "/blog")`,
        inputSchema: z.object({
          dataType: z
            .enum([
              'analytics',
              'performance',
              'captcha',
              'errors',
              'customEvents',
            ])
            .describe('Type of data to query'),
          period: periodSchema,
          from: fromSchema,
          to: toSchema,
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
                isContains: z
                  .boolean()
                  .optional()
                  .describe(
                    'If true, case-insensitive substring match instead of exact equality',
                  ),
              }),
            )
            .optional()
            .describe('Filters to apply'),
          measure: z
            .enum(['average', 'median', 'p95'])
            .optional()
            .describe('Measure type for performance data'),
        }),
        execute: async (params) => {
          if (!params.dataType) {
            return { error: 'dataType is required' }
          }
          this.logger.log(
            {
              pid: project.id,
              dataType: params.dataType,
              period: params.period,
              from: params.from,
              to: params.to,
              filters: params.filters,
            },
            'Tool: getData called',
          )
          try {
            const result = await this.getData(
              project.id,
              { ...params, dataType: params.dataType },
              timezone,
            )
            this.logger.log(
              {
                pid: project.id,
                dataType: params.dataType,
                hasData: !!result,
              },
              'Tool: getData completed',
            )
            return result
          } catch (error) {
            this.logger.error({ error, pid: project.id }, 'Tool getData failed')
            return {
              error:
                'Failed to fetch data. Please try again or rephrase your question.',
            }
          }
        },
      }),

      getGoalStats: tool({
        description:
          'Get goal conversion statistics including conversions, unique sessions, and per-goal totals. Call without goalId to get totals for every active goal.',
        inputSchema: z.object({
          goalId: z
            .string()
            .optional()
            .describe('Specific goal ID, or omit to get all goals'),
          period: periodSchema,
          from: fromSchema,
          to: toSchema,
        }),
        execute: async (params) => {
          this.logger.log(
            { pid: project.id, goalId: params.goalId, period: params.period },
            'Tool: getGoalStats called',
          )
          try {
            const result = await this.getGoalStats(project.id, params, timezone)
            this.logger.log(
              { pid: project.id, hasData: !!result && !result.error },
              'Tool: getGoalStats completed',
            )
            return result
          } catch (error) {
            this.logger.error(
              { error, pid: project.id },
              'Tool getGoalStats failed',
            )
            return {
              error:
                'Failed to fetch goal statistics. Please try again or rephrase your question.',
            }
          }
        },
      }),

      getFunnelData: tool({
        description:
          'Get funnel analysis data showing step-by-step conversions and drop-off for a specific funnel.',
        inputSchema: z.object({
          funnelId: z.string().describe('Funnel ID to query'),
          period: periodSchema,
          from: fromSchema,
          to: toSchema,
        }),
        execute: async (params) => {
          if (!params.funnelId) {
            return { error: 'funnelId is required' }
          }
          this.logger.log(
            {
              pid: project.id,
              funnelId: params.funnelId,
              period: params.period,
            },
            'Tool: getFunnelData called',
          )
          try {
            const result = await this.getFunnelData(
              project.id,
              { ...params, funnelId: params.funnelId },
              timezone,
            )
            this.logger.log(
              {
                pid: project.id,
                funnelId: params.funnelId,
                hasData: !!result,
              },
              'Tool: getFunnelData completed',
            )
            return result
          } catch (error) {
            this.logger.error(
              { error, pid: project.id },
              'Tool getFunnelData failed',
            )
            return {
              error:
                'Failed to fetch funnel data. Please try again or rephrase your question.',
            }
          }
        },
      }),

      getFeatureFlagStats: tool({
        description:
          'Get evaluation stats for feature flags: total evaluations, unique profiles exposed, true vs false counts and percentages. Pass a flagId for a specific flag, or omit to get a summary of all flags in the project.',
        inputSchema: z.object({
          flagId: z
            .string()
            .optional()
            .describe('Feature flag ID, or omit for all flags in the project'),
          period: periodSchema,
          from: fromSchema,
          to: toSchema,
        }),
        execute: async (params) => {
          this.logger.log(
            { pid: project.id, flagId: params.flagId },
            'Tool: getFeatureFlagStats called',
          )
          try {
            return await this.getFeatureFlagStats(project.id, params, timezone)
          } catch (error) {
            this.logger.error(
              { error, pid: project.id },
              'Tool getFeatureFlagStats failed',
            )
            return { error: 'Failed to fetch feature flag stats.' }
          }
        },
      }),

      getExperimentResults: tool({
        description:
          'Get exposures and conversion counts per variant for an A/B experiment. Returns variant exposures, conversions, and conversion rate so you can advise on which variant is winning. Omit experimentId to list all experiments with their basic config.',
        inputSchema: z.object({
          experimentId: z
            .string()
            .optional()
            .describe(
              'Experiment ID. Omit to list all experiments in the project.',
            ),
          period: periodSchema,
          from: fromSchema,
          to: toSchema,
        }),
        execute: async (params) => {
          this.logger.log(
            { pid: project.id, experimentId: params.experimentId },
            'Tool: getExperimentResults called',
          )
          try {
            return await this.getExperimentResults(project.id, params, timezone)
          } catch (error) {
            this.logger.error(
              { error, pid: project.id },
              'Tool getExperimentResults failed',
            )
            return { error: 'Failed to fetch experiment results.' }
          }
        },
      }),

      getSessionsList: tool({
        description:
          'Get a list of recent user sessions (psid, country, OS, browser, started/ended timestamps, page count) for inspection. Useful for finding examples of user behaviour or debugging. Capped at 25 sessions per call.',
        inputSchema: z.object({
          period: periodSchema,
          from: fromSchema,
          to: toSchema,
          take: z
            .number()
            .int()
            .min(1)
            .max(25)
            .optional()
            .describe('Number of sessions to return (max 25, default 10)'),
          country: z
            .string()
            .optional()
            .describe('Optional 2-letter country code filter'),
          page: z
            .string()
            .optional()
            .describe('Optional page path filter (exact match on pg)'),
        }),
        execute: async (params) => {
          this.logger.log(
            { pid: project.id, period: params.period },
            'Tool: getSessionsList called',
          )
          try {
            return await this.getSessionsList(project.id, params, timezone)
          } catch (error) {
            this.logger.error(
              { error, pid: project.id },
              'Tool getSessionsList failed',
            )
            return { error: 'Failed to fetch sessions.' }
          }
        },
      }),

      getProfilesOverview: tool({
        description:
          'Get a high-level overview of profiles (returning visitors): unique profile count, sessions per profile, and top page paths. Useful for understanding audience composition and stickiness.',
        inputSchema: z.object({
          period: periodSchema,
          from: fromSchema,
          to: toSchema,
        }),
        execute: async (params) => {
          this.logger.log(
            { pid: project.id, period: params.period },
            'Tool: getProfilesOverview called',
          )
          try {
            return await this.getProfilesOverview(project.id, params, timezone)
          } catch (error) {
            this.logger.error(
              { error, pid: project.id },
              'Tool getProfilesOverview failed',
            )
            return { error: 'Failed to fetch profiles overview.' }
          }
        },
      }),
    }
  }

  private async getProjectInfo(project: Project) {
    const [funnels, goals, featureFlags, experiments] = await Promise.all([
      this.projectService.getFunnels(project.id),
      this.goalService.find({
        where: { project: { id: project.id }, active: true },
        order: { name: 'ASC' },
      }),
      this.featureFlagService.findByProject(project.id).catch(() => []),
      this.experimentService.findByProject(project.id).catch(() => []),
    ])

    return {
      id: project.id,
      name: project.name,
      created: project.created,
      captchaEnabled: !!project.captchaSecretKey,
      funnels: _map(funnels, (f) => ({
        id: f.id,
        name: f.name,
        steps: f.steps,
      })),
      goals: _map(goals, (g) => ({
        id: g.id,
        name: g.name,
        type: g.type,
        value: g.value,
      })),
      featureFlags: _map(featureFlags, (f) => ({
        id: f.id,
        key: f.key,
        description: f.description,
        flagType: f.flagType,
        rolloutPercentage: f.rolloutPercentage,
        enabled: f.enabled,
      })),
      experiments: _map(experiments, (e) => ({
        id: e.id,
        name: e.name,
        description: e.description,
        status: e.status,
        startedAt: e.startedAt,
        endedAt: e.endedAt,
        variants: _map(e.variants, (v) => ({
          key: v.key,
          name: v.name,
          isControl: v.isControl,
          rolloutPercentage: v.rolloutPercentage,
        })),
        goalId: e.goal?.id || null,
      })),
    }
  }

  private async getData(
    pid: string,
    params: {
      dataType:
        | 'analytics'
        | 'performance'
        | 'captcha'
        | 'errors'
        | 'customEvents'
      period?: string
      from?: string
      to?: string
      timeBucket?: string
      filters?: Array<{
        column?: string
        filter?: string
        isExclusive?: boolean
        isContains?: boolean
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
      (
        f,
      ): f is {
        column: string
        filter: string
        isExclusive?: boolean
        isContains?: boolean
      } => typeof f.column === 'string' && typeof f.filter === 'string',
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

      this.logger.log(
        {
          pid,
          dataType,
          period,
          from: groupFromUTC,
          to: groupToUTC,
          timeBucket,
          filterCount: filters.length,
        },
        'getData: Querying data',
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

      if (dataType === 'captcha') {
        return this.getCaptchaData(
          pid,
          groupFromUTC,
          groupToUTC,
          timeBucket,
          safeTimezone,
        )
      }

      if (dataType === 'customEvents') {
        return this.getCustomEventsData(
          pid,
          groupFromUTC,
          groupToUTC,
          timeBucket,
          safeTimezone,
          filters,
        )
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
      isContains?: boolean
    }>,
  ) {
    const filterConditions = this.buildFilterConditions(filters)

    // Get overall stats
    const overallQuery = `
      SELECT
        count(*) as pageviews,
        count(DISTINCT psid) as sessions
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
      .then((r) => r.json())

    // Get chart data
    const chartQuery = `
      SELECT
        ${this.getTimeBucketSelect(timeBucket, timezone)} as date,
        count(*) as pageviews,
        count(DISTINCT psid) as sessions
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
      .then((r) => r.json())

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
      .then((r) => r.json())

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
      .then((r) => r.json())

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
      .then((r) => r.json())

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
      .then((r) => r.json())

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
      .then((r) => r.json())

    return {
      overall: overallData[0] || {},
      chart: {
        x: _map(chartData, (d: any) => d.date),
        pageviews: _map(chartData, (d: any) => d.pageviews),
        sessions: _map(chartData, (d: any) => d.sessions),
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
      isContains?: boolean
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
      .then((r) => r.json())

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
      .then((r) => r.json())

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
      .then((r) => r.json())

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
      .then((r) => r.json())

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
          .then((r) => r.json())

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
        goals.map(async (goal) => {
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
            .then((r) => r.json())

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
    // Validate timezone to prevent SQL injection
    const safeTimezone = validateTimezoneForSQL(timezone)

    const conversionMap: Record<TimeBucketType, string> = {
      minute: `formatDateTime(toStartOfMinute(toTimeZone(created, '${safeTimezone}')), '%Y-%m-%d %H:%M:00')`,
      hour: `formatDateTime(toStartOfHour(toTimeZone(created, '${safeTimezone}')), '%Y-%m-%d %H:00:00')`,
      day: `formatDateTime(toStartOfDay(toTimeZone(created, '${safeTimezone}')), '%Y-%m-%d')`,
      month: `formatDateTime(toStartOfMonth(toTimeZone(created, '${safeTimezone}')), '%Y-%m')`,
      year: `formatDateTime(toStartOfYear(toTimeZone(created, '${safeTimezone}')), '%Y')`,
    }
    return conversionMap[timeBucket] || conversionMap.day
  }

  private async getCaptchaData(
    pid: string,
    groupFrom: string,
    groupTo: string,
    timeBucket: TimeBucketType,
    timezone: string,
  ) {
    const overallQuery = `
      SELECT
        count(*) as total,
        countIf(manuallyPassed = 1) as manuallyPassed,
        countIf(manuallyPassed = 0) as autoPassed
      FROM captcha
      WHERE pid = {pid:FixedString(12)}
        AND created BETWEEN {groupFrom:String} AND {groupTo:String}
    `

    const chartQuery = `
      SELECT
        ${this.getTimeBucketSelect(timeBucket, timezone)} as date,
        count(*) as challenges,
        countIf(manuallyPassed = 1) as manuallyPassed
      FROM captcha
      WHERE pid = {pid:FixedString(12)}
        AND created BETWEEN {groupFrom:String} AND {groupTo:String}
      GROUP BY date
      ORDER BY date
    `

    const breakdownQuery = (column: string) => `
      SELECT ${column} as name, count(*) as count
      FROM captcha
      WHERE pid = {pid:FixedString(12)}
        AND created BETWEEN {groupFrom:String} AND {groupTo:String}
        AND ${column} IS NOT NULL AND ${column} != ''
      GROUP BY ${column}
      ORDER BY count DESC
      LIMIT 10
    `

    const params = { pid, groupFrom, groupTo, timezone }

    const [overall, chart, byCountry, byBrowser, byDevice] = await Promise.all([
      clickhouse
        .query({ query: overallQuery, query_params: params })
        .then((r) => r.json()),
      clickhouse
        .query({ query: chartQuery, query_params: params })
        .then((r) => r.json()),
      clickhouse
        .query({ query: breakdownQuery('cc'), query_params: params })
        .then((r) => r.json()),
      clickhouse
        .query({ query: breakdownQuery('br'), query_params: params })
        .then((r) => r.json()),
      clickhouse
        .query({ query: breakdownQuery('dv'), query_params: params })
        .then((r) => r.json()),
    ])

    return {
      overall: (overall.data as any)[0] || {},
      chart: {
        x: _map(chart.data as any[], (d) => d.date),
        challenges: _map(chart.data as any[], (d) => d.challenges),
        manuallyPassed: _map(chart.data as any[], (d) => d.manuallyPassed),
      },
      topCountries: byCountry.data,
      topBrowsers: byBrowser.data,
      devices: byDevice.data,
      period: { from: groupFrom, to: groupTo },
    }
  }

  private async getCustomEventsData(
    pid: string,
    groupFrom: string,
    groupTo: string,
    timeBucket: TimeBucketType,
    timezone: string,
    filters: Array<{
      column: string
      filter: string
      isExclusive?: boolean
      isContains?: boolean
    }>,
  ) {
    const filterConditions = this.buildFilterConditions(filters)

    const overallQuery = `
      SELECT
        count(*) as totalEvents,
        uniqExact(ev) as uniqueEvents,
        uniqExact(psid) as sessions
      FROM customEV
      WHERE pid = {pid:FixedString(12)}
        AND created BETWEEN {groupFrom:String} AND {groupTo:String}
        ${filterConditions.where}
    `

    const topEventsQuery = `
      SELECT ev as name, count(*) as count, uniqExact(psid) as sessions
      FROM customEV
      WHERE pid = {pid:FixedString(12)}
        AND created BETWEEN {groupFrom:String} AND {groupTo:String}
        ${filterConditions.where}
      GROUP BY ev
      ORDER BY count DESC
      LIMIT 25
    `

    const chartQuery = `
      SELECT
        ${this.getTimeBucketSelect(timeBucket, timezone)} as date,
        count(*) as events,
        uniqExact(psid) as sessions
      FROM customEV
      WHERE pid = {pid:FixedString(12)}
        AND created BETWEEN {groupFrom:String} AND {groupTo:String}
        ${filterConditions.where}
      GROUP BY date
      ORDER BY date
    `

    const params = {
      pid,
      groupFrom,
      groupTo,
      timezone,
      ...filterConditions.params,
    }

    const [overall, topEvents, chart] = await Promise.all([
      clickhouse
        .query({ query: overallQuery, query_params: params })
        .then((r) => r.json()),
      clickhouse
        .query({ query: topEventsQuery, query_params: params })
        .then((r) => r.json()),
      clickhouse
        .query({ query: chartQuery, query_params: params })
        .then((r) => r.json()),
    ])

    return {
      overall: (overall.data as any)[0] || {},
      topEvents: topEvents.data,
      chart: {
        x: _map(chart.data as any[], (d) => d.date),
        events: _map(chart.data as any[], (d) => d.events),
        sessions: _map(chart.data as any[], (d) => d.sessions),
      },
      period: { from: groupFrom, to: groupTo },
    }
  }

  private async getFeatureFlagStats(
    pid: string,
    params: {
      flagId?: string
      period?: string
      from?: string
      to?: string
    },
    timezone: string,
  ) {
    const { flagId, period = '7d', from, to } = params

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

      const queryFlag = async (flag: {
        id: string
        key: string
        flagType: string
        rolloutPercentage: number
        enabled: boolean
      }) => {
        const statsQuery = `
          SELECT
            count(*) as evaluations,
            uniqExact(profileId) as profileCount,
            countIf(result = 1) as trueCount,
            countIf(result = 0) as falseCount
          FROM feature_flag_evaluations
          WHERE pid = {pid:FixedString(12)}
            AND flagId = {flagId:String}
            AND created BETWEEN {groupFrom:String} AND {groupTo:String}
        `

        try {
          const { data } = await clickhouse
            .query({
              query: statsQuery,
              query_params: {
                pid,
                flagId: flag.id,
                groupFrom: groupFromUTC,
                groupTo: groupToUTC,
              },
            })
            .then((r) => r.json())

          const stats = (data as any)[0] || {
            evaluations: 0,
            profileCount: 0,
            trueCount: 0,
            falseCount: 0,
          }
          const evaluations = Number(stats.evaluations) || 0
          const trueCount = Number(stats.trueCount) || 0
          const truePercentage =
            evaluations > 0
              ? Math.round((trueCount / evaluations) * 10000) / 100
              : 0

          return {
            id: flag.id,
            key: flag.key,
            flagType: flag.flagType,
            rolloutPercentage: flag.rolloutPercentage,
            enabled: flag.enabled,
            evaluations,
            profileCount: Number(stats.profileCount) || 0,
            trueCount,
            falseCount: Number(stats.falseCount) || 0,
            truePercentage,
          }
        } catch (err) {
          this.logger.warn(
            { err, flagId: flag.id },
            'Failed to fetch flag stats',
          )
          return {
            id: flag.id,
            key: flag.key,
            flagType: flag.flagType,
            rolloutPercentage: flag.rolloutPercentage,
            enabled: flag.enabled,
            evaluations: 0,
            profileCount: 0,
            trueCount: 0,
            falseCount: 0,
            truePercentage: 0,
            note: 'No evaluation data yet',
          }
        }
      }

      if (flagId) {
        const flag = await this.featureFlagService.findOne({
          where: { id: flagId, project: { id: pid } },
        })
        if (!flag) {
          return { error: 'Feature flag not found' }
        }
        return {
          flag: await queryFlag(flag),
          period: { from: groupFromUTC, to: groupToUTC },
        }
      }

      const flags = await this.featureFlagService.findByProject(pid)
      if (!flags.length) {
        return {
          flags: [],
          period: { from: groupFromUTC, to: groupToUTC },
          note: 'No feature flags configured for this project',
        }
      }

      const flagsWithStats = await Promise.all(flags.map(queryFlag))
      return {
        flags: flagsWithStats,
        period: { from: groupFromUTC, to: groupToUTC },
      }
    } catch (error) {
      this.logger.error(
        { error, pid, params },
        'Error fetching feature flag stats',
      )
      return { error: 'Failed to fetch feature flag stats' }
    }
  }

  private async getExperimentResults(
    pid: string,
    params: {
      experimentId?: string
      period?: string
      from?: string
      to?: string
    },
    timezone: string,
  ) {
    const { experimentId, period = '7d', from, to } = params

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

      if (!experimentId) {
        const experiments = await this.experimentService.findByProject(pid)
        return {
          experiments: experiments.map((e) => ({
            id: e.id,
            name: e.name,
            status: e.status,
            startedAt: e.startedAt,
            endedAt: e.endedAt,
            variants: e.variants?.map((v) => ({
              key: v.key,
              name: v.name,
              isControl: v.isControl,
              rolloutPercentage: v.rolloutPercentage,
            })),
            goalId: e.goal?.id || null,
          })),
          note: 'Call this tool again with a specific experimentId to get exposure/conversion stats.',
          period: { from: groupFromUTC, to: groupToUTC },
        }
      }

      const experiment = await this.experimentService.findOne({
        where: { id: experimentId, project: { id: pid } },
        relations: ['variants', 'goal'],
      })

      if (!experiment) {
        return { error: 'Experiment not found' }
      }

      const exposuresQuery = `
        SELECT variantKey, uniqExact(profileId) as exposures
        FROM experiment_exposures
        WHERE pid = {pid:FixedString(12)}
          AND experimentId = {experimentId:String}
          AND created BETWEEN {groupFrom:String} AND {groupTo:String}
        GROUP BY variantKey
      `

      let exposures: { variantKey: string; exposures: number }[] = []
      try {
        const { data } = await clickhouse
          .query({
            query: exposuresQuery,
            query_params: {
              pid,
              experimentId,
              groupFrom: groupFromUTC,
              groupTo: groupToUTC,
            },
          })
          .then((r) => r.json())
        exposures = data as any
      } catch (err) {
        this.logger.warn(
          { err, experimentId },
          'Failed to fetch experiment exposures',
        )
      }

      let conversions: { variantKey: string; conversions: number }[] = []
      if (experiment.goal) {
        const table =
          experiment.goal.type === 'custom_event' ? 'customEV' : 'analytics'
        const matchColumn =
          experiment.goal.type === 'custom_event' ? 'ev' : 'pg'
        const matchCondition =
          experiment.goal.matchType === 'exact'
            ? `c.${matchColumn} = {goalValue:String}`
            : `c.${matchColumn} ILIKE concat('%', {goalValue:String}, '%')`

        const conversionsQuery = `
          SELECT e.variantKey, uniqExact(e.profileId) as conversions
          FROM experiment_exposures e
          INNER JOIN ${table} c ON e.pid = c.pid AND e.profileId = assumeNotNull(c.profileId)
          WHERE e.pid = {pid:FixedString(12)}
            AND e.experimentId = {experimentId:String}
            AND e.created BETWEEN {groupFrom:String} AND {groupTo:String}
            AND c.created BETWEEN {groupFrom:String} AND {groupTo:String}
            AND c.created >= e.created
            AND ${matchCondition}
          GROUP BY e.variantKey
        `

        try {
          const { data } = await clickhouse
            .query({
              query: conversionsQuery,
              query_params: {
                pid,
                experimentId,
                groupFrom: groupFromUTC,
                groupTo: groupToUTC,
                goalValue: experiment.goal.value || '',
              },
            })
            .then((r) => r.json())
          conversions = data as any
        } catch (err) {
          this.logger.warn(
            { err, experimentId },
            'Failed to fetch experiment conversions',
          )
        }
      }

      const exposuresMap = new Map(
        exposures.map((e) => [e.variantKey, Number(e.exposures)]),
      )
      const conversionsMap = new Map(
        conversions.map((c) => [c.variantKey, Number(c.conversions)]),
      )

      const variantResults = (experiment.variants || []).map((v) => {
        const exp = exposuresMap.get(v.key) || 0
        const conv = conversionsMap.get(v.key) || 0
        const rate = exp > 0 ? Math.round((conv / exp) * 10000) / 100 : 0
        return {
          key: v.key,
          name: v.name,
          isControl: v.isControl,
          rolloutPercentage: v.rolloutPercentage,
          exposures: exp,
          conversions: conv,
          conversionRate: rate,
        }
      })

      return {
        experiment: {
          id: experiment.id,
          name: experiment.name,
          status: experiment.status,
          startedAt: experiment.startedAt,
          endedAt: experiment.endedAt,
          goal: experiment.goal
            ? {
                id: experiment.goal.id,
                name: experiment.goal.name,
                type: experiment.goal.type,
              }
            : null,
        },
        variants: variantResults,
        totals: {
          exposures: variantResults.reduce((s, v) => s + v.exposures, 0),
          conversions: variantResults.reduce((s, v) => s + v.conversions, 0),
        },
        hasGoal: !!experiment.goal,
        period: { from: groupFromUTC, to: groupToUTC },
      }
    } catch (error) {
      this.logger.error(
        { error, pid, params },
        'Error fetching experiment results',
      )
      return { error: 'Failed to fetch experiment results' }
    }
  }

  private async getSessionsList(
    pid: string,
    params: {
      period?: string
      from?: string
      to?: string
      take?: number
      country?: string
      page?: string
    },
    timezone: string,
  ) {
    const { period = '7d', from, to, take = 10, country, page } = params

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

      const safeTake = Math.min(Math.max(Math.floor(take || 10), 1), 25)

      const extraWhere: string[] = []
      const queryParams: Record<string, string | number> = {
        pid,
        groupFrom: groupFromUTC,
        groupTo: groupToUTC,
        take: safeTake,
      }
      if (country) {
        extraWhere.push(`AND cc = {country:String}`)
        queryParams.country = country
      }
      if (page) {
        extraWhere.push(`AND pg = {page:String}`)
        queryParams.page = page
      }

      const sessionsQuery = `
        SELECT
          psid,
          any(cc) as country,
          any(rg) as region,
          any(ct) as city,
          any(os) as os,
          any(br) as browser,
          any(dv) as device,
          any(ref) as referrer,
          min(created) as startedAt,
          max(created) as endedAt,
          count(*) as pageviews
        FROM analytics
        WHERE pid = {pid:FixedString(12)}
          AND created BETWEEN {groupFrom:String} AND {groupTo:String}
          AND psid IS NOT NULL
          ${extraWhere.join(' ')}
        GROUP BY psid
        ORDER BY endedAt DESC
        LIMIT {take:UInt32}
      `

      const { data } = await clickhouse
        .query({ query: sessionsQuery, query_params: queryParams })
        .then((r) => r.json())

      return {
        sessions: (data as any[]).map((s) => ({
          ...s,
          durationSeconds:
            s.startedAt && s.endedAt
              ? Math.max(
                  0,
                  Math.round(
                    (new Date(s.endedAt).getTime() -
                      new Date(s.startedAt).getTime()) /
                      1000,
                  ),
                )
              : 0,
        })),
        period: { from: groupFromUTC, to: groupToUTC },
      }
    } catch (error) {
      this.logger.error({ error, pid, params }, 'Error fetching sessions list')
      return { error: 'Failed to fetch sessions' }
    }
  }

  private async getProfilesOverview(
    pid: string,
    params: {
      period?: string
      from?: string
      to?: string
    },
    timezone: string,
  ) {
    const { period = '7d', from, to } = params

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

      const overviewQuery = `
        SELECT
          uniqExact(profileId) as uniqueProfiles,
          uniqExactIf(profileId, profileId LIKE 'usr_%') as identifiedProfiles,
          uniqExact(psid) as sessions,
          count(*) as pageviews
        FROM analytics
        WHERE pid = {pid:FixedString(12)}
          AND created BETWEEN {groupFrom:String} AND {groupTo:String}
          AND profileId IS NOT NULL
      `

      const topProfilesQuery = `
        SELECT
          profileId,
          uniqExact(psid) as sessions,
          count(*) as pageviews,
          max(created) as lastSeen
        FROM analytics
        WHERE pid = {pid:FixedString(12)}
          AND created BETWEEN {groupFrom:String} AND {groupTo:String}
          AND profileId IS NOT NULL
        GROUP BY profileId
        ORDER BY pageviews DESC
        LIMIT 10
      `

      const topPagesQuery = `
        SELECT pg as name, uniqExact(profileId) as profiles
        FROM analytics
        WHERE pid = {pid:FixedString(12)}
          AND created BETWEEN {groupFrom:String} AND {groupTo:String}
          AND profileId IS NOT NULL
          AND pg IS NOT NULL AND pg != ''
        GROUP BY pg
        ORDER BY profiles DESC
        LIMIT 10
      `

      const params_ = { pid, groupFrom: groupFromUTC, groupTo: groupToUTC }

      const [overview, topProfiles, topPages] = await Promise.all([
        clickhouse
          .query({ query: overviewQuery, query_params: params_ })
          .then((r) => r.json()),
        clickhouse
          .query({ query: topProfilesQuery, query_params: params_ })
          .then((r) => r.json()),
        clickhouse
          .query({ query: topPagesQuery, query_params: params_ })
          .then((r) => r.json()),
      ])

      const stats = (overview.data as any)[0] || {}
      const uniqueProfiles = Number(stats.uniqueProfiles) || 0
      const sessions = Number(stats.sessions) || 0

      return {
        overview: {
          uniqueProfiles,
          identifiedProfiles: Number(stats.identifiedProfiles) || 0,
          sessions,
          pageviews: Number(stats.pageviews) || 0,
          sessionsPerProfile:
            uniqueProfiles > 0
              ? Math.round((sessions / uniqueProfiles) * 100) / 100
              : 0,
        },
        topProfiles: (topProfiles.data as any[]).map((p) => ({
          ...p,
          isIdentified:
            typeof p.profileId === 'string' && p.profileId.startsWith('usr_'),
        })),
        topPages: topPages.data,
        period: { from: groupFromUTC, to: groupToUTC },
      }
    } catch (error) {
      this.logger.error(
        { error, pid, params },
        'Error fetching profiles overview',
      )
      return { error: 'Failed to fetch profiles overview' }
    }
  }

  private buildFilterConditions(
    filters: Array<{
      column: string
      filter: string
      isExclusive?: boolean
      isContains?: boolean
    }>,
  ): { where: string; params: Record<string, string> } {
    if (_isEmpty(filters)) {
      return { where: '', params: {} }
    }

    // Group equality/contains filters by column so multiple values OR together,
    // matching the dashboard's behaviour (e.g. cc=US OR cc=CA OR cc=MX).
    const grouped = new Map<
      string,
      {
        eqInclude: string[]
        eqExclude: string[]
        containsInclude: string[]
        containsExclude: string[]
      }
    >()

    filters.forEach((f) => {
      // Validate column name against allowlist to prevent SQL injection
      if (!ALLOWED_FILTER_COLUMNS.has(f.column)) {
        return // Skip invalid columns
      }

      const bucket = grouped.get(f.column) ?? {
        eqInclude: [],
        eqExclude: [],
        containsInclude: [],
        containsExclude: [],
      }

      if (f.isContains && f.isExclusive) bucket.containsExclude.push(f.filter)
      else if (f.isContains) bucket.containsInclude.push(f.filter)
      else if (f.isExclusive) bucket.eqExclude.push(f.filter)
      else bucket.eqInclude.push(f.filter)

      grouped.set(f.column, bucket)
    })

    const conditions: string[] = []
    const params: Record<string, string> = {}
    let paramIndex = 0
    const nextParam = (value: string): string => {
      const name = `filter_${paramIndex++}`
      params[name] = value
      return name
    }

    grouped.forEach((bucket, column) => {
      if (bucket.eqInclude.length > 0) {
        const placeholders = bucket.eqInclude.map(
          (v) => `${column} = {${nextParam(v)}:String}`,
        )
        conditions.push(`(${placeholders.join(' OR ')})`)
      }
      if (bucket.containsInclude.length > 0) {
        const placeholders = bucket.containsInclude.map(
          (v) => `${column} ILIKE concat('%', {${nextParam(v)}:String}, '%')`,
        )
        conditions.push(`(${placeholders.join(' OR ')})`)
      }
      bucket.eqExclude.forEach((v) => {
        conditions.push(`${column} != {${nextParam(v)}:String}`)
      })
      bucket.containsExclude.forEach((v) => {
        conditions.push(
          `${column} NOT ILIKE concat('%', {${nextParam(v)}:String}, '%')`,
        )
      })
    })

    return {
      where: conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '',
      params,
    }
  }
}

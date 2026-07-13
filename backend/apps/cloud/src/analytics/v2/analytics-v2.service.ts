import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnprocessableEntityException,
} from '@nestjs/common'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

import { clickhouse } from '../../common/integrations/clickhouse'
import { AppLoggerService } from '../../logger/logger.service'
import { MAX_METRICS_IN_VIEW } from '../../project/dto/create-project-view.dto'
import { IFunnel, PerfMeasure } from '../interfaces'
import {
  AnalyticsService,
  getLowestPossibleTimeBucket,
} from '../analytics.service'
import { ChartRenderMode, TimeBucketType } from '../dto/getData.dto'
import { GetCustomEventMetadata } from '../dto/get-custom-event-meta.dto'
import { GetPagePropertyMetaDto } from '../dto/get-page-property-meta.dto'
import {
  findDimension,
  getBreakdownDimension,
  getMetric,
  listDimensions,
  listMetrics,
  parseMetricsParam,
  V2_TO_V1_DATATYPE,
  V2DataType,
  V2MetricDef,
} from './registry'
import {
  parseV2Filters,
  toV1FiltersJson,
  V2Filter,
} from './query/filters.translator'
import {
  buildBreakdownQuery,
  parseSortParam,
} from './query/breakdown-query.builder'
import {
  computeBounceRateSeries,
  toIsoTimestamp,
  zipTimeseries,
  TimeseriesRow,
} from './mappers/timeseries.mapper'
import { renameEntityKeys, renameEntityList } from './mappers/entity.mapper'
import { mapTrafficSummary, V1TrafficSummary } from './mappers/summary.mapper'
import { envelope, V2Envelope } from './mappers/envelope'
import {
  V2_DEFAULT_PERIOD,
  V2BaseQueryDto,
  V2BreakdownDto,
  V2TimeseriesDto,
} from './dto/v2-base.dto'

dayjs.extend(utc)

type EventsAllTimeType =
  | 'pageview'
  | 'custom_event'
  | 'performance'
  | 'error'
  | 'captcha'

const ALL_TIME_EVENT_TYPES: Record<V2DataType, readonly EventsAllTimeType[]> = {
  traffic: ['pageview', 'custom_event', 'error'],
  performance: ['performance'],
  captcha: ['captcha'],
  errors: ['error'],
}

/** Traffic metrics computable per time bucket by the v1 chart query */
const TRAFFIC_TIMESERIES_METRICS = [
  'visitors',
  'pageviews',
  'session_duration',
  'bounce_rate',
  'concurrency',
]

/** Performance metrics computable per time bucket (v2 name -> v1 chart key) */
const PERFORMANCE_TIMESERIES_METRICS: Record<string, string> = {
  dns: 'dns',
  tls: 'tls',
  connection: 'conn',
  response: 'response',
  render: 'render',
  dom_load: 'domLoad',
  ttfb: 'ttfb',
}

/** Captcha counters computable per time bucket (v2 name -> v1 chart key) */
const CAPTCHA_TIMESERIES_METRICS: Record<string, string> = {
  generated: 'generated',
  passed: 'passed',
  failed: 'failed',
  validation_failed: 'validationFailed',
  replayed: 'replayed',
}

const ONLINE_VISITORS_WINDOW_MINUTES = 5

export interface ResolvedTimeframe {
  period: string | null
  timeBucket: TimeBucketType | null
  allowedTimeBuckets: TimeBucketType[] | null
  safeTimezone: string
  /** Timezone-shifted bounds (YYYY-MM-DD HH:mm:ss) */
  groupFrom: string
  groupTo: string
  /** UTC bounds used as ClickHouse query params */
  groupFromUTC: string
  groupToUTC: string
}

interface PreparedFilters {
  appliedFilters: V2Filter[]
  v1FiltersJson: string
  filtersQuery: string
  filtersParams: Record<string, unknown>
  customEVFilterApplied: boolean
}

const DEFAULT_BREAKDOWN_LIMIT = 30

@Injectable()
export class AnalyticsV2Service {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly logger: AppLoggerService,
  ) {}

  async assertReadAccess(
    pid: string,
    uid: string | null,
    password?: string,
  ): Promise<void> {
    await this.analyticsService.checkProjectAccess(pid, uid, password)
    await this.analyticsService.checkBillingAccess(pid)
  }

  /**
   * Resolve period/from/to/timeBucket/timezone into concrete query bounds.
   * Centralizes the v1 `period=all` dance (first-event lookup -> diff ->
   * allowed time buckets) in a single place.
   */
  async resolveTimeframe(opts: {
    pid: string
    dataType: V2DataType
    period?: string
    from?: string
    to?: string
    timeBucket?: TimeBucketType
    timezone?: string
    /** Override the event types used for the period=all first-event lookup */
    allTimeEventTypes?: readonly EventsAllTimeType[]
  }): Promise<ResolvedTimeframe> {
    const { pid, dataType, from, to, timezone } = opts

    const safeTimezone = this.analyticsService.getSafeTimezone(timezone)

    if (Boolean(from) !== Boolean(to)) {
      throw new BadRequestException(
        "The 'from' and 'to' parameters must be provided together",
      )
    }

    const hasCustomRange = Boolean(from && to)
    const period = hasCustomRange
      ? null
      : opts.period && opts.period !== 'custom'
        ? opts.period
        : V2_DEFAULT_PERIOD

    let timeBucket =
      opts.timeBucket ||
      getLowestPossibleTimeBucket(
        period ?? undefined,
        hasCustomRange ? from : undefined,
        hasCustomRange ? to : undefined,
      )

    let diff: number | undefined
    let allowedTimeBuckets: TimeBucketType[] | null = null

    if (period === 'all') {
      const allTime = await this.analyticsService.calculateTimeBucketForAllTime(
        pid,
        opts.allTimeEventTypes ?? ALL_TIME_EVENT_TYPES[dataType],
      )

      diff = allTime.diff
      allowedTimeBuckets = allTime.timeBucket
      timeBucket =
        opts.timeBucket && allTime.timeBucket.includes(opts.timeBucket)
          ? opts.timeBucket
          : allTime.timeBucket[0]
    }

    const { groupFrom, groupTo, groupFromUTC, groupToUTC } =
      this.analyticsService.getGroupFromTo(
        hasCustomRange ? from : undefined,
        hasCustomRange ? to : undefined,
        timeBucket,
        period ?? undefined,
        safeTimezone,
        diff,
      )

    return {
      period,
      timeBucket,
      allowedTimeBuckets,
      safeTimezone,
      groupFrom,
      groupTo,
      groupFromUTC,
      groupToUTC,
    }
  }

  prepareFilters(
    filters: string | undefined,
    dataType: V2DataType,
    ignoreEV?: boolean,
  ): PreparedFilters {
    const appliedFilters = parseV2Filters(filters)
    const v1FiltersJson = toV1FiltersJson(appliedFilters, dataType)

    const [filtersQuery, filtersParams, , customEVFilterApplied] =
      this.analyticsService.getFiltersQuery(
        v1FiltersJson,
        V2_TO_V1_DATATYPE[dataType],
        ignoreEV,
      )

    return {
      appliedFilters,
      v1FiltersJson,
      filtersQuery,
      filtersParams,
      customEVFilterApplied,
    }
  }

  buildSubQuery(
    dataType: V2DataType,
    filtersQuery: string,
    customEVFilterApplied: boolean,
  ): string {
    if (dataType === 'traffic') {
      return this.analyticsService.buildAnalyticsEventsSubQuery(
        filtersQuery,
        customEVFilterApplied,
      )
    }

    if (dataType === 'captcha') {
      return this.analyticsService.buildAnalyticsEventsSubQuery(
        filtersQuery,
        false,
        true,
      )
    }

    const eventType = dataType === 'performance' ? 'performance' : 'error'

    return `FROM events WHERE pid = {pid:FixedString(12)} AND type = '${eventType}' ${filtersQuery} AND created BETWEEN {groupFrom:String} AND {groupTo:String}`
  }

  private baseMeta(
    pid: string,
    timeframe: ResolvedTimeframe,
    appliedFilters: V2Filter[],
  ): Record<string, unknown> {
    return {
      pid,
      period: timeframe.period,
      from: toIsoTimestamp(timeframe.groupFrom, timeframe.safeTimezone),
      to: toIsoTimestamp(timeframe.groupTo, timeframe.safeTimezone),
      timezone: timeframe.safeTimezone,
      appliedFilters,
    }
  }

  async getBreakdown(
    pid: string,
    dto: V2BreakdownDto,
    dataType: V2DataType,
    measure?: PerfMeasure,
  ): Promise<V2Envelope<Record<string, unknown>[]>> {
    const dimension = getBreakdownDimension(dto.dimension, dataType)
    // Session-scoped virtual dimensions (entry/exit page) only support
    // 'visitors', so the per-type defaults don't apply to them
    const metrics =
      dimension.virtual && !dto.metrics
        ? [getMetric('visitors', dataType)]
        : parseMetricsParam(dto.metrics, dataType)
    // v1 parity: performance and error queries ignore custom-event filters
    const filters = this.prepareFilters(
      dto.filters,
      dataType,
      dataType === 'performance' || dataType === 'errors',
    )
    const timeframe = await this.resolveTimeframe({
      pid,
      dataType,
      period: dto.period,
      from: dto.from,
      to: dto.to,
      timezone: dto.timezone,
    })

    const limit = dto.limit ?? DEFAULT_BREAKDOWN_LIMIT
    const offset = dto.offset ?? 0
    const sort = parseSortParam(dto.sort, dimension, metrics)
    const subQuery = this.buildSubQuery(
      dataType,
      filters.filtersQuery,
      filters.customEVFilterApplied,
    )

    const meta: Record<string, unknown> = {
      ...this.baseMeta(pid, timeframe, filters.appliedFilters),
      dimension: dimension.api,
      metrics: metrics.map((metric) => metric.api),
      limit,
      offset,
      sort: `${sort.field}:${sort.direction}`,
    }

    if (dimension.virtual) {
      const rows = await this.getVirtualPageBreakdown(
        dimension.virtual,
        dataType,
        metrics,
        filters,
        subQuery,
        {
          pid,
          groupFrom: timeframe.groupFromUTC,
          groupTo: timeframe.groupToUTC,
          ...filters.filtersParams,
        },
        sort,
      )

      meta.total = rows.length

      return envelope(rows.slice(offset, offset + limit), meta)
    }

    const query = buildBreakdownQuery({
      dataType,
      dimension,
      metrics,
      subQuery,
      ctx: {
        customEVFilterApplied: filters.customEVFilterApplied,
        measure,
      },
      sort,
    })

    const { data } = await clickhouse
      .query({
        query,
        query_params: {
          pid,
          groupFrom: timeframe.groupFromUTC,
          groupTo: timeframe.groupToUTC,
          ...filters.filtersParams,
          v2_limit: limit,
          v2_offset: offset,
        },
      })
      .then((resultSet) => resultSet.json<Record<string, unknown>>())

    let total = 0

    const rows = (data || []).map((row) => {
      const { __total, value, ...rest } = row

      total = Number(__total) || 0

      const mapped: Record<string, unknown> = { value }

      for (const field of dimension.extraFields ?? []) {
        mapped[field.api] = rest[field.api] ?? null
      }

      for (const metric of metrics) {
        mapped[metric.api] = Number(rest[metric.api]) || 0
      }

      return mapped
    })

    meta.total = total

    return envelope(rows, meta)
  }

  private async getVirtualPageBreakdown(
    kind: 'entry_page' | 'exit_page',
    dataType: V2DataType,
    metrics: V2MetricDef[],
    filters: PreparedFilters,
    subQuery: string,
    params: Record<string, unknown>,
    sort: { field: string; direction: 'asc' | 'desc' },
  ): Promise<Record<string, unknown>[]> {
    if (dataType !== 'traffic') {
      throw new UnprocessableEntityException(
        `The '${kind}' dimension is only available for traffic breakdowns`,
      )
    }

    if (filters.customEVFilterApplied) {
      throw new UnprocessableEntityException(
        `The '${kind}' dimension cannot be combined with custom event filters`,
      )
    }

    const unsupported = metrics.filter((metric) => metric.api !== 'visitors')

    if (unsupported.length > 0) {
      throw new UnprocessableEntityException(
        `The '${kind}' dimension only supports the 'visitors' metric`,
      )
    }

    const paramsData = { params }

    const rows =
      kind === 'entry_page'
        ? await this.analyticsService.getEntryPages(subQuery, paramsData)
        : await this.analyticsService.getExitPages(subQuery, paramsData)

    const mapped = (rows || []).map((row) => ({
      value: row.name,
      visitors: Number(row.count) || 0,
    }))

    const directionFactor = sort.direction === 'asc' ? 1 : -1

    mapped.sort((a, b) => {
      if (sort.field === 'value') {
        return String(a.value).localeCompare(String(b.value)) * directionFactor
      }

      return (a.visitors - b.visitors) * directionFactor
    })

    return mapped
  }

  async getTrafficTimeseries(
    pid: string,
    dto: V2TimeseriesDto,
  ): Promise<V2Envelope<TimeseriesRow[]>> {
    const dataType: V2DataType = 'traffic'
    const metrics = parseMetricsParam(dto.metrics, dataType)

    for (const metric of metrics) {
      if (!TRAFFIC_TIMESERIES_METRICS.includes(metric.api)) {
        throw new UnprocessableEntityException(
          `The '${metric.api}' metric is not supported on the traffic timeseries. Supported metrics: ${TRAFFIC_TIMESERIES_METRICS.join(', ')}`,
        )
      }
    }

    const filters = this.prepareFilters(dto.filters, dataType)
    const timeframe = await this.resolveTimeframe({
      pid,
      dataType,
      period: dto.period,
      from: dto.from,
      to: dto.to,
      timeBucket: dto.timeBucket,
      timezone: dto.timezone,
    })

    const mode = dto.mode || ChartRenderMode.PERIODICAL

    // Concurrency (live visitors over time) runs an extra ClickHouse query, so
    // it is only reconstructed when the metric is explicitly requested
    const includeConcurrency = metrics.some(
      (metric) => metric.api === 'concurrency',
    )

    const result = (await this.analyticsService.groupChartByTimeBucket(
      timeframe.timeBucket,
      timeframe.groupFrom,
      timeframe.groupTo,
      filters.filtersQuery,
      {
        params: {
          pid,
          groupFrom: timeframe.groupFromUTC,
          groupTo: timeframe.groupToUTC,
          ...filters.filtersParams,
        },
      },
      timeframe.safeTimezone,
      filters.customEVFilterApplied,
      mode,
      includeConcurrency,
    )) as {
      chart: {
        x: string[]
        visits: number[]
        uniques: number[]
        sdur: number[]
        bounces?: number[]
        concurrency?: number[]
      }
    }

    const { chart } = result

    const availableSeries: Record<string, (number | null)[] | undefined> = {
      visitors: chart.uniques,
      pageviews: chart.visits,
      session_duration: chart.sdur,
      bounce_rate: computeBounceRateSeries(chart.bounces, chart.uniques),
      concurrency: chart.concurrency,
    }

    const series: Record<string, (number | null)[] | undefined> = {}

    for (const metric of metrics) {
      series[metric.api] = availableSeries[metric.api]
    }

    return envelope(zipTimeseries(chart.x, series, timeframe.safeTimezone), {
      ...this.baseMeta(pid, timeframe, filters.appliedFilters),
      timeBucket: timeframe.timeBucket,
      allowedTimeBuckets: timeframe.allowedTimeBuckets,
      metrics: metrics.map((metric) => metric.api),
      mode,
    })
  }

  async getTrafficSummary(
    pid: string,
    dto: V2BaseQueryDto,
  ): Promise<V2Envelope<ReturnType<typeof mapTrafficSummary>>> {
    const dataType: V2DataType = 'traffic'
    const appliedFilters = parseV2Filters(dto.filters)
    const v1FiltersJson = toV1FiltersJson(appliedFilters, dataType)

    const hasCustomRange = Boolean(dto.from && dto.to)

    if (Boolean(dto.from) !== Boolean(dto.to)) {
      throw new BadRequestException(
        "The 'from' and 'to' parameters must be provided together",
      )
    }

    const period = hasCustomRange
      ? undefined
      : dto.period && dto.period !== 'custom'
        ? dto.period
        : V2_DEFAULT_PERIOD

    const result = await this.analyticsService.getAnalyticsSummary(
      [pid],
      undefined,
      period,
      hasCustomRange ? dto.from : undefined,
      hasCustomRange ? dto.to : undefined,
      dto.timezone,
      v1FiltersJson,
      false,
    )

    const summary = result?.[pid] as V1TrafficSummary | undefined

    if (!summary) {
      throw new InternalServerErrorException(
        'Failed to compute the traffic summary for this project',
      )
    }

    return envelope(mapTrafficSummary(summary), {
      pid,
      period: period ?? null,
      from: hasCustomRange ? dto.from : undefined,
      to: hasCustomRange ? dto.to : undefined,
      timezone: this.analyticsService.getSafeTimezone(dto.timezone),
      appliedFilters,
    })
  }

  async getTrafficCustomEvents(
    pid: string,
    dto: V2BaseQueryDto & { limit?: number; offset?: number },
  ): Promise<V2Envelope<{ event: string; count: number }[]>> {
    const dataType: V2DataType = 'traffic'
    const filters = this.prepareFilters(dto.filters, dataType)
    const timeframe = await this.resolveTimeframe({
      pid,
      dataType,
      period: dto.period,
      from: dto.from,
      to: dto.to,
      timezone: dto.timezone,
    })

    const customs = await this.analyticsService.getCustomEvents(
      filters.filtersQuery,
      {
        params: {
          pid,
          groupFrom: timeframe.groupFromUTC,
          groupTo: timeframe.groupToUTC,
          ...filters.filtersParams,
        },
      },
    )

    const rows = Object.entries(customs || {})
      .map(([event, count]) => ({ event, count: Number(count) || 0 }))
      .sort((a, b) => b.count - a.count)

    const limit = dto.limit ?? DEFAULT_BREAKDOWN_LIMIT
    const offset = dto.offset ?? 0

    return envelope(rows.slice(offset, offset + limit), {
      ...this.baseMeta(pid, timeframe, filters.appliedFilters),
      total: rows.length,
      limit,
      offset,
    })
  }

  async getTrafficCustomMetrics(
    pid: string,
    dto: V2BaseQueryDto & { metrics: string },
  ): Promise<V2Envelope<unknown[]>> {
    const dataType: V2DataType = 'traffic'
    const filters = this.prepareFilters(dto.filters, dataType)
    const timeframe = await this.resolveTimeframe({
      pid,
      dataType,
      period: dto.period,
      from: dto.from,
      to: dto.to,
      timezone: dto.timezone,
    })

    const parsedMetrics = this.analyticsService.parseMetrics(dto.metrics)

    if (parsedMetrics.length > MAX_METRICS_IN_VIEW) {
      throw new UnprocessableEntityException(
        `The maximum number of metrics within one request is ${MAX_METRICS_IN_VIEW}`,
      )
    }

    if (!parsedMetrics.length) {
      return envelope([], this.baseMeta(pid, timeframe, filters.appliedFilters))
    }

    const meta = await this.analyticsService.getMetaResults(
      pid,
      parsedMetrics,
      filters.filtersQuery,
      {
        params: {
          pid,
          groupFrom: timeframe.groupFromUTC,
          groupTo: timeframe.groupToUTC,
          ...filters.filtersParams,
        },
      },
      timeframe.safeTimezone,
      timeframe.period ?? undefined,
      dto.from,
      dto.to,
    )

    return envelope(
      meta ?? [],
      this.baseMeta(pid, timeframe, filters.appliedFilters),
    )
  }

  async getTrafficPageProperties(
    pid: string,
    dto: V2BaseQueryDto & { limit?: number; offset?: number },
  ): Promise<V2Envelope<{ property: string; count: number }[]>> {
    const dataType: V2DataType = 'traffic'
    const filters = this.prepareFilters(dto.filters, dataType)

    if (filters.customEVFilterApplied) {
      throw new UnprocessableEntityException(
        'Page properties cannot be combined with custom event filters',
      )
    }

    const timeframe = await this.resolveTimeframe({
      pid,
      dataType,
      period: dto.period,
      from: dto.from,
      to: dto.to,
      timezone: dto.timezone,
    })

    const properties = await this.analyticsService.getPageProperties(
      filters.filtersQuery,
      {
        params: {
          pid,
          groupFrom: timeframe.groupFromUTC,
          groupTo: timeframe.groupToUTC,
          ...filters.filtersParams,
        },
      },
    )

    const rows = Object.entries(properties || {})
      .map(([property, count]) => ({ property, count: Number(count) || 0 }))
      .sort((a, b) => b.count - a.count)

    const limit = dto.limit ?? DEFAULT_BREAKDOWN_LIMIT
    const offset = dto.offset ?? 0

    return envelope(rows.slice(offset, offset + limit), {
      ...this.baseMeta(pid, timeframe, filters.appliedFilters),
      total: rows.length,
      limit,
      offset,
    })
  }

  async getTrafficUserFlow(
    pid: string,
    dto: V2BaseQueryDto,
  ): Promise<V2Envelope<unknown>> {
    const dataType: V2DataType = 'traffic'
    const filters = this.prepareFilters(dto.filters, dataType, true)
    const timeframe = await this.resolveTimeframe({
      pid,
      dataType,
      period: dto.period,
      from: dto.from,
      to: dto.to,
      timezone: dto.timezone,
      allTimeEventTypes: ['pageview'],
    })

    // v1 parity: the user-flow query compares `created` against the
    // timezone-shifted bounds directly
    const flow = await this.analyticsService.getUserFlow(
      {
        pid,
        groupFrom: timeframe.groupFrom,
        groupTo: timeframe.groupTo,
        ...filters.filtersParams,
      },
      filters.filtersQuery,
    )

    return envelope(flow, this.baseMeta(pid, timeframe, filters.appliedFilters))
  }

  async getPerformanceTimeseries(
    pid: string,
    dto: V2TimeseriesDto & { measure?: string },
  ): Promise<V2Envelope<TimeseriesRow[]>> {
    const dataType: V2DataType = 'performance'
    const measure = (dto.measure || 'median') as PerfMeasure

    this.analyticsService.checkIfPerfMeasureIsValid(measure)

    const filters = this.prepareFilters(dto.filters, dataType, true)
    const timeframe = await this.resolveTimeframe({
      pid,
      dataType,
      period: dto.period,
      from: dto.from,
      to: dto.to,
      timeBucket: dto.timeBucket,
      timezone: dto.timezone,
    })

    const chart = (await this.analyticsService.getPerfChartData(
      timeframe.timeBucket,
      timeframe.groupFrom,
      timeframe.groupTo,
      filters.filtersQuery,
      {
        params: {
          pid,
          groupFrom: timeframe.groupFromUTC,
          groupTo: timeframe.groupToUTC,
          ...filters.filtersParams,
        },
      },
      timeframe.safeTimezone,
      measure,
    )) as { x: string[] } & Record<string, (number | null)[]>

    const series: Record<string, (number | null)[] | undefined> = {}
    let metricNames: string[]

    if (measure === 'quantiles') {
      metricNames = ['p50', 'p75', 'p95']

      for (const name of metricNames) {
        series[name] = chart[name]
      }
    } else {
      metricNames = dto.metrics
        ? [
            ...new Set(
              dto.metrics
                .split(',')
                .map((name) => name.trim())
                .filter(Boolean),
            ),
          ]
        : Object.keys(PERFORMANCE_TIMESERIES_METRICS)

      for (const name of metricNames) {
        const v1Key = Object.hasOwn(PERFORMANCE_TIMESERIES_METRICS, name)
          ? PERFORMANCE_TIMESERIES_METRICS[name]
          : undefined

        if (!v1Key) {
          throw new UnprocessableEntityException(
            `The '${name}' metric is not supported on the performance timeseries. Supported metrics: ${Object.keys(PERFORMANCE_TIMESERIES_METRICS).join(', ')}`,
          )
        }

        series[name] = chart[v1Key]
      }
    }

    return envelope(zipTimeseries(chart.x, series, timeframe.safeTimezone), {
      ...this.baseMeta(pid, timeframe, filters.appliedFilters),
      timeBucket: timeframe.timeBucket,
      allowedTimeBuckets: timeframe.allowedTimeBuckets,
      metrics: metricNames,
      measure,
    })
  }

  async getPerformanceSummary(
    pid: string,
    dto: V2BaseQueryDto & { measure?: string },
  ): Promise<V2Envelope<Record<string, unknown>>> {
    const dataType: V2DataType = 'performance'
    let measure = (dto.measure || 'median') as PerfMeasure

    this.analyticsService.checkIfPerfMeasureIsValid(measure)

    // v1 parity: quantiles is a timeseries-only measure; birdseye maps it to median
    if (measure === 'quantiles') {
      measure = 'median'
    }

    const appliedFilters = parseV2Filters(dto.filters)
    const v1FiltersJson = toV1FiltersJson(appliedFilters, dataType)

    if (Boolean(dto.from) !== Boolean(dto.to)) {
      throw new BadRequestException(
        "The 'from' and 'to' parameters must be provided together",
      )
    }

    const hasCustomRange = Boolean(dto.from && dto.to)
    const period = hasCustomRange
      ? undefined
      : dto.period && dto.period !== 'custom'
        ? dto.period
        : V2_DEFAULT_PERIOD

    const result = await this.analyticsService.getPerformanceSummary(
      [pid],
      period,
      hasCustomRange ? dto.from : undefined,
      hasCustomRange ? dto.to : undefined,
      dto.timezone,
      v1FiltersJson,
      measure,
    )

    const summary = result?.[pid] as
      | {
          current: Record<string, number>
          previous: Record<string, number>
          frontendChange: number
          networkChange: number
          backendChange: number
        }
      | undefined

    if (!summary) {
      throw new InternalServerErrorException(
        'Failed to compute the performance summary for this project',
      )
    }

    return envelope(
      {
        current: summary.current,
        previous: summary.previous,
        change: {
          frontend: summary.frontendChange,
          network: summary.networkChange,
          backend: summary.backendChange,
        },
      },
      {
        pid,
        period: period ?? null,
        from: hasCustomRange ? dto.from : undefined,
        to: hasCustomRange ? dto.to : undefined,
        timezone: this.analyticsService.getSafeTimezone(dto.timezone),
        measure,
        appliedFilters,
      },
    )
  }

  async getCaptchaTimeseries(
    pid: string,
    dto: V2TimeseriesDto,
  ): Promise<V2Envelope<TimeseriesRow[]>> {
    const dataType: V2DataType = 'captcha'
    const filters = this.prepareFilters(dto.filters, dataType)
    const timeframe = await this.resolveTimeframe({
      pid,
      dataType,
      period: dto.period,
      from: dto.from,
      to: dto.to,
      timeBucket: dto.timeBucket,
      timezone: dto.timezone,
    })

    const mode = dto.mode || ChartRenderMode.PERIODICAL

    const { xShifted } = this.analyticsService.generateXAxis(
      timeframe.timeBucket,
      timeframe.groupFrom,
      timeframe.groupTo,
      timeframe.safeTimezone,
    )

    const query = this.analyticsService.generateCaptchaAggregationQuery(
      timeframe.timeBucket,
      filters.filtersQuery,
      mode,
    )

    const { data } = await clickhouse
      .query({
        query,
        query_params: {
          pid,
          groupFrom: timeframe.groupFromUTC,
          groupTo: timeframe.groupToUTC,
          ...filters.filtersParams,
          timezone: timeframe.safeTimezone,
        },
      })
      .then((resultSet) => resultSet.json<Record<string, unknown>>())

    const chart = this.analyticsService.extractCaptchaChartData(
      data,
      xShifted,
    ) as Record<string, number[]>

    const metricNames = dto.metrics
      ? [
          ...new Set(
            dto.metrics
              .split(',')
              .map((name) => name.trim())
              .filter(Boolean),
          ),
        ]
      : Object.keys(CAPTCHA_TIMESERIES_METRICS)

    const series: Record<string, (number | null)[] | undefined> = {}

    for (const name of metricNames) {
      const v1Key = Object.hasOwn(CAPTCHA_TIMESERIES_METRICS, name)
        ? CAPTCHA_TIMESERIES_METRICS[name]
        : undefined

      if (!v1Key) {
        throw new UnprocessableEntityException(
          `The '${name}' metric is not supported on the captcha timeseries. Supported metrics: ${Object.keys(CAPTCHA_TIMESERIES_METRICS).join(', ')}`,
        )
      }

      series[name] = chart[v1Key]
    }

    return envelope(zipTimeseries(xShifted, series, timeframe.safeTimezone), {
      ...this.baseMeta(pid, timeframe, filters.appliedFilters),
      timeBucket: timeframe.timeBucket,
      allowedTimeBuckets: timeframe.allowedTimeBuckets,
      metrics: metricNames,
      mode,
    })
  }

  async getCaptchaSummary(
    pid: string,
    dto: V2BaseQueryDto,
  ): Promise<V2Envelope<Record<string, unknown>>> {
    const dataType: V2DataType = 'captcha'
    const filters = this.prepareFilters(dto.filters, dataType)
    const timeframe = await this.resolveTimeframe({
      pid,
      dataType,
      period: dto.period,
      from: dto.from,
      to: dto.to,
      timezone: dto.timezone,
    })

    const baseParams = {
      pid,
      groupFrom: timeframe.groupFromUTC,
      groupTo: timeframe.groupToUTC,
      ...filters.filtersParams,
    }

    const currentPromise = this.analyticsService.getCaptchaSummary(
      filters.filtersQuery,
      { params: baseParams },
    )

    // Previous period of the same length (v1 parity; skipped for period=all)
    let previousPromise: Promise<object | null> = Promise.resolve(null)

    if (timeframe.period !== 'all') {
      const periodSubtracted = dayjs
        .utc(timeframe.groupFromUTC)
        .subtract(
          Math.abs(
            dayjs
              .utc(timeframe.groupFromUTC)
              .diff(dayjs.utc(timeframe.groupToUTC), 'minutes'),
          ),
          'minutes',
        )
        .format('YYYY-MM-DD HH:mm:ss')

      previousPromise = this.analyticsService.getCaptchaSummary(
        filters.filtersQuery,
        {
          params: {
            ...baseParams,
            groupFrom: periodSubtracted,
            groupTo: timeframe.groupFromUTC,
          },
        },
      )
    }

    const [current, previous] = await Promise.all([
      currentPromise,
      previousPromise,
    ])

    return envelope(
      { current, previous },
      this.baseMeta(pid, timeframe, filters.appliedFilters),
    )
  }

  async getErrorsList(
    pid: string,
    dto: V2BaseQueryDto & {
      limit?: number
      offset?: number
      show_resolved?: boolean
    },
  ): Promise<V2Envelope<Record<string, unknown>[]>> {
    const dataType: V2DataType = 'errors'
    const filters = this.prepareFilters(dto.filters, dataType, true)
    const timeframe = await this.resolveTimeframe({
      pid,
      dataType,
      period: dto.period,
      from: dto.from,
      to: dto.to,
      timezone: dto.timezone,
    })

    const limit = dto.limit ?? DEFAULT_BREAKDOWN_LIMIT
    const offset = dto.offset ?? 0

    const errors = await this.analyticsService.getErrorsList(
      JSON.stringify({ showResolved: Boolean(dto.show_resolved) }),
      filters.filtersQuery,
      {
        params: {
          pid,
          groupFrom: timeframe.groupFromUTC,
          groupTo: timeframe.groupToUTC,
          ...filters.filtersParams,
        },
      },
      timeframe.safeTimezone,
      limit,
      offset,
    )

    return envelope(renameEntityList(errors), {
      ...this.baseMeta(pid, timeframe, filters.appliedFilters),
      limit,
      offset,
      showResolved: Boolean(dto.show_resolved),
    })
  }

  async getErrorsTimeseries(
    pid: string,
    dto: V2TimeseriesDto,
  ): Promise<V2Envelope<TimeseriesRow[]>> {
    const dataType: V2DataType = 'errors'
    const filters = this.prepareFilters(dto.filters, dataType, true)
    const timeframe = await this.resolveTimeframe({
      pid,
      dataType,
      period: dto.period,
      from: dto.from,
      to: dto.to,
      timeBucket: dto.timeBucket,
      timezone: dto.timezone,
    })

    const mode = dto.mode || ChartRenderMode.PERIODICAL

    // v1 parity: error occurrences are bucketed in UTC, labels are shifted
    // to the requested timezone afterwards
    const { x, format } = this.analyticsService.generateUTCXAxis(
      timeframe.timeBucket,
      timeframe.groupFromUTC,
      timeframe.groupToUTC,
    )

    const query = this.analyticsService.generateErrorsAggregationQuery(
      timeframe.timeBucket,
      filters.filtersQuery,
      mode,
    )

    const { data } = await clickhouse
      .query({
        query,
        query_params: {
          pid,
          groupFrom: timeframe.groupFromUTC,
          groupTo: timeframe.groupToUTC,
          ...filters.filtersParams,
        },
      })
      .then((resultSet) => resultSet.json<Record<string, unknown>>())

    const { count, affectedUsers } =
      this.analyticsService.extractErrorsChartData(data as never[], x)

    const labels = this.analyticsService.shiftToTimezone(
      x,
      timeframe.safeTimezone,
      format,
    )

    const availableSeries: Record<string, (number | null)[] | undefined> = {
      occurrences: count,
      affected_users: affectedUsers,
    }

    const metricNames = dto.metrics
      ? [
          ...new Set(
            dto.metrics
              .split(',')
              .map((name) => name.trim())
              .filter(Boolean),
          ),
        ]
      : Object.keys(availableSeries)

    const series: Record<string, (number | null)[] | undefined> = {}

    for (const name of metricNames) {
      if (!Object.hasOwn(availableSeries, name) || !availableSeries[name]) {
        throw new UnprocessableEntityException(
          `The '${name}' metric is not supported on the errors timeseries. Supported metrics: ${Object.keys(availableSeries).join(', ')}`,
        )
      }

      series[name] = availableSeries[name]
    }

    return envelope(zipTimeseries(labels, series, timeframe.safeTimezone), {
      ...this.baseMeta(pid, timeframe, filters.appliedFilters),
      timeBucket: timeframe.timeBucket,
      allowedTimeBuckets: timeframe.allowedTimeBuckets,
      metrics: metricNames,
      mode,
    })
  }

  async getErrorsOverview(
    pid: string,
    dto: V2BaseQueryDto & { show_resolved?: boolean },
  ): Promise<V2Envelope<unknown>> {
    const dataType: V2DataType = 'errors'
    const filters = this.prepareFilters(dto.filters, dataType, true)

    // Session-scoped stats inside the overview run against traffic data;
    // error-specific filters are dropped for that part (v1 parity)
    const sessionV1FiltersJson = toV1FiltersJson(
      filters.appliedFilters,
      'traffic',
      { lenient: true },
    )
    const [sessionFiltersQuery, sessionFiltersParams] =
      this.analyticsService.getFiltersQuery(
        sessionV1FiltersJson,
        V2_TO_V1_DATATYPE.traffic,
        true,
      )

    const timeframe = await this.resolveTimeframe({
      pid,
      dataType,
      period: dto.period,
      from: dto.from,
      to: dto.to,
      timezone: dto.timezone,
    })

    const overview = await this.analyticsService.getErrorOverview(
      pid,
      filters.filtersQuery,
      {
        params: {
          pid,
          groupFrom: timeframe.groupFromUTC,
          groupTo: timeframe.groupToUTC,
          ...filters.filtersParams,
        },
      },
      timeframe.safeTimezone,
      timeframe.groupFromUTC,
      timeframe.groupToUTC,
      timeframe.timeBucket,
      Boolean(dto.show_resolved),
      sessionFiltersQuery,
      sessionFiltersParams,
    )

    return envelope(overview, {
      ...this.baseMeta(pid, timeframe, filters.appliedFilters),
      timeBucket: timeframe.timeBucket,
      showResolved: Boolean(dto.show_resolved),
    })
  }

  async getErrorDetails(
    pid: string,
    eid: string,
    dto: V2BaseQueryDto & { timeBucket?: TimeBucketType },
  ): Promise<V2Envelope<unknown>> {
    const dataType: V2DataType = 'errors'
    const timeframe = await this.resolveTimeframe({
      pid,
      dataType,
      period: dto.period,
      from: dto.from,
      to: dto.to,
      timeBucket: dto.timeBucket,
      timezone: dto.timezone,
    })

    const details = await this.analyticsService.getErrorDetails(
      pid,
      eid,
      timeframe.safeTimezone,
      timeframe.groupFromUTC,
      timeframe.groupToUTC,
      timeframe.timeBucket,
    )

    return envelope(details, {
      ...this.baseMeta(pid, timeframe, []),
      eid,
      timeBucket: timeframe.timeBucket,
    })
  }

  async getErrorSessions(
    pid: string,
    eid: string,
    dto: V2BaseQueryDto & { limit?: number; offset?: number },
  ): Promise<V2Envelope<Record<string, unknown>[]>> {
    const dataType: V2DataType = 'errors'
    const filters = this.prepareFilters(dto.filters, dataType, true)
    const timeframe = await this.resolveTimeframe({
      pid,
      dataType,
      period: dto.period,
      from: dto.from,
      to: dto.to,
      timezone: dto.timezone,
    })

    const limit = dto.limit ?? 10
    const offset = dto.offset ?? 0

    const result = (await this.analyticsService.getErrorAffectedSessions(
      pid,
      eid,
      timeframe.groupFromUTC,
      timeframe.groupToUTC,
      limit,
      offset,
      filters.filtersQuery,
      filters.filtersParams,
    )) as { sessions?: unknown } | Record<string, unknown>[]

    const sessions = Array.isArray(result)
      ? result
      : ((result?.sessions ?? []) as Record<string, unknown>[])

    return envelope(renameEntityList(sessions), {
      ...this.baseMeta(pid, timeframe, filters.appliedFilters),
      eid,
      limit,
      offset,
    })
  }

  async getSessionsList(
    pid: string,
    dto: V2BaseQueryDto & {
      limit?: number
      offset?: number
      event_type?: 'traffic' | 'performance' | 'error'
    },
  ): Promise<V2Envelope<Record<string, unknown>[]>> {
    const eventType = dto.event_type || 'traffic'
    const dataType: V2DataType =
      eventType === 'performance'
        ? 'performance'
        : eventType === 'error'
          ? 'errors'
          : 'traffic'

    const filters = this.prepareFilters(
      dto.filters,
      dataType,
      eventType !== 'traffic',
    )

    const timeframe = await this.resolveTimeframe({
      pid,
      dataType: 'traffic',
      period: dto.period,
      from: dto.from,
      to: dto.to,
      timezone: dto.timezone,
      allTimeEventTypes:
        eventType === 'traffic'
          ? ['pageview', 'custom_event', 'error']
          : [eventType],
    })

    const limit = dto.limit ?? DEFAULT_BREAKDOWN_LIMIT
    const offset = dto.offset ?? 0

    const sessions = await this.analyticsService.getSessionsList(
      filters.filtersQuery,
      {
        params: {
          pid,
          groupFrom: timeframe.groupFromUTC,
          groupTo: timeframe.groupToUTC,
          ...filters.filtersParams,
        },
      },
      timeframe.safeTimezone,
      limit,
      offset,
      filters.customEVFilterApplied,
      eventType,
    )

    return envelope(renameEntityList(sessions), {
      ...this.baseMeta(pid, timeframe, filters.appliedFilters),
      eventType,
      limit,
      offset,
    })
  }

  async getSessionDetails(
    pid: string,
    psid: string,
    timezone?: string,
  ): Promise<V2Envelope<Record<string, unknown>>> {
    const safeTimezone = this.analyticsService.getSafeTimezone(timezone)

    const result = (await this.analyticsService.getSessionDetails(
      pid,
      psid,
      safeTimezone,
    )) as Record<string, unknown>

    const details = result?.details as Record<string, unknown> | undefined

    return envelope(
      {
        ...result,
        details: details ? renameEntityKeys(details) : details,
      },
      { pid, psid, timezone: safeTimezone },
    )
  }

  async getProfilesList(
    pid: string,
    dto: V2BaseQueryDto & {
      limit?: number
      offset?: number
      profile_type?: 'all' | 'anonymous' | 'identified'
    },
  ): Promise<V2Envelope<Record<string, unknown>[]>> {
    const dataType: V2DataType = 'traffic'
    const filters = this.prepareFilters(dto.filters, dataType)
    const timeframe = await this.resolveTimeframe({
      pid,
      dataType,
      period: dto.period,
      from: dto.from,
      to: dto.to,
      timezone: dto.timezone,
    })

    const limit = dto.limit ?? DEFAULT_BREAKDOWN_LIMIT
    const offset = dto.offset ?? 0

    const profiles = await this.analyticsService.getProfilesList(
      pid,
      filters.filtersQuery,
      {
        params: {
          pid,
          groupFrom: timeframe.groupFromUTC,
          groupTo: timeframe.groupToUTC,
          ...filters.filtersParams,
        },
      },
      timeframe.safeTimezone,
      limit,
      offset,
      dto.profile_type || 'all',
      filters.customEVFilterApplied,
    )

    return envelope(renameEntityList(profiles), {
      ...this.baseMeta(pid, timeframe, filters.appliedFilters),
      profileType: dto.profile_type || 'all',
      limit,
      offset,
    })
  }

  async getProfileDetails(
    pid: string,
    profileId: string,
    timezone?: string,
  ): Promise<V2Envelope<Record<string, unknown>>> {
    const safeTimezone = this.analyticsService.getSafeTimezone(timezone)

    const [details, topPages, activityCalendar] = await Promise.all([
      this.analyticsService.getProfileDetails(pid, profileId, safeTimezone),
      this.analyticsService.getProfileTopPages(pid, profileId),
      this.analyticsService.getProfileActivityCalendar(pid, profileId),
    ])

    return envelope(
      {
        ...renameEntityKeys((details ?? {}) as Record<string, unknown>),
        topPages,
        activityCalendar,
      },
      { pid, profileId, timezone: safeTimezone },
    )
  }

  async getProfileSessions(
    pid: string,
    profileId: string,
    dto: V2BaseQueryDto & { limit?: number; offset?: number },
  ): Promise<V2Envelope<Record<string, unknown>[]>> {
    const dataType: V2DataType = 'traffic'
    const filters = this.prepareFilters(dto.filters, dataType)
    const timeframe = await this.resolveTimeframe({
      pid,
      dataType,
      period: dto.period,
      from: dto.from,
      to: dto.to,
      timezone: dto.timezone,
    })

    const limit = dto.limit ?? DEFAULT_BREAKDOWN_LIMIT
    const offset = dto.offset ?? 0

    const sessions = await this.analyticsService.getProfileSessionsList(
      pid,
      profileId,
      filters.filtersQuery,
      {
        params: {
          pid,
          groupFrom: timeframe.groupFromUTC,
          groupTo: timeframe.groupToUTC,
          ...filters.filtersParams,
        },
      },
      timeframe.safeTimezone,
      limit,
      offset,
      filters.customEVFilterApplied,
    )

    return envelope(renameEntityList(sessions), {
      ...this.baseMeta(pid, timeframe, filters.appliedFilters),
      profileId,
      limit,
      offset,
    })
  }

  async getTrafficCustomEventMetadata(
    pid: string,
    dto: V2BaseQueryDto & { event: string; timeBucket?: TimeBucketType },
  ): Promise<V2Envelope<unknown>> {
    const appliedFilters = parseV2Filters(dto.filters)
    const v1FiltersJson = toV1FiltersJson(appliedFilters, 'traffic')

    if (Boolean(dto.from) !== Boolean(dto.to)) {
      throw new BadRequestException(
        "The 'from' and 'to' parameters must be provided together",
      )
    }

    const hasCustomRange = Boolean(dto.from && dto.to)
    const from = hasCustomRange ? dto.from : undefined
    const to = hasCustomRange ? dto.to : undefined
    const period = hasCustomRange
      ? undefined
      : dto.period && dto.period !== 'custom'
        ? dto.period
        : V2_DEFAULT_PERIOD

    const { result } = await this.analyticsService.getCustomEventMetadata({
      pid,
      period,
      timeBucket:
        dto.timeBucket || getLowestPossibleTimeBucket(period, from, to),
      from,
      to,
      filters: v1FiltersJson,
      timezone: dto.timezone,
      event: dto.event,
    } as GetCustomEventMetadata)

    return envelope(result, {
      pid,
      event: dto.event,
      period: period ?? null,
      timezone: this.analyticsService.getSafeTimezone(dto.timezone),
      appliedFilters,
    })
  }

  async getTrafficPagePropertyMetadata(
    pid: string,
    dto: V2BaseQueryDto & { property: string; timeBucket?: TimeBucketType },
  ): Promise<V2Envelope<unknown>> {
    const appliedFilters = parseV2Filters(dto.filters)
    const v1FiltersJson = toV1FiltersJson(appliedFilters, 'traffic')

    if (Boolean(dto.from) !== Boolean(dto.to)) {
      throw new BadRequestException(
        "The 'from' and 'to' parameters must be provided together",
      )
    }

    const hasCustomRange = Boolean(dto.from && dto.to)
    const from = hasCustomRange ? dto.from : undefined
    const to = hasCustomRange ? dto.to : undefined
    const period = hasCustomRange
      ? undefined
      : dto.period && dto.period !== 'custom'
        ? dto.period
        : V2_DEFAULT_PERIOD

    const { result } = await this.analyticsService.getPagePropertyMeta({
      pid,
      period,
      timeBucket:
        dto.timeBucket || getLowestPossibleTimeBucket(period, from, to),
      from,
      to,
      filters: v1FiltersJson,
      timezone: dto.timezone,
      property: dto.property,
    } as GetPagePropertyMetaDto)

    return envelope(result, {
      pid,
      property: dto.property,
      period: period ?? null,
      timezone: this.analyticsService.getSafeTimezone(dto.timezone),
      appliedFilters,
    })
  }

  async getTrafficCustomEventsTimeseries(
    pid: string,
    dto: V2BaseQueryDto & { events: string; timeBucket?: TimeBucketType },
  ): Promise<V2Envelope<TimeseriesRow[]>> {
    const dataType: V2DataType = 'traffic'

    let events: string[]
    try {
      const parsed = JSON.parse(dto.events)
      events = Array.isArray(parsed) ? parsed.map(String) : []
    } catch {
      events = dto.events
        .split(',')
        .map((event) => event.trim())
        .filter(Boolean)
    }

    // A '__proto__' series key would mutate the response object's prototype
    // instead of adding a series
    events = events.filter((event) => event && event !== '__proto__')

    if (events.length === 0) {
      throw new UnprocessableEntityException(
        'At least one custom event name has to be provided',
      )
    }

    const filters = this.prepareFilters(dto.filters, dataType)
    const timeframe = await this.resolveTimeframe({
      pid,
      dataType,
      period: dto.period,
      from: dto.from,
      to: dto.to,
      timeBucket: dto.timeBucket,
      timezone: dto.timezone,
      allTimeEventTypes: ['custom_event'],
    })

    const result = (await this.analyticsService.groupCustomEVByTimeBucket(
      timeframe.timeBucket,
      timeframe.groupFrom,
      timeframe.groupTo,
      filters.filtersQuery,
      {
        params: {
          pid,
          groupFrom: timeframe.groupFromUTC,
          groupTo: timeframe.groupToUTC,
          ...filters.filtersParams,
        },
      },
      timeframe.safeTimezone,
      events,
    )) as { chart: { x: string[]; events: Record<string, number[]> } }

    const series: Record<string, (number | null)[] | undefined> = {}

    for (const event of events) {
      series[event] = result.chart.events?.[event] ?? []
    }

    return envelope(
      zipTimeseries(result.chart.x, series, timeframe.safeTimezone),
      {
        ...this.baseMeta(pid, timeframe, filters.appliedFilters),
        timeBucket: timeframe.timeBucket,
        allowedTimeBuckets: timeframe.allowedTimeBuckets,
        events,
      },
    )
  }

  async getFunnel(
    pid: string,
    dto: V2BaseQueryDto & { steps?: string; funnelId?: string },
  ): Promise<V2Envelope<unknown>> {
    const steps = await this.resolveFunnelSteps(pid, dto)

    const { params, filters, timeframe } = await this.resolveFunnelContext(
      pid,
      dto,
    )

    let funnel: IFunnel[] = []
    let totalPageviews = 0
    let timeToConvert: unknown
    let stepDetails: Record<string, Record<number, Record<string, number>>> = {
      countries: {},
      devices: {},
      browsers: {},
      sources: {},
      campaigns: {},
      pages: {},
      profileTypes: {},
    }

    await Promise.all([
      (async () => {
        funnel = await this.analyticsService.getFunnel(
          steps,
          params,
          filters.filtersQuery,
        )
      })(),
      (async () => {
        totalPageviews = await this.analyticsService.getTotalPageviews(
          pid,
          params.groupFrom as string,
          params.groupTo as string,
          filters.filtersQuery,
          filters.filtersParams,
        )
      })(),
      (async () => {
        try {
          stepDetails = await this.analyticsService.getFunnelStepDetails(
            steps,
            params,
            filters.filtersQuery,
          )
        } catch (reason) {
          // Step details are best-effort (v1 parity); dev-only logging as
          // the raw error may embed funnel query params
          this.logger.log(reason, 'AnalyticsV2Service -> getFunnelStepDetails')
        }
      })(),
      (async () => {
        timeToConvert = await this.analyticsService.getFunnelTimeToConvert(
          steps,
          params,
          filters.filtersQuery,
        )
      })(),
    ])

    for (let i = 0; i < funnel.length; i++) {
      funnel[i].breakdowns = {
        countries: stepDetails.countries[i + 1] || {},
        devices: stepDetails.devices[i + 1] || {},
        browsers: stepDetails.browsers[i + 1] || {},
        sources: stepDetails.sources[i + 1] || {},
        campaigns: stepDetails.campaigns[i + 1] || {},
        pages: stepDetails.pages[i + 1] || {},
        profileTypes: stepDetails.profileTypes[i + 1] || {},
      }
    }

    return envelope(
      { steps: funnel, totalPageviews, timeToConvert },
      this.baseMeta(pid, timeframe, filters.appliedFilters),
    )
  }

  async getFunnelSessions(
    pid: string,
    dto: V2BaseQueryDto & {
      steps?: string
      funnelId?: string
      step: number
      dropoff?: boolean
      limit?: number
      offset?: number
    },
  ): Promise<V2Envelope<Record<string, unknown>[]>> {
    const steps = await this.resolveFunnelSteps(pid, dto)

    if (dto.step < 1 || dto.step > steps.length) {
      throw new BadRequestException(
        'Step must be between 1 and the number of funnel steps',
      )
    }

    const { params, filters, timeframe } = await this.resolveFunnelContext(
      pid,
      dto,
    )

    const limit = dto.limit ?? DEFAULT_BREAKDOWN_LIMIT
    const offset = dto.offset ?? 0

    const sessions = await this.analyticsService.getFunnelSessionsList(
      steps,
      params,
      timeframe.safeTimezone,
      dto.step,
      limit,
      offset,
      filters.filtersQuery,
      Boolean(dto.dropoff),
    )

    return envelope(renameEntityList(sessions), {
      ...this.baseMeta(pid, timeframe, filters.appliedFilters),
      step: dto.step,
      dropoff: Boolean(dto.dropoff),
      limit,
      offset,
    })
  }

  private async resolveFunnelSteps(
    pid: string,
    dto: { steps?: string; funnelId?: string },
  ): Promise<string[]> {
    if (dto.steps && dto.funnelId) {
      throw new BadRequestException(
        "The 'steps' and 'funnelId' parameters are mutually exclusive",
      )
    }

    return this.analyticsService.getPagesArray(dto.steps, dto.funnelId, pid)
  }

  /**
   * Funnel time bounds mirror v1 exactly: no time bucket, timezone-shifted
   * bounds as ClickHouse params, and a period=all diff based on the max of
   * pageview / custom_event first-seen.
   */
  private async resolveFunnelContext(
    pid: string,
    dto: V2BaseQueryDto,
  ): Promise<{
    params: Record<string, unknown>
    filters: PreparedFilters
    timeframe: ResolvedTimeframe
  }> {
    const filters = this.prepareFilters(dto.filters, 'traffic')
    const safeTimezone = this.analyticsService.getSafeTimezone(dto.timezone)

    if (Boolean(dto.from) !== Boolean(dto.to)) {
      throw new BadRequestException(
        "The 'from' and 'to' parameters must be provided together",
      )
    }

    const hasCustomRange = Boolean(dto.from && dto.to)
    const period = hasCustomRange
      ? null
      : dto.period && dto.period !== 'custom'
        ? dto.period
        : V2_DEFAULT_PERIOD

    let diff: number | undefined

    if (period === 'all') {
      const [pageviewRes, customEventRes] = await Promise.all([
        this.analyticsService.calculateTimeBucketForAllTime(pid, 'pageview'),
        this.analyticsService.calculateTimeBucketForAllTime(
          pid,
          'custom_event',
        ),
      ])

      diff = Math.max(pageviewRes.diff, customEventRes.diff)
    }

    const { groupFrom, groupTo, groupFromUTC, groupToUTC } =
      this.analyticsService.getGroupFromTo(
        hasCustomRange ? dto.from : undefined,
        hasCustomRange ? dto.to : undefined,
        null,
        period ?? undefined,
        safeTimezone,
        diff,
      )

    return {
      params: {
        pid,
        groupFrom,
        groupTo,
        ...filters.filtersParams,
      },
      filters,
      timeframe: {
        period,
        timeBucket: null,
        allowedTimeBuckets: null,
        safeTimezone,
        groupFrom,
        groupTo,
        groupFromUTC,
        groupToUTC,
      },
    }
  }

  async getLiveVisitors(
    pid: string,
  ): Promise<V2Envelope<{ count: number; visitors: unknown[] }>> {
    const since = dayjs
      .utc()
      .subtract(ONLINE_VISITORS_WINDOW_MINUTES, 'minute')
      .format('YYYY-MM-DD HH:mm:ss')

    const query = `
      SELECT
        dv,
        br,
        os,
        cc,
        psidCasted AS psid
      FROM (
        SELECT
          any(dv) AS dv,
          any(br) AS br,
          any(os) AS os,
          any(cc) AS cc,
          toString(psid) AS psidCasted
        FROM events
        WHERE
          pid = {pid:FixedString(12)}
          AND type IN ('pageview', 'custom_event')
          AND created >= {since:DateTime}
          AND psid IS NOT NULL
          AND psid != 0
        GROUP BY psid
      )
    `

    const [{ data }, count] = await Promise.all([
      clickhouse
        .query({ query, query_params: { pid, since } })
        .then((resultSet) => resultSet.json<Record<string, unknown>>()),
      this.analyticsService.getOnlineUserCount(pid),
    ])

    return envelope(
      { count, visitors: renameEntityList(data) },
      { pid, windowMinutes: ONLINE_VISITORS_WINDOW_MINUTES },
    )
  }

  getDimensions(type: V2DataType): V2Envelope<{
    dimensions: Record<string, unknown>[]
    metrics: Record<string, unknown>[]
  }> {
    const dimensions = listDimensions(type).map((dimension) => ({
      name: dimension.api,
      description: dimension.description,
      filterOnly: Boolean(dimension.filterOnly),
      extraFields: (dimension.extraFields ?? []).map((field) => field.api),
    }))

    const metrics = listMetrics(type).map((metric) => ({
      name: metric.api,
      description: metric.description,
      format: metric.format ?? 'integer',
      default: Boolean(metric.isDefault),
    }))

    return envelope({ dimensions, metrics }, { type })
  }

  async getDimensionValues(
    pid: string,
    dimensionApi: string,
    type: 'traffic' | 'errors',
  ): Promise<V2Envelope<unknown[]>> {
    const dimension = findDimension(
      dimensionApi,
      type === 'errors' ? 'errors' : 'traffic',
    )

    if (!dimension) {
      throw new UnprocessableEntityException(
        `Unknown ${type} dimension '${dimensionApi}'`,
      )
    }

    // Browser / OS versions return { name, version } pairs
    if (dimension.column === 'brv' || dimension.column === 'osv') {
      const values = await this.analyticsService.getVersionFilters(
        pid,
        type,
        dimension.column === 'brv' ? 'br' : 'os',
      )

      return envelope(values, { pid, dimension: dimensionApi, type })
    }

    // Entry/exit page values come from the session-scoped virtual-column
    // path in getFilters; getErrorsFilters cannot resolve them
    const values =
      type === 'errors' && !dimension.virtual
        ? await this.analyticsService.getErrorsFilters(pid, dimension.column)
        : await this.analyticsService.getFilters(pid, dimension.column)

    return envelope(values, { pid, dimension: dimensionApi, type })
  }

  /** Validate a metric name exists for the data type (helper for controllers) */
  validateMetric(api: string, dataType: V2DataType): V2MetricDef {
    return getMetric(api, dataType)
  }
}

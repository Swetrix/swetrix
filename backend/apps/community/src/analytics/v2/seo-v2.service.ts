import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

import {
  BrandedTrafficAnalytics,
  GSC_ALL_TIME_DAYS,
  GSCContext,
  GSCService,
  MAX_BRANDED_TRAFFIC_RANGE_DAYS,
  MAX_FILTER_EXPRESSION_LENGTH,
  MAX_FILTERS,
  MAX_POSITION_ANALYTICS_RANGE_DAYS,
  OPTIONAL_ANALYTICS_TIMEOUT_MS,
  PositionAnalytics,
} from '../../project/gsc.service'
import { AnalyticsService } from '../analytics.service'
import { TimeBucketType } from '../dto/getData.dto'
import {
  V2SeoBreakdownDto,
  V2SeoRangeDto,
  V2SeoSummaryDto,
  V2SeoTimeseriesDto,
  V2_SEO_TIME_BUCKETS,
} from './dto/seo.dto'
import { V2_DEFAULT_PERIOD, V2BaseQueryDto } from './dto/v2-base.dto'
import { envelope, V2Envelope } from './mappers/envelope'
import {
  bucketSeoDateSeries,
  mapSeoBreakdownRows,
  mapSeoSummary,
  mapSeoTimeseries,
  SeoDateSeriesEntry,
  SeoSummaryData,
} from './mappers/seo.mapper'
import { toIsoTimestamp, TimeseriesRow } from './mappers/timeseries.mapper'
import { parseV2Filters, V2Filter } from './query/filters.translator'
import {
  getSeoBreakdownDimension,
  listSeoDimensions,
  listSeoMetrics,
  parseSeoMetricsParam,
  SEO_SORT,
  toGscFiltersJson,
  validateSeoFilters,
} from './registry/seo'

dayjs.extend(utc)

const DEFAULT_SEO_BREAKDOWN_LIMIT = 30

const INTRADAY_PERIODS = ['1h', 'today', 'yesterday', '1d']

interface SeoTimeframe {
  period: string | null
  timeBucket: TimeBucketType
  safeTimezone: string
  groupFrom: string
  groupTo: string
  rangeDays: number
}

const SKIPPED = Symbol('skipped')

/**
 * Runs an expensive Search Console rollup under a deadline. A timeout aborts
 * the in-flight paging and reports the panel as skipped; a genuine upstream
 * failure still propagates, so a broken panel reads as broken rather than as
 * "too much data".
 */
const resolveOptional = async <T>(
  load: (signal: AbortSignal) => Promise<T>,
): Promise<T | typeof SKIPPED> => {
  const controller = new AbortController()
  let timeout: ReturnType<typeof setTimeout> | undefined

  const loading = load(controller.signal)

  // Aborting rejects `loading` after the race has already settled on SKIPPED;
  // this keeps that late rejection from surfacing as an unhandled rejection
  // without stopping Promise.race from seeing a real, pre-deadline failure.
  loading.catch(() => {})

  try {
    return await Promise.race([
      loading,
      new Promise<typeof SKIPPED>((resolve) => {
        timeout = setTimeout(() => {
          controller.abort()
          resolve(SKIPPED)
        }, OPTIONAL_ANALYTICS_TIMEOUT_MS)
      }),
    ])
  } finally {
    if (timeout) {
      clearTimeout(timeout)
    }
  }
}

@Injectable()
export class SeoV2Service {
  constructor(
    private readonly gscService: GSCService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  /**
   * Search Console has to be connected and a property linked before any of the
   * data endpoints can answer. Both are project configuration rather than a bad
   * request, hence 409 rather than 400.
   *
   * Call this only after the request itself has been validated: a malformed
   * filter is a 422 whether or not the project happens to be connected, and
   * answering 409 first would send callers debugging their query down the
   * wrong path.
   */
  private async requireContext(pid: string): Promise<GSCContext> {
    const { connected, property } =
      await this.gscService.getConnectionState(pid)

    if (!connected) {
      throw new ConflictException(
        'Google Search Console is not connected for this project',
      )
    }

    if (!property) {
      throw new ConflictException(
        'No Google Search Console property is linked to this project',
      )
    }

    return this.gscService.getGSCContext(pid)
  }

  private prepareFilters(filters: string | undefined): {
    appliedFilters: V2Filter[]
    gscFilters: string | undefined
  } {
    const appliedFilters = validateSeoFilters(parseV2Filters(filters))

    if (appliedFilters.length > MAX_FILTERS) {
      throw new UnprocessableEntityException(
        `Too many filters; at most ${MAX_FILTERS} may be applied at once`,
      )
    }

    for (const filter of appliedFilters) {
      if (String(filter.value).length > MAX_FILTER_EXPRESSION_LENGTH) {
        throw new UnprocessableEntityException(
          `The seo filter on '${filter.dimension}' has a value longer than ${MAX_FILTER_EXPRESSION_LENGTH} characters`,
        )
      }
    }

    // GSCService.parseFilters already understands the v2 filter shape, so the
    // validated filters are handed straight back to it, mirroring how the
    // ClickHouse data types translate v2 -> v1 JSON -> getFiltersQuery.
    return { appliedFilters, gscFilters: toGscFiltersJson(appliedFilters) }
  }

  private resolveTimeframe(
    dto: V2BaseQueryDto,
    requestedBucket?: TimeBucketType,
  ): SeoTimeframe {
    const { from, to, timezone } = dto
    const safeTimezone = this.analyticsService.getSafeTimezone(timezone)

    if (Boolean(from) !== Boolean(to)) {
      throw new BadRequestException(
        "The 'from' and 'to' parameters must be provided together",
      )
    }

    const hasCustomRange = Boolean(from && to)
    const period = hasCustomRange
      ? null
      : dto.period && dto.period !== 'custom'
        ? dto.period
        : V2_DEFAULT_PERIOD

    const timeBucket =
      requestedBucket ??
      (period && INTRADAY_PERIODS.includes(period)
        ? TimeBucketType.HOUR
        : TimeBucketType.DAY)

    // getGroupFromTo validates the bucket against the range, which neither an
    // open-ended 'all' nor a caller-chosen custom range can satisfy.
    const groupTimeBucket =
      hasCustomRange || period === 'all' ? null : timeBucket
    const diff = period === 'all' ? GSC_ALL_TIME_DAYS : undefined

    const { groupFrom, groupTo } = this.analyticsService.getGroupFromTo(
      hasCustomRange ? from : undefined,
      hasCustomRange ? to : undefined,
      groupTimeBucket,
      period ?? undefined,
      safeTimezone,
      diff,
    )

    const rangeDays =
      Math.abs(
        dayjs(groupTo)
          .startOf('day')
          .diff(dayjs(groupFrom).startOf('day'), 'day'),
      ) + 1

    return { period, timeBucket, safeTimezone, groupFrom, groupTo, rangeDays }
  }

  private baseMeta(
    pid: string,
    timeframe: SeoTimeframe,
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

  async getStatus(
    pid: string,
  ): Promise<V2Envelope<{ connected: boolean; property: string | null }>> {
    const state = await this.gscService.getConnectionState(pid)

    return envelope(state, { pid })
  }

  /**
   * Mirrors AnalyticsV2Service.getDimensions so `?type=seo` answers in the same
   * shape as every other data type on the discovery endpoint.
   */
  getDimensions(): V2Envelope<{
    dimensions: Record<string, unknown>[]
    metrics: Record<string, unknown>[]
  }> {
    const dimensions = listSeoDimensions().map((dimension) => ({
      name: dimension.api,
      description: dimension.description,
      filterOnly: false,
      extraFields: [] as string[],
    }))

    const metrics = listSeoMetrics().map((metric) => ({
      name: metric.api,
      description: metric.description,
      format: metric.format,
      default: Boolean(metric.isDefault),
    }))

    return envelope({ dimensions, metrics }, { type: 'seo' })
  }

  async getSummary(
    pid: string,
    dto: V2SeoSummaryDto,
  ): Promise<V2Envelope<SeoSummaryData>> {
    const { appliedFilters, gscFilters } = this.prepareFilters(dto.filters)
    const timeframe = this.resolveTimeframe(dto)
    const ctx = await this.requireContext(pid)
    const { groupFrom, groupTo } = timeframe

    const fromDate = dayjs(groupFrom)
    const durationMs = dayjs(groupTo).diff(fromDate)
    const previousTo = fromDate
      .subtract(1, 'millisecond')
      .format('YYYY-MM-DD HH:mm:ss')
    const previousFrom = fromDate
      .subtract(durationMs, 'millisecond')
      .format('YYYY-MM-DD HH:mm:ss')

    const [current, previous] = await Promise.all([
      this.gscService.getSummary(pid, groupFrom, groupTo, gscFilters, ctx),
      this.gscService
        .getSummary(pid, previousFrom, previousTo, gscFilters, ctx)
        .catch(() => null),
    ])

    return envelope(mapSeoSummary(current, previous), {
      ...this.baseMeta(pid, timeframe, appliedFilters),
      metrics: listSeoMetrics().map((metric) => metric.api),
    })
  }

  async getTimeseries(
    pid: string,
    dto: V2SeoTimeseriesDto,
  ): Promise<V2Envelope<TimeseriesRow[]>> {
    const { appliedFilters, gscFilters } = this.prepareFilters(dto.filters)
    const metrics = parseSeoMetricsParam(dto.metrics).map(
      (metric) => metric.api,
    )
    const timeframe = this.resolveTimeframe(
      dto,
      dto.timeBucket as TimeBucketType | undefined,
    )
    const ctx = await this.requireContext(pid)

    // Search Console only serves hourly and daily rows; wider buckets are
    // rolled up from the daily series rather than requested upstream.
    const series = (await this.gscService.getDateSeries(
      pid,
      timeframe.groupFrom,
      timeframe.groupTo,
      timeframe.timeBucket === TimeBucketType.HOUR ? 'hour' : 'day',
      gscFilters,
      ctx,
    )) as SeoDateSeriesEntry[]

    const bucketed = bucketSeoDateSeries(series, timeframe.timeBucket)

    return envelope(
      mapSeoTimeseries(bucketed, metrics, timeframe.safeTimezone),
      {
        ...this.baseMeta(pid, timeframe, appliedFilters),
        metrics,
        timeBucket: timeframe.timeBucket,
        allowedTimeBuckets: [...V2_SEO_TIME_BUCKETS],
      },
    )
  }

  async getBreakdown(
    pid: string,
    dto: V2SeoBreakdownDto,
  ): Promise<V2Envelope<Record<string, unknown>[]>> {
    const dimension = getSeoBreakdownDimension(dto.dimension)
    const { appliedFilters, gscFilters } = this.prepareFilters(dto.filters)
    const metrics = parseSeoMetricsParam(dto.metrics).map(
      (metric) => metric.api,
    )
    const timeframe = this.resolveTimeframe(dto)
    const limit = dto.limit ?? DEFAULT_SEO_BREAKDOWN_LIMIT
    const offset = dto.offset ?? 0
    const ctx = await this.requireContext(pid)
    const { groupFrom, groupTo } = timeframe

    const rows = await this.fetchBreakdownRows(
      dimension.gsc,
      pid,
      groupFrom,
      groupTo,
      limit,
      offset,
      gscFilters,
      ctx,
    )

    return envelope(mapSeoBreakdownRows(dimension.gsc, rows, metrics), {
      ...this.baseMeta(pid, timeframe, appliedFilters),
      dimension: dimension.api,
      metrics,
      limit,
      offset,
      sort: SEO_SORT,
    })
  }

  private fetchBreakdownRows(
    dimension: 'query' | 'page' | 'country' | 'device',
    pid: string,
    from: string,
    to: string,
    limit: number,
    offset: number,
    filters: string | undefined,
    ctx: GSCContext,
  ) {
    if (dimension === 'query') {
      return this.gscService.getKeywords(
        pid,
        from,
        to,
        limit,
        offset,
        filters,
        undefined,
        ctx,
      )
    }

    if (dimension === 'page') {
      return this.gscService.getTopPages(
        pid,
        from,
        to,
        limit,
        offset,
        filters,
        undefined,
        ctx,
      )
    }

    if (dimension === 'country') {
      return this.gscService.getTopCountries(
        pid,
        from,
        to,
        limit,
        offset,
        filters,
        ctx,
      )
    }

    return this.gscService.getTopDevices(
      pid,
      from,
      to,
      limit,
      offset,
      filters,
      ctx,
    )
  }

  async getBrandedTraffic(
    pid: string,
    dto: V2SeoRangeDto,
  ): Promise<V2Envelope<BrandedTrafficAnalytics | null>> {
    const { appliedFilters, gscFilters } = this.prepareFilters(dto.filters)
    const timeframe = this.resolveTimeframe(dto)
    const ctx = await this.requireContext(pid)
    const meta = this.baseMeta(pid, timeframe, appliedFilters)

    if (timeframe.rangeDays > MAX_BRANDED_TRAFFIC_RANGE_DAYS) {
      return envelope(null, {
        ...meta,
        skipped: true,
        skippedReason: 'range_too_large',
        maxRangeDays: MAX_BRANDED_TRAFFIC_RANGE_DAYS,
      })
    }

    const result = await resolveOptional((signal) =>
      this.gscService.getBrandedTraffic(
        pid,
        timeframe.groupFrom,
        timeframe.groupTo,
        gscFilters,
        ctx,
        signal,
      ),
    )

    if (result === SKIPPED) {
      return envelope(null, {
        ...meta,
        skipped: true,
        skippedReason: 'timeout',
        timeoutMs: OPTIONAL_ANALYTICS_TIMEOUT_MS,
      })
    }

    return envelope(result, { ...meta, skipped: false })
  }

  async getPositions(
    pid: string,
    dto: V2SeoRangeDto,
  ): Promise<V2Envelope<PositionAnalytics | null>> {
    const { appliedFilters, gscFilters } = this.prepareFilters(dto.filters)
    const timeframe = this.resolveTimeframe(dto)
    const ctx = await this.requireContext(pid)
    const meta = this.baseMeta(pid, timeframe, appliedFilters)

    if (timeframe.rangeDays > MAX_POSITION_ANALYTICS_RANGE_DAYS) {
      return envelope(null, {
        ...meta,
        skipped: true,
        skippedReason: 'range_too_large',
        maxRangeDays: MAX_POSITION_ANALYTICS_RANGE_DAYS,
      })
    }

    const result = await resolveOptional((signal) =>
      this.gscService.getPositionAnalytics(
        pid,
        timeframe.groupFrom,
        timeframe.groupTo,
        gscFilters,
        ctx,
        signal,
      ),
    )

    if (result === SKIPPED) {
      return envelope(null, {
        ...meta,
        skipped: true,
        skippedReason: 'timeout',
        timeoutMs: OPTIONAL_ANALYTICS_TIMEOUT_MS,
      })
    }

    return envelope(result, { ...meta, skipped: false })
  }
}

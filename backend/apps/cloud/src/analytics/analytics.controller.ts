import _isEmpty from 'lodash/isEmpty'
import _isArray from 'lodash/isArray'
import _toNumber from 'lodash/toNumber'
import _includes from 'lodash/includes'
import _size from 'lodash/size'
import _map from 'lodash/map'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import dayjsTimezone from 'dayjs/plugin/timezone'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import {
  Controller,
  Body,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Get,
  Post,
  Patch,
  Headers,
  BadRequestException,
  InternalServerErrorException,
  UnprocessableEntityException,
  Ip,
  ForbiddenException,
  Response,
  Header,
  HttpException,
  HttpStatus,
} from '@nestjs/common'

import { OptionalJwtAccessTokenGuard } from '../auth/guards'
import { Auth, Public } from '../auth/decorators'
import {
  AnalyticsService,
  DataType,
  getLowestPossibleTimeBucket,
} from './analytics.service'
import { VALID_PERIODS } from './decorators/validate-period.decorator'
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator'
import { DEFAULT_TIMEZONE } from '../user/entities/user.entity'
import { AuthenticationGuard } from '../auth/guards/authentication.guard'
import { PageviewsDto } from './dto/pageviews.dto'
import { EventsDto } from './dto/events.dto'
import { GetDataDto, ChartRenderMode } from './dto/getData.dto'
import { GetCustomEventMetadata } from './dto/get-custom-event-meta.dto'
import { GetPagePropertyMetaDto } from './dto/get-page-property-meta.dto'
import { GetUserFlowDto } from './dto/getUserFlow.dto'
import { GetFunnelsDto } from './dto/getFunnels.dto'
import { GetFunnelSessionsDto } from './dto/get-funnel-sessions.dto'
import { AppLoggerService } from '../logger/logger.service'
import {
  redis,
  REDIS_USERS_COUNT_KEY,
  REDIS_TRIALS_COUNT_KEY,
  REDIS_PROJECTS_COUNT_KEY,
  REDIS_EVENTS_COUNT_KEY,
} from '../common/constants'
import { clickhouse } from '../common/integrations/clickhouse'
import { checkRateLimit, getIPDetails, getIPFromHeaders } from '../common/utils'
import { GetCustomEventsDto } from './dto/get-custom-events.dto'
import { GetFiltersDto } from './dto/get-filters.dto'
import { GetVersionFiltersDto } from './dto/get-version-filters.dto'
import {
  IFunnel,
  IGetFunnel,
  IPageProperty,
  IUserFlow,
  PerfMeasure,
} from './interfaces'
import { GetSessionsDto } from './dto/get-sessions.dto'
import { GetSessionDto } from './dto/get-session.dto'
import { GetProfilesDto } from './dto/get-profiles.dto'
import { GetProfileDto, GetProfileSessionsDto } from './dto/get-profile.dto'
import { ErrorDto } from './dto/error.dto'
import { GetErrorsDto } from './dto/get-errors.dto'
import { GetErrorDto } from './dto/get-error.dto'
import {
  GetErrorOverviewDto,
  GetErrorOverviewOptions,
} from './dto/get-error-overview.dto'
import { PatchStatusDto } from './dto/patch-status.dto'
import {
  customEventTransformer,
  errorEventTransformer,
  performanceTransformer,
  trafficTransformer,
} from './utils/transformers'
import { enrichTrafficSource } from './utils/clickIdSources'
import {
  MAX_METRICS_IN_VIEW,
  ProjectViewCustomEventDto,
} from '../project/dto/create-project-view.dto'
import { GetOverallStatsDto } from './dto/get-overall-stats.dto'
import { NoscriptDto } from './dto/noscript.dto'
import { LiveVisitorsDto } from './dto/live-visitors.dto'
import { GetHeartbeatStatsDto } from './dto/get-heartbeat-stats'
import { GetKeywordsDto } from './dto/get-keywords.dto'
import { GetBotStatsDto } from './dto/get-bot-stats.dto'
import { GSCService } from '../project/gsc.service'
import { GetProfileIdDto, GetSessionIdDto } from './dto/get-id.dto'

dayjs.extend(utc)
dayjs.extend(dayjsTimezone)

const DEFAULT_MEASURE = 'median'

// Silent 200 response for bots
// https://github.com/Swetrix/swetrix/issues/371
const BOT_RESPONSE = { message: 'Bot traffic detected, request is ignored' }

const ONLINE_VISITORS_WINDOW_MINUTES = 5 // minutes

// Performance object validator: none of the values cannot be bigger than 1000 * 60 * 5 (5 minutes) and are >= 0
const MAX_PERFORMANCE_VALUE = 1000 * 60 * 5
const isPerformanceValid = (perf: any) => {
  return (
    perf.dns <= MAX_PERFORMANCE_VALUE &&
    perf.tls <= MAX_PERFORMANCE_VALUE &&
    perf.conn <= MAX_PERFORMANCE_VALUE &&
    perf.response <= MAX_PERFORMANCE_VALUE &&
    perf.render <= MAX_PERFORMANCE_VALUE &&
    perf.dom_load <= MAX_PERFORMANCE_VALUE &&
    perf.page_load <= MAX_PERFORMANCE_VALUE &&
    perf.ttfb <= MAX_PERFORMANCE_VALUE &&
    perf.dns >= 0 &&
    perf.tls >= 0 &&
    perf.conn >= 0 &&
    perf.response >= 0 &&
    perf.render >= 0 &&
    perf.dom_load >= 0 &&
    perf.page_load >= 0 &&
    perf.ttfb >= 0
  )
}

const getPIDsArray = (pids, pid) => {
  const pidsEmpty = _isEmpty(pids)
  const pidEmpty = _isEmpty(pid)
  if (pidsEmpty && pidEmpty)
    throw new BadRequestException(
      "An array of Project ID's (pids) or a Project ID (pid) has to be provided",
    )
  else if (!pidsEmpty && !pidEmpty)
    throw new BadRequestException(
      "Please provide either an array of Project ID's (pids) or a Project ID (pid), but not both",
    )
  else if (!pidEmpty) {
    pids = JSON.stringify([pid])
  }

  try {
    pids = JSON.parse(pids)
  } catch {
    throw new UnprocessableEntityException(
      "Cannot process the provided array of Project ID's",
    )
  }

  if (!_isArray(pids)) {
    throw new UnprocessableEntityException(
      "An array of Project ID's has to be provided as a 'pids' param",
    )
  }

  return pids
}

const getEIDsArray = (eids, eid) => {
  const eidsEmpty = _isEmpty(eids)
  const eidEmpty = _isEmpty(eid)
  if (eidsEmpty && eidEmpty) {
    throw new BadRequestException(
      "An array of Error ID's (eids) or a Error ID (eid) has to be provided",
    )
  }
  if (!eidsEmpty && !eidEmpty) {
    throw new BadRequestException(
      "Please provide either an array of Error ID's (eids) or a Error ID (eid), but not both",
    )
  }

  if (!eidsEmpty) {
    return eids
  }

  return [eid]
}

// needed for serving 1x1 px GIF
const TRANSPARENT_GIF_BUFFER = Buffer.from(
  'R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=',
  'base64',
)

@ApiTags('Analytics')
@UseGuards(OptionalJwtAccessTokenGuard, AuthenticationGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
  }),
)
@Controller(['log', 'v1/log'])
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly logger: AppLoggerService,
    private readonly gscService: GSCService,
  ) {}

  @ApiBearerAuth()
  @Get()
  @Auth(true, true)
  async getData(
    @Query() data: GetDataDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
    isCaptcha = false,
  ) {
    const {
      pid,
      period,
      timeBucket,
      from,
      to,
      filters,
      timezone = DEFAULT_TIMEZONE,
      mode = ChartRenderMode.PERIODICAL,
      metrics,
    } = data

    await this.analyticsService.checkProjectAccess(
      pid,
      uid,
      headers['x-password'],
    )

    await this.analyticsService.checkBillingAccess(pid)

    this.logger.log(
      `pid: ${pid}, period: ${period}, metrics: ${metrics}`,
      'GET /analytics',
    )

    let parsedMetrics: ProjectViewCustomEventDto[]

    if (!isCaptcha) {
      parsedMetrics = this.analyticsService.parseMetrics(metrics)

      if (_size(parsedMetrics) > MAX_METRICS_IN_VIEW) {
        throw new BadRequestException(
          `The maximum number of metrics within one request is ${MAX_METRICS_IN_VIEW}`,
        )
      }
    }

    let newTimebucket = timeBucket
    let allowedTumebucketForPeriodAll

    let diff

    if (period === 'all') {
      const res = await this.analyticsService.calculateTimeBucketForAllTime(
        pid,
        'analytics',
      )

      diff = res.diff

      newTimebucket = _includes(res.timeBucket, timeBucket)
        ? timeBucket
        : res.timeBucket[0]
      allowedTumebucketForPeriodAll = res.timeBucket
    }

    const [filtersQuery, filtersParams, appliedFilters, customEVFilterApplied] =
      this.analyticsService.getFiltersQuery(
        filters,
        isCaptcha ? DataType.CAPTCHA : DataType.ANALYTICS,
      )

    const safeTimezone = this.analyticsService.getSafeTimezone(timezone)
    const { groupFrom, groupTo, groupFromUTC, groupToUTC } =
      this.analyticsService.getGroupFromTo(
        from,
        to,
        newTimebucket,
        period,
        safeTimezone,
        diff,
      )

    let subQuery = `FROM ${
      isCaptcha ? 'captcha' : 'analytics'
    } WHERE pid = {pid:FixedString(12)} ${filtersQuery} AND created BETWEEN {groupFrom:String} AND {groupTo:String}`

    if (customEVFilterApplied && !isCaptcha) {
      subQuery = `FROM customEV WHERE pid = {pid:FixedString(12)} ${filtersQuery} AND created BETWEEN {groupFrom:String} AND {groupTo:String}`
    }

    const paramsData = {
      params: {
        pid,
        groupFrom: groupFromUTC,
        groupTo: groupToUTC,
        ...filtersParams,
      },
    }

    let result: any | void

    if (isCaptcha) {
      result = await this.analyticsService.groupCaptchaByTimeBucket(
        newTimebucket,
        groupFrom,
        groupTo,
        subQuery,
        filtersQuery,
        paramsData,
        safeTimezone,
        mode,
      )
    } else {
      result = await this.analyticsService.groupByTimeBucket(
        newTimebucket,
        groupFrom,
        groupTo,
        subQuery,
        filtersQuery,
        paramsData,
        safeTimezone,
        customEVFilterApplied,
        appliedFilters,
        mode,
      )
    }

    if (isCaptcha) {
      return {
        ...result,
        appliedFilters,
        timeBucket: allowedTumebucketForPeriodAll,
      }
    }

    const customs = await this.analyticsService.getCustomEvents(
      filtersQuery,
      paramsData,
    )

    let properties: IPageProperty = {}

    if (!customEVFilterApplied) {
      properties = await this.analyticsService.getPageProperties(
        filtersQuery,
        paramsData,
      )
    }

    let meta: Awaited<ReturnType<typeof this.analyticsService.getMetaResults>>

    if (!_isEmpty(parsedMetrics)) {
      meta = await this.analyticsService.getMetaResults(
        pid,
        parsedMetrics,
        filtersQuery,
        paramsData,
        timezone,
        period,
        from,
        to,
      )
    }

    return {
      ...result,
      customs,
      properties,
      appliedFilters,
      timeBucket: allowedTumebucketForPeriodAll,
      meta,
    }
  }

  @Get('funnel')
  @Auth(true, true)
  async getFunnel(
    @Query() data: GetFunnelsDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ): Promise<IGetFunnel> {
    const {
      pid,
      period,
      from,
      to,
      timezone = DEFAULT_TIMEZONE,
      pages,
      funnelId,
    } = data

    await this.analyticsService.checkProjectAccess(
      pid,
      uid,
      headers['x-password'],
    )

    await this.analyticsService.checkBillingAccess(pid)

    this.logger.log(`pid: ${pid}, period: ${period}`, 'GET /analytics/funnel')

    const pagesArr = await this.analyticsService.getPagesArray(
      pages,
      funnelId,
      pid,
    )

    let diff

    if (period === 'all') {
      const [analyticsRes, customEVRes] = await Promise.all([
        this.analyticsService.calculateTimeBucketForAllTime(pid, 'analytics'),
        this.analyticsService.calculateTimeBucketForAllTime(pid, 'customEV'),
      ])

      diff = Math.max(analyticsRes.diff, customEVRes.diff)
    }

    const safeTimezone = this.analyticsService.getSafeTimezone(timezone)
    const { groupFrom, groupTo } = this.analyticsService.getGroupFromTo(
      from,
      to,
      null,
      period,
      safeTimezone,
      diff,
    )

    const params = { pid, groupFrom, groupTo }

    let funnel: IFunnel[] = []
    let totalPageviews: number = 0
    let stepDetails: {
      countries: Record<number, Record<string, number>>
      sources: Record<number, Record<string, number>>
    } = { countries: {}, sources: {} }

    const promises = [
      (async () => {
        funnel = await this.analyticsService.getFunnel(pagesArr, params)
      })(),
      (async () => {
        totalPageviews = await this.analyticsService.getTotalPageviews(
          pid,
          groupFrom,
          groupTo,
        )
      })(),
      (async () => {
        try {
          stepDetails = await this.analyticsService.getFunnelStepDetails(
            pagesArr,
            params,
          )
        } catch (e) {
          this.logger.error(e, 'GET /analytics/funnel - getFunnelStepDetails')
        }
      })(),
    ]

    await Promise.all(promises)

    for (let i = 0; i < funnel.length; i++) {
      funnel[i].topCountries = stepDetails.countries[i + 1] || {}
      funnel[i].topSources = stepDetails.sources[i + 1] || {}
    }

    return { funnel, totalPageviews }
  }

  @Get('funnel-sessions')
  @Auth(true, true)
  async getFunnelSessions(
    @Query() data: GetFunnelSessionsDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    const {
      pid,
      period,
      from,
      to,
      timezone = DEFAULT_TIMEZONE,
      pages,
      funnelId,
      step,
    } = data

    await this.analyticsService.checkProjectAccess(
      pid,
      uid,
      headers['x-password'],
    )

    await this.analyticsService.checkBillingAccess(pid)

    const pagesArr = await this.analyticsService.getPagesArray(
      pages,
      funnelId,
      pid,
    )

    if (step < 1 || step > pagesArr.length) {
      throw new BadRequestException(
        'Step must be between 1 and the number of funnel steps',
      )
    }

    const take = this.analyticsService.getSafeNumber(data.take, 30)
    const skip = this.analyticsService.getSafeNumber(data.skip, 0)

    if (take > 150) {
      throw new BadRequestException(
        'The maximum number of sessions to return is 150',
      )
    }

    this.logger.log(
      `pid: ${pid}, period: ${period}, step: ${step}, take: ${take}, skip: ${skip}`,
      'GET /analytics/funnel-sessions',
    )

    let diff

    if (period === 'all') {
      const [analyticsRes, customEVRes] = await Promise.all([
        this.analyticsService.calculateTimeBucketForAllTime(pid, 'analytics'),
        this.analyticsService.calculateTimeBucketForAllTime(pid, 'customEV'),
      ])

      diff = Math.max(analyticsRes.diff, customEVRes.diff)
    }

    const safeTimezone = this.analyticsService.getSafeTimezone(timezone)
    const { groupFrom, groupTo } = this.analyticsService.getGroupFromTo(
      from,
      to,
      null,
      period,
      safeTimezone,
      diff,
    )

    const params = { pid, groupFrom, groupTo }

    const sessions = await this.analyticsService.getFunnelSessionsList(
      pagesArr,
      params,
      safeTimezone,
      step,
      take,
      skip,
    )

    return { sessions, take, skip }
  }

  @Get('meta')
  @Auth(true, true)
  async getCustomEventMetadata(
    @Query() data: GetCustomEventMetadata,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ): Promise<ReturnType<typeof this.analyticsService.getCustomEventMetadata>> {
    const { pid } = data

    await this.analyticsService.checkProjectAccess(
      pid,
      uid,
      headers['x-password'],
    )

    await this.analyticsService.checkBillingAccess(pid)

    this.logger.log(`pid: ${pid}`, 'GET /analytics/meta')

    return this.analyticsService.getCustomEventMetadata(data)
  }

  @Get('property')
  @Auth(true, true)
  async getPagePropertyMetadata(
    @Query() data: GetPagePropertyMetaDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ): Promise<ReturnType<typeof this.analyticsService.getPagePropertyMeta>> {
    const { pid } = data

    await this.analyticsService.checkProjectAccess(
      pid,
      uid,
      headers['x-password'],
    )

    await this.analyticsService.checkBillingAccess(pid)

    this.logger.log(`pid: ${pid}`, 'GET /analytics/property')

    return this.analyticsService.getPagePropertyMeta(data)
  }

  @Get('filters')
  @Auth(true, true)
  async getFilters(
    @Query() data: GetFiltersDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    const { pid, type } = data

    await this.analyticsService.checkProjectAccess(
      pid,
      uid,
      headers['x-password'],
    )

    await this.analyticsService.checkBillingAccess(pid)

    this.logger.log(`pid: ${pid}, type: ${type}`, 'GET /analytics/filters')

    return this.analyticsService.getFilters(pid, type)
  }

  @Get('errors-filters')
  @Auth(true, true)
  async getErrorsFilters(
    @Query() data: GetFiltersDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    const { pid, type } = data

    await this.analyticsService.checkProjectAccess(
      pid,
      uid,
      headers['x-password'],
    )

    await this.analyticsService.checkBillingAccess(pid)

    this.logger.log(
      `pid: ${pid}, type: ${type}`,
      'GET /analytics/errors-filters',
    )

    return this.analyticsService.getErrorsFilters(pid, type)
  }

  @Get('filters/versions')
  @Auth(true, true)
  async getVersionFilters(
    @Query() data: GetVersionFiltersDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    const { pid, type, column } = data

    await this.analyticsService.checkProjectAccess(
      pid,
      uid,
      headers['x-password'],
    )

    await this.analyticsService.checkBillingAccess(pid)

    this.logger.log(
      `pid: ${pid}, type: ${type}, column: ${column}`,
      'GET /analytics/filters/versions',
    )

    return this.analyticsService.getVersionFilters(pid, type, column)
  }

  @Get('chart')
  @Auth(true, true)
  async getChartData(
    @Query() data: GetDataDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    const {
      pid,
      period,
      timeBucket,
      from,
      to,
      filters,
      timezone = DEFAULT_TIMEZONE,
      mode = ChartRenderMode.PERIODICAL,
    } = data

    const [filtersQuery, filtersParams, appliedFilters, customEVFilterApplied] =
      this.analyticsService.getFiltersQuery(filters, DataType.ANALYTICS)

    const safeTimezone = this.analyticsService.getSafeTimezone(timezone)
    const { groupFrom, groupTo } = this.analyticsService.getGroupFromTo(
      from,
      to,
      timeBucket,
      period,
      safeTimezone,
    )
    await this.analyticsService.checkProjectAccess(
      pid,
      uid,
      headers['x-password'],
    )

    await this.analyticsService.checkBillingAccess(pid)

    this.logger.log(`pid: ${pid}, period: ${period}`, 'GET /analytics/chart')

    const paramsData = { params: { pid, groupFrom, groupTo, ...filtersParams } }

    const result = await this.analyticsService.groupChartByTimeBucket(
      timeBucket,
      groupFrom,
      groupTo,
      filtersQuery,
      paramsData,
      safeTimezone,
      customEVFilterApplied,
      mode,
    )

    return { ...result, appliedFilters }
  }

  @Get('performance')
  @Auth(true, true)
  async getPerfData(
    @Query() data: GetDataDto & { measure: PerfMeasure },
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    const {
      pid,
      period,
      timeBucket,
      from,
      to,
      filters,
      timezone = DEFAULT_TIMEZONE,
      measure = DEFAULT_MEASURE,
    } = data

    this.analyticsService.checkIfPerfMeasureIsValid(measure)

    await this.analyticsService.checkProjectAccess(
      pid,
      uid,
      headers['x-password'],
    )

    await this.analyticsService.checkBillingAccess(pid)

    this.logger.log(
      `pid: ${pid}, period: ${period}, measure: ${measure}`,
      'GET /analytics/performance',
    )

    let newTimeBucket = timeBucket
    let allowedTumebucketForPeriodAll
    let diff

    if (period === 'all') {
      const res = await this.analyticsService.calculateTimeBucketForAllTime(
        pid,
        'performance',
      )

      diff = res.diff

      newTimeBucket = _includes(res.timeBucket, timeBucket)
        ? timeBucket
        : res.timeBucket[0]
      allowedTumebucketForPeriodAll = res.timeBucket
    }

    const [filtersQuery, filtersParams, appliedFilters] =
      this.analyticsService.getFiltersQuery(filters, DataType.PERFORMANCE, true)

    const safeTimezone = this.analyticsService.getSafeTimezone(timezone)
    const { groupFrom, groupTo } = this.analyticsService.getGroupFromTo(
      from,
      to,
      newTimeBucket,
      period,
      safeTimezone,
      diff,
    )

    const subQuery = `FROM performance WHERE pid = {pid:FixedString(12)} ${filtersQuery} AND created BETWEEN {groupFrom:String} AND {groupTo:String}`

    const paramsData = { params: { pid, groupFrom, groupTo, ...filtersParams } }

    const result = await this.analyticsService.groupPerfByTimeBucket(
      newTimeBucket,
      groupFrom,
      groupTo,
      subQuery,
      filtersQuery,
      paramsData,
      safeTimezone,
      measure,
    )

    return {
      ...result,
      appliedFilters,
      timeBucket: allowedTumebucketForPeriodAll,
    }
  }

  @Get('performance/chart')
  @Auth(true, true)
  async getPerfChartData(
    @Query() data: GetDataDto & { measure: PerfMeasure },
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    const {
      pid,
      period,
      timeBucket,
      from,
      to,
      filters,
      timezone = DEFAULT_TIMEZONE,
      measure = DEFAULT_MEASURE,
    } = data

    this.analyticsService.checkIfPerfMeasureIsValid(measure)

    const [filtersQuery, filtersParams, appliedFilters] =
      this.analyticsService.getFiltersQuery(filters, DataType.PERFORMANCE, true)

    const safeTimezone = this.analyticsService.getSafeTimezone(timezone)
    const { groupFrom, groupTo } = this.analyticsService.getGroupFromTo(
      from,
      to,
      timeBucket,
      period,
      safeTimezone,
    )
    await this.analyticsService.checkProjectAccess(
      pid,
      uid,
      headers['x-password'],
    )

    await this.analyticsService.checkBillingAccess(pid)

    this.logger.log(
      `pid: ${pid}, period: ${period}, measure: ${measure}`,
      'GET /analytics/performance/chart',
    )

    const paramsData = { params: { pid, groupFrom, groupTo, ...filtersParams } }

    const chart = await this.analyticsService.getPerfChartData(
      timeBucket,
      from,
      to,
      filtersQuery,
      paramsData,
      safeTimezone,
      measure,
    )

    return { chart, appliedFilters }
  }

  @Get('captcha')
  @Auth(true, true)
  async getCaptchaData(
    @Query() data: GetDataDto,
    @CurrentUserId() uid: string,
  ) {
    return this.getData(data, uid, {}, true)
  }

  @Get('user-flow')
  @Auth(true, true)
  async getUserFlow(
    @Query() data: GetUserFlowDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ): Promise<IUserFlow | { appliedFilters: any[] }> {
    const { pid, period, from, to, timezone = DEFAULT_TIMEZONE, filters } = data

    await this.analyticsService.checkProjectAccess(
      pid,
      uid,
      headers['x-password'],
    )

    await this.analyticsService.checkBillingAccess(pid)

    this.logger.log(
      `pid: ${pid}, period: ${period}`,
      'GET /analytics/user-flow',
    )

    let diff

    if (period === 'all') {
      const res = await this.analyticsService.calculateTimeBucketForAllTime(
        pid,
        'analytics',
      )

      diff = res.diff
    }

    const safeTimezone = this.analyticsService.getSafeTimezone(timezone)
    const { groupFrom, groupTo } = this.analyticsService.getGroupFromTo(
      from,
      to,
      null,
      period,
      safeTimezone,
      diff,
    )

    const [filtersQuery, filtersParams, appliedFilters] =
      this.analyticsService.getFiltersQuery(filters, DataType.ANALYTICS)

    const params = { pid, groupFrom, groupTo, ...filtersParams }

    const flow = await this.analyticsService.getUserFlow(params, filtersQuery)

    return { ...flow, appliedFilters }
  }

  @Get('keywords')
  @Auth(true, true)
  async getKeywords(
    @Query() data: GetKeywordsDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    const { pid, period, from, to, timezone = DEFAULT_TIMEZONE } = data

    await this.analyticsService.checkProjectAccess(
      pid,
      uid,
      headers['x-password'],
    )

    await this.analyticsService.checkBillingAccess(pid)

    this.logger.log(`pid: ${pid}, period: ${period}`, 'GET /analytics/keywords')

    let diff

    if (period === 'all') {
      const res = await this.analyticsService.calculateTimeBucketForAllTime(
        pid,
        'analytics',
      )

      diff = res.diff
    }

    const safeTimezone = this.analyticsService.getSafeTimezone(timezone)
    const { groupFrom, groupTo } = this.analyticsService.getGroupFromTo(
      from,
      to,
      null,
      period,
      safeTimezone,
      diff,
    )

    const keywords = await this.gscService.getKeywords(pid, groupFrom, groupTo)
    return { keywords }
  }

  @Get('gsc-dashboard')
  @Auth(true, true)
  async getGSCDashboard(
    @Query() data: GetKeywordsDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    const {
      pid,
      period,
      from,
      to,
      timezone = DEFAULT_TIMEZONE,
      timeBucket,
      filters,
    } = data

    await this.analyticsService.checkProjectAccess(
      pid,
      uid,
      headers['x-password'],
    )

    await this.analyticsService.checkBillingAccess(pid)

    const finalTimeBucket =
      timeBucket ||
      (['1h', 'today', 'yesterday', '1d'].includes(period) ? 'hour' : 'day')

    this.logger.log(
      `pid: ${pid}, period: ${period}, timeBucket: ${finalTimeBucket}, filters: ${filters}`,
      'GET /analytics/gsc-dashboard',
    )

    let diff

    if (period === 'all') {
      const res = await this.analyticsService.calculateTimeBucketForAllTime(
        pid,
        'analytics',
      )

      diff = res.diff
    }

    const safeTimezone = this.analyticsService.getSafeTimezone(timezone)
    const { groupFrom, groupTo } = this.analyticsService.getGroupFromTo(
      from,
      to,
      null,
      period,
      safeTimezone,
      diff,
    )

    return this.gscService.getDashboard(
      pid,
      groupFrom,
      groupTo,
      finalTimeBucket,
      filters,
    )
  }

  @Get('gsc-details')
  @Auth(true, true)
  async getGSCDetails(
    @Query() data: GetKeywordsDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    const {
      pid,
      period,
      from,
      to,
      timezone = DEFAULT_TIMEZONE,
      page,
      query,
    } = data

    this.logger.log(
      `pid: ${pid}, period: ${period}, page: ${page}, query: ${query}`,
      'GET /analytics/gsc-details',
    )

    await this.analyticsService.checkProjectAccess(
      pid,
      uid,
      headers['x-password'],
    )

    await this.analyticsService.checkBillingAccess(pid)

    let diff

    if (period === 'all') {
      const res = await this.analyticsService.calculateTimeBucketForAllTime(
        pid,
        'analytics',
      )

      diff = res.diff
    }

    const safeTimezone = this.analyticsService.getSafeTimezone(timezone)
    const { groupFrom, groupTo } = this.analyticsService.getGroupFromTo(
      from,
      to,
      null,
      period,
      safeTimezone,
      diff,
    )

    if (page) {
      const keywords = await this.gscService.getKeywords(
        pid,
        groupFrom,
        groupTo,
        50,
        0,
        undefined,
        page,
      )
      return { type: 'queries', data: keywords }
    }

    if (query) {
      const pages = await this.gscService.getTopPages(
        pid,
        groupFrom,
        groupTo,
        50,
        0,
        undefined,
        query,
      )
      return { type: 'pages', data: pages }
    }

    return { type: 'none', data: [] }
  }

  @Get('birdseye')
  @Auth(true, true)
  // returns overall short statistics per project
  async getOverallStats(
    @Query() data: GetOverallStatsDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    const {
      pids,
      pid,
      period,
      from,
      to,
      timezone = DEFAULT_TIMEZONE,
      timeBucket,
      filters,
      includeChart,
    } = data
    const pidsArray = getPIDsArray(pids, pid)

    this.logger.log(`pidsArray: ${pidsArray}`, 'GET /analytics/birdseye')

    const validPids = []

    const validationPromises = _map(pidsArray, async (currentPID) => {
      await this.analyticsService.checkProjectAccess(
        currentPID,
        uid,
        headers['x-password'],
      )

      await this.analyticsService.checkBillingAccess(currentPID)

      validPids.push(currentPID)
    })

    try {
      await Promise.allSettled(validationPromises)
    } catch {
      //
    }

    if (_isEmpty(validPids)) {
      throw new HttpException(
        'The data could not be loaded for the selected projects. It is possible that the projects are not accessible to you or the account owner has been suspended.',
        HttpStatus.PAYMENT_REQUIRED,
      )
    }

    return this.analyticsService.getAnalyticsSummary(
      validPids,
      timeBucket,
      period,
      from,
      to,
      timezone,
      filters,
      includeChart,
    )
  }

  @Get('performance/birdseye')
  @Auth(true, true)
  async getPerformanceOverallStats(
    @Query() data: GetOverallStatsDto & { measure: PerfMeasure },
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    const {
      pids,
      pid,
      period,
      from,
      to,
      timezone = DEFAULT_TIMEZONE,
      filters,
    } = data
    let { measure = DEFAULT_MEASURE } = data
    const pidsArray = getPIDsArray(pids, pid)

    this.analyticsService.checkIfPerfMeasureIsValid(measure)

    if (measure === 'quantiles') {
      measure = DEFAULT_MEASURE
    }

    const validationPromises = _map(pidsArray, async (currentPID) => {
      await this.analyticsService.checkProjectAccess(
        currentPID,
        uid,
        headers['x-password'],
      )

      await this.analyticsService.checkBillingAccess(currentPID)
    })

    await Promise.all(validationPromises)

    this.logger.log(
      `pidsArray: ${pidsArray}, measure: ${measure}`,
      'GET /analytics/performance/birdseye',
    )

    return this.analyticsService.getPerformanceSummary(
      pidsArray,
      period,
      from,
      to,
      timezone,
      filters,
      measure,
    )
  }

  @Public()
  @Get('generalStats')
  async getGeneralStats(): Promise<object> {
    const exists = await redis.exists(
      REDIS_USERS_COUNT_KEY,
      REDIS_PROJECTS_COUNT_KEY,
      REDIS_EVENTS_COUNT_KEY,
      REDIS_TRIALS_COUNT_KEY,
    )

    if (exists) {
      const users = _toNumber(await redis.get(REDIS_USERS_COUNT_KEY))
      const trials = _toNumber(await redis.get(REDIS_TRIALS_COUNT_KEY))
      const projects = _toNumber(await redis.get(REDIS_PROJECTS_COUNT_KEY))
      const events = _toNumber(await redis.get(REDIS_EVENTS_COUNT_KEY))

      return { users, trials, projects, events }
    }

    return this.analyticsService.getGeneralStats()
  }

  @Get('hb')
  @Auth(true, true)
  async getHeartBeatStats(
    @Query() data: GetHeartbeatStatsDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ): Promise<object> {
    const { pids, pid } = data
    const pidsArray = getPIDsArray(pids, pid)

    this.logger.log(`pidsArray: ${pidsArray}`, 'GET /analytics/hb')

    const validPids = []

    const validationPromises = _map(pidsArray, async (currentPID) => {
      await this.analyticsService.checkProjectAccess(
        currentPID,
        uid,
        headers['x-password'],
      )

      await this.analyticsService.checkBillingAccess(currentPID)

      validPids.push(currentPID)
    })

    try {
      await Promise.allSettled(validationPromises)
    } catch {
      //
    }

    if (_isEmpty(validPids)) {
      throw new HttpException(
        'The data could not be loaded for the selected projects. It is possible that the projects are not accessible to you or the account owner has been suspended.',
        HttpStatus.PAYMENT_REQUIRED,
      )
    }

    const result = {}

    const keyCountPromises = _map(validPids, async (currentPID) => {
      result[currentPID] =
        await this.analyticsService.getOnlineUserCount(currentPID)
    })

    await Promise.all(keyCountPromises).catch((reason) => {
      this.logger.error(`[GET /analytics/hb] ${reason}`)
      throw new InternalServerErrorException(
        'An error occured while calculating heartbeat statistics',
      )
    })

    return result
  }

  @Get('live-visitors')
  @Auth(true, true)
  async getLiveVisitors(
    @Query() queryParams: LiveVisitorsDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ): Promise<object> {
    const { pid } = queryParams

    await this.analyticsService.checkProjectAccess(
      pid,
      uid,
      headers['x-password'],
    )
    await this.analyticsService.checkBillingAccess(pid)

    this.logger.log(`pid: ${pid}`, 'GET /analytics/live-visitors')

    const since = dayjs
      .utc()
      .subtract(ONLINE_VISITORS_WINDOW_MINUTES, 'minute')
      .format('YYYY-MM-DD HH:mm:ss')

    // Query ClickHouse for active sessions in the last 5 minutes
    const query = `
      SELECT DISTINCT ON (psid)
        any(dv) AS dv,
        any(br) AS br,
        any(os) AS os,
        any(cc) AS cc,
        toString(psid) AS psid
      FROM
      (
        SELECT
          psid,
          dv,
          br,
          os,
          cc
        FROM analytics
        WHERE
          pid = {pid:FixedString(12)}
          AND created >= {since:DateTime}
          AND psid IS NOT NULL
        UNION ALL
        SELECT
          psid,
          dv,
          br,
          os,
          cc
        FROM customEV
        WHERE
          pid = {pid:FixedString(12)}
          AND created >= {since:DateTime}
          AND psid IS NOT NULL
      )
      GROUP BY psid
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: {
          pid,
          since,
        },
      })
      .then((resultSet) => resultSet.json())

    return data
  }

  @Get('bot-stats')
  @Auth(true, true)
  async getBotStats(
    @Query() data: GetBotStatsDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    const { pid, period = '30d' } = data

    await this.analyticsService.checkProjectAccess(
      pid,
      uid,
      headers['x-password'],
    )
    await this.analyticsService.checkBillingAccess(pid)

    this.logger.log(
      `pid: ${pid}, period: ${period}`,
      'GET /analytics/bot-stats',
    )

    return this.analyticsService.getBotStats(pid, period)
  }

  @Post('error')
  @Public()
  async logError(@Body() errorDTO: ErrorDto, @Headers() headers, @Ip() reqIP) {
    const { 'user-agent': userAgent, origin } = headers

    const ip = getIPFromHeaders(headers) || reqIP || ''

    const botResult = await this.analyticsService.checkBot(
      errorDTO.pid,
      userAgent,
      headers,
      ip,
      headers.referer || headers.referrer,
      errorDTO.pg,
      'error',
    )

    if (botResult.isBot) {
      return BOT_RESPONSE
    }

    const project = await this.analyticsService.validate(errorDTO, origin, ip)

    const [, psid] = await this.analyticsService.generateAndStoreSessionId(
      errorDTO.pid,
      userAgent,
      ip,
    )

    const profileId = await this.analyticsService.generateProfileId(
      errorDTO.pid,
      userAgent,
      ip,
      errorDTO.profileId,
    )

    await this.analyticsService.recordSessionActivity(
      psid,
      errorDTO.pid,
      profileId,
    )

    const {
      city,
      region,
      regionCode,
      country,
      isp,
      organization,
      userType,
      connectionType,
    } = getIPDetails(ip, errorDTO.tz)

    this.analyticsService.checkCountryBlacklist(project, country)

    this.logger.log(
      `pid: ${errorDTO.pid}, pg: ${errorDTO.pg}, name: ${errorDTO.name}, message: ${errorDTO.message}`,
      'POST /analytics/error',
    )

    const { deviceType, browserName, browserVersion, osName, osVersion } =
      await this.analyticsService.getRequestInformation(headers)

    const { name, message, lineno, colno, filename, stackTrace, meta } =
      errorDTO

    const transformed = errorEventTransformer({
      psid,
      profileId,
      eid: this.analyticsService.getErrorID(errorDTO),
      pid: errorDTO.pid,
      host: this.analyticsService.getHostFromOrigin(headers.origin),
      pg: errorDTO.pg,
      dv: deviceType,
      br: browserName,
      brv: browserVersion,
      os: osName,
      osv: osVersion,
      lc: errorDTO.lc,
      cc: country,
      rg: region,
      rgc: regionCode,
      ct: city,
      isp,
      og: organization,
      ut: userType,
      ctp: connectionType,
      name,
      message,
      lineno,
      colno,
      filename,
      stackTrace,
      meta,
    })

    try {
      await clickhouse.insert({
        table: 'errors',
        format: 'JSONEachRow',
        values: [transformed],
        clickhouse_settings: { async_insert: 1 },
      })
    } catch (reason) {
      this.logger.error(reason)
      throw new InternalServerErrorException(
        'Error occured while saving the custom event',
      )
    }

    return {}
  }

  // Update error(s) status
  @Patch('error-status')
  @Auth(true, true)
  async patchStatus(
    @Body() statusDTO: PatchStatusDto,
    @CurrentUserId() uid: string,
    @Headers() headers,
    @Ip() reqIP,
  ) {
    const { pid, eid, eids: unprocessedEids, status } = statusDTO
    const ip = getIPFromHeaders(headers) || reqIP || ''

    await checkRateLimit(ip, 'error-status', 100, 1800)

    await this.analyticsService.checkManageAccess(pid, uid)
    await this.analyticsService.checkBillingAccess(pid)

    const eids = getEIDsArray(unprocessedEids, eid)

    await this.analyticsService.validateEIDs(eids, pid)

    return this.analyticsService.updateEIDStatus(eids, status, pid)
  }

  @Post('custom')
  @Public()
  async logCustom(
    @Body() eventsDTO: EventsDto,
    @Headers() headers,
    @Ip() reqIP,
  ) {
    const { 'user-agent': userAgent, origin } = headers

    const ip = getIPFromHeaders(headers) || reqIP || ''

    const botResult = await this.analyticsService.checkBot(
      eventsDTO.pid,
      userAgent,
      headers,
      ip,
      eventsDTO.ref || headers.referer || headers.referrer,
      eventsDTO.pg,
      'custom',
    )

    if (botResult.isBot) {
      return BOT_RESPONSE
    }

    const project = await this.analyticsService.validate(eventsDTO, origin, ip)

    if (eventsDTO.unique) {
      const [unique] = await this.analyticsService.generateAndStoreSessionId(
        `${eventsDTO.pid}-${eventsDTO.ev}`,
        userAgent,
        ip,
      )

      if (!unique) {
        throw new ForbiddenException(
          'The unique option provided, while the custom event have already been created for this session',
        )
      }
    }

    const {
      city,
      region,
      regionCode,
      country,
      isp,
      organization,
      userType,
      connectionType,
    } = getIPDetails(ip, eventsDTO.tz)

    this.analyticsService.checkCountryBlacklist(project, country)

    this.logger.log(
      `pid: ${eventsDTO.pid}, ev: ${eventsDTO.ev}, pg: ${eventsDTO.pg}`,
      'POST /analytics/custom',
    )

    const { deviceType, browserName, browserVersion, osName, osVersion } =
      await this.analyticsService.getRequestInformation(headers)

    const [, psid] = await this.analyticsService.generateAndStoreSessionId(
      eventsDTO.pid,
      userAgent,
      ip,
    )

    const profileId = await this.analyticsService.generateProfileId(
      eventsDTO.pid,
      userAgent,
      ip,
      eventsDTO.profileId,
    )

    await this.analyticsService.recordSessionActivity(
      psid,
      eventsDTO.pid,
      profileId,
    )

    enrichTrafficSource(eventsDTO)

    const transformed = customEventTransformer({
      psid,
      profileId,
      pid: eventsDTO.pid,
      host: this.analyticsService.getHostFromOrigin(headers.origin),
      ev: eventsDTO.ev,
      pg: eventsDTO.pg,
      dv: deviceType,
      br: browserName,
      brv: browserVersion,
      os: osName,
      osv: osVersion,
      lc: eventsDTO.lc,
      ref: eventsDTO.ref,
      so: eventsDTO.so,
      me: eventsDTO.me,
      ca: eventsDTO.ca,
      te: eventsDTO.te,
      co: eventsDTO.co,
      cc: country,
      rg: region,
      rgc: regionCode,
      ct: city,
      isp,
      og: organization,
      ut: userType,
      ctp: connectionType,
      meta: eventsDTO.meta,
    })

    try {
      await clickhouse.insert({
        table: 'customEV',
        format: 'JSONEachRow',
        values: [transformed],
        clickhouse_settings: { async_insert: 1 },
      })
    } catch (reason) {
      this.logger.error(reason)
      throw new InternalServerErrorException(
        'Error occured while saving the custom event',
      )
    }

    return {}
  }

  @Post('hb')
  @Auth(true, true)
  async heartbeat(
    @Body() logDTO: PageviewsDto,
    @Headers() headers,
    @Ip() reqIP,
  ) {
    const { 'user-agent': userAgent, origin } = headers
    const { pid } = logDTO
    const ip = getIPFromHeaders(headers) || reqIP || ''

    const botResult = await this.analyticsService.checkBot(
      logDTO.pid,
      userAgent,
      headers,
      ip,
      headers.referer || headers.referrer,
      logDTO.pg,
      'heartbeat',
    )

    if (botResult.isBot) {
      return BOT_RESPONSE
    }

    await this.analyticsService.validateHeartbeat(logDTO, origin, ip)

    const { exists, psid } = await this.analyticsService.getSessionId(
      pid,
      userAgent,
      ip,
    )

    if (!exists) {
      throw new ForbiddenException(
        'The heartbeat was not saved because there is no session for this request. Please, send a pageview or custom event request first to initialise the session.',
      )
    }

    const profileId = await this.analyticsService.generateProfileId(
      pid,
      userAgent,
      ip,
      logDTO.profileId,
    )

    await this.analyticsService.extendSessionTTL(psid)
    await this.analyticsService.recordSessionActivity(psid, pid, profileId)

    this.logger.log(`pid: ${pid}, psid: ${psid}`, 'POST /analytics/hb')

    return {}
  }

  // Log pageview event
  @Post()
  @Public()
  async log(@Body() logDTO: PageviewsDto, @Headers() headers, @Ip() reqIP) {
    const { 'user-agent': userAgent, origin } = headers

    const ip = getIPFromHeaders(headers) || reqIP || ''

    const botResult = await this.analyticsService.checkBot(
      logDTO.pid,
      userAgent,
      headers,
      ip,
      logDTO.ref || headers.referer || headers.referrer,
      logDTO.pg,
      'pageview',
    )

    if (botResult.isBot) {
      return BOT_RESPONSE
    }

    const project = await this.analyticsService.validate(logDTO, origin, ip)

    const [unique, psid] =
      await this.analyticsService.generateAndStoreSessionId(
        logDTO.pid,
        userAgent,
        ip,
      )

    const profileId = await this.analyticsService.generateProfileId(
      logDTO.pid,
      userAgent,
      ip,
      logDTO.profileId,
    )

    await this.analyticsService.recordSessionActivity(
      psid,
      logDTO.pid,
      profileId,
    )

    if (!unique && logDTO.unique) {
      throw new ForbiddenException(
        'The event was not saved because it was not unique while unique only param is provided',
      )
    }

    const {
      city,
      region,
      regionCode,
      country,
      isp,
      organization,
      userType,
      connectionType,
    } = getIPDetails(ip, logDTO.tz)

    this.analyticsService.checkCountryBlacklist(project, country)

    this.logger.log(`pid: ${logDTO.pid}, pg: ${logDTO.pg}`, 'POST /analytics')

    const { deviceType, browserName, browserVersion, osName, osVersion } =
      await this.analyticsService.getRequestInformation(headers)

    enrichTrafficSource(logDTO)

    const transformed = trafficTransformer({
      psid,
      profileId,
      pid: logDTO.pid,
      host: this.analyticsService.getHostFromOrigin(headers.origin),
      pg: logDTO.pg,
      dv: deviceType,
      br: browserName,
      brv: browserVersion,
      os: osName,
      osv: osVersion,
      lc: logDTO.lc,
      ref: logDTO.ref,
      so: logDTO.so,
      me: logDTO.me,
      ca: logDTO.ca,
      te: logDTO.te,
      co: logDTO.co,
      cc: country,
      rg: region,
      rgc: regionCode,
      ct: city,
      isp,
      og: organization,
      ut: userType,
      ctp: connectionType,
      meta: logDTO.meta,
    })

    let perfTransformed = null

    if (!_isEmpty(logDTO.perf) && isPerformanceValid(logDTO.perf)) {
      const {
        dns,
        tls,
        conn,
        response,
        render,
        dom_load: domLoad,
        page_load: pageLoad,
        ttfb,
      } = logDTO.perf

      perfTransformed = performanceTransformer({
        pid: logDTO.pid,
        host: this.analyticsService.getHostFromOrigin(headers.origin),
        pg: logDTO.pg,
        dv: deviceType,
        br: browserName,
        brv: browserVersion,
        cc: country,
        rg: region,
        rgc: regionCode,
        ct: city,
        isp,
        og: organization,
        ut: userType,
        ctp: connectionType,
        dns,
        tls,
        conn,
        response,
        render,
        domLoad,
        pageLoad,
        ttfb,
      })
    }

    try {
      await clickhouse.insert({
        table: 'analytics',
        format: 'JSONEachRow',
        values: [transformed],
        clickhouse_settings: { async_insert: 1 },
      })

      if (!_isEmpty(perfTransformed)) {
        await clickhouse.insert({
          table: 'performance',
          format: 'JSONEachRow',
          values: [perfTransformed],
          clickhouse_settings: { async_insert: 1 },
        })
      }
    } catch (reason) {
      this.logger.error(reason)
      throw new InternalServerErrorException(
        'Error occured while saving the log data',
      )
    }

    return {}
  }

  // Fallback for logging pageviews for users with JavaScript disabled
  // Returns 1x1 transparent gif
  @Get('noscript')
  @Header('Cross-Origin-Resource-Policy', 'cross-origin')
  @Public()
  async noscript(
    @Query() data: NoscriptDto,
    @Headers() headers,
    @Ip() reqIP,
    @Response() res,
  ) {
    const { 'user-agent': userAgent, origin } = headers
    const { pid } = data

    const ip = getIPFromHeaders(headers) || reqIP || ''

    const botResult = await this.analyticsService.checkBot(
      pid,
      userAgent,
      headers,
      ip,
      headers.referer || headers.referrer,
      null,
      'noscript',
    )

    if (botResult.isBot) {
      res.writeHead(200, { 'Content-Type': 'image/gif' })
      return res.end(TRANSPARENT_GIF_BUFFER, 'binary')
    }

    const logDTO: PageviewsDto = { pid }

    const project = await this.analyticsService.validate(logDTO, origin, ip)

    const [, psid] = await this.analyticsService.generateAndStoreSessionId(
      logDTO.pid,
      userAgent,
      ip,
    )

    const profileId = await this.analyticsService.generateProfileId(
      logDTO.pid,
      userAgent,
      ip,
    )

    await this.analyticsService.recordSessionActivity(
      psid,
      logDTO.pid,
      profileId,
    )

    const {
      city,
      region,
      regionCode,
      country,
      isp,
      organization,
      userType,
      connectionType,
    } = getIPDetails(ip)

    this.analyticsService.checkCountryBlacklist(project, country)

    this.logger.log(`pid: ${pid}`, 'GET /analytics/noscript')

    const { deviceType, browserName, browserVersion, osName, osVersion } =
      await this.analyticsService.getRequestInformation(headers)

    const transformed = trafficTransformer({
      psid,
      profileId,
      pid: logDTO.pid,
      host: this.analyticsService.getHostFromOrigin(headers.origin),
      pg: null,
      dv: deviceType,
      br: browserName,
      brv: browserVersion,
      os: osName,
      osv: osVersion,
      lc: null,
      ref: null,
      so: null,
      me: null,
      ca: null,
      te: null,
      co: null,
      cc: country,
      rg: region,
      rgc: regionCode,
      ct: city,
      isp,
      og: organization,
      ut: userType,
      ctp: connectionType,
      meta: null,
    })

    try {
      await clickhouse.insert({
        table: 'analytics',
        format: 'JSONEachRow',
        values: [transformed],
        clickhouse_settings: { async_insert: 1 },
      })
    } catch (reason) {
      this.logger.error(reason)
    }

    res.writeHead(200, { 'Content-Type': 'image/gif' })
    return res.end(TRANSPARENT_GIF_BUFFER, 'binary')
  }

  @Get('sessions')
  @Auth(true, true)
  async getSessions(
    @Query() data: GetSessionsDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    const { pid, period, from, to, filters, timezone = DEFAULT_TIMEZONE } = data

    await this.analyticsService.checkProjectAccess(
      pid,
      uid,
      headers['x-password'],
    )

    await this.analyticsService.checkBillingAccess(pid)

    const take = this.analyticsService.getSafeNumber(data.take, 30)
    const skip = this.analyticsService.getSafeNumber(data.skip, 0)

    if (take > 150) {
      throw new BadRequestException(
        'The maximum number of sessions to return is 150',
      )
    }

    this.logger.log(
      `pid: ${pid}, period: ${period}, take: ${take}, skip: ${skip}`,
      'GET /analytics/sessions',
    )

    const [filtersQuery, filtersParams, appliedFilters, customEVFilterApplied] =
      this.analyticsService.getFiltersQuery(filters, DataType.ANALYTICS)

    let timeBucket
    let diff

    if (period === 'all') {
      const res = await this.analyticsService.calculateTimeBucketForAllTime(
        pid,
        customEVFilterApplied ? 'customEV' : 'analytics',
      )

      timeBucket = res.timeBucket[0]
      diff = res.diff
    } else {
      timeBucket = getLowestPossibleTimeBucket(period, from, to)
    }

    const safeTimezone = this.analyticsService.getSafeTimezone(timezone)
    const { groupFromUTC, groupToUTC } = this.analyticsService.getGroupFromTo(
      from,
      to,
      timeBucket,
      period,
      safeTimezone,
      diff,
    )

    const paramsData = {
      params: {
        pid,
        groupFrom: groupFromUTC,
        groupTo: groupToUTC,
        ...filtersParams,
      },
    }

    const sessions = await this.analyticsService.getSessionsList(
      filtersQuery,
      paramsData,
      safeTimezone,
      take,
      skip,
      customEVFilterApplied,
    )

    return { sessions, appliedFilters, take, skip }
  }

  @Get('errors')
  @Auth(true, true)
  async getErrors(
    @Query() data: GetErrorsDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    const {
      pid,
      period,
      from,
      to,
      filters,
      timezone = DEFAULT_TIMEZONE,
      options,
    } = data

    await this.analyticsService.checkProjectAccess(
      pid,
      uid,
      headers['x-password'],
    )

    await this.analyticsService.checkBillingAccess(pid)

    const take = this.analyticsService.getSafeNumber(data.take, 30)
    const skip = this.analyticsService.getSafeNumber(data.skip, 0)

    if (take > 150) {
      throw new BadRequestException(
        'The maximum number of errors to return is 150',
      )
    }

    this.logger.log(
      `pid: ${pid}, period: ${period}, take: ${take}, skip: ${skip}`,
      'GET /analytics/errors',
    )

    let timeBucket
    let diff

    if (period === 'all') {
      const res = await this.analyticsService.calculateTimeBucketForAllTime(
        pid,
        'errors',
      )

      timeBucket = res.timeBucket[0]
      diff = res.diff
    } else {
      timeBucket = getLowestPossibleTimeBucket(period, from, to)
    }

    const [filtersQuery, filtersParams, appliedFilters] =
      this.analyticsService.getFiltersQuery(filters, DataType.ERRORS, true)

    const safeTimezone = this.analyticsService.getSafeTimezone(timezone)
    const { groupFromUTC, groupToUTC } = this.analyticsService.getGroupFromTo(
      from,
      to,
      timeBucket,
      period,
      safeTimezone,
      diff,
    )

    const paramsData = {
      params: {
        pid,
        groupFrom: groupFromUTC,
        groupTo: groupToUTC,
        ...filtersParams,
      },
    }

    const errors = await this.analyticsService.getErrorsList(
      options,
      filtersQuery,
      paramsData,
      safeTimezone,
      take,
      skip,
    )

    return { errors, appliedFilters, take, skip }
  }

  @Get('get-error')
  @Auth(true, true)
  async getError(
    @Query() data: GetErrorDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    const {
      pid,
      timezone = DEFAULT_TIMEZONE,
      eid,
      period,
      from,
      to,
      timeBucket,
    } = data

    await this.analyticsService.checkProjectAccess(
      pid,
      uid,
      headers['x-password'],
    )

    await this.analyticsService.checkBillingAccess(pid)

    this.logger.log(
      `pid: ${pid}, eid: ${eid}, period: ${period}`,
      'GET /analytics/get-error',
    )

    let newTimeBucket = timeBucket
    let diff

    if (period === 'all') {
      const res = await this.analyticsService.calculateTimeBucketForAllTime(
        pid,
        'errors',
      )

      newTimeBucket = res.timeBucket[0]
      diff = res.diff
    }

    const safeTimezone = this.analyticsService.getSafeTimezone(timezone)
    const { groupFromUTC, groupToUTC } = this.analyticsService.getGroupFromTo(
      from,
      to,
      newTimeBucket,
      period,
      safeTimezone,
      diff,
    )

    const result = await this.analyticsService.getErrorDetails(
      pid,
      eid,
      safeTimezone,
      groupFromUTC,
      groupToUTC,
      newTimeBucket,
    )

    return result
  }

  @Get('error-overview')
  @Auth(true, true)
  async getErrorOverview(
    @Query() data: GetErrorOverviewDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    const {
      pid,
      period,
      from,
      to,
      filters,
      timezone = DEFAULT_TIMEZONE,
      timeBucket,
      options,
    } = data

    await this.analyticsService.checkProjectAccess(
      pid,
      uid,
      headers['x-password'],
    )

    await this.analyticsService.checkBillingAccess(pid)

    this.logger.log(
      `pid: ${pid}, period: ${period}`,
      'GET /analytics/error-overview',
    )

    let parsedOptions: GetErrorOverviewOptions = {}

    if (typeof options === 'string') {
      try {
        parsedOptions = JSON.parse(options)
      } catch {
        // Ignore parse errors
      }
    } else {
      parsedOptions = options || {}
    }

    let newTimeBucket = timeBucket
    let diff

    if (period === 'all') {
      const res = await this.analyticsService.calculateTimeBucketForAllTime(
        pid,
        'errors',
      )

      newTimeBucket = res.timeBucket[0]
      diff = res.diff
    }

    const [filtersQuery, filtersParams] = this.analyticsService.getFiltersQuery(
      filters,
      DataType.ERRORS,
      true,
    )

    const safeTimezone = this.analyticsService.getSafeTimezone(timezone)
    const { groupFromUTC, groupToUTC } = this.analyticsService.getGroupFromTo(
      from,
      to,
      newTimeBucket,
      period,
      safeTimezone,
      diff,
    )

    const paramsData = {
      params: {
        pid,
        groupFrom: groupFromUTC,
        groupTo: groupToUTC,
        ...filtersParams,
      },
    }

    return this.analyticsService.getErrorOverview(
      pid,
      filtersQuery,
      paramsData,
      safeTimezone,
      groupFromUTC,
      groupToUTC,
      newTimeBucket,
      parsedOptions.showResolved || false,
    )
  }

  @Get('error-sessions')
  @Auth(true, true)
  async getErrorSessions(
    @Query() data: GetErrorDto & { take?: number; skip?: number },
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    const { pid, eid, period, from, to, timeBucket } = data

    await this.analyticsService.checkProjectAccess(
      pid,
      uid,
      headers['x-password'],
    )

    await this.analyticsService.checkBillingAccess(pid)

    const take = this.analyticsService.getSafeNumber(data.take, 10)
    const skip = this.analyticsService.getSafeNumber(data.skip, 0)

    if (take > 50) {
      throw new BadRequestException(
        'The maximum number of sessions to return is 50',
      )
    }

    this.logger.log(
      `pid: ${pid}, eid: ${eid}, period: ${period}, take: ${take}, skip: ${skip}`,
      'GET /analytics/error-sessions',
    )

    let newTimeBucket = timeBucket
    let diff

    if (period === 'all') {
      const res = await this.analyticsService.calculateTimeBucketForAllTime(
        pid,
        'errors',
      )

      newTimeBucket = res.timeBucket[0]
      diff = res.diff
    }

    const safeTimezone = this.analyticsService.getSafeTimezone(DEFAULT_TIMEZONE)
    const { groupFromUTC, groupToUTC } = this.analyticsService.getGroupFromTo(
      from,
      to,
      newTimeBucket,
      period,
      safeTimezone,
      diff,
    )

    return this.analyticsService.getErrorAffectedSessions(
      pid,
      eid,
      groupFromUTC,
      groupToUTC,
      take,
      skip,
    )
  }

  @Get('session')
  @Auth(true, true)
  async getSession(
    @Query() data: GetSessionDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    const { pid, psid, timezone = DEFAULT_TIMEZONE } = data

    await this.analyticsService.checkProjectAccess(
      pid,
      uid,
      headers['x-password'],
    )

    await this.analyticsService.checkBillingAccess(pid)

    this.logger.log(`pid: ${pid}, psid: ${psid}`, 'GET /analytics/session')

    const safeTimezone = this.analyticsService.getSafeTimezone(timezone)

    const result = await this.analyticsService.getSessionDetails(
      pid,
      psid,
      safeTimezone,
    )

    return result
  }

  @Get('profiles')
  @Auth(true, true)
  async getProfiles(
    @Query() data: GetProfilesDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    const {
      pid,
      period,
      from,
      to,
      filters,
      timezone = DEFAULT_TIMEZONE,
      profileType = 'all',
    } = data

    await this.analyticsService.checkProjectAccess(
      pid,
      uid,
      headers['x-password'],
    )

    await this.analyticsService.checkBillingAccess(pid)

    const take = this.analyticsService.getSafeNumber(data.take, 30)
    const skip = this.analyticsService.getSafeNumber(data.skip, 0)

    if (take > 150) {
      throw new BadRequestException(
        'The maximum number of profiles to return is 150',
      )
    }

    this.logger.log(
      `pid: ${pid}, period: ${period}, take: ${take}, skip: ${skip}`,
      'GET /analytics/profiles',
    )

    const [filtersQuery, filtersParams, appliedFilters, customEVFilterApplied] =
      this.analyticsService.getFiltersQuery(filters, DataType.ANALYTICS)

    let timeBucket
    let diff

    if (period === 'all') {
      const res = await this.analyticsService.calculateTimeBucketForAllTime(
        pid,
        customEVFilterApplied ? 'customEV' : 'analytics',
      )

      timeBucket = res.timeBucket[0]
      diff = res.diff
    } else {
      timeBucket = getLowestPossibleTimeBucket(period, from, to)
    }

    const safeTimezone = this.analyticsService.getSafeTimezone(timezone)
    const { groupFromUTC, groupToUTC } = this.analyticsService.getGroupFromTo(
      from,
      to,
      timeBucket,
      period,
      safeTimezone,
      diff,
    )

    const paramsData = {
      params: {
        pid,
        groupFrom: groupFromUTC,
        groupTo: groupToUTC,
        ...filtersParams,
      },
    }

    const profiles = await this.analyticsService.getProfilesList(
      pid,
      filtersQuery,
      paramsData,
      safeTimezone,
      take,
      skip,
      profileType,
      customEVFilterApplied,
    )

    return { profiles, appliedFilters, take, skip }
  }

  @Get('profile')
  @Auth(true, true)
  async getProfile(
    @Query() data: GetProfileDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    const {
      pid,
      profileId,
      timezone = DEFAULT_TIMEZONE,
      period,
      from,
      to,
    } = data

    await this.analyticsService.checkProjectAccess(
      pid,
      uid,
      headers['x-password'],
    )

    await this.analyticsService.checkBillingAccess(pid)

    this.logger.log(
      `pid: ${pid}, profileId: ${profileId}, period: ${period}`,
      'GET /analytics/profile',
    )

    const safeTimezone = this.analyticsService.getSafeTimezone(timezone)

    let timeBucket
    let diff

    if (period === 'all') {
      const res = await this.analyticsService.calculateTimeBucketForAllTime(
        pid,
        'analytics',
      )
      timeBucket = res.timeBucket[0]
      diff = res.diff
    } else {
      timeBucket = getLowestPossibleTimeBucket(period, from, to)
    }

    const { groupFromUTC, groupToUTC } = this.analyticsService.getGroupFromTo(
      from,
      to,
      timeBucket,
      period,
      safeTimezone,
      diff,
    )

    const [details, topPages, activityCalendar, chart] = await Promise.all([
      this.analyticsService.getProfileDetails(pid, profileId, safeTimezone),
      this.analyticsService.getProfileTopPages(pid, profileId),
      this.analyticsService.getProfileActivityCalendar(pid, profileId),
      this.analyticsService.getProfileChartData(
        pid,
        profileId,
        timeBucket,
        groupFromUTC,
        groupToUTC,
        safeTimezone,
      ),
    ])

    return {
      ...details,
      topPages,
      activityCalendar,
      chart,
      timeBucket,
    }
  }

  @Get('profile/sessions')
  @Auth(true, true)
  async getProfileSessions(
    @Query() data: GetProfileSessionsDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    const {
      pid,
      profileId,
      period,
      from,
      to,
      filters,
      timezone = DEFAULT_TIMEZONE,
    } = data

    await this.analyticsService.checkProjectAccess(
      pid,
      uid,
      headers['x-password'],
    )

    await this.analyticsService.checkBillingAccess(pid)

    const take = this.analyticsService.getSafeNumber(data.take, 30)
    const skip = this.analyticsService.getSafeNumber(data.skip, 0)

    if (take > 150) {
      throw new BadRequestException(
        'The maximum number of sessions to return is 150',
      )
    }

    this.logger.log(
      `pid: ${pid}, profileId: ${profileId}, period: ${period}, take: ${take}, skip: ${skip}`,
      'GET /analytics/profile/sessions',
    )

    const [filtersQuery, filtersParams, appliedFilters, customEVFilterApplied] =
      this.analyticsService.getFiltersQuery(filters, DataType.ANALYTICS)

    let timeBucket
    let diff

    if (period === 'all') {
      const res = await this.analyticsService.calculateTimeBucketForAllTime(
        pid,
        customEVFilterApplied ? 'customEV' : 'analytics',
      )

      timeBucket = res.timeBucket[0]
      diff = res.diff
    } else {
      timeBucket = getLowestPossibleTimeBucket(period, from, to)
    }

    const safeTimezone = this.analyticsService.getSafeTimezone(timezone)
    const { groupFromUTC, groupToUTC } = this.analyticsService.getGroupFromTo(
      from,
      to,
      timeBucket,
      period,
      safeTimezone,
      diff,
    )

    const paramsData = {
      params: {
        pid,
        groupFrom: groupFromUTC,
        groupTo: groupToUTC,
        ...filtersParams,
      },
    }

    const sessions = await this.analyticsService.getProfileSessionsList(
      pid,
      profileId,
      filtersQuery,
      paramsData,
      safeTimezone,
      take,
      skip,
      customEVFilterApplied,
    )

    return { sessions, appliedFilters, take, skip }
  }

  @Get('custom-events')
  @Auth(true, true)
  async getCustomEvents(
    @Query() data: GetCustomEventsDto,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    const {
      pid,
      period,
      timeBucket,
      from,
      to,
      filters,
      timezone = DEFAULT_TIMEZONE,
      customEvents,
    } = data

    await this.analyticsService.checkProjectAccess(
      pid,
      uid,
      headers['x-password'],
    )

    await this.analyticsService.checkBillingAccess(pid)

    this.logger.log(
      `pid: ${pid}, period: ${period}, customEvents: ${customEvents}`,
      'GET /analytics/custom-events',
    )

    let newTimeBucket = timeBucket
    let diff
    let timeBucketForAllTime

    if (period === VALID_PERIODS[VALID_PERIODS.length - 1]) {
      const res = await this.analyticsService.calculateTimeBucketForAllTime(
        pid,
        'customEV',
      )

      newTimeBucket = _includes(res.timeBucket, timeBucket)
        ? timeBucket
        : res.timeBucket[0]
      diff = res.diff
      timeBucketForAllTime = res.timeBucket
    }

    const [filtersQuery, filtersParams, appliedFilters] =
      this.analyticsService.getFiltersQuery(filters, DataType.ANALYTICS)

    const safeTimezone = this.analyticsService.getSafeTimezone(timezone)
    const { groupFrom, groupTo } = this.analyticsService.getGroupFromTo(
      from,
      to,
      newTimeBucket,
      period,
      safeTimezone,
      diff,
    )

    const paramsData = { params: { pid, groupFrom, groupTo, ...filtersParams } }

    // customEvents comes as a JSON.stringified array from the frontend
    let customEventsList: string[] = []
    try {
      const parsed = JSON.parse(customEvents || '[]')
      customEventsList = Array.isArray(parsed) ? parsed : []
    } catch {
      customEventsList = []
    }

    if (customEventsList.length === 0) {
      return { chart: {}, appliedFilters, timeBucket: timeBucketForAllTime }
    }

    const result: any = await this.analyticsService.groupCustomEVByTimeBucket(
      newTimeBucket,
      groupFrom,
      groupTo,
      filtersQuery,
      paramsData,
      safeTimezone,
      customEventsList,
    )

    return { ...result, appliedFilters, timeBucket: timeBucketForAllTime }
  }

  // Revenue attribution endpoints

  @Post('profile-id')
  @Public()
  async getOrCreateProfileId(
    @Body() dto: GetProfileIdDto,
    @Headers() headers,
    @Ip() reqIP,
  ): Promise<{ profileId: string | null }> {
    const { 'user-agent': userAgent } = headers
    const { pid } = dto

    try {
      const ip = getIPFromHeaders(headers) || reqIP || ''

      const profileId = await this.analyticsService.generateProfileId(
        pid,
        userAgent,
        ip,
      )

      this.logger.log(
        `pid: ${pid}, profileId: ${profileId}`,
        'POST /analytics/profile-id',
      )

      return { profileId }
    } catch (error) {
      this.logger.error({ error, pid }, 'Error generating profile ID')
      return { profileId: null }
    }
  }

  @Post('session-id')
  @Public()
  async getOrCreateSessionId(
    @Body() dto: GetSessionIdDto,
    @Headers() headers,
    @Ip() reqIP,
  ): Promise<{ sessionId: string | null }> {
    const { 'user-agent': userAgent } = headers
    const { pid } = dto

    try {
      const ip = getIPFromHeaders(headers) || reqIP || ''

      const { psid } = await this.analyticsService.getSessionId(
        pid,
        userAgent,
        ip,
      )

      this.logger.log(
        `pid: ${pid}, sessionId: ${psid}`,
        'POST /analytics/session-id',
      )

      return { sessionId: psid }
    } catch (error) {
      this.logger.error({ error, pid }, 'Error generating session ID')
      return { sessionId: null }
    }
  }
}

import crypto from 'crypto'
import _isEmpty from 'lodash/isEmpty'
import _split from 'lodash/split'
import _reverse from 'lodash/reverse'
import _size from 'lodash/size'
import _includes from 'lodash/includes'
import _map from 'lodash/map'
import _toUpper from 'lodash/toUpper'
import _head from 'lodash/head'
import _join from 'lodash/join'
import _isArray from 'lodash/isArray'
import _startsWith from 'lodash/startsWith'
import _sortBy from 'lodash/sortBy'
import _reduce from 'lodash/reduce'
import _keys from 'lodash/keys'
import _last from 'lodash/last'
import _replace from 'lodash/replace'
import _some from 'lodash/some'
import _find from 'lodash/find'
import _isString from 'lodash/isString'
import _values from 'lodash/values'
import _round from 'lodash/round'
import _filter from 'lodash/filter'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import dayjsTimezone from 'dayjs/plugin/timezone'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import ipRangeCheck from 'ip-range-check'
import validator from 'validator'
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  HttpException,
  HttpStatus,
  UnprocessableEntityException,
  PreconditionFailedException,
} from '@nestjs/common'
import { isbot } from 'isbot'

import { DEFAULT_TIMEZONE, PlanCode } from '../user/entities/user.entity'
import {
  redis,
  UNIQUE_SESSION_LIFE_TIME,
  TRAFFIC_COLUMNS,
  ALL_COLUMNS,
  CAPTCHA_COLUMNS,
  ERROR_COLUMNS,
  PERFORMANCE_COLUMNS,
  MIN_PAGES_IN_FUNNEL,
  MAX_PAGES_IN_FUNNEL,
  REDIS_USERS_COUNT_KEY,
  REDIS_PROJECTS_COUNT_KEY,
  REDIS_EVENTS_COUNT_KEY,
  TRAFFIC_METAKEY_COLUMNS,
  REDIS_TRIALS_COUNT_KEY,
} from '../common/constants'
import { SaltService } from './salt.service'
import { clickhouse } from '../common/integrations/clickhouse'
import { getDomainsForRefName } from './utils/referrers.map'
import {
  calculateRelativePercentage,
  hash,
  millisecondsToSeconds,
  sumArrays,
  formatDuration,
} from '../common/utils'
import { PageviewsDto } from './dto/pageviews.dto'
import { EventsDto } from './dto/events.dto'
import { ProjectService } from '../project/project.service'
import { UserService } from '../user/user.service'
import { BotsProtectionLevel, Project } from '../project/entity/project.entity'
import { ChartRenderMode, TimeBucketType } from './dto/getData.dto'
import { GetCustomEventMetadata } from './dto/get-custom-event-meta.dto'
import {
  PerformanceCHResponse,
  CustomsCHResponse,
  CustomsCHAggregatedResponse,
  TrafficCEFilterCHResponse,
  BirdseyeCHResponse,
  TrafficCHResponse,
  IGetGroupFromTo,
  GetFiltersQuery,
  IUserFlowNode,
  IUserFlowLink,
  IUserFlow,
  IBuildUserFlow,
  IExtractChartData,
  IGenerateXAxis,
  IAggregatedMetadata,
  IFunnelCHResponse,
  IFunnel,
  IOverall,
  IOverallPerformance,
  IPageflow,
  PerfMeasure,
  PropertiesCHResponse,
  IPageProperty,
  ICustomEvent,
} from './interfaces'
import { ErrorDto } from './dto/error.dto'
import { GetPagePropertyMetaDto } from './dto/get-page-property-meta.dto'
import { ProjectViewCustomEventMetaValueType } from '../project/entity/project-view-custom-event.entity'
import { ProjectViewCustomEventDto } from '../project/dto/create-project-view.dto'
import { UAParser } from '@ua-parser-js/pro-business'
import { extensions } from './utils/ua-parser'
import { In, Not } from 'typeorm'

dayjs.extend(utc)
dayjs.extend(dayjsTimezone)
dayjs.extend(isSameOrBefore)

// 2 minutes
const LIVE_SESSION_THRESHOLD_SECONDS = 120

const SOFTWARE_WITH_PATCH_VERSION = ['GameVault']

const GMT_0_TIMEZONES = [
  'Atlantic/Azores',
  'Etc/GMT',
  // 'Africa/Casablanca',
]

const MEASURES_MAP = {
  average: 'avg',
  median: 'median',
  p95: 'quantileExact(0.95)',
  p75: 'quantileExact(0.75)',
}

// mapping of allowed timebuckets per difference between days
// (e.g. if difference is lower than (lt) (including) -> then the specified timebuckets are allowed to be applied)
const timeBucketToDays = [
  {
    lt: 0,
    tb: [TimeBucketType.MINUTE, TimeBucketType.HOUR],
  }, // < 1 day
  {
    lt: 7,
    tb: [TimeBucketType.HOUR, TimeBucketType.DAY, TimeBucketType.MONTH],
  }, // 7 days
  {
    lt: 28,
    tb: [TimeBucketType.DAY, TimeBucketType.MONTH],
  }, // 4 weeks
  { lt: 366, tb: [TimeBucketType.DAY, TimeBucketType.MONTH] }, // 12 months
  { lt: 732, tb: [TimeBucketType.MONTH] }, // 24 months
  { lt: 1464, tb: [TimeBucketType.MONTH, TimeBucketType.YEAR] }, // 48 months
  { lt: 99999, tb: [TimeBucketType.YEAR] },
]

const timeBucketConversion = {
  minute: 'toStartOfMinute',
  hour: 'toStartOfHour',
  day: 'toStartOfDay',
  month: 'toStartOfMonth',
  year: 'toStartOfYear',
}

const isValidTimezone = (timezone: string): boolean => {
  if (_isEmpty(timezone)) {
    return false
  }

  try {
    dayjs.tz('2013-11-18 11:55', timezone)
    return true
  } catch {
    return false
  }
}

export const isValidDate = (date: string, format = 'YYYY-MM-DD'): boolean => {
  if (_isEmpty(date)) {
    return false
  }

  return dayjs(date, format).format(format) === date
}

const checkIfTBAllowed = (
  timeBucket: TimeBucketType,
  from: string,
  to: string,
): void => {
  const diff = dayjs(to).diff(dayjs(from), 'days')

  const tbMap = _find(timeBucketToDays, ({ lt }) => diff <= lt)

  if (_isEmpty(tbMap)) {
    throw new PreconditionFailedException(
      "The difference between 'from' and 'to' is greater than allowed",
    )
  }

  const { tb } = tbMap

  if (!_includes(tb, timeBucket)) {
    throw new PreconditionFailedException(
      "The specified 'timeBucket' parameter cannot be applied to the date range",
    )
  }
}

export const getLowestPossibleTimeBucket = (
  period?: string,
  from?: string,
  to?: string,
): TimeBucketType => {
  if (!from && !to) {
    if (period === '1h') {
      return TimeBucketType.MINUTE
    }

    if (
      period === 'today' ||
      period === 'yesterday' ||
      period === '1d' ||
      period === '7d'
    ) {
      return TimeBucketType.HOUR
    }

    if (period === '4w') {
      return TimeBucketType.DAY
    }

    if (period === '3M' || period === '12M' || period === '24M') {
      return TimeBucketType.MONTH
    }

    return TimeBucketType.YEAR
  }

  const diff = dayjs(to).diff(dayjs(from), 'days')

  const tbMap = _find(timeBucketToDays, ({ lt }) => diff <= lt)

  if (_isEmpty(tbMap)) {
    throw new PreconditionFailedException(
      "The difference between 'from' and 'to' is greater than allowed",
    )
  }

  return _head(tbMap.tb)
}

const EXCLUDE_NULL_FOR = ['so', 'me', 'ca', 'te', 'co', 'rg', 'ct']

const generateParamsQuery = (
  col: string,
  subQuery: string,
  customEVFilterApplied: boolean,
  isPageInclusiveFilterSet: boolean,
  type: 'traffic' | 'performance' | 'captcha' | 'errors',
  measure?: PerfMeasure,
): string => {
  let columns = [`${col} as name`]

  // For regions and cities we'll return an array of objects, that will also include the country code and region code
  // We need the conutry code to display the flag next to the region/city name
  if (col === 'rg') {
    columns = [...columns, 'cc', 'rgc']
  } else if (col === 'ct') {
    columns = [...columns, 'cc']
  }

  // For browser version and OS version, include the browser or OS name
  if (col === 'brv') {
    columns = [...columns, 'br']
  } else if (col === 'osv') {
    columns = [...columns, 'os']
  }

  const columnsQuery = columns.join(', ')

  if (type === 'performance') {
    const processedMeasure = measure === 'quantiles' ? 'median' : measure

    const fn = MEASURES_MAP[processedMeasure]

    if (col === 'pg' || col === 'host') {
      return `SELECT ${columnsQuery}, round(divide(${fn}(pageLoad), 1000), 2) as count ${subQuery} GROUP BY ${columnsQuery}`
    }

    return `SELECT ${columnsQuery}, round(divide(${fn}(pageLoad), 1000), 2) as count ${subQuery} ${EXCLUDE_NULL_FOR.includes(col) ? `AND ${col} IS NOT NULL` : ''} GROUP BY ${columnsQuery}`
  }

  if (type === 'errors') {
    return `SELECT ${columnsQuery}, count(*) as count ${subQuery} ${EXCLUDE_NULL_FOR.includes(col) ? `AND ${col} IS NOT NULL` : ''} GROUP BY ${columnsQuery}`
  }

  if (type === 'captcha') {
    return `SELECT ${columnsQuery}, count(*) as count ${subQuery} GROUP BY ${col}`
  }

  if (customEVFilterApplied) {
    return `SELECT ${columnsQuery}, count(*) as count ${subQuery} GROUP BY ${columnsQuery}`
  }

  if (col === 'pg' || col === 'host') {
    return `SELECT ${columnsQuery}, count(*) as count ${subQuery} GROUP BY ${columnsQuery}`
  }

  if (isPageInclusiveFilterSet) {
    return `SELECT ${columnsQuery}, count(*) as count ${subQuery} ${EXCLUDE_NULL_FOR.includes(col) ? `AND ${col} IS NOT NULL` : ''} GROUP BY ${columnsQuery}`
  }

  return `SELECT ${columnsQuery}, count(DISTINCT psid) as count ${subQuery} ${EXCLUDE_NULL_FOR.includes(col) ? `AND ${col} IS NOT NULL` : ''} GROUP BY ${columnsQuery}`
}

export enum DataType {
  ANALYTICS = 'analytics',
  PERFORMANCE = 'performance',
  CAPTCHA = 'captcha',
  ERRORS = 'errors',
}

const isValidOrigin = (origins: string[], origin: string) => {
  const escapeRegex = (str: string) =>
    str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  for (let i = 0; i < _size(origins); ++i) {
    const allowedOrigin = origins[i]

    // Check if the allowedOrigin is an exact match
    if (allowedOrigin === origin) {
      return true
    }

    // Check if the allowedOrigin contains a wildcard
    if (_includes(allowedOrigin, '*')) {
      // Convert wildcard host pattern into a safe, anchored regex.
      // Example: "*.example.com" -> /^.*\.example\.com$/i
      const parts = allowedOrigin.split('*').map(escapeRegex)
      const wildcardRegex = new RegExp(`^${parts.join('.*')}$`, 'i')

      // Check if the origin matches the wildcard pattern
      if (wildcardRegex.test(origin)) {
        return true
      }
    }
  }

  return false
}

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly projectService: ProjectService,
    private readonly userService: UserService,
    private readonly saltService: SaltService,
  ) {}

  async checkProjectAccess(
    pid: string,
    uid: string | null,
    password?: string,
  ): Promise<void> {
    const project = await this.projectService.getRedisProject(pid)
    this.projectService.allowedToView(project, uid, password)
  }

  async checkManageAccess(pid: string, uid: string | null): Promise<void> {
    const project = await this.projectService.getRedisProject(pid)
    this.projectService.allowedToManage(project, uid)
  }

  async checkBillingAccess(pid: string) {
    const project = await this.projectService.getRedisProject(pid)

    if (project.admin?.dashboardBlockReason) {
      throw new HttpException(
        'The account that owns this site is currently suspended, this is because of a billing issue. Please resolve the issue to continue.',
        HttpStatus.PAYMENT_REQUIRED,
      )
    }
  }

  async isBot(pid: string, userAgent: string) {
    const project = await this.projectService.getRedisProject(pid)

    if (project.botsProtectionLevel === BotsProtectionLevel.OFF) {
      return false
    }

    return isbot(userAgent)
  }

  checkOrigin(project: Project, origin: string): void {
    // For some reasons the project.origins sometimes may look like [''], let's filter it out
    // TODO: Properly validate the origins on project update
    const origins = _filter(project.origins, Boolean) as string[]

    if (!_isEmpty(origins) && !_isEmpty(origin)) {
      if (origin === 'null') {
        if (!_includes(origins, 'null')) {
          throw new BadRequestException(
            "'null' origin is not added to your project's whitelist. To send requests from this origin either add it to your origins policy or leave it empty.",
          )
        }
      } else {
        const { hostname } = new URL(origin)

        if (!isValidOrigin(origins, hostname)) {
          throw new BadRequestException(
            "This origin is prohibited by the project's origins policy",
          )
        }
      }
    }
  }

  getHostFromOrigin(origin: string): string | null {
    try {
      const { hostname } = new URL(origin)
      return hostname || null
    } catch {
      return null
    }
  }

  checkIpBlacklist(project: Project, ip: string): void {
    // For some reasons the project.ipBlacklist sometimes may look like [''], let's filter it out
    // TODO: Properly validate the ipBlacklist on project update
    const ipBlacklist = _filter(project.ipBlacklist, Boolean) as string[]

    if (!_isEmpty(ipBlacklist) && ipRangeCheck(ip, ipBlacklist)) {
      throw new BadRequestException(
        'Incoming analytics is disabled for this IP address',
      )
    }
  }

  checkCountryBlacklist(project: Project, country: string | null): void {
    if (!country) {
      return
    }

    const countryBlacklist = _filter(
      project.countryBlacklist,
      Boolean,
    ) as string[]

    if (
      !_isEmpty(countryBlacklist) &&
      _includes(countryBlacklist, _toUpper(country))
    ) {
      throw new BadRequestException(
        'Incoming analytics is disabled for this country',
      )
    }
  }

  checkIfAccountSuspended(project: Project) {
    if (project.admin?.isAccountBillingSuspended) {
      throw new HttpException(
        'The account that owns this site is currently suspended, this is because of a billing issue. This, and all other events, are NOT being tracked and saved on our side. Please log in to your account on Swetrix or contact our support to resolve the issue.',
        HttpStatus.PAYMENT_REQUIRED,
      )
    }
  }

  async validate(
    logDTO: PageviewsDto | EventsDto | ErrorDto,
    origin: string,
    ip?: string,
  ): Promise<Project> {
    const { pid } = logDTO

    // 'tz' does not need validation as it's based on getCountryForTimezone detection
    const { lc } = logDTO

    // validate locale ('lc' param)
    if (!_isEmpty(lc)) {
      if (validator.isLocale(lc)) {
        // uppercase the locale after '-' char, so for example both 'en-gb' and 'en-GB' in result will be 'en-GB'
        const lcParted = _split(lc, '-')

        if (_size(lcParted) > 1) {
          lcParted[1] = _toUpper(lcParted[1])
        }

        logDTO.lc = _join(lcParted, '-')
      } else {
        logDTO.lc = null
      }
    }

    const project = await this.projectService.getRedisProject(pid)

    this.checkIpBlacklist(project, ip)

    if (!project.active) {
      throw new BadRequestException(
        'Incoming analytics is disabled for this project',
      )
    }

    this.checkIfAccountSuspended(project)

    this.checkOrigin(project, origin)

    return project
  }

  async validateHeartbeat(
    logDTO: PageviewsDto,
    origin: string,
    ip?: string,
  ): Promise<Project> {
    const { pid } = logDTO

    const project = await this.projectService.getRedisProject(pid)

    this.checkIpBlacklist(project, ip)

    if (!project.active) {
      throw new BadRequestException(
        'Incoming analytics is disabled for this project',
      )
    }

    this.checkIfAccountSuspended(project)

    this.checkOrigin(project, origin)

    return project
  }

  getDataTypeColumns(dataType: DataType): string[] {
    if (dataType === DataType.ANALYTICS) {
      return TRAFFIC_COLUMNS
    }

    if (dataType === DataType.PERFORMANCE) {
      return PERFORMANCE_COLUMNS
    }

    if (dataType === DataType.ERRORS) {
      return ERROR_COLUMNS
    }

    return CAPTCHA_COLUMNS
  }

  getGroupFromTo(
    from: string,
    to: string,
    timeBucket: TimeBucketType | null,
    period: string,
    safeTimezone: string,
    diff?: number,
    checkTimebucket = true,
    now?: dayjs.Dayjs,
  ): IGetGroupFromTo {
    let groupFrom: dayjs.Dayjs
    let groupTo: dayjs.Dayjs
    let groupFromUTC: string
    let groupToUTC: string
    const formatFrom = 'YYYY-MM-DD HH:mm:ss'
    const formatTo = 'YYYY-MM-DD HH:mm:ss'
    const djsNow = now
      ? _includes(GMT_0_TIMEZONES, safeTimezone)
        ? dayjs.utc(now.toDate())
        : dayjs(now.toDate()).tz(safeTimezone)
      : _includes(GMT_0_TIMEZONES, safeTimezone)
        ? dayjs.utc()
        : dayjs().tz(safeTimezone)

    if (!_isEmpty(from) && !_isEmpty(to)) {
      if (!isValidDate(from)) {
        throw new PreconditionFailedException(
          "The timeframe 'from' parameter is invalid",
        )
      }

      if (!isValidDate(to)) {
        throw new PreconditionFailedException(
          "The timeframe 'to' parameter is invalid",
        )
      }

      if (dayjs.utc(from).isAfter(dayjs.utc(to), 'second')) {
        throw new PreconditionFailedException(
          "The timeframe 'from' parameter cannot be greater than 'to'",
        )
      }

      if (!_isEmpty(timeBucket) && checkTimebucket) {
        checkIfTBAllowed(timeBucket, from, to)
      }

      if (from === to) {
        groupFrom = dayjs.tz(from, safeTimezone).startOf('d')
        groupTo = dayjs.tz(from, safeTimezone).endOf('d')
        groupFromUTC = groupFrom.utc().format(formatFrom)
        groupToUTC = groupTo.utc().format(formatFrom)
      } else {
        groupFrom = dayjs.utc(from)
        groupTo = dayjs.utc(to)
        groupFromUTC = groupFrom.utc().startOf(timeBucket).format(formatFrom)
        groupToUTC = groupTo.utc().endOf(timeBucket).format(formatTo)
      }
    } else if (!_isEmpty(period)) {
      if (period === 'today') {
        groupFrom = djsNow.startOf('d')
        groupTo = djsNow
      } else if (period === 'yesterday') {
        groupFrom = djsNow.subtract(1, 'day').startOf('d')
        groupTo = djsNow.subtract(1, 'day').endOf('d')
      } else if (period === 'all' && (diff === 0 || diff === 1)) {
        groupFrom = djsNow.subtract(1, 'day').startOf('d')
        groupTo = djsNow
      } else if (period === 'all') {
        groupFrom = djsNow.subtract(diff - 1, 'day').startOf(timeBucket)
        groupTo = djsNow
      } else {
        if (period === '1d' || period === '1h') {
          groupFrom = djsNow.subtract(
            parseInt(period, 10),
            _last(period) as dayjs.ManipulateType,
          )
        } else {
          groupFrom = djsNow.subtract(
            parseInt(period, 10) - 1,
            _last(period) as dayjs.ManipulateType,
          )
        }

        groupFrom = groupFrom.startOf(timeBucket)
        groupTo = djsNow
      }

      if (!_isEmpty(timeBucket) && checkTimebucket) {
        checkIfTBAllowed(
          timeBucket,
          groupFrom.format(formatFrom),
          groupTo.format(formatTo),
        )
      }

      groupFromUTC = groupFrom.utc().startOf(timeBucket).format(formatFrom)
      groupToUTC = groupTo.utc().format(formatFrom)
    } else {
      throw new BadRequestException(
        'The timeframe (either from/to pair or period) has to be provided',
      )
    }

    const groupFromFormatted = groupFrom.format(formatFrom)
    const groupToFormatted = groupTo.format(formatTo)

    return {
      // Timezone shifted time
      groupFrom: groupFromFormatted,
      groupTo: groupToFormatted,
      // UTC time
      groupFromUTC,
      groupToUTC,
    }
  }

  removeCyclicDependencies(links: IUserFlowLink[]): IUserFlowLink[] {
    const visited = new Set<string>()

    return links.filter((link) => {
      const key = `${link.source}_${link.target}`
      if (visited.has(key)) {
        return false
      }
      visited.add(key)
      return true
    })
  }

  buildUserFlow(links: IUserFlowLink[]): IBuildUserFlow {
    const nodes: IUserFlowNode[] = Array.from(
      new Set(
        links
          .map((link: IUserFlowLink) => link.source)
          .concat(links.map((link: IUserFlowLink) => link.target)),
      ),
    ).map((node: any) => ({ id: node }))

    return { nodes, links }
  }

  async getUserFlow(
    params: Record<string, unknown>,
    filtersQuery: string,
  ): Promise<IUserFlow> {
    const query = `
      WITH page_sequences AS (
        SELECT
          psid,
          pg,
          created,
          lagInFrame(pg) OVER (PARTITION BY psid ORDER BY created) AS prev_page
        FROM analytics 
        WHERE
          pid = {pid:FixedString(12)}
          AND created BETWEEN {groupFrom:String} AND {groupTo:String}
          AND pg IS NOT NULL
          ${filtersQuery}
      )
      SELECT
        prev_page AS source,
        pg AS target,
        count() AS value
      FROM page_sequences
      WHERE prev_page IS NOT NULL
        AND prev_page != pg
      GROUP BY
        source,
        target
      ORDER BY value DESC
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: params,
      })
      .then((res) => res.json<IUserFlowLink>())

    if (_isEmpty(data)) {
      const empty = { nodes: [], links: [] }
      return {
        ascending: empty,
        descending: empty,
      }
    }

    const ascendingLinks: IUserFlowLink[] = []
    const descendingLinks: IUserFlowLink[] = []

    this.removeCyclicDependencies(data).forEach((row: any) => {
      const link: IUserFlowLink = {
        source: row.source,
        target: row.target,
        value: row.value,
      }
      if (link.source < link.target) {
        ascendingLinks.push(link)
      } else {
        descendingLinks.push(link)
      }
    })

    return {
      ascending: this.buildUserFlow(ascendingLinks),
      descending: this.buildUserFlow(descendingLinks),
    }
  }

  async getPagesArray(
    rawPages?: string,
    funnelId?: string,
    projectId?: string,
  ): Promise<string[]> {
    if (funnelId && projectId) {
      const funnel = await this.projectService.getFunnel(funnelId, projectId)

      if (!funnel || _isEmpty(funnel)) {
        throw new UnprocessableEntityException(
          'The provided funnelId is incorrect',
        )
      }

      return funnel.steps
    }

    try {
      const pages = JSON.parse(rawPages)

      if (!_isArray(pages)) {
        throw new UnprocessableEntityException(
          'An array of pages has to be provided as a pages param',
        )
      }

      const size = _size(pages)

      if (size < MIN_PAGES_IN_FUNNEL) {
        throw new UnprocessableEntityException(
          `A minimum of ${MIN_PAGES_IN_FUNNEL} pages or events has to be provided`,
        )
      }

      if (size > MAX_PAGES_IN_FUNNEL) {
        throw new UnprocessableEntityException(
          `A maximum of ${MAX_PAGES_IN_FUNNEL} pages or events can be provided`,
        )
      }

      if (_some(pages, (page) => !_isString(page))) {
        throw new UnprocessableEntityException(
          'Pages array must contain string values only',
        )
      }

      return pages
    } catch {
      throw new UnprocessableEntityException(
        'Cannot process the provided array of pages',
      )
    }
  }

  async calculateTimeBucketForAllTime(
    pid: string,
    table: 'analytics' | 'customEV' | 'performance' | 'errors',
  ): Promise<{
    timeBucket: TimeBucketType[]
    diff: number
  }> {
    const { data: fromData } = await clickhouse
      .query({
        query: `SELECT min(created) AS firstCreated FROM ${table} WHERE pid = {pid:FixedString(12)}`,
        query_params: { pid },
      })
      .then((res) => res.json<{ firstCreated?: string }>())

    const firstCreated = fromData?.[0]?.firstCreated

    if (!firstCreated) {
      return {
        timeBucket: [TimeBucketType.DAY],
        diff: 0,
      }
    }

    const nowUtc = dayjs.utc()
    const firstCreatedUtc = dayjs.utc(firstCreated)
    const diff = nowUtc.diff(firstCreatedUtc, 'days')

    const tbMap = _find(timeBucketToDays, ({ lt }) => diff <= lt)

    if (_isEmpty(tbMap)) {
      console.error(
        `[ERROR] calculateTimeBucketForAllTime: Difference ${diff} exceeds allowed limits for pid ${pid}`,
      )
      return {
        timeBucket: [TimeBucketType.YEAR],
        diff,
      }
    }

    return {
      timeBucket: tbMap.tb,
      diff,
    }
  }

  postProcessParsedFilters(parsedFilters: any[]): any[] {
    return _reduce(
      parsedFilters,
      (prev, curr) => {
        const { column, filter, isExclusive, isContains = false } = curr

        if (_isArray(filter)) {
          const filterArray = _map(filter, (f) => ({
            column,
            filter: f,
            isExclusive,
            isContains,
          }))
          return [...prev, ...filterArray]
        }

        return [...prev, curr]
      },
      [],
    )
  }

  parseMetrics(metrics: string): ProjectViewCustomEventDto[] {
    if (metrics === '""' || _isEmpty(metrics)) {
      return []
    }

    try {
      return JSON.parse(metrics)
    } catch {
      console.error(
        `[ERROR] parseMetrics: Cannot parse the metrics array: ${metrics}`,
      )
      return []
    }
  }

  // returns SQL filters query in a format like 'AND col=value AND ...'
  getFiltersQuery(
    filters: string,
    dataType: DataType,
    ignoreEV?: boolean,
  ): GetFiltersQuery {
    const params = {}
    let parsed = []
    let query = ''
    let customEVFilterApplied = false
    const allowTagFilters =
      dataType === DataType.ANALYTICS || dataType === DataType.ERRORS
    const supportsReferrerFilters = dataType === DataType.ANALYTICS
    const supportsSessionScopedPageFilters =
      dataType === DataType.ANALYTICS || dataType === DataType.ERRORS

    if (filters === '""' || _isEmpty(filters)) {
      return [query, params, parsed, customEVFilterApplied]
    }

    try {
      parsed = JSON.parse(filters)
    } catch {
      console.error(`Cannot parse the filters array: ${filters}`)
      return [query, params, parsed, customEVFilterApplied]
    }

    if (_isEmpty(parsed)) {
      return [query, params, parsed, customEVFilterApplied]
    }

    if (!_isArray(parsed)) {
      throw new UnprocessableEntityException(
        'The provided filters are not in a valid format',
      )
    }

    const SUPPORTED_COLUMNS = this.getDataTypeColumns(dataType)

    // Converting something like [{"column":"cc","filter":"BG", "isExclusive":false},{"column":"cc","filter":"PL", "isExclusive":false},{"column":"pg","filter":"/hello", "isExclusive":false}]
    // to
    // {cc: [{filter: 'BG', isExclusive: false}, {filter: 'PL', isExclusive: false}], pg: [{filter: '/hello', isExclusive: false}]}
    const converted = _reduce(
      parsed,
      (prev, curr) => {
        const { column, filter, isExclusive = false, isContains = false } = curr

        if (column === 'ev' && ignoreEV) {
          return prev
        }

        // ev:key -> custom event metadata
        // ev:key: -> custom event metadata, but we want to check if some meta.key's meta.value equals to a specific value
        if (
          column === 'ev' ||
          column === 'ev:key' ||
          _startsWith(column, 'ev:key:')
        ) {
          customEVFilterApplied = true
        } else if (
          !_includes(SUPPORTED_COLUMNS, column) &&
          !(supportsReferrerFilters && column === 'refn') &&
          !(allowTagFilters && _includes(TRAFFIC_METAKEY_COLUMNS, column)) &&
          !(allowTagFilters && _startsWith(column, 'tag:key:')) &&
          !(
            supportsSessionScopedPageFilters &&
            (column === 'entryPage' || column === 'exitPage')
          )
        ) {
          return prev
        }

        const res = []

        // commented encodeURIComponent lines of code to support filtering for pages like /product/[id]
        // until I find a more suitable solution for that later
        if (_isArray(filter)) {
          for (const f of filter) {
            // let encoded = f

            // if (column === 'pg' && f !== null) {
            //   encoded = _replace(encodeURIComponent(f), /%2F/g, '/')
            // }

            // res.push({ filter: encoded, isExclusive })
            res.push({ filter: f, isExclusive, isContains })
          }
        } else {
          // let encoded = filter

          // if (column === 'pg' && filter !== null) {
          //   encoded = _replace(encodeURIComponent(filter), /%2F/g, '/')
          // }

          // res.push({ filter: encoded, isExclusive })
          res.push({ filter, isExclusive, isContains })
        }

        if (prev[column]) {
          prev[column].push(...res)
        } else {
          prev[column] = res
        }

        return prev
      },
      {},
    )

    const columns = _keys(converted)

    for (let col = 0; col < _size(columns); ++col) {
      const column: string = columns[col]
      query += ' AND ('

      for (let f = 0; f < _size(converted[column]); ++f) {
        if (f > 0) {
          query += ' OR '
        }

        const { filter, isExclusive, isContains } = converted[column][f]
        let sqlColumn = column
        let isArrayDataset = false

        const param = `qf_${col}_${f}`
        params[param] = filter

        // Special: refn (canonical referrer name/root domain)
        if (column === 'refn') {
          const patterns = getDomainsForRefName(String(filter)) || [
            String(filter),
          ]
          const parts: string[] = []
          for (let i = 0; i < patterns.length; i++) {
            const pattern = String(patterns[i])
            if (pattern.includes('://')) {
              // Scheme-specific referrers (e.g., android-app://...) -> prefix match on full ref value
              const pp = `qf_${col}_${f}_p_${i}`
              params[pp] = pattern.toLowerCase()
              parts.push(`startsWith(lower(ref), {${pp}:String})`)
              continue
            }

            // Plain domain pattern -> host equals domain OR endsWith('.' + domain)
            const dp = `qf_${col}_${f}_d_${i}`
            params[dp] = pattern.toLowerCase()
            parts.push(
              `(domain(ref) != '' AND (lower(domain(ref)) = {${dp}:String} OR endsWith(lower(domain(ref)), concat('.', {${dp}:String})))) OR (domain(ref) = '' AND (lower(ref) = {${dp}:String} OR endsWith(lower(ref), concat('.', {${dp}:String}))))`,
            )
          }
          const combined = parts.map((p) => `(${p})`).join(' OR ')
          query += isExclusive ? `NOT (${combined})` : `(${combined})`
          continue
        }

        // Entry/Exit page filters (virtual columns via session scope)
        if (column === 'entryPage' || column === 'exitPage') {
          const pageSelector =
            column === 'entryPage'
              ? 'argMin(pg, created)'
              : 'argMax(pg, created)'
          const subQueryForPages = isContains
            ? `SELECT psid FROM (SELECT psid, ${pageSelector} as page FROM analytics WHERE pid = {pid:FixedString(12)} GROUP BY psid) WHERE page ILIKE concat('%', {${param}:String}, '%')`
            : `SELECT psid FROM (SELECT psid, ${pageSelector} as page FROM analytics WHERE pid = {pid:FixedString(12)} GROUP BY psid) WHERE page = {${param}:String}`

          // For exclusive filter (isNot) we exclude sessions with matching entry/exit page
          query += `psid ${isExclusive ? 'NOT IN' : 'IN'} (${subQueryForPages})`
          continue
        }

        // when we want to filter meta.value for a specific meta.key
        if (
          _startsWith(column, 'ev:key:') ||
          (allowTagFilters && _startsWith(column, 'tag:key:'))
        ) {
          const key = column.replace(/^ev:key:/, '').replace(/^tag:key:/, '')
          const keyParam = `qfk_${col}_${f}`
          params[keyParam] = key

          if (isContains) {
            query += `indexOf(meta.key, {${keyParam}:String}) > 0 AND ${
              isExclusive ? 'NOT ' : ''
            }(meta.value[indexOf(meta.key, {${keyParam}:String})] ILIKE concat('%', {${param}:String}, '%'))`
          } else {
            query += `indexOf(meta.key, {${keyParam}:String}) > 0 AND meta.value[indexOf(meta.key, {${keyParam}:String})] ${
              isExclusive ? '!= ' : '='
            } {${param}:String}`
          }
          continue
        }

        // meta.key filters for page properties and custom event metadata
        // e.g. article "author" (property)
        if (column === 'ev:key' || (allowTagFilters && column === 'tag:key')) {
          sqlColumn = 'meta.key'
          isArrayDataset = true
          // meta.value filters for page properties and custom event metadata
          // e.g. "Andrii" ("author" value)
        } else if (
          column === 'ev:value' ||
          (allowTagFilters && column === 'tag:value')
        ) {
          sqlColumn = 'meta.value'
          isArrayDataset = true
        }

        const isNullFilter =
          filter === null ||
          (typeof filter === 'string' && filter.toLowerCase() === 'null')

        if (isNullFilter) {
          query += isArrayDataset
            ? ''
            : `${sqlColumn} IS ${isExclusive ? 'NOT' : ''} NULL`
          continue
        }

        if (isContains) {
          if (isArrayDataset) {
            // any array element contains substring (case-insensitive)
            query += `${isExclusive ? 'NOT ' : ''}arrayExists(v -> positionCaseInsensitive(v, {${param}:String}) > 0, ${sqlColumn})`
          } else {
            query += `${isExclusive ? 'NOT ' : ''}${sqlColumn} ILIKE concat('%', {${param}:String}, '%')`
          }
        } else {
          query += isArrayDataset
            ? `indexOf(${sqlColumn}, {${param}:String}) ${isExclusive ? '=' : '>'} 0`
            : `${isExclusive ? 'NOT ' : ''}${sqlColumn} = {${param}:String}`
        }
      }

      query += ')'
    }

    return [
      query,
      params,
      this.postProcessParsedFilters(parsed),
      customEVFilterApplied,
    ]
  }

  derivePsidFromInputs(
    pid: string,
    userAgent: string,
    ip: string,
    salt: string,
  ): string {
    const combined = `${userAgent}${ip}${pid}${salt}`
    return crypto
      .createHash('sha256')
      .update(combined)
      .digest()
      .readBigUInt64BE(0)
      .toString()
  }

  getSessionKey(psid: string): string {
    return `ses:${psid}`
  }

  async getSessionId(
    pid: string,
    userAgent: string,
    ip: string,
  ): Promise<{ exists: boolean; psid: string }> {
    const salt = await this.saltService.getSaltForSession()
    const psid = this.derivePsidFromInputs(pid, userAgent, ip, salt)
    const sessionKey = this.getSessionKey(psid)

    const exists = Boolean(await redis.exists(sessionKey))

    return { exists, psid }
  }

  async generateAndStoreSessionId(
    pid: string,
    userAgent: string,
    ip: string,
  ): Promise<[boolean, string]> {
    const salt = await this.saltService.getSaltForSession()
    const psid = this.derivePsidFromInputs(pid, userAgent, ip, salt)
    const sessionKey = this.getSessionKey(psid)

    // Use SET with NX (only set if not exists) for atomic "new session" detection
    // This prevents race conditions where multiple workers could both see the key
    // doesn't exist and both think they're creating a "new session"
    const result = await redis.set(
      sessionKey,
      '1',
      'EX',
      UNIQUE_SESSION_LIFE_TIME,
      'NX',
    )

    // If SET NX succeeded (returned 'OK'), this is a new session
    // If it returned null, the session already existed
    const isNew = result === 'OK'

    if (!isNew) {
      // Session already exists, extend TTL
      await this.extendSessionTTL(psid)
    }

    return [isNew, psid]
  }

  async extendSessionTTL(psid: string): Promise<void> {
    const sessionKey = this.getSessionKey(psid)
    await redis.set(sessionKey, '1', 'EX', UNIQUE_SESSION_LIFE_TIME)
  }

  static readonly PROFILE_PREFIX_ANON = 'anon_'
  static readonly PROFILE_PREFIX_USER = 'usr_'

  private hashToNumericString(value: string): string {
    return crypto
      .createHash('sha256')
      .update(value)
      .digest()
      .readBigUInt64BE(0)
      .toString()
  }

  async generateProfileId(
    pid: string,
    userAgent: string,
    ip: string,
    userSupplied?: string,
  ): Promise<string> {
    if (userSupplied) {
      const cleanId = userSupplied
        .replace(AnalyticsService.PROFILE_PREFIX_ANON, '')
        .replace(AnalyticsService.PROFILE_PREFIX_USER, '')
      const hash = this.hashToNumericString(`${cleanId}${pid}`)
      return `${AnalyticsService.PROFILE_PREFIX_USER}${hash}`
    }

    const salt = await this.saltService.getSaltForProfile()
    const combined = `${userAgent}${ip}${pid}${salt}`
    const hash = this.hashToNumericString(combined)

    return `${AnalyticsService.PROFILE_PREFIX_ANON}${hash}`
  }

  isUserSuppliedProfile(profileId: string): boolean {
    return profileId.startsWith(AnalyticsService.PROFILE_PREFIX_USER)
  }

  async recordSessionActivity(
    psid: string,
    pid: string,
    profileId: string,
  ): Promise<void> {
    const now = dayjs.utc().format('YYYY-MM-DD HH:mm:ss')

    try {
      const query = `
        SELECT minOrNull(firstSeen) AS firstSeen
        FROM sessions
        WHERE psid = {psid:UInt64}
          AND pid = {pid:FixedString(12)}
      `

      const { data } = await clickhouse
        .query({
          query,
          query_params: { psid, pid },
        })
        .then((resultSet) =>
          resultSet.json<{
            firstSeen: string | null
          }>(),
        )

      const existingSession = data[0]
      const firstSeen = existingSession?.firstSeen
        ? dayjs.utc(existingSession.firstSeen).format('YYYY-MM-DD HH:mm:ss')
        : now

      await clickhouse.insert({
        table: 'sessions',
        format: 'JSONEachRow',
        values: [
          {
            psid,
            pid,
            profileId,
            firstSeen,
            lastSeen: now,
          },
        ],
      })
    } catch (error) {
      console.error('Failed to record session:', error)
    }
  }

  async checkSessionExistsInClickHouse(
    psid: string,
    pid: string,
  ): Promise<boolean> {
    const cutoff = dayjs
      .utc()
      .subtract(UNIQUE_SESSION_LIFE_TIME, 'second')
      .format('YYYY-MM-DD HH:mm:ss')

    try {
      const query = `
        SELECT 1
        FROM sessions FINAL
        WHERE psid = {psid:UInt64}
          AND pid = {pid:FixedString(12)}
          AND lastSeen >= {cutoff:DateTime}
        LIMIT 1
      `

      const { data } = await clickhouse
        .query({
          query,
          query_params: { psid, pid, cutoff },
        })
        .then((resultSet) => resultSet.json())

      return data.length > 0
    } catch (error) {
      console.error('Failed to check session existence:', error)
      return false
    }
  }

  async getSessionDurationFromClickHouse(
    psid: string,
    pid: string,
  ): Promise<number | null> {
    try {
      const query = `
        SELECT dateDiff('second', min(firstSeen), max(lastSeen)) as duration
        FROM sessions
        WHERE psid = {psid:UInt64}
          AND pid = {pid:FixedString(12)}
      `

      const { data } = await clickhouse
        .query({
          query,
          query_params: { psid, pid },
        })
        .then((resultSet) => resultSet.json<{ duration: number }>())

      return data[0]?.duration ?? null
    } catch (error) {
      console.error('Failed to get session duration:', error)
      return null
    }
  }

  formatFunnel(data: IFunnelCHResponse[], pages: string[]): IFunnel[] {
    const funnel = _map(data, (row, index) => {
      const value = pages[index]

      let events = row.c
      let dropoff = 0
      let eventsPerc = 100
      let eventsPercStep = 100
      let dropoffPercStep = 0

      if (index > 0) {
        const prev = data[index - 1]
        events = row.c
        dropoff = prev.c - row.c
        eventsPerc =
          data[0].c > 0 ? Number(_round((row.c / data[0].c) * 100, 2)) : 0
        eventsPercStep =
          prev.c > 0 ? Number(_round((row.c / prev.c) * 100, 2)) : 0
        dropoffPercStep =
          prev.c > 0 ? Number(_round((dropoff / prev.c) * 100, 2)) : 0
      }

      return {
        value,
        events,
        eventsPerc,
        eventsPercStep,
        dropoff,
        dropoffPercStep,
      }
    })

    return funnel
  }

  /*
    ClickHouse's windowFunnel() function returns steps that have non-zero counts.
    I.e. if we have data like [{level: 1, c: 100}, {level: 3, c: 50}],
    it means that level 2 should be 50 as well (because 50 users got up to level 3).

    This function backfills missing levels with previous count.
  */
  backfillFunnel(
    data: IFunnelCHResponse[],
    pages: string[],
  ): IFunnelCHResponse[] {
    // Get max level
    const maxLevel = _size(pages)

    // Build map of level -> count
    const levelCounts = new Map()
    for (const d of data) {
      levelCounts.set(d.level, d.c)
    }

    let prevCount = 0

    // Backfill missing levels with previous count
    const filled = []
    for (let level = maxLevel; level >= 1; level--) {
      const count = levelCounts.get(level)
      if (count !== undefined) {
        prevCount += count
      }

      filled.push({
        level,
        c: prevCount,
      })
    }

    return filled
  }

  generateEmptyFunnel(pages: string[]): IFunnel[] {
    return _map(pages, (value) => ({
      value,
      events: 0,
      eventsPerc: 0,
      eventsPercStep: 0,
      dropoff: 0,
      dropoffPercStep: 0,
    }))
  }

  async getFunnel(pages: string[], params: any): Promise<IFunnel[]> {
    const pageParams: Record<string, string> = {}

    const pagesStr = _join(
      _map(pages, (value, index) => {
        pageParams[`v${index}`] = value

        return `value={v${index}:String}`
      }),
      ',',
    )

    const query = `
      SELECT
        level,
        count() as c
      FROM (
        SELECT
          psid,
          windowFunnel(86400)(created, ${pagesStr}) AS level
        FROM (
          SELECT
            psid,
            pg AS value,
            created
          FROM analytics
          WHERE pid = {pid:FixedString(12)}
          AND psid != 0
          AND created BETWEEN {groupFrom:String} AND {groupTo:String}

          UNION ALL

          SELECT
            psid,
            ev AS value,
            created
          FROM customEV
          WHERE pid = {pid:FixedString(12)}
          AND psid != 0
          AND created BETWEEN {groupFrom:String} AND {groupTo:String}
        )
        GROUP BY psid
      )
      WHERE level != 0
      GROUP BY level
      ORDER BY level DESC;
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: { ...params, ...pageParams },
      })
      .then((resultSet) => resultSet.json<IFunnelCHResponse>())

    if (_isEmpty(data)) {
      return this.generateEmptyFunnel(pages)
    }

    return this.formatFunnel(_reverse(this.backfillFunnel(data, pages)), pages)
  }

  async getTotalPageviews(
    pid: string,
    groupFrom: string,
    groupTo: string,
  ): Promise<number> {
    const query = `
      SELECT
        count() as c
      FROM analytics
      WHERE pid = {pid:FixedString(12)}
      AND created BETWEEN {groupFrom:String} AND {groupTo:String}
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: { pid, groupFrom, groupTo },
      })
      .then((resultSet) => resultSet.json<{ c: number }>())

    return data[0]?.c || 0
  }

  convertSummaryToObsoleteFormat(summary: IOverall): any {
    const result = {}

    for (const pid of _keys(summary)) {
      const { current, previous } = summary[pid]

      result[pid] = {
        thisWeek: current.all,
        lastWeek: previous.all,
        thisWeekUnique: current.unique,
        lastWeekUnique: previous.unique,
        percChange: calculateRelativePercentage(previous.all, current.all),
        percChangeUnique: calculateRelativePercentage(
          previous.unique,
          current.unique,
        ),
      }
    }

    return result
  }

  convertSummaryToReportFormat(summary: IOverall): any {
    const result = {}

    for (const pid of _keys(summary)) {
      const { current, previous } = summary[pid]

      result[pid] = {
        // Existing metrics
        pageviews: current.all,
        previousPageviews: previous.all,
        percChangePageviews: calculateRelativePercentage(
          previous.all,
          current.all,
        ),

        uniqueVisitors: current.unique,
        previousUniqueVisitors: previous.unique,
        percChangeUnique: calculateRelativePercentage(
          previous.unique,
          current.unique,
        ),

        // Active Users (MAU/WAU)
        activeUsers: current.users || 0,
        previousActiveUsers: previous.users || 0,
        percChangeUsers: calculateRelativePercentage(
          previous.users || 0,
          current.users || 0,
        ),

        // Average Session Duration
        avgDuration: formatDuration(current.sdur),
        avgDurationSeconds: _round(current.sdur || 0),
        previousAvgDuration: formatDuration(previous.sdur),
        previousAvgDurationSeconds: _round(previous.sdur || 0),
        percChangeDuration: calculateRelativePercentage(
          previous.sdur || 0,
          current.sdur || 0,
        ),

        // Bounce Rate
        bounceRate: _round(current.bounceRate || 0, 1),
        previousBounceRate: _round(previous.bounceRate || 0, 1),
        // For bounce rate, lower is better, so we subtract current from previous
        bounceRateChange: _round(
          (previous.bounceRate || 0) - (current.bounceRate || 0),
          1,
        ),
      }
    }

    return result
  }

  async getTopCountryForReport(
    pid: string,
    groupFrom: string,
    groupTo: string,
  ): Promise<{ cc: string; count: number } | null> {
    const query = `
      SELECT 
        cc,
        count() as count
      FROM analytics
      WHERE 
        pid = {pid:FixedString(12)}
        AND created BETWEEN {groupFrom:String} AND {groupTo:String}
        AND cc IS NOT NULL
        AND cc != ''
      GROUP BY cc
      ORDER BY count DESC
      LIMIT 1
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: { pid, groupFrom, groupTo },
      })
      .then((resultSet) => resultSet.json<{ cc: string; count: number }>())

    return data[0] || null
  }

  async getTopCountriesForReport(
    pids: string[],
    groupFrom: string,
    groupTo: string,
  ): Promise<Record<string, { cc: string; count: number }>> {
    if (_isEmpty(pids)) {
      return {}
    }

    const query = `
      WITH counts AS (
        SELECT 
          pid,
          cc,
          count() as cnt
        FROM analytics
        WHERE 
          pid IN {pids:Array(FixedString(12))}
          AND created BETWEEN {groupFrom:String} AND {groupTo:String}
          AND cc IS NOT NULL
          AND cc != ''
        GROUP BY pid, cc
      )
      SELECT
        pid,
        argMax(cc, cnt) as cc,
        max(cnt) as count
      FROM counts
      GROUP BY pid
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: { pids, groupFrom, groupTo },
      })
      .then((resultSet) =>
        resultSet.json<{ pid: string; cc: string; count: any }>(),
      )

    const result: Record<string, { cc: string; count: number }> = {}
    for (const row of data || []) {
      if (!row?.pid) {
        continue
      }
      result[row.pid] = {
        cc: row.cc,
        count: Number(row.count) || 0,
      }
    }

    return result
  }

  async getErrorCountForReport(
    pid: string,
    groupFrom: string,
    groupTo: string,
  ): Promise<{ count: number; uniqueErrors: number }> {
    const query = `
      SELECT 
        count() as count,
        count(DISTINCT eid) as uniqueErrors
      FROM errors
      WHERE 
        pid = {pid:FixedString(12)}
        AND created BETWEEN {groupFrom:String} AND {groupTo:String}
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: { pid, groupFrom, groupTo },
      })
      .then((resultSet) =>
        resultSet.json<{ count: number; uniqueErrors: number }>(),
      )

    return data[0] || { count: 0, uniqueErrors: 0 }
  }

  async getErrorCountsForReport(
    pids: string[],
    groupFrom: string,
    groupTo: string,
  ): Promise<Record<string, { count: number; uniqueErrors: number }>> {
    if (_isEmpty(pids)) {
      return {}
    }

    const query = `
      SELECT 
        pid,
        count() as count,
        count(DISTINCT eid) as uniqueErrors
      FROM errors
      WHERE 
        pid IN {pids:Array(FixedString(12))}
        AND created BETWEEN {groupFrom:String} AND {groupTo:String}
      GROUP BY pid
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: { pids, groupFrom, groupTo },
      })
      .then((resultSet) =>
        resultSet.json<{
          pid: string
          count: any
          uniqueErrors: any
        }>(),
      )

    const result: Record<string, { count: number; uniqueErrors: number }> = {}
    for (const row of data || []) {
      if (!row?.pid) {
        continue
      }
      result[row.pid] = {
        count: Number(row.count) || 0,
        uniqueErrors: Number(row.uniqueErrors) || 0,
      }
    }

    return result
  }

  async getTotalSessionsForReport(
    pids: string[],
    groupFrom: string,
    groupTo: string,
  ): Promise<Record<string, number>> {
    if (_isEmpty(pids)) {
      return {}
    }

    const query = `
      SELECT 
        pid,
        uniqExact(psid) as totalSessions
      FROM analytics
      WHERE 
        pid IN {pids:Array(FixedString(12))}
        AND created BETWEEN {groupFrom:String} AND {groupTo:String}
      GROUP BY pid
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: { pids, groupFrom, groupTo },
      })
      .then((resultSet) =>
        resultSet.json<{ pid: string; totalSessions: any }>(),
      )

    const result: Record<string, number> = {}
    for (const row of data || []) {
      if (!row?.pid) {
        continue
      }
      result[row.pid] = Number(row.totalSessions) || 0
    }

    return result
  }

  async getAnalyticsSummary(
    pids: string[],
    timeBucket?: string,
    period?: string,
    from?: string,
    to?: string,
    timezone?: string,
    filters?: string,
    includeChart?: boolean,
    now?: dayjs.Dayjs,
  ): Promise<IOverall> {
    const safeTimezone = this.getSafeTimezone(timezone)

    // Determine the time bucket for chart data
    const effectiveTimeBucket = ['today', 'yesterday', 'custom'].includes(
      period,
    )
      ? TimeBucketType.HOUR
      : (timeBucket as TimeBucketType) || TimeBucketType.DAY

    const { groupFrom, groupTo, groupFromUTC, groupToUTC } =
      this.getGroupFromTo(
        from,
        to,
        effectiveTimeBucket,
        period,
        safeTimezone,
        undefined,
        false,
        now,
      )

    const result = {}

    const [filtersQuery, filtersParams, , customEVFilterApplied] =
      this.getFiltersQuery(filters, DataType.ANALYTICS)

    const promises = pids.map(async (pid) => {
      try {
        if (period === 'all') {
          let queryAll = `
            WITH analytics_counts AS (
              SELECT
                count(*) AS all,
                count(DISTINCT psid) AS unique,
                count(DISTINCT profileId) AS users
              FROM analytics
              WHERE
                pid = {pid:FixedString(12)}
                ${filtersQuery}
            ),
            duration_avg AS (
              SELECT avgOrNull(duration) as sdur
              FROM (
                SELECT
                  psid,
                  dateDiff('second', min(firstSeen), max(lastSeen)) as duration
                FROM sessions
                WHERE pid = {pid:FixedString(12)}
                GROUP BY psid
              )
            )
            SELECT
              analytics_counts.*,
              duration_avg.sdur
            FROM analytics_counts, duration_avg
          `

          if (customEVFilterApplied) {
            queryAll = `
              WITH analytics_counts AS (
                SELECT
                  count(*) AS all,
                  count(DISTINCT psid) AS unique,
                  count(DISTINCT profileId) AS users
                FROM customEV
                WHERE
                  pid = {pid:FixedString(12)}
                  ${filtersQuery}
              ),
              duration_avg AS (
                SELECT avgOrNull(duration) as sdur
                FROM (
                  SELECT
                    psid,
                    dateDiff('second', min(firstSeen), max(lastSeen)) as duration
                  FROM sessions
                  WHERE pid = {pid:FixedString(12)}
                  GROUP BY psid
                )
              )
              SELECT
                analytics_counts.*,
                duration_avg.sdur
              FROM analytics_counts, duration_avg
            `
          }

          const { data } = await clickhouse
            .query({
              query: queryAll,
              query_params: {
                pid,
                ...filtersParams,
              },
            })
            .then((resultSet) => resultSet.json<BirdseyeCHResponse>())

          let bounceRate = 0

          if (data[0].all > 0 && !customEVFilterApplied) {
            bounceRate = _round((data[0].unique * 100) / data[0].all, 1)
          }

          result[pid] = {
            current: {
              all: data[0].all,
              unique: data[0].unique,
              users: data[0].users,
              bounceRate,
              sdur: data[0].sdur,
            },
            previous: {
              all: 0,
              unique: 0,
              users: 0,
              bounceRate: 0,
              sdur: 0,
            },
            change: data[0].all,
            uniqueChange: data[0].unique,
            usersChange: data[0].users,
            bounceRateChange: bounceRate,
            sdurChange: data[0].sdur,
            customEVFilterApplied,
          }

          // For 'all' period, we use month time bucket for chart
          if (includeChart) {
            const allTimeChartBucket = TimeBucketType.MONTH
            const { groupFrom: allFrom, groupTo: allTo } = this.getGroupFromTo(
              undefined,
              undefined,
              allTimeChartBucket,
              'all',
              safeTimezone,
            )
            const chartData = await this.getSimplifiedChartData(
              pid,
              allTimeChartBucket,
              allFrom,
              allTo,
              filtersQuery,
              filtersParams,
              safeTimezone,
              customEVFilterApplied,
            )
            result[pid].chart = chartData
          }
          return
        }

        const periodSubtracted = dayjs
          .utc(groupFromUTC)
          .subtract(
            Math.abs(
              dayjs.utc(groupFromUTC).diff(dayjs.utc(groupToUTC), 'minutes'),
            ),
            'minutes',
          )
          .format('YYYY-MM-DD HH:mm:ss')

        let queryCurrent = `
          WITH analytics_counts AS (
            SELECT
              1 AS sortOrder,
              count(*) AS all,
              count(DISTINCT psid) AS unique,
              count(DISTINCT profileId) AS users
            FROM analytics
            WHERE
              pid = {pid:FixedString(12)}
              AND created BETWEEN {groupFromUTC:String} AND {groupToUTC:String}
              ${filtersQuery}
          ),
          duration_avg AS (
            SELECT avgOrNull(duration) as sdur
            FROM (
              SELECT
                psid,
                dateDiff('second', min(firstSeen), max(lastSeen)) as duration
              FROM sessions
              WHERE pid = {pid:FixedString(12)}
                AND psid IN (
                  SELECT DISTINCT psid
                  FROM analytics
                  WHERE pid = {pid:FixedString(12)}
                    AND psid IS NOT NULL
                    AND created BETWEEN {groupFromUTC:String} AND {groupToUTC:String}
                    ${filtersQuery}
                )
              GROUP BY psid
            )
          )
          SELECT
            analytics_counts.*,
            duration_avg.sdur
          FROM analytics_counts, duration_avg
        `

        let queryPrevious = `
          WITH analytics_counts AS (
            SELECT
              2 AS sortOrder,
              count(*) AS all,
              count(DISTINCT psid) AS unique,
              count(DISTINCT profileId) AS users
            FROM analytics
            WHERE
              pid = {pid:FixedString(12)}
              AND created BETWEEN {periodSubtracted:String} AND {groupFromUTC:String}
              ${filtersQuery}
          ),
          duration_avg AS (
            SELECT avgOrNull(duration) as sdur
            FROM (
              SELECT
                psid,
                dateDiff('second', min(firstSeen), max(lastSeen)) as duration
              FROM sessions
              WHERE pid = {pid:FixedString(12)}
                AND psid IN (
                  SELECT DISTINCT psid
                  FROM analytics
                  WHERE pid = {pid:FixedString(12)}
                    AND psid IS NOT NULL
                    AND created BETWEEN {periodSubtracted:String} AND {groupFromUTC:String}
                    ${filtersQuery}
                )
              GROUP BY psid
            )
          )
          SELECT
            analytics_counts.*,
            duration_avg.sdur
          FROM analytics_counts, duration_avg
        `

        if (customEVFilterApplied) {
          queryCurrent = `
            WITH analytics_counts AS (
              SELECT
                1 AS sortOrder,
                count(*) AS all,
                count(DISTINCT psid) AS unique,
                count(DISTINCT profileId) AS users
              FROM customEV
              WHERE
                pid = {pid:FixedString(12)}
                AND created BETWEEN {groupFromUTC:String} AND {groupToUTC:String}
                ${filtersQuery}
            ),
            duration_avg AS (
              SELECT avgOrNull(duration) as sdur
              FROM (
                SELECT
                  psid,
                  dateDiff('second', min(firstSeen), max(lastSeen)) as duration
                FROM sessions
                WHERE pid = {pid:FixedString(12)}
                  AND psid IN (
                    SELECT DISTINCT psid
                    FROM customEV
                    WHERE pid = {pid:FixedString(12)}
                      AND psid IS NOT NULL
                      AND created BETWEEN {groupFromUTC:String} AND {groupToUTC:String}
                      ${filtersQuery}
                  )
                GROUP BY psid
              )
            )
            SELECT
              analytics_counts.*,
              duration_avg.sdur
            FROM analytics_counts, duration_avg
          `
          queryPrevious = `
            WITH analytics_counts AS (
              SELECT
                2 AS sortOrder,
                count(*) AS all,
                count(DISTINCT psid) AS unique,
                count(DISTINCT profileId) AS users
              FROM customEV
              WHERE
                pid = {pid:FixedString(12)}
                AND created BETWEEN {periodSubtracted:String} AND {groupFromUTC:String}
                ${filtersQuery}
            ),
            duration_avg AS (
              SELECT avgOrNull(duration) as sdur
              FROM (
                SELECT
                  psid,
                  dateDiff('second', min(firstSeen), max(lastSeen)) as duration
                FROM sessions
                WHERE pid = {pid:FixedString(12)}
                  AND psid IN (
                    SELECT DISTINCT psid
                    FROM customEV
                    WHERE pid = {pid:FixedString(12)}
                      AND psid IS NOT NULL
                      AND created BETWEEN {periodSubtracted:String} AND {groupFromUTC:String}
                      ${filtersQuery}
                  )
                GROUP BY psid
              )
            )
            SELECT
              analytics_counts.*,
              duration_avg.sdur
            FROM analytics_counts, duration_avg
          `
        }

        const query = `${queryCurrent} UNION ALL ${queryPrevious}`

        let { data } = await clickhouse
          .query({
            query,
            query_params: {
              pid,
              groupFromUTC,
              groupToUTC,
              periodSubtracted,
              ...filtersParams,
            },
          })
          .then((resultSet) => resultSet.json<BirdseyeCHResponse>())

        data = _sortBy(data, 'sortOrder')

        const currentPeriod = data[0]
        const previousPeriod = data[1]

        let bounceRate = 0
        let prevBounceRate = 0

        if (currentPeriod.all > 0 && !customEVFilterApplied) {
          bounceRate = _round(
            (currentPeriod.unique * 100) / currentPeriod.all,
            1,
          )
        }

        if (previousPeriod.all > 0 && !customEVFilterApplied) {
          prevBounceRate = _round(
            (previousPeriod.unique * 100) / previousPeriod.all,
            1,
          )
        }

        result[pid] = {
          current: {
            all: currentPeriod.all,
            unique: currentPeriod.unique,
            users: currentPeriod.users,
            sdur: currentPeriod.sdur || 0,
            bounceRate,
          },
          previous: {
            all: previousPeriod.all,
            unique: previousPeriod.unique,
            users: previousPeriod.users,
            sdur: previousPeriod.sdur || 0,
            bounceRate: prevBounceRate,
          },
          change: currentPeriod.all - previousPeriod.all,
          uniqueChange: currentPeriod.unique - previousPeriod.unique,
          usersChange: currentPeriod.users - previousPeriod.users,
          bounceRateChange: (bounceRate - prevBounceRate) * -1,
          sdurChange: currentPeriod.sdur - previousPeriod.sdur,
          customEVFilterApplied,
        }

        // Add chart data if requested
        if (includeChart) {
          const chartData = await this.getSimplifiedChartData(
            pid,
            effectiveTimeBucket,
            groupFrom,
            groupTo,
            filtersQuery,
            filtersParams,
            safeTimezone,
            customEVFilterApplied,
          )
          result[pid].chart = chartData
        }
      } catch (reason) {
        console.error(
          `[ERROR] (getAnalyticsSummary) Error occurred for PID ${pid}`,
        )
        console.error(reason)
        throw new InternalServerErrorException(
          "Can't process the provided PID. Please, try again later.",
        )
      }
    })

    await Promise.all(promises)

    return result
  }

  /**
   * Get simplified chart data for dashboard cards
   * Returns only x (dates) and visits (pageviews) for a lightweight chart
   */
  async getSimplifiedChartData(
    pid: string,
    timeBucket: TimeBucketType,
    groupFrom: string,
    groupTo: string,
    filtersQuery: string,
    filtersParams: Record<string, string | boolean>,
    safeTimezone: string,
    customEVFilterApplied: boolean,
  ): Promise<{ x: string[]; visits: number[] }> {
    const { xShifted } = this.generateXAxis(
      timeBucket,
      groupFrom,
      groupTo,
      safeTimezone,
    )

    const paramsData = {
      params: {
        pid,
        groupFrom,
        groupTo,
        ...filtersParams,
      },
    }

    if (customEVFilterApplied) {
      const query = this.generateCustomEventsAggregationQuery(
        timeBucket,
        filtersQuery,
        ChartRenderMode.PERIODICAL,
      )

      const { data } = await clickhouse
        .query({
          query,
          query_params: { ...paramsData.params, timezone: safeTimezone },
        })
        .then((resultSet) => resultSet.json<TrafficCEFilterCHResponse>())

      const visits =
        this.extractCustomEventsChartData(data, xShifted)?._unknown_event || []

      return { x: xShifted, visits }
    }

    const query = this.generateAnalyticsAggregationQuery(
      timeBucket,
      filtersQuery,
      ChartRenderMode.PERIODICAL,
    )

    const { data } = await clickhouse
      .query({
        query,
        query_params: { ...paramsData.params, timezone: safeTimezone },
      })
      .then((resultSet) => resultSet.json<TrafficCHResponse>())

    const { visits } = this.extractChartData(data, xShifted)

    return { x: xShifted, visits }
  }

  async getPerformanceSummary(
    pids: string[],
    period?: string,
    from?: string,
    to?: string,
    timezone?: string,
    filters?: string,
    measure: PerfMeasure = 'median',
  ): Promise<IOverallPerformance> {
    let _from: string

    let _to: string

    if (_isEmpty(period) || ['today', 'yesterday', 'custom'].includes(period)) {
      const safeTimezone = this.getSafeTimezone(timezone)

      const { groupFrom, groupTo } = this.getGroupFromTo(
        from,
        to,
        ['today', 'yesterday'].includes(period) ? TimeBucketType.HOUR : null,
        period,
        safeTimezone,
      )

      _from = groupFrom
      _to = groupTo
    }

    const result = {}

    const [filtersQuery, filtersParams] = this.getFiltersQuery(
      filters,
      DataType.PERFORMANCE,
      true,
    )

    const cols = ['dns', 'tls', 'conn', 'response', 'render', 'domLoad', 'ttfb']

    const columnSelectors = cols
      .map((col) => `${MEASURES_MAP[measure]}(${col}) as ${col}`)
      .join(', ')

    const promises = pids.map(async (pid) => {
      try {
        if (period === 'all') {
          const queryAll = `SELECT ${columnSelectors} FROM performance WHERE pid = {pid:FixedString(12)} ${filtersQuery}`

          const { data } = await clickhouse
            .query({
              query: queryAll,
              query_params: {
                pid,
                ...filtersParams,
              },
            })
            .then((resultSet) =>
              resultSet.json<Partial<PerformanceCHResponse>>(),
            )

          result[pid] = {
            current: {
              frontend: millisecondsToSeconds(data[0].render + data[0].domLoad),
              network: millisecondsToSeconds(
                data[0].dns + data[0].tls + data[0].conn + data[0].response,
              ),
              backend: millisecondsToSeconds(data[0].ttfb),
            },
            previous: {
              frontend: 0,
              network: 0,
              backend: 0,
            },
            frontendChange: millisecondsToSeconds(
              data[0].render + data[0].domLoad,
            ),
            networkChange: millisecondsToSeconds(
              data[0].dns + data[0].tls + data[0].conn + data[0].response,
            ),
            backendChange: millisecondsToSeconds(data[0].ttfb),
          }
          return
        }

        let now: string
        let periodFormatted: string
        let periodSubtracted: string

        if (_from && _to) {
          // diff may be 0 (when selecting data for 1 day), so let's make it 1 to grab some data for the prev day as well
          const diff = dayjs(_to).diff(dayjs(_from), 'days') || 1

          now = _to
          periodFormatted = _from
          periodSubtracted = dayjs(_from)
            .subtract(diff, 'days')
            .format('YYYY-MM-DD HH:mm:ss')
        } else {
          const amountToSubtract = parseInt(period, 10)
          const unit = _replace(period, /[0-9]/g, '') as dayjs.ManipulateType

          now = dayjs.utc().format('YYYY-MM-DD HH:mm:ss')
          const periodRaw = dayjs.utc().subtract(amountToSubtract, unit)
          periodFormatted = periodRaw.format('YYYY-MM-DD HH:mm:ss')
          periodSubtracted = periodRaw
            .subtract(amountToSubtract, unit)
            .format('YYYY-MM-DD HH:mm:ss')
        }

        const queryCurrent = `SELECT 1 AS sortOrder, ${columnSelectors} FROM performance WHERE pid = {pid:FixedString(12)} AND created BETWEEN {periodFormatted:String} AND {now:String} ${filtersQuery}`
        const queryPrevious = `SELECT 2 AS sortOrder, ${columnSelectors} FROM performance WHERE pid = {pid:FixedString(12)} AND created BETWEEN {periodSubtracted:String} AND {periodFormatted:String} ${filtersQuery}`

        const query = `${queryCurrent} UNION ALL ${queryPrevious}`

        let { data } = await clickhouse
          .query({
            query,
            query_params: {
              pid,
              periodFormatted,
              periodSubtracted,
              now,
              ...filtersParams,
            },
          })
          .then((resultSet) => resultSet.json<Partial<PerformanceCHResponse>>())

        data = _sortBy(data, 'sortOrder')

        const currentPeriod = data[0]
        const previousPeriod = data[1]

        result[pid] = {
          current: {
            frontend: millisecondsToSeconds(
              currentPeriod.render + currentPeriod.domLoad,
            ),
            network: millisecondsToSeconds(
              currentPeriod.dns +
                currentPeriod.tls +
                currentPeriod.conn +
                currentPeriod.response,
            ),
            backend: millisecondsToSeconds(currentPeriod.ttfb),
          },
          previous: {
            frontend: millisecondsToSeconds(
              previousPeriod.render + previousPeriod.domLoad,
            ),
            network: millisecondsToSeconds(
              previousPeriod.dns +
                previousPeriod.tls +
                previousPeriod.conn +
                previousPeriod.response,
            ),
            backend: millisecondsToSeconds(previousPeriod.ttfb),
          },
          frontendChange: millisecondsToSeconds(
            currentPeriod.render +
              currentPeriod.domLoad -
              previousPeriod.render -
              previousPeriod.domLoad,
          ),
          networkChange: millisecondsToSeconds(
            currentPeriod.dns +
              currentPeriod.tls +
              currentPeriod.conn +
              currentPeriod.response -
              previousPeriod.dns -
              previousPeriod.tls -
              previousPeriod.conn -
              previousPeriod.response,
          ),
          backendChange: millisecondsToSeconds(
            currentPeriod.ttfb - previousPeriod.ttfb,
          ),
        }
      } catch (reason) {
        console.error(
          `[ERROR] (getPerformanceSummary) Error occurred for PID ${pid}`,
        )
        console.error(reason)
        throw new InternalServerErrorException(
          "Can't process the provided PID. Please, try again later.",
        )
      }
    })

    await Promise.all(promises)

    return result
  }

  async getFilters(pid: string, type: string): Promise<Array<string>> {
    if (!_includes(ALL_COLUMNS, type)) {
      throw new UnprocessableEntityException(
        `The provided type (${type}) is incorrect`,
      )
    }

    // Special handling for virtual columns
    if (type === 'entryPage' || type === 'exitPage') {
      const selector =
        type === 'entryPage' ? 'argMin(pg, created)' : 'argMax(pg, created)'
      const query = `
        WITH session_pages AS (
          SELECT psid, ${selector} as page
          FROM analytics
          WHERE pid = {pid:FixedString(12)}
          GROUP BY psid
        )
        SELECT page FROM session_pages WHERE page IS NOT NULL GROUP BY page
      `

      const { data } = await clickhouse
        .query({
          query,
          query_params: { pid },
        })
        .then((resultSet) => resultSet.json<any>())

      return _map(data, 'page')
    }

    let query = `SELECT ${type} FROM analytics WHERE pid={pid:FixedString(12)} AND ${type} IS NOT NULL GROUP BY ${type}`

    if (type === 'ev') {
      query = `SELECT ${type} FROM customEV WHERE pid={pid:FixedString(12)} AND ${type} IS NOT NULL GROUP BY ${type}`
    }

    const { data } = await clickhouse
      .query({
        query,
        query_params: {
          pid,
        },
      })
      .then((resultSet) => resultSet.json())

    return _map(data, type)
  }

  async getErrorsFilters(pid: string, type: string): Promise<Array<string>> {
    if (!_includes(ERROR_COLUMNS, type)) {
      throw new UnprocessableEntityException(
        `The provided type (${type}) is incorrect`,
      )
    }

    const query = `SELECT ${type} FROM errors WHERE pid={pid:FixedString(12)} AND ${type} IS NOT NULL GROUP BY ${type}`

    const { data } = await clickhouse
      .query({
        query,
        query_params: {
          pid,
        },
      })
      .then((resultSet) => resultSet.json())

    return _map(data, type)
  }

  async getVersionFilters(
    pid: string,
    type: 'traffic' | 'errors',
    column: 'br' | 'os',
  ): Promise<Array<{ name: string; version: string }>> {
    const safeTable = type === 'errors' ? 'errors' : 'analytics'
    const safeVersionCol = column === 'br' ? 'brv' : 'osv'

    const query = `
      SELECT ${column}, ${safeVersionCol} 
      FROM ${safeTable} 
      WHERE pid={pid:FixedString(12)} AND ${column} IS NOT NULL AND ${safeVersionCol} IS NOT NULL 
      GROUP BY ${column}, ${safeVersionCol}
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: { pid },
      })
      .then((resultSet) => resultSet.json<Record<string, string>[]>())

    return data.map((row) => ({
      name: row[column],
      version: row[safeVersionCol],
    }))
  }

  async generateParams(
    parsedFilters: Array<{ [key: string]: string }>,
    subQuery: string,
    customEVFilterApplied: boolean,
    paramsData: any,
    type: 'traffic' | 'performance' | 'captcha' | 'errors',
    measure?: PerfMeasure,
  ) {
    // We need this to display all the pageview related data (e.g. country, browser) when user applies an inclusive filter on the Page column
    const isPageInclusiveFilterSet = ['captcha', 'performance'].includes(type)
      ? false
      : !_isEmpty(
          _find(
            parsedFilters,
            (filter) =>
              (filter.column === 'pg' || filter.column === 'host') &&
              !filter.isExclusive,
          ),
        )

    let columns = TRAFFIC_COLUMNS

    if (type === 'captcha') {
      columns = CAPTCHA_COLUMNS
    }

    if (type === 'errors') {
      columns = ERROR_COLUMNS
    }

    if (type === 'performance') {
      columns = PERFORMANCE_COLUMNS
    }

    // Build a single query combining all metrics
    const withClauses = columns.map((col) => {
      const baseQuery = generateParamsQuery(
        col,
        subQuery,
        customEVFilterApplied,
        isPageInclusiveFilterSet,
        type,
        measure,
      )
      return `metrics_${col} AS (${baseQuery})`
    })

    const EXTRA_FIELDS = {
      rg: ['cc', 'rgc'],
      ct: ['cc'],
      brv: ['br'],
      osv: ['os'],
    } as const

    const query = `
      WITH ${withClauses.join(',\n')}
      SELECT 
        column_name,
        name,
        count,
        extra_fields
      FROM (
        ${columns
          .map((col) => {
            let extraField = `CAST([] AS Array(Nullable(String))) as extra_fields`

            if (col === 'rg') {
              extraField = `CAST([CAST(cc AS Nullable(String)), CAST(rgc AS Nullable(String))] AS Array(Nullable(String))) as extra_fields`
            } else if (col === 'ct') {
              extraField = `CAST([CAST(cc AS Nullable(String))] AS Array(Nullable(String))) as extra_fields`
            } else if (col === 'brv') {
              extraField = `CAST([CAST(br AS Nullable(String))] AS Array(Nullable(String))) as extra_fields`
            } else if (col === 'osv') {
              extraField = `CAST([CAST(os AS Nullable(String))] AS Array(Nullable(String))) as extra_fields`
            }

            return `
              SELECT 
                '${col}' as column_name,
                name,
                count,
                ${extraField}
              FROM metrics_${col}
            `
          })
          .join('\nUNION ALL\n')}
      )
      ORDER BY column_name, count DESC
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: paramsData.params,
      })
      .then((resultSet) => resultSet.json<any>())

    const params = Object.fromEntries(columns.map((col) => [col, []]))

    const { length } = data

    for (let i = 0; i < length; ++i) {
      const row = data[i]

      const extras: Record<string, string | null> = {}
      const extraKeys =
        EXTRA_FIELDS[row.column_name as keyof typeof EXTRA_FIELDS]
      const extraValues = row.extra_fields as (string | null)[] | undefined

      if (extraKeys && extraValues && extraValues.length > 0) {
        for (let j = 0; j < extraKeys.length; j++) {
          const key = extraKeys[j]
          const value = extraValues[j]
          if (key && typeof value !== 'undefined') {
            extras[key] = value
          }
        }
      }

      params[row.column_name].push({
        name: row.name,
        count: row.count,
        ...extras,
      })
    }

    return params
  }

  generateXAxis(
    timeBucket: TimeBucketType,
    from: string, // timezone is already applied to the from and to parameters
    to: string,
    safeTimezone: string,
  ): IGenerateXAxis {
    const iterateTo = _includes(GMT_0_TIMEZONES, safeTimezone)
      ? dayjs.utc(to)
      : dayjs.tz(to, safeTimezone)
    let djsFrom = _includes(GMT_0_TIMEZONES, safeTimezone)
      ? dayjs.utc(from)
      : dayjs.tz(from, safeTimezone)

    let format

    switch (timeBucket) {
      case TimeBucketType.MINUTE:
        djsFrom = djsFrom.startOf('minute')
        format = 'YYYY-MM-DD HH:mm:ss'
        break

      case TimeBucketType.HOUR:
        djsFrom = djsFrom.startOf('hour')
        format = 'YYYY-MM-DD HH:mm:ss'
        break

      case TimeBucketType.DAY:
        djsFrom = djsFrom.startOf('day')
        format = 'YYYY-MM-DD'
        break

      case TimeBucketType.MONTH:
        djsFrom = djsFrom.startOf('month')
        format = 'YYYY-MM'
        break

      case TimeBucketType.YEAR:
        djsFrom = djsFrom.startOf('year')
        format = 'YYYY'
        break

      default:
        throw new BadRequestException(
          `The provided time bucket (${timeBucket}) is incorrect`,
        )
    }

    // UTC dates
    const x = []

    // Timezone shifted dates (a hack to map Clickhouse timezone processed data to UTC dates)
    const xShifted = []

    while (djsFrom.isSameOrBefore(iterateTo, timeBucket)) {
      x.push(djsFrom.utc().format(format))
      xShifted.push(djsFrom.format(format))
      djsFrom = djsFrom.add(1, timeBucket)
    }

    if (_includes(GMT_0_TIMEZONES, safeTimezone)) {
      return {
        x,
        xShifted: x,
      }
    }

    return {
      x,
      xShifted,
    }
  }

  generateDateString(row: { [key: string]: number }): string {
    const { year, month, day, hour, minute } = row

    let dateString = `${year}`

    if (typeof month === 'number') {
      if (month < 10) {
        dateString += `-0${month}`
      } else {
        dateString += `-${month}`
      }
    }

    if (typeof day === 'number') {
      if (day < 10) {
        dateString += `-0${day}`
      } else {
        dateString += `-${day}`
      }
    }

    if (typeof hour === 'number') {
      const strMinute =
        typeof minute === 'number'
          ? minute < 10
            ? `0${minute}`
            : minute
          : '00'

      if (hour < 10) {
        dateString += ` 0${hour}:${strMinute}:00`
      } else {
        dateString += ` ${hour}:${strMinute}:00`
      }
    }

    return dateString
  }

  extractChartData(result, x: string[]): IExtractChartData {
    const visits = Array(x.length).fill(0)
    const uniques = Array(x.length).fill(0)
    const sdur = Array(x.length).fill(0)

    for (let row = 0; row < _size(result); ++row) {
      const dateString = this.generateDateString(result[row])
      const index = x.indexOf(dateString)

      if (index !== -1) {
        visits[index] = result[row].pageviews
        uniques[index] = result[row].uniques
        sdur[index] = _round(result[row].sdur)
      }
    }

    return {
      visits,
      uniques,
      sdur,
    }
  }

  extractCountsForSessionChart(
    result: any[],
    xShifted: string[],
    countFieldName: string,
  ): number[] {
    const counts = Array(xShifted.length).fill(0)

    for (let row = 0; row < _size(result); ++row) {
      const dateString = this.generateDateString(result[row])
      const index = xShifted.indexOf(dateString)

      if (index !== -1) {
        counts[index] = result[row][countFieldName] || 0
      }
    }
    return counts
  }

  extractCustomEventsChartData(queryResult, x: string[]): any {
    const result = {}

    for (let row = 0; row < _size(queryResult); ++row) {
      const { ev = '_unknown_event' } = queryResult[row]

      const dateString = this.generateDateString(queryResult[row])

      const index = x.indexOf(dateString)

      if (index !== -1) {
        if (!result[ev]) {
          result[ev] = Array(x.length).fill(0)
        }

        result[ev][index] = queryResult[row].count
      }
    }

    return result
  }

  getSafeTimezone(timezone: string): string {
    if (timezone === DEFAULT_TIMEZONE || !isValidTimezone(timezone)) {
      return DEFAULT_TIMEZONE
    }

    return timezone
  }

  getGroupSubquery(timeBucket: TimeBucketType): [string, string] {
    if (timeBucket === TimeBucketType.MINUTE) {
      return [
        `toYear(tz_created) as year,
        toMonth(tz_created) as month,
        toDayOfMonth(tz_created) as day,
        toHour(tz_created) as hour,
        toMinute(tz_created) as minute`,
        'year, month, day, hour, minute',
      ]
    }

    if (timeBucket === TimeBucketType.HOUR) {
      return [
        `toYear(tz_created) as year,
        toMonth(tz_created) as month,
        toDayOfMonth(tz_created) as day,
        toHour(tz_created) as hour`,
        'year, month, day, hour',
      ]
    }

    if (timeBucket === TimeBucketType.MONTH) {
      return [
        `toYear(tz_created) as year,
        toMonth(tz_created) as month`,
        'year, month',
      ]
    }

    if (timeBucket === TimeBucketType.YEAR) {
      return [`toYear(tz_created) as year`, 'year']
    }

    return [
      `toYear(tz_created) as year,
      toMonth(tz_created) as month,
      toDayOfMonth(tz_created) as day`,
      'year, month, day',
    ]
  }

  generateAnalyticsAggregationQuery(
    timeBucket: TimeBucketType,
    filtersQuery: string,
    mode: ChartRenderMode,
  ): string {
    const timeBucketFunc = timeBucketConversion[timeBucket]
    const [selector, groupBy] = this.getGroupSubquery(timeBucket)
    const tzFromDate = `toTimeZone(parseDateTimeBestEffort({groupFrom:String}), {timezone:String})`
    const tzToDate = `toTimeZone(parseDateTimeBestEffort({groupTo:String}), {timezone:String})`

    const baseQuery = `
      SELECT
        ${selector},
        avgOrNull(sessions_data.duration) as sdur,
        count() as pageviews,
        count(DISTINCT psid) as uniques
      FROM (
        SELECT
          pid,
          psid,
          ${timeBucketFunc}(toTimeZone(created, {timezone:String})) as tz_created
        FROM analytics
        PREWHERE pid = {pid:FixedString(12)}
        WHERE created BETWEEN ${tzFromDate} AND ${tzToDate}
        ${filtersQuery}
      ) as subquery
      LEFT JOIN (
        SELECT
          pid,
          psid,
          dateDiff('second', min(firstSeen), max(lastSeen)) as duration
        FROM sessions
        WHERE pid = {pid:FixedString(12)}
        GROUP BY pid, psid
      ) as sessions_data
      ON subquery.pid = sessions_data.pid
      AND subquery.psid = sessions_data.psid
      GROUP BY ${groupBy}
      ORDER BY ${groupBy}
    `

    if (mode === ChartRenderMode.CUMULATIVE) {
      return `
        SELECT
          *,
          sum(pageviews) OVER (ORDER BY ${groupBy} ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as pageviews,
          sum(uniques) OVER (ORDER BY ${groupBy} ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as uniques
        FROM (${baseQuery})
      `
    }

    return baseQuery
  }

  generateSessionAggregationQuery(
    timeBucket: TimeBucketType,
    filtersQuery: string,
  ): string {
    const timeBucketFunc = timeBucketConversion[timeBucket]
    const [selector, groupBy] = this.getGroupSubquery(timeBucket)
    const tzFromDate = `toTimeZone(parseDateTimeBestEffort({groupFrom:String}), {timezone:String})`
    const tzToDate = `toTimeZone(parseDateTimeBestEffort({groupTo:String}), {timezone:String})`

    const baseQuery = `
      SELECT
        ${selector},
        count() as pageviews
      FROM (
        SELECT
          ${timeBucketFunc}(toTimeZone(created, {timezone:String})) as tz_created
        FROM analytics
        PREWHERE pid = {pid:FixedString(12)}
        WHERE created BETWEEN ${tzFromDate} AND ${tzToDate}
        ${filtersQuery}
      ) as subquery
      GROUP BY ${groupBy}
      ORDER BY ${groupBy}
    `

    return baseQuery
  }

  generateSessionCustomEventsAggregationQuery(
    timeBucket: TimeBucketType,
    filtersQuery: string,
  ): string {
    const timeBucketFunc = timeBucketConversion[timeBucket]
    const [selector, groupBy] = this.getGroupSubquery(timeBucket)
    const tzFromDate = `toTimeZone(parseDateTimeBestEffort({groupFrom:String}), {timezone:String})`
    const tzToDate = `toTimeZone(parseDateTimeBestEffort({groupTo:String}), {timezone:String})`

    return `
      SELECT
        ${selector},
        count() as customEventsCount
      FROM (
        SELECT
          ${timeBucketFunc}(toTimeZone(created, {timezone:String})) as tz_created
        FROM customEV
        PREWHERE pid = {pid:FixedString(12)}
        WHERE created BETWEEN ${tzFromDate} AND ${tzToDate}
        ${filtersQuery}
      ) as subquery
      GROUP BY ${groupBy}
      ORDER BY ${groupBy}
    `
  }

  generateSessionErrorsAggregationQuery(
    timeBucket: TimeBucketType,
    filtersQuery: string,
  ): string {
    const timeBucketFunc = timeBucketConversion[timeBucket]
    const [selector, groupBy] = this.getGroupSubquery(timeBucket)
    const tzFromDate = `toTimeZone(parseDateTimeBestEffort({groupFrom:String}), {timezone:String})`
    const tzToDate = `toTimeZone(parseDateTimeBestEffort({groupTo:String}), {timezone:String})`

    return `
      SELECT
        ${selector},
        count() as errorsCount
      FROM (
        SELECT
          ${timeBucketFunc}(toTimeZone(created, {timezone:String})) as tz_created
        FROM errors
        PREWHERE pid = {pid:FixedString(12)}
        WHERE created BETWEEN ${tzFromDate} AND ${tzToDate}
        ${filtersQuery}
      ) as subquery
      GROUP BY ${groupBy}
      ORDER BY ${groupBy}
    `
  }

  generateCustomEventsAggregationQuery(
    timeBucket: TimeBucketType,
    filtersQuery: string,
    mode: ChartRenderMode,
  ): string {
    const timeBucketFunc = timeBucketConversion[timeBucket]
    const [selector, groupBy] = this.getGroupSubquery(timeBucket)
    const tzFromDate = `toTimeZone(parseDateTimeBestEffort({groupFrom:String}), {timezone:String})`
    const tzToDate = `toTimeZone(parseDateTimeBestEffort({groupTo:String}), {timezone:String})`

    const baseQuery = `
      SELECT
        ${selector},
        count() as count
      FROM (
        SELECT *,
        ${timeBucketFunc}(toTimeZone(created, {timezone:String})) as tz_created
        FROM customEV
        WHERE pid = {pid:FixedString(12)}
          AND created BETWEEN ${tzFromDate} AND ${tzToDate}
          ${filtersQuery}
      ) as subquery
      GROUP BY ${groupBy}
      ORDER BY ${groupBy}
      `

    if (mode === ChartRenderMode.CUMULATIVE) {
      return `
          SELECT
            *,
            sum(count) OVER (ORDER BY ${groupBy}) as count
          FROM (${baseQuery})
        `
    }

    return baseQuery
  }

  generatePerformanceAggregationQuery(
    timeBucket: TimeBucketType,
    filtersQuery: string,
    measure: PerfMeasure,
  ): string {
    const timeBucketFunc = timeBucketConversion[timeBucket]
    const [selector, groupBy] = this.getGroupSubquery(timeBucket)
    const tzFromDate = `toTimeZone(parseDateTimeBestEffort({groupFrom:String}), {timezone:String})`
    const tzToDate = `toTimeZone(parseDateTimeBestEffort({groupTo:String}), {timezone:String})`

    const cols = ['dns', 'tls', 'conn', 'response', 'render', 'domLoad', 'ttfb']

    const columnSelectors = cols
      .map((col) => `${MEASURES_MAP[measure]}(${col}) as ${col}`)
      .join(', ')

    return `
      SELECT
        ${selector},
        ${columnSelectors}
      FROM (
        SELECT *,
          ${timeBucketFunc}(toTimeZone(created, {timezone:String})) as tz_created
        FROM performance
        WHERE
          pid = {pid:FixedString(12)}
          AND created BETWEEN ${tzFromDate} AND ${tzToDate}
          ${filtersQuery}
      ) as subquery
      GROUP BY ${groupBy}
      ORDER BY ${groupBy}
    `
  }

  generatePerformanceQuantilesQuery(
    timeBucket: TimeBucketType,
    filtersQuery: string,
  ): string {
    const timeBucketFunc = timeBucketConversion[timeBucket]
    const [selector, groupBy] = this.getGroupSubquery(timeBucket)
    const tzFromDate = `toTimeZone(parseDateTimeBestEffort({groupFrom:String}), {timezone:String})`
    const tzToDate = `toTimeZone(parseDateTimeBestEffort({groupTo:String}), {timezone:String})`

    const cols = ['dns', 'tls', 'conn', 'response', 'render', 'domLoad', 'ttfb']

    const columnSelectors = cols
      .map(
        (col) => `quantilesExactInclusive(0.5, 0.75, 0.95)(${col}) as ${col}`,
      )
      .join(', ')

    return `
      SELECT
        ${selector},
        ${columnSelectors}
      FROM (
        SELECT *,
          ${timeBucketFunc}(toTimeZone(created, {timezone:String})) as tz_created
        FROM performance
        WHERE
          pid = {pid:FixedString(12)}
          AND created BETWEEN ${tzFromDate} AND ${tzToDate}
          ${filtersQuery}
      ) as subquery
      GROUP BY ${groupBy}
      ORDER BY ${groupBy}
    `
  }

  generateCaptchaAggregationQuery(
    timeBucket: TimeBucketType,
    filtersQuery: string,
    mode: ChartRenderMode,
  ): string {
    const timeBucketFunc = timeBucketConversion[timeBucket]
    const [selector, groupBy] = this.getGroupSubquery(timeBucket)
    const tzFromDate = `toTimeZone(parseDateTimeBestEffort({groupFrom:String}), {timezone:String})`
    const tzToDate = `toTimeZone(parseDateTimeBestEffort({groupTo:String}), {timezone:String})`

    const baseQuery = `
      SELECT
        ${selector},
        count() as count
      FROM (
        SELECT *,
          ${timeBucketFunc}(toTimeZone(created, {timezone:String})) as tz_created
        FROM captcha
        WHERE
          pid = {pid:FixedString(12)}
          AND created BETWEEN ${tzFromDate} AND ${tzToDate}
          ${filtersQuery}
      ) as subquery
      GROUP BY ${groupBy}
      ORDER BY ${groupBy}
    `

    if (mode === ChartRenderMode.CUMULATIVE) {
      return `
        SELECT
          *,
          sum(pageviews) OVER (ORDER BY ${groupBy}) as pageviews,
          sum(uniques) OVER (ORDER BY ${groupBy}) as uniques
        FROM (${baseQuery})
      `
    }

    return baseQuery
  }

  generateErrorsAggregationQuery(
    timeBucket: TimeBucketType,
    filtersQuery: string,
    mode: ChartRenderMode,
  ): string {
    const timeBucketFunc = timeBucketConversion[timeBucket]
    const [selector, groupBy] = this.getGroupSubquery(timeBucket)

    const baseQuery = `
      SELECT
        ${selector},
        count() as count,
        uniqExact(profileId) as affectedUsers
      FROM (
        SELECT pg, dv, br, os, lc, cc, rg, ct, profileId,
          ${timeBucketFunc}(created) as tz_created
        FROM errors
        WHERE
          pid = {pid:FixedString(12)}
          AND created BETWEEN {groupFrom:String} AND {groupTo:String}
          ${filtersQuery}
      ) as subquery
      GROUP BY ${groupBy}
      ORDER BY ${groupBy}
    `

    if (mode === ChartRenderMode.CUMULATIVE) {
      return `
        SELECT
          *,
          sum(pageviews) OVER (ORDER BY ${groupBy}) as pageviews,
          sum(uniques) OVER (ORDER BY ${groupBy}) as uniques
        FROM (${baseQuery})
      `
    }

    return baseQuery
  }

  async groupByTimeBucket(
    timeBucket: TimeBucketType,
    from: string,
    to: string,
    subQuery: string,
    filtersQuery: string,
    paramsData: any,
    safeTimezone: string,
    customEVFilterApplied: boolean,
    parsedFilters: Array<{ [key: string]: string }>,
    mode: ChartRenderMode,
  ): Promise<object | void> {
    let params: unknown = {}
    let chart: unknown = {}

    const promises = [
      // Getting params
      (async () => {
        params = await this.groupParamsByTimeBucket(
          subQuery,
          paramsData,
          customEVFilterApplied,
          parsedFilters,
        )
      })(),

      // Getting chart & average session duration data
      (async () => {
        const groupedData = await this.groupChartByTimeBucket(
          timeBucket,
          from,
          to,
          filtersQuery,
          paramsData,
          safeTimezone,
          customEVFilterApplied,
          mode,
        )

        // @ts-ignore
        chart = groupedData.chart
      })(),
    ]

    await Promise.all(promises)

    return {
      params,
      chart,
    }
  }

  async getEntryPages(
    subQuery: string,
    paramsData: any,
  ): Promise<{ name: string; count: number }[]> {
    const query = `
      WITH session_first_pages AS (
        SELECT 
          psid,
          argMin(pg, created) as entry_page
        ${subQuery}
        GROUP BY psid
      )
      SELECT
        entry_page as name,
        count() as count
      FROM session_first_pages
      GROUP BY entry_page
      ORDER BY count DESC
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: paramsData.params,
      })
      .then((resultSet) => resultSet.json<any>())

    return data || []
  }

  async getExitPages(
    subQuery: string,
    paramsData: any,
  ): Promise<{ name: string; count: number }[]> {
    const query = `
      WITH session_last_pages AS (
        SELECT
          psid,
          argMax(pg, created) as exit_page
        ${subQuery}
        GROUP BY psid
      )
      SELECT
        exit_page as name,
        count() as count
      FROM session_last_pages
      GROUP BY exit_page
      ORDER BY count DESC
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: paramsData.params,
      })
      .then((resultSet) => resultSet.json<any>())

    return data || []
  }

  async groupParamsByTimeBucket(
    subQuery: string,
    paramsData: any,
    customEVFilterApplied: boolean,
    parsedFilters: Array<{ [key: string]: string }>,
  ): Promise<object | void> {
    const [params, entryPage, exitPage] = await Promise.all([
      this.generateParams(
        parsedFilters,
        subQuery,
        customEVFilterApplied,
        paramsData,
        'traffic',
      ),
      customEVFilterApplied
        ? Promise.resolve([])
        : this.getEntryPages(subQuery, paramsData),
      customEVFilterApplied
        ? Promise.resolve([])
        : this.getExitPages(subQuery, paramsData),
    ])

    return {
      ...params,
      entryPage,
      exitPage,
    }
  }

  async groupChartByTimeBucket(
    timeBucket: TimeBucketType,
    from: string,
    to: string,
    filtersQuery: string,
    paramsData: any,
    safeTimezone: string,
    customEVFilterApplied: boolean,
    mode: ChartRenderMode,
  ): Promise<object | void> {
    const { xShifted } = this.generateXAxis(timeBucket, from, to, safeTimezone)

    if (customEVFilterApplied) {
      const query = this.generateCustomEventsAggregationQuery(
        timeBucket,
        filtersQuery,
        mode,
      )

      const { data } = await clickhouse
        .query({
          query,
          query_params: { ...paramsData.params, timezone: safeTimezone },
        })
        .then((resultSet) => resultSet.json<TrafficCEFilterCHResponse>())

      const uniques =
        this.extractCustomEventsChartData(data, xShifted)?._unknown_event || []

      const sdur = Array(_size(xShifted)).fill(0)

      return Promise.resolve({
        chart: {
          x: xShifted,
          visits: uniques,
          uniques,
          sdur,
        },
      })
    }

    const query = this.generateAnalyticsAggregationQuery(
      timeBucket,
      filtersQuery,
      mode,
    )

    const { data } = await clickhouse
      .query({
        query,
        query_params: { ...paramsData.params, timezone: safeTimezone },
      })
      .then((resultSet) => resultSet.json<TrafficCHResponse>())

    const { visits, uniques, sdur } = this.extractChartData(data, xShifted)

    // Propagate the previous cumulative value forward for empty buckets
    if (mode === ChartRenderMode.CUMULATIVE) {
      for (let i = 1; i < visits.length; ++i) {
        if (visits[i] === 0) {
          visits[i] = visits[i - 1]
        }
        if (uniques[i] === 0) {
          uniques[i] = uniques[i - 1]
        }
      }
    }

    return Promise.resolve({
      chart: {
        x: xShifted,
        visits,
        uniques,
        sdur,
      },
    })
  }

  generateUTCXAxis(
    timeBucket: TimeBucketType,
    from: string,
    to: string,
  ): {
    x: string[]
    format: string
  } {
    const iterateTo = dayjs.utc(to)
    let djsFrom = dayjs.utc(from)

    let format

    switch (timeBucket) {
      case TimeBucketType.MINUTE:
      case TimeBucketType.HOUR:
        format = 'YYYY-MM-DD HH:mm:ss'
        break

      case TimeBucketType.DAY:
        format = 'YYYY-MM-DD'
        break

      case TimeBucketType.MONTH:
        format = 'YYYY-MM'
        break

      case TimeBucketType.YEAR:
        format = 'YYYY'
        break

      default:
        throw new BadRequestException(
          `The provided time bucket (${timeBucket}) is incorrect`,
        )
    }

    const x = []

    while (djsFrom.isSameOrBefore(iterateTo, timeBucket)) {
      x.push(djsFrom.format(format))
      djsFrom = djsFrom.add(1, timeBucket)
    }

    return {
      x,
      format,
    }
  }

  shiftToTimezone(x: string[], timezone: string, format: string): string[] {
    return _map(x, (date: string) =>
      dayjs.utc(date).tz(timezone).format(format),
    )
  }

  async groupSessionChartByTimeBucket(
    timeBucket: TimeBucketType,
    from: string,
    to: string,
    filtersQuery: string,
    paramsData: any,
    safeTimezone: string,
  ): Promise<object | void> {
    const { xShifted } = this.generateXAxis(timeBucket, from, to, safeTimezone)

    const pageviewsQuery = this.generateSessionAggregationQuery(
      timeBucket,
      filtersQuery,
    )
    const customEventsQuery = this.generateSessionCustomEventsAggregationQuery(
      timeBucket,
      filtersQuery,
    )
    const errorsQuery = this.generateSessionErrorsAggregationQuery(
      timeBucket,
      filtersQuery,
    )

    const queryParams = { ...paramsData.params, timezone: safeTimezone }

    const [pageviewsData, customEventsData, errorsData] = await Promise.all([
      clickhouse
        .query({
          query: pageviewsQuery,
          query_params: queryParams,
        })
        .then((resultSet) => resultSet.json<any>()),
      clickhouse
        .query({
          query: customEventsQuery,
          query_params: queryParams,
        })
        .then((resultSet) => resultSet.json<any>()),
      clickhouse
        .query({
          query: errorsQuery,
          query_params: queryParams,
        })
        .then((resultSet) => resultSet.json<any>()),
    ])

    const pageviews = this.extractCountsForSessionChart(
      pageviewsData.data,
      xShifted,
      'pageviews',
    )
    const customEvents = this.extractCountsForSessionChart(
      customEventsData.data,
      xShifted,
      'customEventsCount',
    )
    const errors = this.extractCountsForSessionChart(
      errorsData.data,
      xShifted,
      'errorsCount',
    )

    const chartOutput: {
      x: string[]
      pageviews?: number[]
      customEvents?: number[]
      errors?: number[]
    } = {
      x: xShifted,
    }

    if (_some(pageviews, (count) => count > 0)) {
      chartOutput.pageviews = pageviews
    }

    if (_some(customEvents, (count) => count > 0)) {
      chartOutput.customEvents = customEvents
    }

    if (_some(errors, (count) => count > 0)) {
      chartOutput.errors = errors
    }

    return Promise.resolve({
      chart: chartOutput,
    })
  }

  extractSoftwareVersion(
    version: string | null,
    software?: string | null,
  ): string | null {
    if (!version) return null

    const [major, minor = '0', patch = '0'] = version.split('.')

    if (!major) return null

    if (software && SOFTWARE_WITH_PATCH_VERSION.includes(software)) {
      return `${major}.${minor}.${patch}`
    }

    return `${major}.${minor}`
  }

  async getRequestInformation(headers: any) {
    const ua = await UAParser(
      headers?.['user-agent'],
      extensions,
      headers,
    ).withClientHints()

    return {
      deviceType: ua.device.type || 'desktop',
      browserName: ua.browser.name,
      browserVersion: this.extractSoftwareVersion(
        ua.browser.version,
        ua.browser.name,
      ),
      osName: ua.os.name,
      osVersion: this.extractSoftwareVersion(ua.os.version),
    }
  }

  extractCaptchaChartData(result, x: string[]): any {
    const count = Array(x.length).fill(0)

    for (let row = 0; row < _size(result); ++row) {
      const dateString = this.generateDateString(result[row])

      const index = x.indexOf(dateString)

      if (index !== -1) {
        count[index] = result[row].count
      }
    }

    return {
      count,
    }
  }

  async groupCaptchaByTimeBucket(
    timeBucket: TimeBucketType,
    from: string,
    to: string,
    subQuery: string,
    filtersQuery: string,
    paramsData: any,
    safeTimezone: string,
    mode: ChartRenderMode,
  ): Promise<object | void> {
    let params: unknown = {}
    let chart: unknown = {}

    const promises = [
      // Getting params
      (async () => {
        params = await this.generateParams(
          null,
          subQuery,
          false,
          paramsData,
          'captcha',
        )

        if (!_some(_values(params), (val) => !_isEmpty(val))) {
          throw new BadRequestException(
            'There are no parameters for the specified time frames',
          )
        }
      })(),

      // Getting CAPTCHA chart data
      (async () => {
        const { xShifted } = this.generateXAxis(
          timeBucket,
          from,
          to,
          safeTimezone,
        )

        const query = this.generateCaptchaAggregationQuery(
          timeBucket,
          filtersQuery,
          mode,
        )

        const { data } = await clickhouse
          .query({
            query,
            query_params: { ...paramsData.params, timezone: safeTimezone },
          })
          .then((resultSet) => resultSet.json<TrafficCEFilterCHResponse>())
        const { count } = this.extractCaptchaChartData(data, xShifted)

        chart = {
          x: xShifted,
          results: count,
        }
      })(),
    ]

    await Promise.all(promises)

    return Promise.resolve({
      params,
      chart,
    })
  }

  async groupErrorsByTimeBucket(
    timeBucket: TimeBucketType,
    from: string,
    to: string,
    subQuery: string,
    filtersQuery: string,
    paramsData: any,
    safeTimezone: string,
    mode: ChartRenderMode,
  ): Promise<object | void> {
    let params: unknown = {}
    let chart: unknown = {}

    const promises = [
      // Params
      (async () => {
        params = await this.generateParams(
          null,
          subQuery,
          false,
          paramsData,
          'errors',
        )

        if (!_some(_values(params), (val) => !_isEmpty(val))) {
          throw new BadRequestException(
            'There are no error details for specified time frame',
          )
        }
      })(),

      // Chart data
      (async () => {
        const { x, format } = this.generateUTCXAxis(timeBucket, from, to)

        const query = this.generateErrorsAggregationQuery(
          timeBucket,
          filtersQuery,
          mode,
        )

        const { data } = await clickhouse
          .query({
            query,
            query_params: paramsData.params,
          })
          .then((resultSet) => resultSet.json<TrafficCEFilterCHResponse>())
        const { count, affectedUsers } = this.extractErrorsChartData(data, x)

        chart = {
          x: this.shiftToTimezone(x, safeTimezone, format),
          occurrences: count,
          affectedUsers,
        }
      })(),
    ]

    await Promise.all(promises)

    return Promise.resolve({
      params,
      chart,
    })
  }

  extractErrorsChartData(
    result: any[],
    x: string[],
  ): { count: number[]; affectedUsers: number[] } {
    const count = Array(x.length).fill(0)
    const affectedUsers = Array(x.length).fill(0)

    for (let row = 0; row < _size(result); ++row) {
      const dateString = this.generateDateString(result[row])
      const index = x.indexOf(dateString)

      if (index !== -1) {
        count[index] = Number(result[row].count) || 0
        affectedUsers[index] = Number(result[row].affectedUsers) || 0
      }
    }

    return { count, affectedUsers }
  }

  extractPerformanceChartData(result, x: string[]): any {
    const dns = Array(x.length).fill(0)
    const tls = Array(x.length).fill(0)
    const conn = Array(x.length).fill(0)
    const response = Array(x.length).fill(0)
    const render = Array(x.length).fill(0)
    const domLoad = Array(x.length).fill(0)
    const ttfb = Array(x.length).fill(0)

    for (let row = 0; row < _size(result); ++row) {
      const dateString = this.generateDateString(result[row])

      const index = x.indexOf(dateString)

      if (index !== -1) {
        dns[index] = _round(millisecondsToSeconds(result[row].dns), 2)
        tls[index] = _round(millisecondsToSeconds(result[row].tls), 2)
        conn[index] = _round(millisecondsToSeconds(result[row].conn), 2)
        response[index] = _round(millisecondsToSeconds(result[row].response), 2)
        render[index] = _round(millisecondsToSeconds(result[row].render), 2)
        domLoad[index] = _round(millisecondsToSeconds(result[row].domLoad), 2)
        ttfb[index] = _round(millisecondsToSeconds(result[row].ttfb), 2)
      }
    }

    return {
      dns,
      tls,
      conn,
      response,
      render,
      domLoad,
      ttfb,
    }
  }

  extractPerformanceQuantilesData(result, x: string[]): any {
    const cols = ['dns', 'tls', 'conn', 'response', 'render', 'domLoad', 'ttfb']

    const p50 = Array(x.length).fill(0)
    const p75 = Array(x.length).fill(0)
    const p95 = Array(x.length).fill(0)

    for (let row = 0; row < _size(result); ++row) {
      const dateString = this.generateDateString(result[row])

      const index = x.indexOf(dateString)

      if (index !== -1) {
        let quantiles = [0, 0, 0]

        for (let i = 0; i < cols.length; ++i) {
          const col = cols[i]
          quantiles = sumArrays(quantiles, result[row][col] || [])
        }

        p50[index] = _round(millisecondsToSeconds(quantiles[0]), 2)
        p75[index] = _round(millisecondsToSeconds(quantiles[1]), 2)
        p95[index] = _round(millisecondsToSeconds(quantiles[2]), 2)
      }
    }

    return {
      p50,
      p75,
      p95,
    }
  }

  async getPerfChartData(
    timeBucket: TimeBucketType,
    from: string,
    to: string,
    filtersQuery: string,
    paramsData: any,
    safeTimezone: string,
    measure: PerfMeasure,
  ) {
    const { xShifted } = this.generateXAxis(timeBucket, from, to, safeTimezone)

    if (measure === 'quantiles') {
      const query = this.generatePerformanceQuantilesQuery(
        timeBucket,
        filtersQuery,
      )

      const { data } = await clickhouse
        .query({
          query,
          query_params: { ...paramsData.params, timezone: safeTimezone },
        })
        .then((resultSet) => resultSet.json())

      return {
        x: xShifted,
        ...this.extractPerformanceQuantilesData(data, xShifted),
      }
    }

    const query = this.generatePerformanceAggregationQuery(
      timeBucket,
      filtersQuery,
      measure,
    )

    const { data } = await clickhouse
      .query({
        query,
        query_params: { ...paramsData.params, timezone: safeTimezone },
      })
      .then((resultSet) => resultSet.json<PerformanceCHResponse>())

    return {
      x: xShifted,
      ...this.extractPerformanceChartData(data, xShifted),
    }
  }

  async groupPerfByTimeBucket(
    timeBucket: TimeBucketType,
    from: string,
    to: string,
    subQuery: string,
    filtersQuery: string,
    paramsData: any,
    safeTimezone: string,
    measure: PerfMeasure,
  ): Promise<object | void> {
    let params: unknown = {}
    let chart: unknown = {}

    const promises = [
      // Getting params
      (async () => {
        params = await this.generateParams(
          null,
          subQuery,
          false,
          paramsData,
          'performance',
          measure,
        )

        if (!_some(_values(params), (val) => !_isEmpty(val))) {
          throw new BadRequestException(
            'There are no parameters for the specified time frames',
          )
        }
      })(),

      // Getting chart data
      (async () => {
        chart = await this.getPerfChartData(
          timeBucket,
          from,
          to,
          filtersQuery,
          paramsData,
          safeTimezone,
          measure,
        )
      })(),
    ]

    await Promise.all(promises)

    return Promise.resolve({
      params,
      chart,
    })
  }

  async getCustomEvents(
    filtersQuery: string,
    params: any,
  ): Promise<ICustomEvent> {
    const query = `SELECT ev, count() FROM customEV WHERE pid = {pid:FixedString(12)} ${filtersQuery} AND created BETWEEN {groupFrom:String} AND {groupTo:String} GROUP BY ev`
    const result = {}

    const { data } = await clickhouse
      .query({
        query,
        query_params: params.params,
      })
      .then((resultSet) => resultSet.json<CustomsCHResponse>())
    const size = _size(data)

    for (let i = 0; i < size; ++i) {
      const { ev, 'count()': c } = data[i]
      result[ev] = c
    }

    return result
  }

  async getPageProperties(
    filtersQuery: string,
    params: any,
  ): Promise<IPageProperty> {
    const query = `
      SELECT
        key AS property,
        count()
      FROM (
        SELECT
          meta.key AS key
        FROM
          analytics
        WHERE
          pid = {pid:FixedString(12)}
          ${filtersQuery}
          AND created BETWEEN {groupFrom:String} AND {groupTo:String}
      )
      ARRAY JOIN key
      GROUP BY property`
    const result = {}

    const { data } = await clickhouse
      .query({
        query,
        query_params: params.params,
      })
      .then((resultSet) => resultSet.json<PropertiesCHResponse>())
    const size = _size(data)

    for (let i = 0; i < size; ++i) {
      const { property, 'count()': c } = data[i]

      if (!property) {
        continue
      }

      result[property] = c
    }

    return result
  }

  async getCustomEventMetadata(data: GetCustomEventMetadata): Promise<{
    result: IAggregatedMetadata[]
    appliedFilters: GetFiltersQuery[2]
  }> {
    const {
      pid,
      period,
      timeBucket,
      from,
      to,
      filters,
      timezone = DEFAULT_TIMEZONE,
      event,
    } = data

    let newTimebucket = timeBucket

    let diff

    const [filtersQuery, filtersParams, appliedFilters] = this.getFiltersQuery(
      filters,
      DataType.ANALYTICS,
    )

    if (period === 'all') {
      const res = await this.calculateTimeBucketForAllTime(pid, 'customEV')

      diff = res.diff

      newTimebucket = _includes(res.timeBucket, timeBucket)
        ? timeBucket
        : res.timeBucket[0]
    }

    const safeTimezone = this.getSafeTimezone(timezone)
    const { groupFromUTC, groupToUTC } = this.getGroupFromTo(
      from,
      to,
      newTimebucket,
      period,
      safeTimezone,
      diff,
    )

    const query = `
      SELECT
        meta.key AS key,
        meta.value AS value,
        count() AS count
      FROM (
        SELECT
          meta.key,
          meta.value
        FROM
          customEV
        WHERE
          pid = {pid:FixedString(12)}
          AND created BETWEEN {groupFrom:String} AND {groupTo:String}
          AND ev = {event:String}
          ${filtersQuery}
      )
      ARRAY JOIN meta.key, meta.value
      GROUP BY key, value
    `

    const paramsData = {
      params: {
        pid,
        groupFrom: groupFromUTC,
        groupTo: groupToUTC,
        event,
        ...filtersParams,
      },
    }

    try {
      const { data: result } = await clickhouse
        .query({
          query,
          query_params: paramsData.params,
        })
        .then((resultSet) => resultSet.json<IAggregatedMetadata>())

      return {
        result,
        appliedFilters,
      }
    } catch (reason) {
      console.error(`[ERROR](getCustomEventMetadata): ${reason}`)
      throw new InternalServerErrorException(
        'Something went wrong. Please, try again later.',
      )
    }
  }

  async getPagePropertyMeta(data: GetPagePropertyMetaDto): Promise<{
    result: IAggregatedMetadata[]
    appliedFilters: GetFiltersQuery[2]
  }> {
    const {
      pid,
      period,
      timeBucket,
      from,
      to,
      timezone = DEFAULT_TIMEZONE,
      property,
      filters,
    } = data

    let newTimebucket = timeBucket

    let diff

    const [filtersQuery, filtersParams, appliedFilters, customEVFilterApplied] =
      this.getFiltersQuery(filters, DataType.ANALYTICS)

    // We cannot make a query to customEV table using analytics table properties
    if (customEVFilterApplied) {
      return {
        result: [],
        appliedFilters,
      }
    }

    if (period === 'all') {
      const res = await this.calculateTimeBucketForAllTime(pid, 'analytics')

      diff = res.diff

      newTimebucket = _includes(res.timeBucket, timeBucket)
        ? timeBucket
        : res.timeBucket[0]
    }

    const safeTimezone = this.getSafeTimezone(timezone)
    const { groupFromUTC, groupToUTC } = this.getGroupFromTo(
      from,
      to,
      newTimebucket,
      period,
      safeTimezone,
      diff,
    )

    const query = `
      SELECT
        meta.key AS key,
        meta.value AS value,
        count() AS count
      FROM (
        SELECT
          meta.key,
          meta.value
        FROM
          analytics
        WHERE
          pid = {pid:FixedString(12)}
          AND created BETWEEN {groupFrom:String} AND {groupTo:String}
          AND indexOf(meta.key, {property:String}) > 0
          ${filtersQuery}
      )
      ARRAY JOIN meta.key, meta.value
      WHERE meta.key = {property:String}
      GROUP BY key, value
    `

    const paramsData = {
      params: {
        pid,
        groupFrom: groupFromUTC,
        groupTo: groupToUTC,
        property,
        ...filtersParams,
      },
    }

    try {
      const { data: result } = await clickhouse
        .query({
          query,
          query_params: paramsData.params,
        })
        .then((resultSet) => resultSet.json<IAggregatedMetadata>())

      return {
        result,
        appliedFilters,
      }
    } catch (reason) {
      console.error(`[ERROR](getPagePropertyMeta): ${reason}`)
      throw new InternalServerErrorException(
        'Something went wrong. Please, try again later.',
      )
    }
  }

  async getOnlineUserCount(pid: string): Promise<number> {
    const ONLINE_VISITORS_WINDOW_MINUTES = 5

    const since = dayjs
      .utc()
      .subtract(ONLINE_VISITORS_WINDOW_MINUTES, 'minute')
      .format('YYYY-MM-DD HH:mm:ss')

    const query = `
      SELECT uniqExact(psid) as count
      FROM (
        SELECT psid FROM analytics
        WHERE pid = {pid:FixedString(12)}
          AND created >= {since:DateTime}
          AND psid IS NOT NULL
        UNION ALL
        SELECT psid FROM customEV
        WHERE pid = {pid:FixedString(12)}
          AND created >= {since:DateTime}
          AND psid IS NOT NULL
      )
    `

    try {
      const { data } = await clickhouse
        .query({
          query,
          query_params: {
            pid,
            since,
          },
        })
        .then((resultSet) => resultSet.json<{ count: string }>())

      return Number(data[0]?.count || 0)
    } catch (error) {
      console.error(`[ERROR](getOnlineUserCount): ${error}`)
      return 0
    }
  }

  async groupCustomEVByTimeBucket(
    timeBucket: TimeBucketType,
    from: string,
    to: string,
    filtersQuery: string,
    paramsData: any,
    safeTimezone: string,
    customEvents?: string[],
  ): Promise<object | void> {
    const { xShifted } = this.generateXAxis(timeBucket, from, to, safeTimezone)

    const timeBucketFunc = timeBucketConversion[timeBucket]
    const [selector, groupBy] = this.getGroupSubquery(timeBucket)
    const tzFromDate = `toTimeZone(parseDateTimeBestEffort({groupFrom:String}), {timezone:String})`
    const tzToDate = `toTimeZone(parseDateTimeBestEffort({groupTo:String}), {timezone:String})`
    const customEventsFilter =
      customEvents && customEvents.length > 0
        ? 'AND ev IN {customEvents:Array(String)}'
        : ''

    const query = `
      SELECT
        ${selector},
        ev,
        count() as count
      FROM (
        SELECT *,
          ${timeBucketFunc}(toTimeZone(created, {timezone:String})) as tz_created
        FROM customEV
        WHERE
          pid = {pid:FixedString(12)}
          AND created BETWEEN ${tzFromDate} AND ${tzToDate}
          ${filtersQuery}
          ${customEventsFilter}
      ) as subquery
      GROUP BY ${groupBy}, ev
      ORDER BY ${groupBy}
      `

    const { data } = await clickhouse
      .query({
        query,
        query_params: {
          ...paramsData.params,
          timezone: safeTimezone,
          customEvents: customEvents || [],
        },
      })
      .then((resultSet) => resultSet.json<CustomsCHAggregatedResponse>())

    const events = this.extractCustomEventsChartData(data, xShifted)

    return Promise.resolve({
      chart: {
        x: xShifted,
        events,
      },
    })
  }

  getSafeNumber(value: any, defaultValue: number): number {
    if (typeof value === 'undefined' || value === null || value === '') {
      return defaultValue
    }

    const n = typeof value === 'number' ? value : Number(value)

    if (!Number.isFinite(n)) {
      return defaultValue
    }

    // ClickHouse LIMIT/OFFSET must be non-negative integers
    return Math.max(0, Math.trunc(n))
  }

  processPageflow(pages: IPageflow[]) {
    if (_isEmpty(pages)) {
      return []
    }

    return _map(pages, (page: IPageflow) => {
      const processedMetadata = page.metadata
        ? _map(page.metadata, ([key, value]: [string, string]) => ({
            key,
            value,
          }))
        : undefined

      // For sale and refund events, extract amount and currency from metadata
      if (
        (page.type === 'sale' || page.type === 'refund') &&
        processedMetadata
      ) {
        const amountEntry = processedMetadata.find((m) => m.key === 'amount')
        const currencyEntry = processedMetadata.find(
          (m) => m.key === 'currency',
        )

        let amount: number | undefined

        if (amountEntry) {
          const parsedAmount = parseFloat(amountEntry.value)

          if (Number.isFinite(parsedAmount) && parsedAmount >= 0) {
            amount = parsedAmount
          }
        }

        return {
          ...page,
          metadata: processedMetadata.filter(
            (m) => m.key !== 'amount' && m.key !== 'currency',
          ),
          amount,
          currency: currencyEntry ? currencyEntry.value : undefined,
        }
      }

      return {
        ...page,
        metadata: processedMetadata,
      }
    })
  }

  async getSessionDetails(
    pid: string,
    psid: string,
    safeTimezone: string,
  ): Promise<any> {
    const queryPages = `
      WITH events_with_meta AS (
        SELECT
          'pageview' AS type,
          toString(pg) AS value,
          toTimeZone(analytics.created, {timezone:String}) AS created,
          pid,
          toString(analytics.psid) AS psid,
          groupArrayIf(tuple(meta.key, meta.value), notEmpty(meta.key) AND notEmpty(meta.value)) AS metadata
        FROM analytics
        LEFT ARRAY JOIN meta.key, meta.value
        WHERE
          pid = {pid:FixedString(12)}
          AND analytics.psid IS NOT NULL
          AND toString(analytics.psid) = {psid:String}
        GROUP BY type, value, created, pid, psid

        UNION ALL

        SELECT
          'event' AS type,
          toString(ev) AS value,
          toTimeZone(customEV.created, {timezone:String}) AS created,
          pid,
          toString(customEV.psid) AS psid,
          groupArrayIf(tuple(meta.key, meta.value), notEmpty(meta.key) AND notEmpty(meta.value)) AS metadata
        FROM customEV
        LEFT ARRAY JOIN meta.key, meta.value
        WHERE
          pid = {pid:FixedString(12)}
          AND customEV.psid IS NOT NULL
          AND toString(customEV.psid) = {psid:String}
        GROUP BY type, value, created, pid, psid
        
        UNION ALL

        SELECT
          'error' AS type,
          toString(errors.name) AS value,
          toTimeZone(errors.created, {timezone:String}) AS created,
          pid,
          toString(errors.psid) AS psid,
          [
            tuple('message', COALESCE(errors.message, '')),
            tuple('lineno', toString(COALESCE(errors.lineno, 0))),
            tuple('colno', toString(COALESCE(errors.colno, 0))),
            tuple('filename', COALESCE(errors.filename, ''))
          ] AS metadata
        FROM errors
        WHERE
          pid = {pid:FixedString(12)}
          AND errors.psid IS NOT NULL
          AND toString(errors.psid) = {psid:String}
        GROUP BY type, value, created, pid, psid, errors.message, errors.lineno, errors.colno, errors.filename

        UNION ALL

        SELECT
          type,
          COALESCE(toString(product_name), toString(product_id), if(type = 'refund', 'Refund', 'Sale')) AS value,
          toTimeZone(created, {timezone:String}) AS created,
          pid,
          toString(session_id) AS psid,
          [
            tuple('amount', toString(amount)),
            tuple('currency', toString(currency)),
            tuple('transaction_id', toString(transaction_id)),
            tuple('status', toString(status)),
            tuple('provider', toString(provider))
          ] AS metadata
        FROM (
          SELECT
            argMax(type, synced_at) AS type,
            argMax(product_name, synced_at) AS product_name,
            argMax(product_id, synced_at) AS product_id,
            argMax(created, synced_at) AS created,
            pid,
            session_id,
            argMax(amount, synced_at) AS amount,
            argMax(currency, synced_at) AS currency,
            transaction_id,
            argMax(status, synced_at) AS status,
            argMax(provider, synced_at) AS provider
          FROM revenue
          WHERE
            pid = {pid:FixedString(12)}
            AND session_id IS NOT NULL
            AND toString(session_id) = {psid:String}
            AND revenue.type IN ('sale', 'refund')
          GROUP BY pid, session_id, transaction_id
        )
      )

      SELECT
        type,
        value,
        created,
        metadata
      FROM events_with_meta
      ORDER BY created ASC
    `

    const querySessionDetails = `
      SELECT
        dv, br, brv, os, osv, lc, ref, so, me, ca, te, co, cc, rg, ct, profileId
      FROM analytics
      WHERE
        pid = {pid:FixedString(12)}
        AND psid IS NOT NULL
        AND toString(psid) = {psid:String}
      ORDER BY created ASC
      LIMIT 1;
    `

    const querySessionDuration = `
      SELECT
        dateDiff('second', firstSeen, lastSeen) as duration,
        lastSeen
      FROM (
        SELECT
          minOrNull(firstSeen) AS firstSeen,
          maxOrNull(lastSeen) AS lastSeen
        FROM sessions
        WHERE
          pid = {pid:FixedString(12)}
          AND psid = toUInt64OrNull({psid:String})
      )
    `

    const paramsData = {
      params: {
        pid,
        psid,
        timezone: safeTimezone,
      },
    }

    const { data: pages } = await clickhouse
      .query({
        query: queryPages,
        query_params: paramsData.params,
      })
      .then((resultSet) => resultSet.json<IPageflow>())

    let details = (
      await clickhouse
        .query({
          query: querySessionDetails,
          query_params: paramsData.params,
        })
        .then((resultSet) => resultSet.json())
        .then(({ data }) => data)
    )[0] as any

    let duration: number = 0

    const { data: durationRows } = await clickhouse
      .query({
        query: querySessionDuration,
        query_params: paramsData.params,
      })
      .then((resultSet) =>
        resultSet.json<{
          duration: number | null
          lastSeen: string | null
        }>(),
      )

    const fromSessionsTable = durationRows[0]?.duration ?? null
    const lastSeen = durationRows[0]?.lastSeen ?? null
    if (typeof fromSessionsTable === 'number' && fromSessionsTable > 0) {
      duration = fromSessionsTable
    }

    // If sessions table exists but `firstSeen` was historically broken (e.g. firstSeen == lastSeen),
    // we can still approximate using the first recorded event time + the session's lastSeen (which
    // may include heartbeat updates and thus be later than the last pageflow event).
    if (!duration && lastSeen && Array.isArray(pages) && pages.length >= 1) {
      const first = dayjs(pages[0].created)
      const diffSeconds = dayjs(lastSeen).diff(first, 'second')
      if (diffSeconds > 0) {
        duration = diffSeconds
      }
    }

    // Last resort: if we have at least 2 events in the pageflow, compute duration
    // from the time between the first and last events. This prevents "N/A" durations
    // when the sessions table doesn't have usable data.
    if (!duration && Array.isArray(pages) && pages.length >= 2) {
      const first = dayjs(pages[0].created)
      const last = dayjs(pages[pages.length - 1].created)
      const diffSeconds = last.diff(first, 'second')
      if (diffSeconds > 0) {
        duration = diffSeconds
      }
    }

    if (!details) {
      const querySessionDetailsFromCustomEV = `
        SELECT
          dv, br, brv, os, osv, lc, ref, so, me, ca, te, co, cc, rg, ct, profileId
        FROM customEV
        WHERE
          pid = {pid:FixedString(12)}
          AND psid IS NOT NULL
          AND toString(psid) = {psid:String}
        ORDER BY created ASC
        LIMIT 1;
      `

      details = (
        await clickhouse
          .query({
            query: querySessionDetailsFromCustomEV,
            query_params: paramsData.params,
          })
          .then((resultSet) => resultSet.json())
          .then(({ data }) => data)
      )[0]
    }

    let chartData = {}
    let timeBucket = null

    if (!_isEmpty(pages)) {
      const from = dayjs
        .utc(pages[0].created)
        .tz(safeTimezone)
        .startOf('minute')
        .format('YYYY-MM-DD HH:mm:ss')
      const to = dayjs
        .utc(pages[_size(pages) - 1].created)
        .tz(safeTimezone)
        .endOf('minute')
        .format('YYYY-MM-DD HH:mm:ss')

      timeBucket =
        dayjs(to).diff(dayjs(from), 'hour') > 1
          ? TimeBucketType.HOUR
          : TimeBucketType.MINUTE

      const groupedChart = await this.groupSessionChartByTimeBucket(
        timeBucket,
        from,
        to,
        'AND psid IS NOT NULL AND toString(psid) = {psid:String}',
        {
          params: {
            ...paramsData.params,
            groupFrom: pages[0].created,
            groupTo: pages[_size(pages) - 1].created,
          },
        },
        safeTimezone,
      )

      // @ts-ignore
      chartData = groupedChart.chart
    }

    let isLive = false

    if (!_isEmpty(pages)) {
      const lastActivityTime = dayjs(pages[pages.length - 1].created)

      const liveThresholdTime = dayjs().subtract(
        LIVE_SESSION_THRESHOLD_SECONDS,
        'seconds',
      )
      isLive = lastActivityTime.isAfter(liveThresholdTime)
    }

    return {
      pages: this.processPageflow(pages),
      details: {
        ...(details || {}),
        sdur: duration,
        isLive,
      },
      psid,
      chart: chartData,
      timeBucket,
    }
  }

  async getSessionsList(
    filtersQuery: string,
    paramsData: any,
    safeTimezone: string,
    take = 30,
    skip = 0,
    customEVFilterApplied = false,
  ): Promise<object | void> {
    let primaryEventsSubquery: string

    if (customEVFilterApplied) {
      // When filtering by custom events, we need to:
      // 1. Identify sessions (psids) that have matching custom events
      // 2. Calculate session boundaries from ALL analytics events for those sessions
      primaryEventsSubquery = `
        SELECT
          all_events.psidCasted,
          all_events.pid,
          all_events.cc,
          all_events.os,
          all_events.br,
          all_events.created_for_grouping
        FROM (
          SELECT
            CAST(analytics.psid, 'String') AS psidCasted,
            analytics.pid,
            analytics.cc,
            analytics.os,
            analytics.br,
            toTimeZone(analytics.created, {timezone:String}) AS created_for_grouping
          FROM analytics
          WHERE
            analytics.pid = {pid:FixedString(12)}
            AND analytics.psid IS NOT NULL
            AND analytics.created BETWEEN {groupFrom:String} AND {groupTo:String}
          UNION ALL
          SELECT
            CAST(customEV.psid, 'String') AS psidCasted,
            customEV.pid,
            customEV.cc,
            customEV.os,
            customEV.br,
            toTimeZone(customEV.created, {timezone:String}) AS created_for_grouping
          FROM customEV
          WHERE
            customEV.pid = {pid:FixedString(12)}
            AND customEV.psid IS NOT NULL
            AND customEV.created BETWEEN {groupFrom:String} AND {groupTo:String}
        ) AS all_events
        WHERE all_events.psidCasted IN (
          SELECT DISTINCT CAST(customEV.psid, 'String')
          FROM customEV
          WHERE
            customEV.pid = {pid:FixedString(12)}
            AND customEV.psid IS NOT NULL
            AND customEV.created BETWEEN {groupFrom:String} AND {groupTo:String}
            ${filtersQuery}
        )
      `
    } else {
      primaryEventsSubquery = `
        SELECT
          CAST(analytics.psid, 'String') AS psidCasted,
          analytics.pid,
          analytics.cc,
          analytics.os,
          analytics.br,
          toTimeZone(analytics.created, {timezone:String}) AS created_for_grouping
        FROM analytics
        WHERE
          analytics.pid = {pid:FixedString(12)}
          AND analytics.psid IS NOT NULL
          AND analytics.created BETWEEN {groupFrom:String} AND {groupTo:String}
          ${filtersQuery}
        UNION ALL
        SELECT
          CAST(customEV.psid, 'String') AS psidCasted,
          customEV.pid,
          customEV.cc,
          customEV.os,
          customEV.br,
          toTimeZone(customEV.created, {timezone:String}) AS created_for_grouping
        FROM customEV
        WHERE
          customEV.pid = {pid:FixedString(12)}
          AND customEV.psid IS NOT NULL
          AND customEV.created BETWEEN {groupFrom:String} AND {groupTo:String}
          ${filtersQuery}
      `
    }

    const query = `
      WITH distinct_sessions_filtered AS (
        SELECT
          psidCasted,
          pid, 
          any(cc) AS cc,
          any(os) AS os,
          any(br) AS br,
          min(created_for_grouping) AS sessionStart,
          max(created_for_grouping) AS lastActivity
        FROM (${primaryEventsSubquery}) AS primary_events
        GROUP BY psidCasted, pid
      ),
      pageview_counts AS (
        SELECT 
          CAST(psid, 'String') AS psidCasted,
          pid, 
          count() as count 
        FROM analytics 
        WHERE pid = {pid:FixedString(12)} AND psid IS NOT NULL 
          AND created BETWEEN {groupFrom:String} AND {groupTo:String}
        GROUP BY psidCasted, pid
      ),
      event_counts AS (
        SELECT 
          CAST(psid, 'String') AS psidCasted,
          pid, 
          count() as count 
        FROM customEV 
        WHERE pid = {pid:FixedString(12)} AND psid IS NOT NULL 
          AND created BETWEEN {groupFrom:String} AND {groupTo:String}
        GROUP BY psidCasted, pid
      ),
      error_counts AS (
        SELECT 
          CAST(psid, 'String') AS psidCasted,
          pid, 
          count() as count 
        FROM errors 
        WHERE pid = {pid:FixedString(12)} AND psid IS NOT NULL 
          AND created BETWEEN {groupFrom:String} AND {groupTo:String}
        GROUP BY psidCasted, pid
      ),
      revenue_totals AS (
        SELECT
          psidCasted,
          pid,
          sum(CASE WHEN type = 'sale' THEN amount ELSE 0 END) - sum(CASE WHEN type = 'refund' THEN abs(amount) ELSE 0 END) as revenue,
          sum(CASE WHEN type = 'refund' THEN abs(amount) ELSE 0 END) as refunds
        FROM (
          SELECT
            CAST(session_id, 'String') AS psidCasted,
            pid,
            argMax(type, synced_at) AS type,
            argMax(amount, synced_at) AS amount
          FROM revenue
          WHERE pid = {pid:FixedString(12)} AND session_id IS NOT NULL
            AND created BETWEEN {groupFrom:String} AND {groupTo:String}
            AND revenue.type IN ('sale', 'refund')
          GROUP BY psidCasted, pid, transaction_id
        )
        GROUP BY psidCasted, pid
      ),
      session_duration_agg AS (
        SELECT 
          CAST(psid, 'String') AS psidCasted, 
          pid, 
          dateDiff('second', min(firstSeen), max(lastSeen)) as avg_duration,
          argMax(profileId, lastSeen) as profileId
        FROM sessions
        WHERE pid = {pid:FixedString(12)}
        GROUP BY psidCasted, pid
      ),
      first_session_per_profile AS (
        SELECT
          profileId,
          argMin(CAST(psid, 'String'), firstSeen) AS firstPsid
        FROM sessions FINAL
        WHERE pid = {pid:FixedString(12)}
          AND profileId IS NOT NULL
          AND profileId != ''
        GROUP BY profileId
      )
      SELECT
        dsf.psidCasted AS psid,
        dsf.cc,
        dsf.os,
        dsf.br,
        COALESCE(pc.count, 0) AS pageviews,
        COALESCE(ec.count, 0) AS customEvents,
        COALESCE(errc.count, 0) AS errors,
        toFloat64(COALESCE(rt.revenue, toDecimal64(0, 4))) AS revenue,
        toFloat64(COALESCE(rt.refunds, toDecimal64(0, 4))) AS refunds,
        dsf.sessionStart,
        dsf.lastActivity,
        if(dateDiff('second', dsf.lastActivity, now()) < ${LIVE_SESSION_THRESHOLD_SECONDS}, 1, 0) AS isLive,
        sda.avg_duration AS sdur,
        sda.profileId AS profileId,
        if(startsWith(sda.profileId, '${AnalyticsService.PROFILE_PREFIX_USER}'), 1, 0) AS isIdentified,
        if(fsp.firstPsid = dsf.psidCasted, 1, 0) AS isFirstSession
      FROM distinct_sessions_filtered dsf
      LEFT JOIN pageview_counts pc ON dsf.psidCasted = pc.psidCasted AND dsf.pid = pc.pid
      LEFT JOIN event_counts ec ON dsf.psidCasted = ec.psidCasted AND dsf.pid = ec.pid
      LEFT JOIN error_counts errc ON dsf.psidCasted = errc.psidCasted AND dsf.pid = errc.pid
      LEFT JOIN revenue_totals rt ON dsf.psidCasted = rt.psidCasted AND dsf.pid = rt.pid
      LEFT JOIN session_duration_agg sda ON dsf.psidCasted = sda.psidCasted AND dsf.pid = sda.pid
      LEFT JOIN first_session_per_profile fsp ON sda.profileId = fsp.profileId
      WHERE dsf.psidCasted IS NOT NULL
      ORDER BY dsf.sessionStart DESC
      LIMIT {take:UInt32}
      OFFSET {skip:UInt32}
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: {
          ...paramsData.params,
          timezone: safeTimezone,
          take,
          skip,
        },
      })
      .then((resultSet) => resultSet.json())

    return data
  }

  async getProfilesList(
    pid: string,
    filtersQuery: string,
    paramsData: any,
    safeTimezone: string,
    take = 30,
    skip = 0,
    profileType: 'all' | 'anonymous' | 'identified' = 'all',
  ): Promise<object[]> {
    let profileTypeFilter = ''
    if (profileType === 'anonymous') {
      profileTypeFilter = `AND profileId LIKE '${AnalyticsService.PROFILE_PREFIX_ANON}%'`
    } else if (profileType === 'identified') {
      profileTypeFilter = `AND profileId LIKE '${AnalyticsService.PROFILE_PREFIX_USER}%'`
    }

    const query = `
      WITH all_profile_data AS (
        SELECT
          profileId,
          psid,
          cc,
          os,
          br,
          dv,
          created,
          1 AS isPageview,
          0 AS isEvent
        FROM analytics
        WHERE pid = {pid:FixedString(12)}
          AND profileId IS NOT NULL
          AND profileId != ''
          ${profileTypeFilter}
          ${filtersQuery}
        UNION ALL
        SELECT
          profileId,
          psid,
          cc,
          os,
          br,
          dv,
          created,
          0 AS isPageview,
          1 AS isEvent
        FROM customEV
        WHERE pid = {pid:FixedString(12)}
          AND profileId IS NOT NULL
          AND profileId != ''
          ${profileTypeFilter}
          ${filtersQuery}
      ),
      profile_aggregated AS (
        SELECT
          profileId,
          sum(isPageview) AS pageviewsCount,
          countDistinct(psid) AS sessionsCount,
          sum(isEvent) AS eventsCount,
          min(created) AS firstSeen,
          max(created) AS lastSeen,
          any(cc) AS cc_agg,
          any(os) AS os_agg,
          any(br) AS br_agg,
          any(dv) AS dv_agg
        FROM all_profile_data
        GROUP BY profileId
      ),
      profile_errors AS (
        SELECT
          profileId,
          count() AS errorsCount
        FROM errors
        WHERE pid = {pid:FixedString(12)}
          AND profileId IS NOT NULL
          AND profileId != ''
          ${profileTypeFilter}
        GROUP BY profileId
      )
      SELECT
        pa.profileId AS profileId,
        pa.sessionsCount AS sessionsCount,
        pa.pageviewsCount AS pageviewsCount,
        pa.eventsCount AS eventsCount,
        COALESCE(perr.errorsCount, 0) AS errorsCount,
        pa.firstSeen AS firstSeen,
        pa.lastSeen AS lastSeen,
        pa.cc_agg AS cc,
        pa.os_agg AS os,
        pa.br_agg AS br,
        pa.dv_agg AS dv
      FROM profile_aggregated AS pa
      LEFT JOIN profile_errors AS perr ON pa.profileId = perr.profileId
      ORDER BY pa.lastSeen DESC
      LIMIT {take:UInt32}
      OFFSET {skip:UInt32}
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: { pid, ...paramsData.params, take, skip },
      })
      .then((resultSet) => resultSet.json())

    return data
      .filter((profile: any) => profile.profileId)
      .map((profile: any) => ({
        ...profile,
        isIdentified: this.isUserSuppliedProfile(profile.profileId),
      }))
  }

  async getProfileDetails(
    pid: string,
    profileId: string,
    _safeTimezone: string,
  ): Promise<any> {
    // Query session count from sessions table
    const querySessionCount = `
      SELECT
        count() AS sessionsCount,
        min(sessions.firstSeen) AS firstSeen,
        max(sessions.lastSeen) AS lastSeen
      FROM sessions FINAL
      WHERE pid = {pid:FixedString(12)}
        AND profileId = {profileId:String}
    `

    // Query avg duration from analytics table (more accurate than sessions table)
    const queryAvgDuration = `
      SELECT
        avg(session_duration) AS avgDuration
      FROM (
        SELECT
          psid,
          dateDiff('second', min(created), max(created)) AS session_duration
        FROM analytics
        WHERE pid = {pid:FixedString(12)}
          AND profileId = {profileId:String}
          AND psid IS NOT NULL
        GROUP BY psid
        HAVING session_duration > 0
      )
    `

    // Query analytics for accurate pageview count
    const queryPageviews = `
      SELECT count() AS pageviewsCount
      FROM analytics
      WHERE pid = {pid:FixedString(12)}
        AND profileId = {profileId:String}
    `

    // Query customEV for accurate events count
    const queryEvents = `
      SELECT count() AS eventsCount
      FROM customEV
      WHERE pid = {pid:FixedString(12)}
        AND profileId = {profileId:String}
    `

    // Query for device/location details
    const queryDetails = `
      SELECT
        any(cc) AS cc,
        any(rg) AS rg,
        any(ct) AS ct,
        any(os) AS os,
        any(osv) AS osv,
        any(br) AS br,
        any(brv) AS brv,
        any(dv) AS dv,
        any(lc) AS lc
      FROM analytics
      WHERE pid = {pid:FixedString(12)}
        AND profileId = {profileId:String}
    `

    // Query for total revenue from profile (only sales, not refunds)
    const queryRevenue = `
      SELECT
        sum(amount) AS totalRevenue,
        any(currency) AS revenueCurrency
      FROM (
        SELECT
          argMax(amount, synced_at) AS amount,
          argMax(currency, synced_at) AS currency
        FROM revenue
        WHERE pid = {pid:FixedString(12)}
          AND profile_id = {profileId:String}
          AND type = 'sale'
          AND status = 'completed'
        GROUP BY transaction_id
      )
    `

    const params = { pid, profileId }

    const [
      sessionCountResult,
      avgDurationResult,
      pageviewsResult,
      eventsResult,
      detailsResult,
      revenueResult,
    ] = await Promise.all([
      clickhouse
        .query({ query: querySessionCount, query_params: params })
        .then((resultSet) => resultSet.json()),
      clickhouse
        .query({ query: queryAvgDuration, query_params: params })
        .then((resultSet) => resultSet.json()),
      clickhouse
        .query({ query: queryPageviews, query_params: params })
        .then((resultSet) => resultSet.json()),
      clickhouse
        .query({ query: queryEvents, query_params: params })
        .then((resultSet) => resultSet.json()),
      clickhouse
        .query({ query: queryDetails, query_params: params })
        .then((resultSet) => resultSet.json()),
      clickhouse
        .query({ query: queryRevenue, query_params: params })
        .then((resultSet) => resultSet.json()),
    ])

    const sessionCount = (sessionCountResult.data[0] || {}) as Record<
      string,
      any
    >
    const avgDuration = (avgDurationResult.data[0] || {}) as Record<string, any>
    const pageviews = (pageviewsResult.data[0] || {}) as Record<string, any>
    const events = (eventsResult.data[0] || {}) as Record<string, any>
    const details = (detailsResult.data[0] || {}) as Record<string, any>
    const revenue = (revenueResult.data[0] || {}) as Record<string, any>

    return {
      profileId,
      isIdentified: this.isUserSuppliedProfile(profileId),
      sessionsCount: sessionCount.sessionsCount || 0,
      pageviewsCount: pageviews.pageviewsCount || 0,
      eventsCount: events.eventsCount || 0,
      firstSeen: sessionCount.firstSeen,
      lastSeen: sessionCount.lastSeen,
      avgDuration: avgDuration.avgDuration || 0,
      totalRevenue: revenue.totalRevenue || 0,
      revenueCurrency: revenue.revenueCurrency || null,
      ...details,
    }
  }

  async getProfileTopPages(
    pid: string,
    profileId: string,
    limit = 10,
  ): Promise<{ page: string; count: number }[]> {
    const query = `
      SELECT
        pg AS page,
        count() AS count
      FROM analytics
      WHERE pid = {pid:FixedString(12)}
        AND profileId = {profileId:String}
      GROUP BY pg
      ORDER BY count DESC
      LIMIT {limit:UInt32}
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: { pid, profileId, limit: Number(limit) },
      })
      .then((resultSet) => resultSet.json())

    return data as { page: string; count: number }[]
  }

  async getProfileActivityCalendar(
    pid: string,
    profileId: string,
    months = 4,
  ): Promise<{ date: string; pageviews: number; events: number }[]> {
    const startDate = dayjs
      .utc()
      .subtract(months, 'month')
      .startOf('day')
      .format('YYYY-MM-DD')

    const query = `
      WITH all_activity AS (
        SELECT
          toDate(created) AS date,
          1 AS isPageview,
          0 AS isEvent
        FROM analytics
        WHERE pid = {pid:FixedString(12)}
          AND profileId = {profileId:String}
          AND created >= {startDate:Date}
        UNION ALL
        SELECT
          toDate(created) AS date,
          0 AS isPageview,
          1 AS isEvent
        FROM customEV
        WHERE pid = {pid:FixedString(12)}
          AND profileId = {profileId:String}
          AND created >= {startDate:Date}
      )
      SELECT
        date,
        sum(isPageview) AS pageviews,
        sum(isEvent) AS events
      FROM all_activity
      GROUP BY date
      ORDER BY date ASC
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: { pid, profileId, startDate },
      })
      .then((resultSet) => resultSet.json())

    return data as { date: string; pageviews: number; events: number }[]
  }

  async getProfileChartData(
    pid: string,
    profileId: string,
    timeBucket: string,
    from: string,
    to: string,
    safeTimezone: string,
  ): Promise<{
    x: string[]
    pageviews: number[]
    customEvents: number[]
    errors: number[]
  }> {
    const timeBucketFunc =
      timeBucketConversion[timeBucket] || timeBucketConversion.day

    const queryPageviews = `
      SELECT
        ${timeBucketFunc}(toTimeZone(created, {timezone:String})) AS time,
        count() AS count
      FROM analytics
      WHERE pid = {pid:FixedString(12)}
        AND profileId = {profileId:String}
        AND created BETWEEN {from:String} AND {to:String}
      GROUP BY time
      ORDER BY time ASC
    `

    const queryEvents = `
      SELECT
        ${timeBucketFunc}(toTimeZone(created, {timezone:String})) AS time,
        count() AS count
      FROM customEV
      WHERE pid = {pid:FixedString(12)}
        AND profileId = {profileId:String}
        AND created BETWEEN {from:String} AND {to:String}
      GROUP BY time
      ORDER BY time ASC
    `

    const queryErrors = `
      SELECT
        ${timeBucketFunc}(toTimeZone(created, {timezone:String})) AS time,
        count() AS count
      FROM errors
      WHERE pid = {pid:FixedString(12)}
        AND profileId = {profileId:String}
        AND created BETWEEN {from:String} AND {to:String}
      GROUP BY time
      ORDER BY time ASC
    `

    const params = { pid, profileId, from, to, timezone: safeTimezone }

    const [pageviewsResult, eventsResult, errorsResult] = await Promise.all([
      clickhouse
        .query({ query: queryPageviews, query_params: params })
        .then((resultSet) => resultSet.json()),
      clickhouse
        .query({ query: queryEvents, query_params: params })
        .then((resultSet) => resultSet.json()),
      clickhouse
        .query({ query: queryErrors, query_params: params })
        .then((resultSet) => resultSet.json()),
    ])

    // Merge all timestamps and create aligned data
    const allTimes = new Set<string>()
    const pageviewsMap = new Map<string, number>()
    const eventsMap = new Map<string, number>()
    const errorsMap = new Map<string, number>()

    for (const row of pageviewsResult.data as {
      time: string
      count: number
    }[]) {
      allTimes.add(row.time)
      pageviewsMap.set(row.time, Number(row.count))
    }

    for (const row of eventsResult.data as {
      time: string
      count: number
    }[]) {
      allTimes.add(row.time)
      eventsMap.set(row.time, Number(row.count))
    }

    for (const row of errorsResult.data as {
      time: string
      count: number
    }[]) {
      allTimes.add(row.time)
      errorsMap.set(row.time, Number(row.count))
    }

    const sortedTimes = Array.from(allTimes).sort()

    return {
      x: sortedTimes,
      pageviews: sortedTimes.map((t) => pageviewsMap.get(t) || 0),
      customEvents: sortedTimes.map((t) => eventsMap.get(t) || 0),
      errors: sortedTimes.map((t) => errorsMap.get(t) || 0),
    }
  }

  async getProfileSessionsList(
    pid: string,
    profileId: string,
    filtersQuery: string,
    paramsData: any,
    safeTimezone: string,
    take = 30,
    skip = 0,
  ): Promise<object[]> {
    const query = `
      WITH all_profile_events AS (
        SELECT
          CAST(psid, 'String') AS psidCasted,
          pid,
          profileId,
          cc,
          os,
          br,
          toTimeZone(created, {timezone:String}) AS created_tz
        FROM analytics
        WHERE pid = {pid:FixedString(12)}
          AND profileId = {profileId:String}
          AND psid IS NOT NULL
          AND created BETWEEN {groupFrom:String} AND {groupTo:String}
          ${filtersQuery}
        UNION ALL
        SELECT
          CAST(psid, 'String') AS psidCasted,
          pid,
          profileId,
          cc,
          os,
          br,
          toTimeZone(created, {timezone:String}) AS created_tz
        FROM customEV
        WHERE pid = {pid:FixedString(12)}
          AND profileId = {profileId:String}
          AND psid IS NOT NULL
          AND created BETWEEN {groupFrom:String} AND {groupTo:String}
          ${filtersQuery}
      ),
      profile_sessions AS (
        SELECT
          psidCasted,
          pid,
          profileId,
          any(cc) AS cc_agg,
          any(os) AS os_agg,
          any(br) AS br_agg,
          min(created_tz) AS sessionStart,
          max(created_tz) AS lastActivity
        FROM all_profile_events
        GROUP BY psidCasted, pid, profileId
      ),
      pageview_counts AS (
        SELECT
          CAST(psid, 'String') AS psidCasted,
          pid,
          count() as count
        FROM analytics
        WHERE pid = {pid:FixedString(12)}
          AND profileId = {profileId:String}
          AND psid IS NOT NULL
          AND created BETWEEN {groupFrom:String} AND {groupTo:String}
        GROUP BY psidCasted, pid
      ),
      event_counts AS (
        SELECT
          CAST(psid, 'String') AS psidCasted,
          pid,
          count() as count
        FROM customEV
        WHERE pid = {pid:FixedString(12)}
          AND profileId = {profileId:String}
          AND psid IS NOT NULL
          AND created BETWEEN {groupFrom:String} AND {groupTo:String}
        GROUP BY psidCasted, pid
      ),
      error_counts AS (
        SELECT
          CAST(psid, 'String') AS psidCasted,
          pid,
          count() as count
        FROM errors
        WHERE pid = {pid:FixedString(12)}
          AND profileId = {profileId:String}
          AND psid IS NOT NULL
          AND created BETWEEN {groupFrom:String} AND {groupTo:String}
        GROUP BY psidCasted, pid
      ),
      session_duration_agg AS (
        SELECT
          CAST(psid, 'String') AS psidCasted,
          pid,
          dateDiff('second', min(firstSeen), max(lastSeen)) as avg_duration
        FROM sessions
        WHERE pid = {pid:FixedString(12)}
          AND profileId = {profileId:String}
        GROUP BY psidCasted, pid
      )
      SELECT
        ps.psidCasted AS psid,
        ps.cc_agg AS cc,
        ps.os_agg AS os,
        ps.br_agg AS br,
        COALESCE(pc.count, 0) AS pageviews,
        COALESCE(ec.count, 0) AS customEvents,
        COALESCE(errc.count, 0) AS errors,
        ps.sessionStart,
        ps.lastActivity,
        if(dateDiff('second', ps.lastActivity, now()) < ${LIVE_SESSION_THRESHOLD_SECONDS}, 1, 0) AS isLive,
        sda.avg_duration AS sdur
      FROM profile_sessions ps
      LEFT JOIN pageview_counts pc ON ps.psidCasted = pc.psidCasted AND ps.pid = pc.pid
      LEFT JOIN event_counts ec ON ps.psidCasted = ec.psidCasted AND ps.pid = ec.pid
      LEFT JOIN error_counts errc ON ps.psidCasted = errc.psidCasted AND ps.pid = errc.pid
      LEFT JOIN session_duration_agg sda ON ps.psidCasted = sda.psidCasted AND ps.pid = sda.pid
      WHERE ps.psidCasted IS NOT NULL
      ORDER BY ps.sessionStart DESC
      LIMIT {take:UInt32}
      OFFSET {skip:UInt32}
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: {
          pid,
          profileId,
          ...paramsData.params,
          timezone: safeTimezone,
          take,
          skip,
        },
      })
      .then((resultSet) => resultSet.json())

    return data as object[]
  }

  async getErrorsList(
    options: string,
    filtersQuery: string,
    paramsData: any,
    safeTimezone: string,
    take = 30,
    skip = 0,
  ): Promise<object | void> {
    let parsedOptions: {
      showResolved?: boolean
    } = {}

    try {
      parsedOptions = JSON.parse(options)
    } catch {
      console.error('[getErrorsList] Failed to parse options:', options)
    }

    const query = `
      SELECT
        eid,
        any(name) as name,
        any(message) as message,
        any(filename) as filename,
        count(*) as count,
        max(created) as last_seen,
        count(DISTINCT profileId) as users,
        count(DISTINCT psid) as sessions,
        status.status
      FROM (
        SELECT eid, name, message, filename, psid, profileId, toTimeZone(errors.created, {timezone:String}) AS created
        FROM errors
        WHERE pid = {pid:FixedString(12)}
          AND errors.created BETWEEN {groupFrom:String} AND {groupTo:String}
          ${filtersQuery}
      ) AS errors
      LEFT JOIN (
        SELECT
          eid,
          argMax(status, updated) AS status
        FROM error_statuses
        WHERE pid = {pid:FixedString(12)}
        GROUP BY eid
      ) AS status ON errors.eid = status.eid
      ${
        parsedOptions?.showResolved
          ? ''
          : "WHERE status.status = 'active' OR status.status = 'regressed'"
      }
      GROUP BY errors.eid, status.status
      ORDER BY last_seen DESC
      LIMIT {take:UInt32}
      OFFSET {skip:UInt32};
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: {
          ...paramsData.params,
          timezone: safeTimezone,
          take,
          skip,
        },
      })
      .then((resultSet) => resultSet.json())

    return data
  }

  async getErrorDetails(
    pid: string,
    eid: string,
    safeTimezone: string,
    groupFrom: string,
    groupTo: string,
    timeBucket: any,
  ): Promise<any> {
    const queryErrorDetails = `
      SELECT
        subquery.eid,
        any(subquery.name) AS name,
        any(subquery.message) AS message,
        any(subquery.filename) AS filename,
        any(subquery.colno) AS colno,
        any(subquery.lineno) AS lineno,
        any(subquery.stackTrace) AS stackTrace,
        count(*) AS count,
        status.status
      FROM (
        SELECT
          eid,
          name,
          message,
          filename,
          colno,
          lineno,
          stackTrace
        FROM errors
        WHERE pid = {pid:FixedString(12)}
          AND eid = {eid:FixedString(32)}
          AND created BETWEEN {groupFrom:String} AND {groupTo:String}
        ORDER BY created DESC
        LIMIT 1 BY eid
      ) AS subquery
      LEFT JOIN (
        SELECT
          eid,
          argMax(status, updated) AS status
        FROM error_statuses
        WHERE pid = {pid:FixedString(12)}
          AND eid = {eid:FixedString(32)}
        GROUP BY eid
      ) AS status ON subquery.eid = status.eid
      GROUP BY subquery.eid, status.status;
    `

    const queryFirstLastSeen = `
      SELECT
        max(created) AS last_seen,
        min(created) AS first_seen,
        count() AS count
      FROM errors
      WHERE
        pid = {pid:FixedString(12)}
        AND eid = {eid:FixedString(32)};
    `

    const queryMetadata = `
      SELECT
        meta.key AS key,
        meta.value AS value,
        count() AS count
      FROM (
        SELECT
          meta.key,
          meta.value
        FROM errors
        WHERE
          pid = {pid:FixedString(12)}
          AND eid = {eid:FixedString(32)}
          AND created BETWEEN {groupFrom:String} AND {groupTo:String}
      )
      ARRAY JOIN meta.key, meta.value
      WHERE meta.key != '' AND meta.value != ''
      GROUP BY key, value
      ORDER BY count DESC
    `

    const paramsData = {
      params: {
        pid,
        eid,
        groupFrom,
        groupTo,
      },
    }

    const [details, occurenceDetails, metadata] = await Promise.all([
      clickhouse
        .query({
          query: queryErrorDetails,
          query_params: paramsData.params,
        })
        .then((resultSet) => resultSet.json<any>())
        .then(({ data }) => data[0]),
      clickhouse
        .query({
          query: queryFirstLastSeen,
          query_params: paramsData.params,
        })
        .then((resultSet) => resultSet.json<any>())
        .then(({ data }) => data[0]),
      clickhouse
        .query({
          query: queryMetadata,
          query_params: paramsData.params,
        })
        .then((resultSet) => resultSet.json<IAggregatedMetadata>())
        .then(({ data }) => data),
    ])

    const groupedChart = await this.groupErrorsByTimeBucket(
      timeBucket,
      groupFrom,
      groupTo,
      `FROM errors WHERE eid = {eid:FixedString(32)} AND created BETWEEN {groupFrom:String} AND {groupTo:String}`,
      'AND eid = {eid:FixedString(32)}',
      paramsData,
      safeTimezone,
      ChartRenderMode.PERIODICAL,
    )

    return {
      details: {
        ...details,
        ...occurenceDetails,
      },
      metadata,
      ...groupedChart,
      timeBucket,
    }
  }

  async getErrorOverview(
    pid: string,
    filtersQuery: string,
    paramsData: any,
    safeTimezone: string,
    groupFrom: string,
    groupTo: string,
    timeBucket: string,
    showResolved: boolean,
  ): Promise<any> {
    const resolvedFilter = showResolved
      ? ''
      : "AND (status.status = 'active' OR status.status = 'regressed' OR status.status IS NULL)"

    // Get total sessions from analytics table for the time range
    const queryTotalSessions = `
      SELECT count(DISTINCT psid) as totalSessions
      FROM analytics
      WHERE pid = {pid:FixedString(12)}
        AND created BETWEEN {groupFrom:String} AND {groupTo:String}
    `

    // Get error stats: total errors, unique errors, affected sessions, affected users
    const queryErrorStats = `
      SELECT
        count(*) as totalErrors,
        count(DISTINCT eid) as uniqueErrors,
        count(DISTINCT psid) as affectedSessions,
        count(DISTINCT profileId) as affectedUsers
      FROM errors
      LEFT JOIN (
        SELECT eid, argMax(status, updated) AS status
        FROM error_statuses
        WHERE pid = {pid:FixedString(12)}
        GROUP BY eid
      ) AS status ON errors.eid = status.eid
      WHERE pid = {pid:FixedString(12)}
        AND created BETWEEN {groupFrom:String} AND {groupTo:String}
        ${filtersQuery}
        ${resolvedFilter}
    `

    // Get most frequent error
    const queryMostFrequentError = `
      SELECT
        errors.eid as eid,
        any(errors.name) as name,
        any(errors.message) as message,
        count(*) as count,
        count(DISTINCT errors.profileId) as usersAffected,
        max(errors.created) as lastSeen
      FROM errors
      LEFT JOIN (
        SELECT eid, argMax(status, updated) AS status
        FROM error_statuses
        WHERE pid = {pid:FixedString(12)}
        GROUP BY eid
      ) AS status ON errors.eid = status.eid
      WHERE errors.pid = {pid:FixedString(12)}
        AND errors.created BETWEEN {groupFrom:String} AND {groupTo:String}
        ${filtersQuery}
        ${resolvedFilter}
      GROUP BY errors.eid
      ORDER BY count DESC
      LIMIT 1
    `

    // Get chart data with affected users - use same pattern as other chart methods
    const timeBucketFunc =
      timeBucketConversion[timeBucket as keyof typeof timeBucketConversion] ||
      timeBucketConversion.day
    const [selector, groupBy] = this.getGroupSubquery(
      timeBucket as TimeBucketType,
    )
    const queryChart = `
      SELECT
        ${selector},
        count(*) as count,
        uniqExact(profileId) as affectedUsers
      FROM (
        SELECT
          profileId,
          ${timeBucketFunc}(toTimeZone(created, {timezone:String})) as tz_created
        FROM errors
        LEFT JOIN (
          SELECT eid, argMax(status, updated) AS status
          FROM error_statuses
          WHERE pid = {pid:FixedString(12)}
          GROUP BY eid
        ) AS status ON errors.eid = status.eid
        WHERE pid = {pid:FixedString(12)}
          AND created BETWEEN {groupFrom:String} AND {groupTo:String}
          ${filtersQuery}
          ${resolvedFilter}
      ) as subquery
      GROUP BY ${groupBy}
      ORDER BY ${groupBy}
    `

    const paramsWithTimezone = {
      ...paramsData.params,
      timezone: safeTimezone,
    }

    const [
      totalSessionsResult,
      errorStatsResult,
      mostFrequentResult,
      chartResult,
    ] = await Promise.all([
      clickhouse
        .query({
          query: queryTotalSessions,
          query_params: paramsData.params,
        })
        .then((resultSet) => resultSet.json<any>())
        .then(({ data }) => data[0]),
      clickhouse
        .query({
          query: queryErrorStats,
          query_params: paramsWithTimezone,
        })
        .then((resultSet) => resultSet.json<any>())
        .then(({ data }) => data[0]),
      clickhouse
        .query({
          query: queryMostFrequentError,
          query_params: paramsWithTimezone,
        })
        .then((resultSet) => resultSet.json<any>())
        .then(({ data }) => data[0] || null),
      clickhouse
        .query({
          query: queryChart,
          query_params: paramsWithTimezone,
        })
        .then((resultSet) => resultSet.json<any>())
        .then(({ data }) => data),
    ])

    // Process chart data using same pattern as extractErrorsChartData
    const { x, format } = this.generateUTCXAxis(
      timeBucket as TimeBucketType,
      groupFrom,
      groupTo,
    )
    const occurrences = Array(x.length).fill(0)
    const affectedUsersChart = Array(x.length).fill(0)

    for (const row of chartResult) {
      const dateString = this.generateDateString(row)
      const index = x.indexOf(dateString)
      if (index !== -1) {
        occurrences[index] = Number(row.count) || 0
        affectedUsersChart[index] = Number(row.affectedUsers) || 0
      }
    }

    const errorRate =
      totalSessionsResult?.totalSessions > 0
        ? (Number(errorStatsResult?.affectedSessions || 0) /
            Number(totalSessionsResult.totalSessions)) *
          100
        : 0

    return {
      stats: {
        totalErrors: Number(errorStatsResult?.totalErrors || 0),
        uniqueErrors: Number(errorStatsResult?.uniqueErrors || 0),
        affectedSessions: Number(errorStatsResult?.affectedSessions || 0),
        affectedUsers: Number(errorStatsResult?.affectedUsers || 0),
        errorRate: Math.round(errorRate * 100) / 100,
      },
      mostFrequentError: mostFrequentResult
        ? {
            eid: mostFrequentResult.eid,
            name: mostFrequentResult.name,
            message: mostFrequentResult.message,
            count: Number(mostFrequentResult.count),
            usersAffected: Number(mostFrequentResult.usersAffected),
            lastSeen: mostFrequentResult.lastSeen,
          }
        : null,
      chart: {
        x: this.shiftToTimezone(x, safeTimezone, format),
        occurrences,
        affectedUsers: affectedUsersChart,
      },
      timeBucket,
    }
  }

  async getErrorAffectedSessions(
    pid: string,
    eid: string,
    groupFrom: string,
    groupTo: string,
    take: number = 10,
    skip: number = 0,
  ): Promise<{ sessions: any[]; total: number }> {
    const queryCount = `
      SELECT count(DISTINCT psid) as total
      FROM errors
      WHERE pid = {pid:FixedString(12)}
        AND eid = {eid:FixedString(32)}
        AND created BETWEEN {groupFrom:String} AND {groupTo:String}
    `

    const querySessions = `
      SELECT DISTINCT
        CAST(errors.psid, 'String') as psid,
        any(errors.profileId) as profileId,
        any(analytics.cc) as cc,
        any(analytics.br) as br,
        any(analytics.os) as os,
        min(errors.created) as firstErrorAt,
        max(errors.created) as lastErrorAt,
        count(*) as errorCount
      FROM errors
      LEFT JOIN analytics ON errors.psid = analytics.psid AND errors.pid = analytics.pid
      WHERE errors.pid = {pid:FixedString(12)}
        AND errors.eid = {eid:FixedString(32)}
        AND errors.created BETWEEN {groupFrom:String} AND {groupTo:String}
      GROUP BY errors.psid
      ORDER BY lastErrorAt DESC
      LIMIT {take:UInt32}
      OFFSET {skip:UInt32}
    `

    const params = { pid, eid, groupFrom, groupTo, take, skip }

    const [countResult, sessionsResult] = await Promise.all([
      clickhouse
        .query({ query: queryCount, query_params: params })
        .then((resultSet) => resultSet.json<any>())
        .then(({ data }) => data[0]),
      clickhouse
        .query({ query: querySessions, query_params: params })
        .then((resultSet) => resultSet.json<any>())
        .then(({ data }) => data),
    ])

    return {
      sessions: sessionsResult,
      total: Number(countResult?.total || 0),
    }
  }

  getErrorID(errorDTO: ErrorDto): string {
    const { name, message, colno, lineno, filename } = errorDTO

    return hash(`${name}${message}${colno}${lineno}${filename}`).substring(
      0,
      32,
    )
  }

  async validateEIDs(eids: string[], pid: string) {
    const params = _reduce(
      eids,
      (acc, curr, index) => ({
        ...acc,
        [`e_${index}`]: curr,
      }),
      {},
    )

    const query = `SELECT count(DISTINCT eid) as count FROM errors WHERE pid = {pid:FixedString(12)} AND eid IN (${_map(
      params,
      (val, key) => `{${key}:FixedString(32)}`,
    ).join(', ')})`

    let result

    try {
      result = (
        await clickhouse
          .query({
            query,
            query_params: { ...params, pid },
          })
          .then((resultSet) => resultSet.json())
          .then(({ data }) => data)
      )[0]
    } catch (reason) {
      console.error('validateEIDs - clickhouse request error')
      console.error(reason)
      throw new InternalServerErrorException(
        'Error occured while validating error IDs',
      )
    }

    if (result.count !== _size(eids)) {
      throw new UnprocessableEntityException(
        'Some of the error IDs you provided are not valid (do not exist in our database)',
      )
    }
  }

  async updateEIDStatus(
    eids: string[],
    status: 'resolved' | 'active',
    pid: string,
  ) {
    const values = _reduce(
      eids,
      (acc, curr) => [
        ...acc,
        {
          eid: curr,
          status,
          pid,
        },
      ],
      [],
    )

    try {
      await clickhouse.insert({
        table: 'error_statuses',
        format: 'JSONEachRow',
        values: [values],
      })
    } catch (reason) {
      console.error('Error at PATCH error-status:')
      console.error(reason)
      throw new InternalServerErrorException(
        'Error occured while updating error status',
      )
    }
  }

  checkIfPerfMeasureIsValid(measure: PerfMeasure) {
    const validMeasures = ['average', 'median', 'p95', 'p75', 'quantiles']

    if (!_includes(validMeasures, measure)) {
      throw new UnprocessableEntityException(
        `Please provide a valid "measure" parameter, it must be one of ${validMeasures}`,
      )
    }
  }

  async getGeneralStats(): Promise<{
    users: number
    trials: number
    projects: number
    events: number
  }> {
    const query = `
      SELECT 'traffic' AS type, count(*) AS count FROM analytics
      UNION ALL
      SELECT 'customEV' AS type, count(*) AS count FROM customEV
      UNION ALL
      SELECT 'performance' AS type, count(*) AS count FROM performance
      UNION ALL
      SELECT 'captcha' AS type, count(*) AS count FROM captcha
      UNION ALL
      SELECT 'errors' AS type, count(*) AS count FROM errors
    `

    const users = await this.userService.count({
      where: {
        planCode: Not(In([PlanCode.free, PlanCode.trial, PlanCode.none])),
      },
    })
    const trials = await this.userService.count()
    const projects = await this.projectService.count()
    const { data } = await clickhouse
      .query({
        query,
      })
      .then((resultSet) => resultSet.json())

    // @ts-expect-error
    const events = data.reduce((total, row) => total + row.count, 0) as number

    await redis.set(REDIS_USERS_COUNT_KEY, users, 'EX', 630)
    await redis.set(REDIS_TRIALS_COUNT_KEY, trials, 'EX', 630)
    await redis.set(REDIS_PROJECTS_COUNT_KEY, projects, 'EX', 630)
    await redis.set(REDIS_EVENTS_COUNT_KEY, events, 'EX', 630)

    return {
      users,
      trials,
      projects,
      events,
    }
  }

  async getMetaResults(
    pid: string,
    customEvents: ProjectViewCustomEventDto[],
    filtersQuery: string,
    paramsData: any,
    timezone: string,
    period?: string,
    from?: string,
    to?: string,
  ) {
    let _from = from

    let _to = to

    if (_isEmpty(period) || ['today', 'yesterday', 'custom'].includes(period)) {
      const safeTimezone = this.getSafeTimezone(timezone)

      const { groupFrom, groupTo } = this.getGroupFromTo(
        from,
        to,
        ['today', 'yesterday'].includes(period) ? TimeBucketType.HOUR : null,
        period,
        safeTimezone,
      )

      _from = groupFrom
      _to = groupTo
    }

    const results = []

    await Promise.all(
      customEvents.map(async (event) => {
        const result = await this.getMetaResult(
          pid,
          event,
          filtersQuery,
          paramsData,
          period,
          _from,
          _to,
        )
        results.push(result)
      }),
    )

    return results.filter((r) => !!r)
  }

  async getMetaResult(
    pid: string,
    metric: ProjectViewCustomEventDto,
    filtersQuery: string,
    paramsData: any,
    period?: string,
    from?: string,
    to?: string,
  ) {
    if (metric.metaValueType === ProjectViewCustomEventMetaValueType.STRING) {
      return undefined
    }

    const paramsKeys = ['customEventName', 'metaKey', 'metaValue', 'metricKey']

    const aggFunction =
      metric.metaValueType === ProjectViewCustomEventMetaValueType.INTEGER
        ? 'toInt32OrZero(value)'
        : 'toFloat32OrZero(value)'

    let kvQuery = ''

    if (metric.metaKey && metric.metaValue) {
      kvQuery = `AND (
        indexOf(meta.key, {metaKey:String}) > 0
        AND meta.value[indexOf(meta.key, {metaKey:String})] = {metaValue:String}
      )`
    } else if (metric.metaKey) {
      kvQuery = `AND indexOf(meta.key, {metaKey:String}) > 0`
    } else if (metric.metaValue) {
      kvQuery = `AND indexOf(meta.value, {metaValue:String}) > 0`
    }

    const queryCurrent = `
      SELECT
        1 AS sortOrder,
        key,
        round(sum(${aggFunction}), 2) AS sum,
        round(avg(${aggFunction}), 2) AS avg
      FROM customEV
      ARRAY JOIN meta.key AS key, meta.value AS value
      WHERE
        pid = {pid:FixedString(12)}
        AND key = {metricKey:String}
        AND ev = {customEventName:String}
        AND created BETWEEN {periodFormatted:String} AND {now:String}
        ${kvQuery}
        ${filtersQuery}
      GROUP BY key
    `

    const queryPrevious = `
      SELECT
        2 AS sortOrder,
        key,
        round(sum(${aggFunction}), 2) AS sum,
        round(avg(${aggFunction}), 2) AS avg
      FROM customEV
      ARRAY JOIN meta.key AS key, meta.value AS value
      WHERE
        pid = {pid:FixedString(12)}
        AND key = {metricKey:String}
        AND ev = {customEventName:String}
        AND created BETWEEN {periodSubtracted:String} AND {periodFormatted:String}
        ${kvQuery}
        ${filtersQuery}
      GROUP BY key
    `

    let now
    let periodFormatted
    let periodSubtracted

    if (period !== 'all') {
      if (from && to) {
        // diff may be 0 (when selecting data for 1 day), so let's make it 1 to grab some data for the prev day as well
        const diff = dayjs(to).diff(dayjs(from), 'days') || 1

        now = to
        periodFormatted = from
        periodSubtracted = dayjs(from)
          .subtract(diff, 'days')
          .format('YYYY-MM-DD HH:mm:ss')
      } else {
        const amountToSubtract = parseInt(period, 10)
        const unit = _replace(period, /[0-9]/g, '') as dayjs.ManipulateType

        now = dayjs.utc().format('YYYY-MM-DD HH:mm:ss')
        const periodRaw = dayjs.utc().subtract(amountToSubtract, unit)
        periodFormatted = periodRaw.format('YYYY-MM-DD HH:mm:ss')
        periodSubtracted = periodRaw
          .subtract(amountToSubtract, unit)
          .format('YYYY-MM-DD HH:mm:ss')
      }
    }

    const params = {
      pid,
      ...paramsKeys.reduce(
        (acc, curr) => ({
          ...acc,
          [curr]: metric[curr],
        }),
        {},
      ),
      now,
      periodFormatted,
      periodSubtracted,
      ...paramsData.params,
    }

    try {
      let { data } = await clickhouse
        .query({
          query: `${queryCurrent} UNION ALL ${queryPrevious}`,
          query_params: params,
        })
        .then((resultSet) =>
          resultSet.json<{
            sortOrder: 1 | 2
            key: string
            sum: number
            avg: number
          }>(),
        )

      data = _sortBy(data, 'sortOrder')

      const currentPeriod = data[0]
      const previousPeriod = data[1]

      if (!currentPeriod) {
        return undefined
      }

      return {
        key: currentPeriod.key,
        current: {
          sum: currentPeriod.sum || 0,
          avg: currentPeriod.avg || 0,
        },
        previous: {
          sum: previousPeriod?.sum || 0,
          avg: previousPeriod?.avg || 0,
        },
      }
    } catch (reason) {
      console.error('[ERROR] (getMetaResult) - Clickhouse query error:')
      console.error(reason)
      throw new InternalServerErrorException(
        'Error occurred while fetching meta results',
      )
    }
  }
}

import crypto from 'crypto'
import _isEmpty from 'lodash/isEmpty'
import _split from 'lodash/split'
import _reverse from 'lodash/reverse'
import _size from 'lodash/size'
import _includes from 'lodash/includes'
import _map from 'lodash/map'
import _head from 'lodash/head'
import _toUpper from 'lodash/toUpper'
import _sortBy from 'lodash/sortBy'
import _join from 'lodash/join'
import _replace from 'lodash/replace'
import _last from 'lodash/last'
import _some from 'lodash/some'
import _find from 'lodash/find'
import _isArray from 'lodash/isArray'
import _startsWith from 'lodash/startsWith'
import _reduce from 'lodash/reduce'
import _keys from 'lodash/keys'
import _values from 'lodash/values'
import _round from 'lodash/round'
import _filter from 'lodash/filter'
import _isString from 'lodash/isString'
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
  UnprocessableEntityException,
  PreconditionFailedException,
  Logger,
} from '@nestjs/common'
import { isbot } from 'isbot'

import { DEFAULT_TIMEZONE } from '../user/entities/user.entity'
import {
  redis,
  UNIQUE_SESSION_LIFE_TIME,
  TRAFFIC_COLUMNS,
  PERFORMANCE_COLUMNS,
  ERROR_COLUMNS,
  MIN_PAGES_IN_FUNNEL,
  MAX_PAGES_IN_FUNNEL,
  ALL_COLUMNS,
  TRAFFIC_METAKEY_COLUMNS,
} from '../common/constants'
import { SaltService } from './salt.service'
import { clickhouse } from '../common/integrations/clickhouse'
import { getDomainsForRefName } from './utils/referrers.map'
import {
  getFunnelClickhouse,
  hash,
  millisecondsToSeconds,
  sumArrays,
} from '../common/utils'
import { PageviewsDto } from './dto/pageviews.dto'
import { EventsDto } from './dto/events.dto'
import { ProjectService } from '../project/project.service'
import { BotsProtectionLevel, Project } from '../project/entity/project.entity'
import { GetCustomEventMetadata } from './dto/get-custom-event-meta.dto'
import { TimeBucketType, ChartRenderMode } from './dto/getData.dto'
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

const EXCLUDE_NULL_FOR = ['so', 'me', 'ca', 'te', 'co']

const generateParamsQuery = (
  col: string,
  subQuery: string,
  customEVFilterApplied: boolean,
  isPageInclusiveFilterSet: boolean,
  type: 'traffic' | 'performance' | 'errors',
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

    return `SELECT ${columnsQuery}, round(divide(${fn}(pageLoad), 1000), 2) as count ${subQuery} GROUP BY ${columnsQuery}`
  }

  if (type === 'errors') {
    return `SELECT ${columnsQuery}, count(*) as count ${subQuery} GROUP BY ${columnsQuery}`
  }

  if (customEVFilterApplied) {
    return `SELECT ${columnsQuery}, count(*) as count ${subQuery} GROUP BY ${columnsQuery}`
  }

  if (col === 'pg' || col === 'host') {
    return `SELECT ${columnsQuery}, count(*) as count ${subQuery} GROUP BY ${columnsQuery}`
  }

  if (isPageInclusiveFilterSet) {
    return `SELECT ${columnsQuery}, count(*) as count ${subQuery} GROUP BY ${columnsQuery}`
  }

  return `SELECT ${columnsQuery}, count(DISTINCT psid) as count ${subQuery} ${EXCLUDE_NULL_FOR.includes(col) ? `AND ${col} IS NOT NULL` : ''} GROUP BY ${columnsQuery}`
}

export enum DataType {
  ANALYTICS = 'analytics',
  PERFORMANCE = 'performance',
  ERRORS = 'errors',
}

const isValidOrigin = (origins: string[], origin: string) => {
  for (let i = 0; i < _size(origins); ++i) {
    const allowedOrigin = origins[i]

    // Check if the allowedOrigin is an exact match
    if (allowedOrigin === origin) {
      return true
    }

    // Check if the allowedOrigin contains a wildcard
    if (_includes(allowedOrigin, '*')) {
      // Escape the wildcard character for use in a regular expression
      const wildcardRegex = new RegExp(allowedOrigin.replace(/\*/g, '.*'))

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
  private readonly logger = new Logger(AnalyticsService.name)

  static readonly PROFILE_PREFIX_ANON = 'anon_'
  static readonly PROFILE_PREFIX_USER = 'usr_'

  constructor(
    private readonly projectService: ProjectService,
    private readonly saltService: SaltService,
  ) {}

  async checkProjectAccess(
    pid: string,
    uid: string | null,
    password: string | null,
  ): Promise<void> {
    const project = await this.projectService.getRedisProject(pid)
    this.projectService.allowedToView(project, uid, password)
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

  async validate(
    logDTO: PageviewsDto | EventsDto | ErrorDto,
    origin: string,
    ip?: string,
  ): Promise<Project> {
    if (_isEmpty(logDTO)) {
      throw new BadRequestException('The request cannot be empty')
    }

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

    this.checkOrigin(project, origin)

    return project
  }

  async validateHeartbeat(
    logDTO: PageviewsDto,
    origin: string,
    ip?: string,
  ): Promise<Project> {
    if (_isEmpty(logDTO)) {
      throw new BadRequestException('The request cannot be empty')
    }

    const { pid } = logDTO

    const project = await this.projectService.getRedisProject(pid)

    this.checkIpBlacklist(project, ip)

    if (!project.active) {
      throw new BadRequestException(
        'Incoming analytics is disabled for this project',
      )
    }

    this.checkOrigin(project, origin)

    return project
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
      .then(resultSet => resultSet.json())

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
      .then(resultSet => resultSet.json<Record<string, string>[]>())

    return data.map(row => ({
      name: row[column],
      version: row[safeVersionCol],
    }))
  }

  getDataTypeColumns(dataType: DataType): string[] {
    if (dataType === DataType.ANALYTICS) {
      return TRAFFIC_COLUMNS
    }

    if (dataType === DataType.ERRORS) {
      return ERROR_COLUMNS
    }

    return PERFORMANCE_COLUMNS
  }

  getGroupFromTo(
    from: string,
    to: string,
    timeBucket: TimeBucketType | null,
    period: string,
    safeTimezone: string,
    diff?: number,
    checkTimebucket = true,
  ): IGetGroupFromTo {
    let groupFrom: dayjs.Dayjs
    let groupTo: dayjs.Dayjs
    let groupFromUTC: string
    let groupToUTC: string
    const formatFrom = 'YYYY-MM-DD HH:mm:ss'
    const formatTo = 'YYYY-MM-DD HH:mm:ss'
    const djsNow = _includes(GMT_0_TIMEZONES, safeTimezone)
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

    return links.filter(link => {
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
      .then(res => res.json<IUserFlowLink>())

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
      const funnel = this.projectService.formatFunnelFromClickhouse(
        await getFunnelClickhouse(projectId, funnelId),
      )

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

      if (_some(pages, page => !_isString(page))) {
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
      .then(res => res.json<{ firstCreated?: string }>())

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
          const filterArray = _map(filter, f => ({
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
          column !== 'refn' &&
          !_includes(TRAFFIC_METAKEY_COLUMNS, column) &&
          !_startsWith(column, 'tag:key:') &&
          column !== 'entryPage' &&
          column !== 'exitPage'
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
          const combined = parts.map(p => `(${p})`).join(' OR ')
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
        if (_startsWith(column, 'ev:key:') || _startsWith(column, 'tag:key:')) {
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
        if (column === 'ev:key' || column === 'tag:key') {
          sqlColumn = 'meta.key'
          isArrayDataset = true
          // meta.value filters for page properties and custom event metadata
          // e.g. "Andrii" ("author" value)
        } else if (column === 'ev:value' || column === 'tag:value') {
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
            ? `indexOf(${sqlColumn}, {${param}:String}) ${
                isExclusive ? '=' : '>'
              } 0`
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
    const salt = await this.saltService.getSaltForProject(pid)
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
    const salt = await this.saltService.getSaltForProject(pid)
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
        SELECT firstSeen
        FROM sessions FINAL
        WHERE psid = {psid:UInt64}
          AND pid = {pid:FixedString(12)}
        LIMIT 1
      `

      const { data } = await clickhouse
        .query({
          query,
          query_params: { psid, pid },
        })
        .then(resultSet =>
          resultSet.json<{
            firstSeen: string
          }>(),
        )

      const existingSession = data[0]

      await clickhouse.insert({
        table: 'sessions',
        format: 'JSONEachRow',
        values: [
          {
            psid,
            pid,
            profileId,
            firstSeen: existingSession?.firstSeen ?? now,
            lastSeen: now,
          },
        ],
        clickhouse_settings: { async_insert: 1 },
      })
    } catch (error) {
      this.logger.error('Failed to record session:', error)
      throw error
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
    return _map(pages, value => ({
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
      .then(resultSet => resultSet.json<IFunnelCHResponse>())

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
      .then(resultSet => resultSet.json<{ c: number }>())

    return data[0]?.c || 0
  }

  async getAnalyticsSummary(
    pids: string[],
    timeBucket?: string,
    period?: string,
    from?: string,
    to?: string,
    timezone?: string,
    filters?: string,
  ): Promise<IOverall> {
    const safeTimezone = this.getSafeTimezone(timezone)

    const { groupFromUTC, groupToUTC } = this.getGroupFromTo(
      from,
      to,
      ['today', 'yesterday', 'custom'].includes(period)
        ? TimeBucketType.HOUR
        : (timeBucket as TimeBucketType) || TimeBucketType.DAY,
      period,
      safeTimezone,
      undefined,
      false,
    )

    const result = {}

    const [filtersQuery, filtersParams, , customEVFilterApplied] =
      this.getFiltersQuery(filters, DataType.ANALYTICS)

    const promises = pids.map(async pid => {
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
              SELECT avg(dateDiff('second', firstSeen, lastSeen)) as sdur
              FROM sessions FINAL
              WHERE pid = {pid:FixedString(12)}
            )
            SELECT
              analytics_counts.*,
              duration_avg.sdur
            FROM analytics_counts, duration_avg
          `

          if (customEVFilterApplied) {
            queryAll = `
              SELECT
                count(*) AS all
              FROM customEV
              WHERE
                pid = {pid:FixedString(12)}
                ${filtersQuery}
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
            .then(resultSet => resultSet.json<BirdseyeCHResponse>())

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
            SELECT avg(dateDiff('second', firstSeen, lastSeen)) as sdur
            FROM sessions FINAL
            WHERE pid = {pid:FixedString(12)}
            AND psid IN (
              SELECT DISTINCT psid
              FROM analytics
              WHERE pid = {pid:FixedString(12)}
              AND created BETWEEN {groupFromUTC:String} AND {groupToUTC:String}
              ${filtersQuery}
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
            SELECT avg(dateDiff('second', firstSeen, lastSeen)) as sdur
            FROM sessions FINAL
            WHERE pid = {pid:FixedString(12)}
            AND psid IN (
              SELECT DISTINCT psid
              FROM analytics
              WHERE pid = {pid:FixedString(12)}
              AND created BETWEEN {periodSubtracted:String} AND {groupFromUTC:String}
              ${filtersQuery}
            )
          )
          SELECT
            analytics_counts.*,
            duration_avg.sdur
          FROM analytics_counts, duration_avg
        `

        if (customEVFilterApplied) {
          queryCurrent = `
            SELECT 1 AS sortOrder, count(*) AS all
            FROM customEV
            WHERE
              pid = {pid:FixedString(12)}
              AND created BETWEEN {groupFromUTC:String} AND {groupToUTC:String}
              ${filtersQuery}
          `
          queryPrevious = `
            SELECT 2 AS sortOrder, count(*) AS all
            FROM customEV
            WHERE
              pid = {pid:FixedString(12)}
              AND created BETWEEN {periodSubtracted:String} AND {groupFromUTC:String}
              ${filtersQuery}
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
          .then(resultSet => resultSet.json<BirdseyeCHResponse>())

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

    if (_isEmpty(period) || period === 'custom') {
      const safeTimezone = this.getSafeTimezone(timezone)

      const { groupFrom, groupTo } = this.getGroupFromTo(
        from,
        to,
        null,
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
      .map(col => `${MEASURES_MAP[measure]}(${col}) as ${col}`)
      .join(', ')

    const promises = pids.map(async pid => {
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
            .then(resultSet => resultSet.json<Partial<PerformanceCHResponse>>())

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
          .then(resultSet => resultSet.json<Partial<PerformanceCHResponse>>())

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

    // Handle virtual columns
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
        .then(resultSet => resultSet.json<any>())

      return _map(data, 'page')
    }

    let query = `SELECT ${type} FROM analytics WHERE pid={pid:FixedString(12)} AND ${type} IS NOT NULL GROUP BY ${type}`

    if (type === 'ev') {
      query =
        'SELECT ev FROM customEV WHERE pid={pid:FixedString(12)} AND ev IS NOT NULL GROUP BY ev'
    }

    const { data } = await clickhouse
      .query({
        query,
        query_params: {
          pid,
        },
      })
      .then(resultSet => resultSet.json())

    return _map(data, type)
  }

  async generateParams(
    parsedFilters: Array<{ [key: string]: string }>,
    subQuery: string,
    customEVFilterApplied: boolean,
    paramsData: any,
    type: 'traffic' | 'performance' | 'errors',
    measure?: PerfMeasure,
  ) {
    // We need this to display all the pageview related data (e.g. country, browser) when user applies an inclusive filter on the Page column
    const isPageInclusiveFilterSet = ['captcha', 'performance'].includes(type)
      ? false
      : !_isEmpty(
          _find(
            parsedFilters,
            filter =>
              (filter.column === 'pg' || filter.column === 'host') &&
              !filter.isExclusive,
          ),
        )

    let columns = TRAFFIC_COLUMNS

    if (type === 'errors') {
      columns = ERROR_COLUMNS
    }

    if (type === 'performance') {
      columns = PERFORMANCE_COLUMNS
    }

    // Build a single query combining all metrics
    const withClauses = columns.map(col => {
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
          .map(col => {
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
      .then(resultSet => resultSet.json<any>())

    const params = Object.fromEntries(columns.map(col => [col, []]))

    const { length } = data

    for (let i = 0; i < length; ++i) {
      const row = data[i]

      const extras = {}
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

    let dateString = `${year}-${month < 10 ? `0${month}` : month}`

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
          dateDiff('second', firstSeen, lastSeen) as duration
        FROM sessions FINAL
        WHERE pid = {pid:FixedString(12)}
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
      .map(col => `${MEASURES_MAP[measure]}(${col}) as ${col}`)
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
      .map(col => `quantilesExactInclusive(0.5, 0.75, 0.95)(${col}) as ${col}`)
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
        count() as count
      FROM (
        SELECT pg, dv, br, os, lc, cc, rg, ct,
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

        if (!_some(_values(params), val => !_isEmpty(val))) {
          throw new BadRequestException(
            'There are no parameters for the specified time frames',
          )
        }
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
      .then(resultSet => resultSet.json<any>())

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
      .then(resultSet => resultSet.json<any>())

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
        .then(resultSet => resultSet.json<TrafficCEFilterCHResponse>())

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
      .then(resultSet => resultSet.json<TrafficCHResponse>())

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

  extractErrorsChartData(result, x: string[]): any {
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
        .then(resultSet => resultSet.json<any>()),
      clickhouse
        .query({
          query: customEventsQuery,
          query_params: queryParams,
        })
        .then(resultSet => resultSet.json<any>()),
      clickhouse
        .query({
          query: errorsQuery,
          query_params: queryParams,
        })
        .then(resultSet => resultSet.json<any>()),
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

    if (_some(pageviews, count => count > 0)) {
      chartOutput.pageviews = pageviews
    }

    if (_some(customEvents, count => count > 0)) {
      chartOutput.customEvents = customEvents
    }

    if (_some(errors, count => count > 0)) {
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

        if (!_some(_values(params), val => !_isEmpty(val))) {
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
          .then(resultSet => resultSet.json<TrafficCEFilterCHResponse>())
        const { count } = this.extractErrorsChartData(data, x)

        chart = {
          x: this.shiftToTimezone(x, safeTimezone, format),
          occurrences: count,
        }
      })(),
    ]

    await Promise.all(promises)

    return Promise.resolve({
      params,
      chart,
    })
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
        .then(resultSet => resultSet.json())

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
      .then(resultSet => resultSet.json<PerformanceCHResponse>())

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

        if (!_some(_values(params), val => !_isEmpty(val))) {
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
      .then(resultSet => resultSet.json<CustomsCHResponse>())
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
      .then(resultSet => resultSet.json<PropertiesCHResponse>())
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
        .then(resultSet => resultSet.json<IAggregatedMetadata>())

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
        .then(resultSet => resultSet.json<IAggregatedMetadata>())

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
        .then(resultSet => resultSet.json<{ count: string }>())

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
  ): Promise<object | void> {
    const { xShifted } = this.generateXAxis(timeBucket, from, to, safeTimezone)

    const timeBucketFunc = timeBucketConversion[timeBucket]
    const [selector, groupBy] = this.getGroupSubquery(timeBucket)
    const tzFromDate = `toTimeZone(parseDateTimeBestEffort({groupFrom:String}), {timezone:String})`
    const tzToDate = `toTimeZone(parseDateTimeBestEffort({groupTo:String}), {timezone:String})`

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
      ) as subquery
      GROUP BY ${groupBy}, ev
      ORDER BY ${groupBy}
      `

    const { data } = await clickhouse
      .query({
        query,
        query_params: { ...paramsData.params, timezone: safeTimezone },
      })
      .then(resultSet => resultSet.json<CustomsCHAggregatedResponse>())

    const events = this.extractCustomEventsChartData(data, xShifted)

    return Promise.resolve({
      chart: {
        x: xShifted,
        events,
      },
    })
  }

  getSafeNumber(value: number | undefined, defaultValue: number): number {
    if (typeof value === 'undefined' || Number.isNaN(value)) {
      return defaultValue
    }

    return value
  }

  processPageflow(pages: IPageflow[]) {
    if (_isEmpty(pages)) {
      return []
    }

    return _map(pages, (page: IPageflow) => {
      if (!page.metadata) {
        return page
      }

      return {
        ...page,
        metadata: _map(page.metadata, ([key, value]: [string, string]) => ({
          key,
          value,
        })),
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
          pg AS value,
          toTimeZone(analytics.created, {timezone:String}) AS created,
          pid,
          psid,
          groupArrayIf(tuple(meta.key, meta.value), notEmpty(meta.key) AND notEmpty(meta.value)) AS metadata
        FROM analytics
        LEFT ARRAY JOIN meta.key, meta.value
        WHERE
          pid = {pid:FixedString(12)}
          AND analytics.psid IS NOT NULL
          AND CAST(analytics.psid AS String) = {psid:String}
        GROUP BY type, value, created, pid, psid

        UNION ALL

        SELECT
          'event' AS type,
          ev AS value,
          toTimeZone(customEV.created, {timezone:String}) AS created,
          pid,
          psid,
          groupArrayIf(tuple(meta.key, meta.value), notEmpty(meta.key) AND notEmpty(meta.value)) AS metadata
        FROM customEV
        LEFT ARRAY JOIN meta.key, meta.value
        WHERE
          pid = {pid:FixedString(12)}
          AND customEV.psid IS NOT NULL
          AND CAST(customEV.psid AS String) = {psid:String}
        GROUP BY type, value, created, pid, psid
        
        UNION ALL

        SELECT
          'error' AS type,
          errors.name AS value,
          toTimeZone(errors.created, {timezone:String}) AS created,
          pid,
          psid,
          [
            tuple('message', COALESCE(errors.message, '')),
            tuple('lineno', CAST(COALESCE(errors.lineno, 0), 'String')),
            tuple('colno', CAST(COALESCE(errors.colno, 0), 'String')),
            tuple('filename', COALESCE(errors.filename, ''))
          ] AS metadata
        FROM errors
        WHERE
          pid = {pid:FixedString(12)}
          AND errors.psid IS NOT NULL
          AND CAST(errors.psid AS String) = {psid:String}
        GROUP BY type, value, created, pid, psid, errors.message, errors.lineno, errors.colno, errors.filename
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
        dv, br, brv, os, osv, lc, ref, so, me, ca, te, co, cc, rg, ct
      FROM analytics
      WHERE
        pid = {pid:FixedString(12)}
        AND CAST(psid, 'String') = {psid:String}
      ORDER BY created ASC
      LIMIT 1;
    `

    const querySessionDuration = `
      SELECT
        avg(dateDiff('second', firstSeen, lastSeen)) as duration
      FROM sessions FINAL
      WHERE
        pid = {pid:FixedString(12)}
        AND CAST(psid, 'String') = {psid:String}
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
      .then(resultSet => resultSet.json<IPageflow>())

    let details = (
      await clickhouse
        .query({
          query: querySessionDetails,
          query_params: paramsData.params,
        })
        .then(resultSet => resultSet.json())
        .then(({ data }) => data)
    )[0] as any

    const { duration = 0 } =
      (
        await clickhouse
          .query({
            query: querySessionDuration,
            query_params: paramsData.params,
          })
          .then(resultSet =>
            resultSet.json<{ duration: number }>().then(({ data }) => data),
          )
      )[0] || {}

    if (!details) {
      const querySessionDetailsBackup = `
        SELECT
          dv, br, brv, os, osv, lc, ref, so, me, ca, te, co, cc, rg, ct
        FROM analytics
        WHERE
          pid = {pid:FixedString(12)}
          AND CAST(psid, 'String') = {psid:String}
        LIMIT 1;
      `

      details = (
        await clickhouse
          .query({
            query: querySessionDetailsBackup,
            query_params: paramsData.params,
          })
          .then(resultSet => resultSet.json())
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
        "AND psid IS NOT NULL AND CAST(psid, 'String') = {psid:String}",
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
    const primaryEventsTable = customEVFilterApplied ? 'customEV' : 'analytics'

    const primaryEventsSubquery = `
      SELECT
        CAST(${primaryEventsTable}.psid, 'String') AS psidCasted,
        ${primaryEventsTable}.pid,
        ${primaryEventsTable}.cc,
        ${primaryEventsTable}.os,
        ${primaryEventsTable}.br,
        toTimeZone(${primaryEventsTable}.created, {timezone:String}) AS created_for_grouping
      FROM ${primaryEventsTable}
      WHERE
        ${primaryEventsTable}.pid = {pid:FixedString(12)}
        AND ${primaryEventsTable}.psid IS NOT NULL
        AND ${primaryEventsTable}.created BETWEEN {groupFrom:String} AND {groupTo:String}
        ${filtersQuery} 
    `

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
      session_duration_agg AS (
        SELECT 
          CAST(psid, 'String') AS psidCasted, 
          pid, 
          avg(dateDiff('second', firstSeen, lastSeen)) as avg_duration,
          any(profileId) as profileId
        FROM sessions FINAL
        WHERE pid = {pid:FixedString(12)}
        GROUP BY psidCasted, pid
      )
      SELECT
        dsf.psidCasted AS psid,
        dsf.cc,
        dsf.os,
        dsf.br,
        COALESCE(pc.count, 0) AS pageviews,
        COALESCE(ec.count, 0) AS customEvents,
        COALESCE(errc.count, 0) AS errors,
        dsf.sessionStart,
        dsf.lastActivity,
        if(dateDiff('second', dsf.lastActivity, now()) < ${LIVE_SESSION_THRESHOLD_SECONDS}, 1, 0) AS isLive,
        sda.avg_duration AS sdur,
        sda.profileId AS profileId,
        if(startsWith(sda.profileId, '${AnalyticsService.PROFILE_PREFIX_USER}'), 1, 0) AS isIdentified
      FROM distinct_sessions_filtered dsf
      LEFT JOIN pageview_counts pc ON dsf.psidCasted = pc.psidCasted AND dsf.pid = pc.pid
      LEFT JOIN event_counts ec ON dsf.psidCasted = ec.psidCasted AND dsf.pid = ec.pid
      LEFT JOIN error_counts errc ON dsf.psidCasted = errc.psidCasted AND dsf.pid = errc.pid
      LEFT JOIN session_duration_agg sda ON dsf.psidCasted = sda.psidCasted AND dsf.pid = sda.pid
      WHERE dsf.psidCasted IS NOT NULL
      ORDER BY dsf.sessionStart DESC
      LIMIT ${take}
      OFFSET ${skip}
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: { ...paramsData.params, timezone: safeTimezone },
      })
      .then(resultSet => resultSet.json())

    return data
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
        status.status
      FROM (
        SELECT eid, name, message, filename, toTimeZone(errors.created, {timezone:String}) AS created
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
      LIMIT ${take}
      OFFSET ${skip};
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: { ...paramsData.params, timezone: safeTimezone },
      })
      .then(resultSet => resultSet.json())

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
        min(created) AS first_seen
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
        .then(resultSet => resultSet.json<any>())
        .then(({ data }) => data[0]),
      clickhouse
        .query({
          query: queryFirstLastSeen,
          query_params: paramsData.params,
        })
        .then(resultSet => resultSet.json<any>())
        .then(({ data }) => data[0]),
      clickhouse
        .query({
          query: queryMetadata,
          query_params: paramsData.params,
        })
        .then(resultSet => resultSet.json<IAggregatedMetadata>())
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
          .then(resultSet => resultSet.json())
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
      customEvents.map(async event => {
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

    return results.filter(r => !!r)
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
        .then(resultSet =>
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

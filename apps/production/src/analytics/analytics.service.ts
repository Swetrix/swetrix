import * as crypto from 'crypto'
import * as _isEmpty from 'lodash/isEmpty'
import * as _split from 'lodash/split'
import * as _reverse from 'lodash/reverse'
import * as _size from 'lodash/size'
import * as _includes from 'lodash/includes'
import * as _map from 'lodash/map'
import * as _toUpper from 'lodash/toUpper'
import * as _head from 'lodash/head'
import * as _join from 'lodash/join'
import * as _isArray from 'lodash/isArray'
import * as _sortBy from 'lodash/sortBy'
import * as _reduce from 'lodash/reduce'
import * as _keys from 'lodash/keys'
import * as _last from 'lodash/last'
import * as _replace from 'lodash/replace'
import * as _some from 'lodash/some'
import * as _find from 'lodash/find'
import * as _now from 'lodash/now'
import * as _isString from 'lodash/isString'
import * as _values from 'lodash/values'
import * as _round from 'lodash/round'
import * as _filter from 'lodash/filter'
import * as dayjs from 'dayjs'
import * as utc from 'dayjs/plugin/utc'
import * as dayjsTimezone from 'dayjs/plugin/timezone'
import * as isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import * as ipRangeCheck from 'ip-range-check'
import validator from 'validator'
import { hash } from 'blake3'
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  HttpException,
  HttpStatus,
  UnprocessableEntityException,
  PreconditionFailedException,
} from '@nestjs/common'

import { DEFAULT_TIMEZONE } from '../user/entities/user.entity'
import {
  redis,
  isValidPID,
  UNIQUE_SESSION_LIFE_TIME,
  clickhouse,
  REDIS_SESSION_SALT_KEY,
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
} from '../common/constants'
import {
  calculateRelativePercentage,
  millisecondsToSeconds,
  sumArrays,
} from '../common/utils'
import { PageviewsDTO } from './dto/pageviews.dto'
import { EventsDTO } from './dto/events.dto'
import { ProjectService } from '../project/project.service'
import { UserService } from '../user/user.service'
import { Project } from '../project/entity/project.entity'
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
  IOverallCaptcha,
  IOverallPerformance,
  IPageflow,
  PerfMeasure,
} from './interfaces'
import { ErrorDTO } from './dto/error.dto'

dayjs.extend(utc)
dayjs.extend(dayjsTimezone)
dayjs.extend(isSameOrBefore)

export const getSessionKey = (ip: string, ua: string, pid: string, salt = '') =>
  `ses_${hash(`${ua}${ip}${pid}${salt}`).toString('hex')}`

export const getHeartbeatKey = (pid: string, sessionID: string) =>
  `hb:${pid}:${sessionID}`

const getSessionDurationKey = (sessionHash: string, pid: string) =>
  `sd:${sessionHash}:${pid}`

const GMT_0_TIMEZONES = [
  'Atlantic/Azores',
  'Etc/GMT',
  // 'Africa/Casablanca',
]

export const validPeriods = [
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
]

const MEASURES_MAP = {
  average: 'avg',
  median: 'median',
  p95: 'quantileExact(0.95)',
}

const validTimebuckets = [
  TimeBucketType.MINUTE,
  TimeBucketType.HOUR,
  TimeBucketType.DAY,
  TimeBucketType.MONTH,
  TimeBucketType.YEAR,
]

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
  { lt: 366, tb: [TimeBucketType.MONTH] }, // 12 months
  { lt: 732, tb: [TimeBucketType.MONTH] }, // 24 months
  { lt: 1464, tb: [TimeBucketType.MONTH, TimeBucketType.YEAR] }, // 48 months
  { lt: 99999, tb: [TimeBucketType.YEAR] },
]

// Smaller than 64 characters, must start with an English letter and contain only letters (a-z A-Z), numbers (0-9), underscores (_) and dots (.)
// eslint-disable-next-line no-useless-escape
const customEVvalidate = /^[a-zA-Z](?:[\w\.]){0,62}$/

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
    if (!_includes(validPeriods, period)) {
      throw new UnprocessableEntityException('The provided period is incorrect')
    }

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

const generateParamsQuery = (
  col: string,
  subQuery: string,
  customEVFilterApplied: boolean,
  isPageInclusiveFilterSet: boolean,
  type: 'traffic' | 'performance' | 'captcha' | 'errors',
  measure?: PerfMeasure,
): string => {
  let columns = [`${col} as name`]

  // For regions and cities we'll return an array of objects, that will also include the country code
  // We need the conutry code to display the flag next to the region/city name
  if (col === 'rg' || col === 'ct') {
    columns = [...columns, 'cc']
  }

  const columnsQuery = columns.join(', ')

  if (type === 'performance') {
    const processedMeasure = measure === 'quantiles' ? 'median' : measure

    const fn = MEASURES_MAP[processedMeasure]

    if (col === 'pg') {
      return `SELECT ${columnsQuery}, round(divide(${fn}(pageLoad), 1000), 2) as count ${subQuery} GROUP BY ${columnsQuery}`
    }

    return `SELECT ${columnsQuery}, round(divide(${fn}(pageLoad), 1000), 2) as count ${subQuery} AND ${col} IS NOT NULL GROUP BY ${columnsQuery}`
  }

  if (type === 'errors') {
    return `SELECT ${columnsQuery}, count(*) as count ${subQuery} AND ${col} IS NOT NULL GROUP BY ${columnsQuery}`
  }

  if (type === 'captcha') {
    return `SELECT ${columnsQuery}, count(*) as count ${subQuery} AND ${col} IS NOT NULL GROUP BY ${col}`
  }

  if (customEVFilterApplied) {
    return `SELECT ${columnsQuery}, count(*) as count ${subQuery} AND ${col} IS NOT NULL GROUP BY ${columnsQuery}`
  }

  if (col === 'pg') {
    return `SELECT ${columnsQuery}, count(*) as count ${subQuery} GROUP BY ${columnsQuery}`
  }

  if (isPageInclusiveFilterSet) {
    return `SELECT ${columnsQuery}, count(*) as count ${subQuery} AND ${col} IS NOT NULL GROUP BY ${columnsQuery}`
  }

  return `SELECT ${columnsQuery}, count(*) as count ${subQuery} AND ${col} IS NOT NULL AND unique='1' GROUP BY ${columnsQuery}`
}

export enum DataType {
  ANALYTICS = 'analytics',
  PERFORMANCE = 'performance',
  CAPTCHA = 'captcha',
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
  constructor(
    private readonly projectService: ProjectService,
    private readonly userService: UserService,
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

    if (project.admin.dashboardBlockReason) {
      throw new HttpException(
        'The account that owns this site is currently suspended, this is because of a billing issue. Please resolve the issue to continue.',
        HttpStatus.PAYMENT_REQUIRED,
      )
    }
  }

  checkOrigin(project: Project, origin: string): void {
    // For some reasons the project.origins sometimes may look like [''], let's filter it out
    // TODO: Properly validate the origins on project update
    const origins = _filter(project.origins, Boolean)

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

  checkIpBlacklist(project: Project, ip: string): void {
    // For some reasons the project.ipBlacklist sometimes may look like [''], let's filter it out
    // TODO: Properly validate the ipBlacklist on project update
    const ipBlacklist = _filter(project.ipBlacklist, Boolean)

    if (!_isEmpty(ipBlacklist) && ipRangeCheck(ip, ipBlacklist)) {
      throw new BadRequestException(
        'Incoming analytics is disabled for this IP address',
      )
    }
  }

  validatePID(pid: string): void {
    if (_isEmpty(pid)) {
      throw new BadRequestException('The Project ID (pid) has to be provided')
    }

    if (!isValidPID(pid)) {
      throw new BadRequestException(
        'The provided Project ID (pid) is incorrect',
      )
    }
  }

  async validate(
    logDTO: PageviewsDTO | EventsDTO | ErrorDTO,
    origin: string,
    type: 'custom' | 'log' | 'error' = 'log',
    ip?: string,
  ): Promise<string | null> {
    if (_isEmpty(logDTO)) {
      throw new BadRequestException('The request cannot be empty')
    }

    const { pid } = logDTO
    this.validatePID(pid)

    if (type === 'custom') {
      const { ev } = <EventsDTO>logDTO

      if (_isEmpty(ev)) {
        throw new BadRequestException('Empty custom events are not allowed')
      }

      if (!customEVvalidate.test(ev)) {
        throw new BadRequestException(
          'An incorrect event name (ev) is provided',
        )
      }
    }

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
        logDTO.lc = 'NULL'
      }
    }

    const project = await this.projectService.getRedisProject(pid)

    this.checkIpBlacklist(project, ip)

    if (!project.active) {
      throw new BadRequestException(
        'Incoming analytics is disabled for this project',
      )
    }

    if (project.admin?.isAccountBillingSuspended) {
      throw new HttpException(
        'The account that owns this site is currently suspended, this is because of a billing issue. This, and all other events, are NOT being tracked and saved on our side. Please log in to your account on Swetrix or contact our support to resolve the issue.',
        HttpStatus.PAYMENT_REQUIRED,
      )
    }

    this.checkOrigin(project, origin)

    return null
  }

  getDataTypeColumns(dataType: DataType): string[] {
    if (dataType === DataType.ANALYTICS) {
      return TRAFFIC_COLUMNS
    }

    if (dataType === DataType.PERFORMANCE) {
      return PERFORMANCE_COLUMNS
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

      if (!_isEmpty(timeBucket)) {
        checkIfTBAllowed(timeBucket, from, to)
      }

      // TODO:
      // THE FOLLOWING CODE SHOULD BE TIMEZONE SPECIFIC BUT HAS SOME ISSUES WITH DATE SHIFTS
      // IT SHOULD BE REFACTORED AND USED IN THE FUTURE
      // if (from === to) {
      //   // When from and to are the same we need to return timezone specific data for 1 specified day
      //   groupFrom = dayjs.tz(from, safeTimezone).startOf('d')
      //   groupTo = groupFrom.endOf('d')
      //   groupFromUTC = groupFrom.utc().format(formatFrom)
      //   groupToUTC = groupTo.utc().format(formatTo)
      // } else {
      //   groupFrom = dayjs.tz(from, safeTimezone)
      //   groupTo = dayjs.tz(to, safeTimezone)
      //   groupFromUTC = groupFrom.utc().startOf(timeBucket).format(formatFrom)
      //   groupToUTC = groupTo.utc().endOf(timeBucket).format(formatTo)
      // }

      // THIS SHOULD BE REPLACED BY THE CODE ABOVE WHEN IT'S FIXED
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
          groupFrom = djsNow.subtract(parseInt(period, 10), _last(period))
        } else {
          groupFrom = djsNow.subtract(parseInt(period, 10) - 1, _last(period))
        }

        groupFrom = groupFrom.startOf(timeBucket)
        groupTo = djsNow
      }

      if (!_isEmpty(timeBucket)) {
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

  async getUserFlow(params: unknown, filtersQuery: string): Promise<IUserFlow> {
    const query = `
      SELECT
        pg AS source,
        prev AS target,
        count() AS value
      FROM analytics
      WHERE
        pid = {pid:FixedString(12)}
        AND created BETWEEN {groupFrom:String} AND {groupTo:String}
        AND pg != prev
        ${filtersQuery}
      GROUP BY
        pg,
        prev
    `

    const results = <IUserFlowLink[]>(
      await clickhouse.query(query, { params }).toPromise()
    )

    if (_isEmpty(results)) {
      const empty = { nodes: [], links: [] }
      return {
        ascending: empty,
        descending: empty,
      }
    }

    const ascendingLinks: IUserFlowLink[] = []
    const descendingLinks: IUserFlowLink[] = []

    this.removeCyclicDependencies(results).forEach((row: any) => {
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

  async getSessionHash(
    pid: string,
    userAgent: string,
    ip: string,
  ): Promise<string> {
    this.validatePID(pid)

    const salt = await redis.get(REDIS_SESSION_SALT_KEY)

    return getSessionKey(ip, userAgent, pid, salt)
  }

  async isSessionDurationOpen(sdKey: string): Promise<Array<string | boolean>> {
    const sd = await redis.get(sdKey)
    return [sd, Boolean(sd)]
  }

  // Processes interaction for session duration
  async processInteractionSD(sessionHash: string, pid: string): Promise<void> {
    const sdKey = getSessionDurationKey(sessionHash, pid)
    const [sd, isOpened] = await this.isSessionDurationOpen(sdKey)
    const now = _now()

    // the value is START_UNIX_TIMESTAMP:LAST_INTERACTION_UNIX_TIMESTAMP
    if (isOpened) {
      const [start] = _split(sd, ':')
      await redis.set(sdKey, `${start}:${now}`, 'EX', UNIQUE_SESSION_LIFE_TIME)
    } else {
      await redis.set(sdKey, `${now}:${now}`, 'EX', UNIQUE_SESSION_LIFE_TIME)
    }
  }

  validatePeriod(period: string): void {
    if (!_includes(validPeriods, period)) {
      throw new UnprocessableEntityException('The provided period is incorrect')
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

      if (_some(pages, page => !_isString(page))) {
        throw new UnprocessableEntityException(
          'Pages array must contain string values only',
        )
      }

      return pages
    } catch (e) {
      throw new UnprocessableEntityException(
        'Cannot process the provided array of pages',
      )
    }
  }

  async getTimeBucketForAllTime(
    pid: string,
    period: string,
    safeTimezone: string,
  ): Promise<{
    timeBucket: TimeBucketType[]
    diff: number
  }> {
    if (period !== 'all') {
      return null
    }

    const from: any = await clickhouse
      .query(
        'SELECT created FROM analytics where pid = {pid:FixedString(12)} ORDER BY created ASC LIMIT 1',
        { params: { pid } },
      )
      .toPromise()
    const to = _includes(GMT_0_TIMEZONES, safeTimezone)
      ? dayjs.utc()
      : dayjs().tz(safeTimezone)

    let newTimeBucket = [TimeBucketType.MONTH]
    let diff = null

    if (from && to) {
      diff = dayjs(to).diff(dayjs(from?.[0].created || to), 'days')

      const tbMap = _find(timeBucketToDays, ({ lt }) => diff <= lt)

      if (_isEmpty(tbMap)) {
        throw new PreconditionFailedException(
          "The difference between 'from' and 'to' is greater than allowed",
        )
      }

      newTimeBucket = tbMap?.tb
    }

    return {
      timeBucket: newTimeBucket,
      diff,
    }
  }

  postProcessParsedFilters(parsedFilters: any[]): any[] {
    return _reduce(
      parsedFilters,
      (prev, curr) => {
        const { column, filter, isExclusive } = curr

        if (_isArray(filter)) {
          const filterArray = _map(filter, f => ({
            column,
            filter: f,
            isExclusive,
          }))
          return [...prev, ...filterArray]
        }

        return [...prev, curr]
      },
      [],
    )
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
    } catch (e) {
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
        const { column, filter, isExclusive = false } = curr

        if (column === 'ev' && ignoreEV) {
          return prev
        }

        if (column === 'ev') {
          customEVFilterApplied = true
        } else if (!_includes(SUPPORTED_COLUMNS, column)) {
          throw new UnprocessableEntityException(
            `The provided filter (${column}) is not supported`,
          )
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
            res.push({ filter: f, isExclusive })
          }
        } else {
          // let encoded = filter

          // if (column === 'pg' && filter !== null) {
          //   encoded = _replace(encodeURIComponent(filter), /%2F/g, '/')
          // }

          // res.push({ filter: encoded, isExclusive })
          res.push({ filter, isExclusive })
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
      const column = columns[col]
      query += ' AND ('

      for (let f = 0; f < _size(converted[column]); ++f) {
        if (f > 0) {
          query += ' OR '
        }

        const { filter, isExclusive } = converted[column][f]

        const param = `qf_${col}_${f}`

        if (filter === null) {
          query += `${column} IS ${isExclusive ? 'NOT' : ''} NULL`
          params[param] = filter
          continue
        }

        query += `${isExclusive ? 'NOT ' : ''}${column} = {${param}:String}`

        params[param] = filter
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

  validateTimebucket(tb: TimeBucketType): void {
    if (!_includes(validTimebuckets, tb)) {
      throw new UnprocessableEntityException(
        'The provided timebucket is incorrect',
      )
    }
  }

  generateUInt64(): string {
    return crypto.randomBytes(8).readBigUInt64BE(0).toString()
  }

  /**
   * Checks if the session is unique and returns the session psid (or creates a new one)
   * @param sessionHash
   * @returns [isUnique, psid]
   */
  async isUnique(sessionHash: string): Promise<[boolean, string]> {
    let psid = await redis.get(sessionHash)
    const exists = Boolean(psid)

    if (!exists) {
      psid = this.generateUInt64()
    }

    await redis.set(sessionHash, psid, 'EX', UNIQUE_SESSION_LIFE_TIME)
    return [!exists, psid]
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
        eventsPerc = Number(_round((row.c / data[0].c) * 100, 2))
        eventsPercStep = Number(_round((row.c / prev.c) * 100, 2))
        dropoffPercStep = Number(_round((dropoff / prev.c) * 100, 2))
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
    const pageParams = {}

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

    const result = <Array<IFunnelCHResponse>>(
      await clickhouse
        .query(query, { params: { ...params, ...pageParams } })
        .toPromise()
    )

    if (_isEmpty(result)) {
      return this.generateEmptyFunnel(pages)
    }

    return this.formatFunnel(
      _reverse(this.backfillFunnel(result, pages)),
      pages,
    )
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
    const result = <{ c: number }[]>(
      await clickhouse
        .query(query, { params: { pid, groupFrom, groupTo } })
        .toPromise()
    )

    return result[0]?.c || 0
  }

  async getCaptchaSummary(
    pids: string[],
    period?: string,
    from?: string,
    to?: string,
    timezone?: string,
    filters?: string,
  ): Promise<IOverallCaptcha> {
    // eslint-disable-next-line
    let _from: string
    // eslint-disable-next-line
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
    } else {
      this.validatePeriod(period)
    }

    const result = {}

    const [filtersQuery, filtersParams] = this.getFiltersQuery(
      filters,
      DataType.CAPTCHA,
      true,
    )

    const promises = pids.map(async pid => {
      if (!isValidPID(pid)) {
        throw new BadRequestException(
          `The provided Project ID (${pid}) is incorrect`,
        )
      }

      try {
        if (period === 'all') {
          const queryAll = `SELECT count(*) AS all FROM captcha WHERE pid = {pid:FixedString(12)} ${filtersQuery}`
          const rawResult = <Array<Partial<BirdseyeCHResponse>>>await clickhouse
            .query(queryAll, {
              params: { pid, ...filtersParams },
            })
            .toPromise()

          result[pid] = {
            current: {
              all: rawResult[0].all,
            },
            previous: {
              all: 0,
            },
            change: rawResult[0].all,
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
          const unit = _replace(period, /[0-9]/g, '')

          now = dayjs.utc().format('YYYY-MM-DD HH:mm:ss')
          const periodRaw = dayjs.utc().subtract(amountToSubtract, unit)
          periodFormatted = periodRaw.format('YYYY-MM-DD HH:mm:ss')
          periodSubtracted = periodRaw
            .subtract(amountToSubtract, unit)
            .format('YYYY-MM-DD HH:mm:ss')
        }

        const queryCurrent = `SELECT 1 AS sortOrder, count(*) AS all FROM captcha WHERE pid = {pid:FixedString(12)} AND created BETWEEN {periodFormatted:String} AND {now:String} ${filtersQuery}`
        const queryPrevious = `SELECT 2 AS sortOrder, count(*) AS all FROM captcha WHERE pid = {pid:FixedString(12)} AND created BETWEEN {periodSubtracted:String} AND {periodFormatted:String} ${filtersQuery}`

        const query = `${queryCurrent} UNION ALL ${queryPrevious}`

        let rawResult = <Array<Partial<BirdseyeCHResponse>>>await clickhouse
          .query(query, {
            params: {
              pid,
              periodFormatted,
              periodSubtracted,
              now,
              ...filtersParams,
            },
          })
          .toPromise()

        rawResult = _sortBy(rawResult, 'sortOrder')

        const currentPeriod = rawResult[0]
        const previousPeriod = rawResult[1]

        result[pid] = {
          current: {
            all: currentPeriod.all,
          },
          previous: {
            all: previousPeriod.all,
          },
          change: currentPeriod.all - previousPeriod.all,
        }
      } catch {
        throw new InternalServerErrorException(
          "Can't process the provided PID. Please, try again later.",
        )
      }
    })

    await Promise.all(promises)

    return result
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

  async getAnalyticsSummary(
    pids: string[],
    period?: string,
    from?: string,
    to?: string,
    timezone?: string,
    filters?: string,
  ): Promise<IOverall> {
    // eslint-disable-next-line
    let _from: string
    // eslint-disable-next-line
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
    } else {
      this.validatePeriod(period)
    }

    const result = {}

    const [filtersQuery, filtersParams, , customEVFilterApplied] =
      this.getFiltersQuery(filters, DataType.ANALYTICS)

    const promises = pids.map(async pid => {
      if (!isValidPID(pid)) {
        throw new BadRequestException(
          `The provided Project ID (${pid}) is incorrect`,
        )
      }

      try {
        if (period === 'all') {
          let queryAll = `SELECT count(*) AS all, countIf(unique=1) AS unique, avgIf(sdur, sdur IS NOT NULL AND analytics.unique=1) AS sdur FROM analytics WHERE pid = {pid:FixedString(12)} ${filtersQuery}`

          if (customEVFilterApplied) {
            queryAll = `SELECT count(*) AS all FROM customEV WHERE pid = {pid:FixedString(12)} ${filtersQuery}`
          }

          const rawResult = <Array<BirdseyeCHResponse>>await clickhouse
            .query(queryAll, {
              params: { pid, ...filtersParams },
            })
            .toPromise()

          let bounceRate = 0

          if (rawResult[0].all > 0 && !customEVFilterApplied) {
            bounceRate = _round(
              (rawResult[0].unique * 100) / rawResult[0].all,
              1,
            )
          }

          result[pid] = {
            current: {
              all: rawResult[0].all,
              unique: rawResult[0].unique,
              bounceRate,
              sdur: rawResult[0].sdur,
            },
            previous: {
              all: 0,
              unique: 0,
              bounceRate: 0,
              sdur: 0,
            },
            change: rawResult[0].all,
            uniqueChange: rawResult[0].unique,
            bounceRateChange: bounceRate,
            sdurChange: rawResult[0].sdur,
            customEVFilterApplied,
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
          const unit = _replace(period, /[0-9]/g, '')

          now = dayjs.utc().format('YYYY-MM-DD HH:mm:ss')
          const periodRaw = dayjs.utc().subtract(amountToSubtract, unit)
          periodFormatted = periodRaw.format('YYYY-MM-DD HH:mm:ss')
          periodSubtracted = periodRaw
            .subtract(amountToSubtract, unit)
            .format('YYYY-MM-DD HH:mm:ss')
        }

        let queryCurrent = `SELECT 1 AS sortOrder, count(*) AS all, countIf(unique=1) AS unique, avgIf(sdur, sdur IS NOT NULL AND analytics.unique=1) AS sdur FROM analytics WHERE pid = {pid:FixedString(12)} AND created BETWEEN {periodFormatted:String} AND {now:String} ${filtersQuery}`
        let queryPrevious = `SELECT 2 AS sortOrder, count(*) AS all, countIf(unique=1) AS unique, avgIf(sdur, sdur IS NOT NULL AND analytics.unique=1) AS sdur FROM analytics WHERE pid = {pid:FixedString(12)} AND created BETWEEN {periodSubtracted:String} AND {periodFormatted:String} ${filtersQuery}`

        if (customEVFilterApplied) {
          queryCurrent = `SELECT 1 AS sortOrder, count(*) AS all FROM customEV WHERE pid = {pid:FixedString(12)} AND created BETWEEN {periodFormatted:String} AND {now:String} ${filtersQuery}`
          queryPrevious = `SELECT 2 AS sortOrder, count(*) AS all FROM customEV WHERE pid = {pid:FixedString(12)} AND created BETWEEN {periodSubtracted:String} AND {periodFormatted:String} ${filtersQuery}`
        }

        const query = `${queryCurrent} UNION ALL ${queryPrevious}`

        let rawResult = <Array<BirdseyeCHResponse>>await clickhouse
          .query(query, {
            params: {
              pid,
              periodFormatted,
              periodSubtracted,
              now,
              ...filtersParams,
            },
          })
          .toPromise()

        rawResult = _sortBy(rawResult, 'sortOrder')

        const currentPeriod = rawResult[0]
        const previousPeriod = rawResult[1]

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
            sdur: currentPeriod.sdur || 0,
            bounceRate,
          },
          previous: {
            all: previousPeriod.all,
            unique: previousPeriod.unique,
            sdur: previousPeriod.sdur || 0,
            bounceRate: prevBounceRate,
          },
          change: currentPeriod.all - previousPeriod.all,
          uniqueChange: currentPeriod.unique - previousPeriod.unique,
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
    // eslint-disable-next-line
    let _from: string
    // eslint-disable-next-line
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
    } else {
      this.validatePeriod(period)
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
      if (!isValidPID(pid)) {
        throw new BadRequestException(
          `The provided Project ID (${pid}) is incorrect`,
        )
      }

      try {
        if (period === 'all') {
          const queryAll = `SELECT ${columnSelectors} FROM performance WHERE pid = {pid:FixedString(12)} ${filtersQuery}`
          const rawResult = <Array<Partial<PerformanceCHResponse>>>(
            await clickhouse
              .query(queryAll, {
                params: { pid, ...filtersParams },
              })
              .toPromise()
          )

          result[pid] = {
            current: {
              frontend: millisecondsToSeconds(
                rawResult[0].render + rawResult[0].domLoad,
              ),
              network: millisecondsToSeconds(
                rawResult[0].dns +
                  rawResult[0].tls +
                  rawResult[0].conn +
                  rawResult[0].response,
              ),
              backend: millisecondsToSeconds(rawResult[0].ttfb),
            },
            previous: {
              frontend: 0,
              network: 0,
              backend: 0,
            },
            frontendChange: millisecondsToSeconds(
              rawResult[0].render + rawResult[0].domLoad,
            ),
            networkChange: millisecondsToSeconds(
              rawResult[0].dns +
                rawResult[0].tls +
                rawResult[0].conn +
                rawResult[0].response,
            ),
            backendChange: millisecondsToSeconds(rawResult[0].ttfb),
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
          const unit = _replace(period, /[0-9]/g, '')

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

        let rawResult = <Array<Partial<PerformanceCHResponse>>>await clickhouse
          .query(query, {
            params: {
              pid,
              periodFormatted,
              periodSubtracted,
              now,
              ...filtersParams,
            },
          })
          .toPromise()

        rawResult = _sortBy(rawResult, 'sortOrder')

        const currentPeriod = rawResult[0]
        const previousPeriod = rawResult[1]

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

  async getFilters(pid: string, type: string): Promise<Array<string>> {
    if (!_includes(ALL_COLUMNS, type)) {
      throw new UnprocessableEntityException(
        `The provided type (${type}) is incorrect`,
      )
    }

    let query = `SELECT ${type} FROM analytics WHERE pid={pid:FixedString(12)} AND ${type} IS NOT NULL GROUP BY ${type}`

    if (type === 'ev') {
      query = `SELECT ${type} FROM customEV WHERE pid={pid:FixedString(12)} AND ${type} IS NOT NULL GROUP BY ${type}`
    }

    const results = await clickhouse
      .query(query, { params: { pid } })
      .toPromise()

    return _map(results, type)
  }

  async getErrorsFilters(pid: string, type: string): Promise<Array<string>> {
    if (!_includes(ERROR_COLUMNS, type)) {
      throw new UnprocessableEntityException(
        `The provided type (${type}) is incorrect`,
      )
    }

    const query = `SELECT ${type} FROM errors WHERE pid={pid:FixedString(12)} AND ${type} IS NOT NULL GROUP BY ${type}`

    const results = await clickhouse
      .query(query, { params: { pid } })
      .toPromise()

    return _map(results, type)
  }

  async generateParams(
    parsedFilters: Array<{ [key: string]: string }>,
    subQuery: string,
    customEVFilterApplied: boolean,
    paramsData: any,
    type: 'traffic' | 'performance' | 'captcha' | 'errors',
    measure?: PerfMeasure,
  ): Promise<any> {
    const params = {}

    // We need this to display all the pageview related data (e.g. country, browser) when user applies an inclusive filter on the Page column
    const isPageInclusiveFilterSet = ['captcha', 'performance'].includes(type)
      ? false
      : !_isEmpty(
          _find(
            parsedFilters,
            filter => filter.column === 'pg' && !filter.isExclusive,
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

    const paramsPromises = _map(columns, async col => {
      const query = generateParamsQuery(
        col,
        subQuery,
        customEVFilterApplied,
        isPageInclusiveFilterSet,
        type,
        measure,
      )
      const res = await clickhouse.query(query, paramsData).toPromise()

      params[col] = res
    })

    await Promise.all(paramsPromises)

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
    safeTimezone: string,
    mode: ChartRenderMode,
  ): string {
    const timeBucketFunc = timeBucketConversion[timeBucket]
    const [selector, groupBy] = this.getGroupSubquery(timeBucket)
    const tzFromDate = `toTimeZone(parseDateTimeBestEffort({groupFrom:String}), '${safeTimezone}')`
    const tzToDate = `toTimeZone(parseDateTimeBestEffort({groupTo:String}), '${safeTimezone}')`

    const baseQuery = `
      SELECT
        ${selector},
        avg(sdur) as sdur,
        count() as pageviews,
        countIf(unique=1) as uniques
      FROM (
        SELECT *,
          ${timeBucketFunc}(toTimeZone(created, '${safeTimezone}')) as tz_created
        FROM analytics
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

  generateCustomEventsAggregationQuery(
    timeBucket: TimeBucketType,
    filtersQuery: string,
    safeTimezone: string,
    mode: ChartRenderMode,
  ): string {
    const timeBucketFunc = timeBucketConversion[timeBucket]
    const [selector, groupBy] = this.getGroupSubquery(timeBucket)
    const tzFromDate = `toTimeZone(parseDateTimeBestEffort({groupFrom:String}), '${safeTimezone}')`
    const tzToDate = `toTimeZone(parseDateTimeBestEffort({groupTo:String}), '${safeTimezone}')`

    const baseQuery = `
      SELECT
        ${selector},
        count() as count
      FROM (
        SELECT *,
        ${timeBucketFunc}(toTimeZone(created, '${safeTimezone}')) as tz_created
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
    safeTimezone: string,
    measure: PerfMeasure,
  ): string {
    const timeBucketFunc = timeBucketConversion[timeBucket]
    const [selector, groupBy] = this.getGroupSubquery(timeBucket)
    const tzFromDate = `toTimeZone(parseDateTimeBestEffort({groupFrom:String}), '${safeTimezone}')`
    const tzToDate = `toTimeZone(parseDateTimeBestEffort({groupTo:String}), '${safeTimezone}')`

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
          ${timeBucketFunc}(toTimeZone(created, '${safeTimezone}')) as tz_created
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
    safeTimezone: string,
  ): string {
    const timeBucketFunc = timeBucketConversion[timeBucket]
    const [selector, groupBy] = this.getGroupSubquery(timeBucket)
    const tzFromDate = `toTimeZone(parseDateTimeBestEffort({groupFrom:String}), '${safeTimezone}')`
    const tzToDate = `toTimeZone(parseDateTimeBestEffort({groupTo:String}), '${safeTimezone}')`

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
          ${timeBucketFunc}(toTimeZone(created, '${safeTimezone}')) as tz_created
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
    safeTimezone: string,
    mode: ChartRenderMode,
  ): string {
    const timeBucketFunc = timeBucketConversion[timeBucket]
    const [selector, groupBy] = this.getGroupSubquery(timeBucket)
    const tzFromDate = `toTimeZone(parseDateTimeBestEffort({groupFrom:String}), '${safeTimezone}')`
    const tzToDate = `toTimeZone(parseDateTimeBestEffort({groupTo:String}), '${safeTimezone}')`

    const baseQuery = `
      SELECT
        ${selector},
        count() as count
      FROM (
        SELECT *,
          ${timeBucketFunc}(toTimeZone(created, '${safeTimezone}')) as tz_created
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
    safeTimezone: string,
    mode: ChartRenderMode,
  ): string {
    const timeBucketFunc = timeBucketConversion[timeBucket]
    const [selector, groupBy] = this.getGroupSubquery(timeBucket)
    const tzFromDate = `toTimeZone(parseDateTimeBestEffort({groupFrom:String}), '${safeTimezone}')`
    const tzToDate = `toTimeZone(parseDateTimeBestEffort({groupTo:String}), '${safeTimezone}')`

    const baseQuery = `
      SELECT
        ${selector},
        count() as count
      FROM (
        SELECT pg, dv, br, os, lc, cc, rg, ct,
          ${timeBucketFunc}(toTimeZone(created, '${safeTimezone}')) as tz_created
        FROM errors
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

  async groupParamsByTimeBucket(
    subQuery: string,
    paramsData: any,
    customEVFilterApplied: boolean,
    parsedFilters: Array<{ [key: string]: string }>,
  ): Promise<object | void> {
    return this.generateParams(
      parsedFilters,
      subQuery,
      customEVFilterApplied,
      paramsData,
      'traffic',
    )
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
        safeTimezone,
        mode,
      )

      const result = <Array<TrafficCEFilterCHResponse>>(
        await clickhouse.query(query, paramsData).toPromise()
      )

      const uniques =
        this.extractCustomEventsChartData(result, xShifted)?._unknown_event ||
        []

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
      safeTimezone,
      mode,
    )

    const result = <Array<TrafficCHResponse>>(
      await clickhouse.query(query, paramsData).toPromise()
    )

    const { visits, uniques, sdur } = this.extractChartData(result, xShifted)

    return Promise.resolve({
      chart: {
        x: xShifted,
        visits,
        uniques,
        sdur,
      },
    })
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
    paramsData: object,
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

        if (!_some(_values(params), val => !_isEmpty(val))) {
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
          safeTimezone,
          mode,
        )

        const result = <Array<TrafficCEFilterCHResponse>>(
          await clickhouse.query(query, paramsData).toPromise()
        )
        const { count } = this.extractCaptchaChartData(result, xShifted)

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
    paramsData: object,
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
        const { xShifted } = this.generateXAxis(
          timeBucket,
          from,
          to,
          safeTimezone,
        )

        const query = this.generateErrorsAggregationQuery(
          timeBucket,
          filtersQuery,
          safeTimezone,
          mode,
        )

        const result = <Array<TrafficCEFilterCHResponse>>(
          await clickhouse.query(query, paramsData).toPromise()
        )
        const { count } = this.extractCaptchaChartData(result, xShifted)

        chart = {
          x: xShifted,
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
    paramsData: object,
    safeTimezone: string,
    measure: PerfMeasure,
  ) {
    const { xShifted } = this.generateXAxis(timeBucket, from, to, safeTimezone)

    if (measure === 'quantiles') {
      const query = this.generatePerformanceQuantilesQuery(
        timeBucket,
        filtersQuery,
        safeTimezone,
      )

      const result = await clickhouse.query(query, paramsData).toPromise()

      return {
        x: xShifted,
        ...this.extractPerformanceQuantilesData(result, xShifted),
      }
    }

    const query = this.generatePerformanceAggregationQuery(
      timeBucket,
      filtersQuery,
      safeTimezone,
      measure,
    )

    const result = <Array<PerformanceCHResponse>>(
      await clickhouse.query(query, paramsData).toPromise()
    )

    return {
      x: xShifted,
      ...this.extractPerformanceChartData(result, xShifted),
    }
  }

  async groupPerfByTimeBucket(
    timeBucket: TimeBucketType,
    from: string,
    to: string,
    subQuery: string,
    filtersQuery: string,
    paramsData: object,
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

  async processCustomEV(query: string, params: object): Promise<object> {
    const result = {}

    const rawCustoms = <Array<CustomsCHResponse>>(
      await clickhouse.query(query, params).toPromise()
    )
    const size = _size(rawCustoms)

    for (let i = 0; i < size; ++i) {
      const { ev, 'count()': c } = rawCustoms[i]
      result[ev] = c
    }

    return result
  }

  validateCustomEVMeta(meta: any) {
    if (typeof meta === 'undefined') {
      return
    }

    if (_some(_values(meta), val => !_isString(val))) {
      throw new UnprocessableEntityException(
        'The provided custom event metadata is incorrect (some values are not strings)',
      )
    }
  }

  async getCustomEventMetadata(
    data: GetCustomEventMetadata,
  ): Promise<IAggregatedMetadata[]> {
    const {
      pid,
      period,
      timeBucket,
      from,
      to,
      timezone = DEFAULT_TIMEZONE,
      event,
    } = data

    let newTimebucket = timeBucket

    let diff

    if (period === 'all') {
      const res = await this.getTimeBucketForAllTime(pid, period, timezone)

      diff = res.diff
      // eslint-disable-next-line prefer-destructuring
      newTimebucket = _includes(res.timeBucket, timeBucket)
        ? timeBucket
        : res.timeBucket[0]
    }

    this.validateTimebucket(newTimebucket)

    const safeTimezone = this.getSafeTimezone(timezone)
    const { groupFromUTC, groupToUTC } = this.getGroupFromTo(
      from,
      to,
      newTimebucket,
      period,
      safeTimezone,
      diff,
    )

    const query = `SELECT 
      meta.key AS key, 
      meta.value AS value,
      count() AS count
    FROM customEV
    ARRAY JOIN meta.key, meta.value
    WHERE pid = {pid:FixedString(12)}
      AND created BETWEEN {groupFrom:String} AND {groupTo:String}
      AND ev = {event:String}
    GROUP BY key, value`

    const paramsData = {
      params: {
        pid,
        groupFrom: groupFromUTC,
        groupTo: groupToUTC,
        event,
      },
    }

    try {
      const result = await clickhouse.query(query, paramsData).toPromise()
      return result as IAggregatedMetadata[]
    } catch (reason) {
      console.error(`[ERROR](getCustomEventMetadata): ${reason}`)
      throw new InternalServerErrorException(
        'Something went wrong. Please, try again later.',
      )
    }
  }

  async getOnlineUserCount(pid: string): Promise<number> {
    // @ts-ignore
    return redis.countKeysByPattern(`hb:${pid}:*`)
  }

  async groupCustomEVByTimeBucket(
    timeBucket: TimeBucketType,
    from: string,
    to: string,
    filtersQuery: string,
    paramsData: object,
    safeTimezone: string,
  ): Promise<object | void> {
    const { xShifted } = this.generateXAxis(timeBucket, from, to, safeTimezone)

    const timeBucketFunc = timeBucketConversion[timeBucket]
    const [selector, groupBy] = this.getGroupSubquery(timeBucket)
    const tzFromDate = `toTimeZone(parseDateTimeBestEffort({groupFrom:String}), '${safeTimezone}')`
    const tzToDate = `toTimeZone(parseDateTimeBestEffort({groupTo:String}), '${safeTimezone}')`

    const query = `
      SELECT
        ${selector},
        ev,
        count() as count
      FROM (
        SELECT *,
          ${timeBucketFunc}(toTimeZone(created, '${safeTimezone}')) as tz_created
        FROM customEV
        WHERE
          pid = {pid:FixedString(12)}
          AND created BETWEEN ${tzFromDate} AND ${tzToDate}
          ${filtersQuery}
      ) as subquery
      GROUP BY ${groupBy}, ev
      ORDER BY ${groupBy}
      `

    const result = <Array<CustomsCHAggregatedResponse>>(
      await clickhouse.query(query, paramsData).toPromise()
    )

    const events = this.extractCustomEventsChartData(result, xShifted)

    return Promise.resolve({
      chart: {
        x: xShifted,
        events,
      },
    })
  }

  getSafeNumber(value: any, defaultValue: number): number {
    if (typeof value === 'undefined') {
      return defaultValue
    }

    const parsed = parseInt(value, 10)

    if (Number.isNaN(parsed)) {
      return defaultValue
    }

    return parsed
  }

  async getSessionDetails(
    pid: string,
    psid: string,
    safeTimezone: string,
  ): Promise<any> {
    const queryPages = `
      SELECT
        *
      FROM (
        SELECT
          'pageview' AS type,
          pg AS value,
          created
        FROM analytics
        WHERE
          pid = {pid:FixedString(12)}
          AND psid = {psid:String}

        UNION ALL

        SELECT
          'event' AS type,
          ev AS value,
          created
        FROM customEV
        WHERE
          pid = {pid:FixedString(12)}
          AND psid = {psid:String}
      )
      ORDER BY created ASC;
    `

    const querySessionDetails = `
      SELECT
        dv, br, os, lc, ref, so, me, ca, cc, rg, ct, sdur
      FROM analytics
      WHERE
        pid = {pid:FixedString(12)}
        AND psid = {psid:String}
        AND unique = 1
      LIMIT 1;
    `

    const paramsData = {
      params: {
        pid,
        psid,
      },
    }

    const pages = <IPageflow[]>(
      await clickhouse.query(queryPages, paramsData).toPromise()
    )
    let details = (
      await clickhouse.query(querySessionDetails, paramsData).toPromise()
    )[0]

    if (!details) {
      const querySessionDetailsBackup = `
        SELECT
          dv, br, os, lc, ref, so, me, ca, cc, rg, ct, sdur
        FROM analytics
        WHERE
          pid = {pid:FixedString(12)}
          AND psid = {psid:String}
        LIMIT 1;
      `

      // eslint-disable-next-line prefer-destructuring
      details = (
        await clickhouse
          .query(querySessionDetailsBackup, paramsData)
          .toPromise()
      )[0]
    }

    let chartData = {}
    let timeBucket = null

    if (!_isEmpty(pages)) {
      const from = dayjs(pages[0].created)
        .startOf('minute')
        .format('YYYY-MM-DD HH:mm:ss')
      const to = dayjs(pages[_size(pages) - 1].created)
        .endOf('minute')
        .format('YYYY-MM-DD HH:mm:ss')

      // eslint-disable-next-line
      timeBucket =
        dayjs(to).diff(dayjs(from), 'hour') > 1
          ? TimeBucketType.HOUR
          : TimeBucketType.MINUTE

      const groupedChart = await this.groupChartByTimeBucket(
        timeBucket,
        from,
        to,
        'AND psid = {psid:String}',
        {
          params: {
            ...paramsData.params,
            groupFrom: from,
            groupTo: to,
          },
        },
        safeTimezone,
        false,
        ChartRenderMode.PERIODICAL,
      )

      // @ts-ignore
      chartData = groupedChart.chart
    }

    return { pages, details, psid, chart: chartData, timeBucket }
  }

  async getSessionsList(
    filtersQuery: string,
    paramsData: object,
    safeTimezone: string,
    take = 30,
    skip = 0,
    customEVFilterApplied = false,
  ): Promise<object | void> {
    const tzFromDate = `toTimeZone(parseDateTimeBestEffort({groupFrom:String}), '${safeTimezone}')`
    const tzToDate = `toTimeZone(parseDateTimeBestEffort({groupTo:String}), '${safeTimezone}')`

    const analyticsSubquery = `
      SELECT
        isNotNull(sid) AS active,
        CAST(psid, 'String') AS psidCasted,
        cc,
        os,
        br,
        created
      FROM analytics
      WHERE
        pid = {pid:FixedString(12)}
        AND psid IS NOT NULL
        AND created BETWEEN ${tzFromDate} AND ${tzToDate}
        ${filtersQuery}
    `

    const customEVSubquery = `
      SELECT
        0 AS active,
        CAST(psid, 'String') AS psidCasted,
        cc,
        os,
        br,
        created
      FROM customEV
      WHERE
        pid = {pid:FixedString(12)}
        AND psid IS NOT NULL
        AND created BETWEEN ${tzFromDate} AND ${tzToDate}
        ${filtersQuery}
    `

    const query = `
      SELECT
        psidCasted AS psid,
        any(active) AS active,
        any(cc) AS cc,
        any(os) AS os,
        any(br) AS br,
        count() AS pageviews,
        min(created) AS created
      FROM
      (
        ${customEVFilterApplied ? customEVSubquery : analyticsSubquery}
      )
      GROUP BY psid
      ORDER BY created DESC
      LIMIT ${take}
      OFFSET ${skip}
    `

    const result = await clickhouse.query(query, paramsData).toPromise()

    return result
  }

  async getErrorsList(
    options: string,
    filtersQuery: string,
    paramsData: object,
    safeTimezone: string,
    take = 30,
    skip = 0,
  ): Promise<object | void> {
    const tzFromDate = `toTimeZone(parseDateTimeBestEffort({groupFrom:String}), '${safeTimezone}')`
    const tzToDate = `toTimeZone(parseDateTimeBestEffort({groupTo:String}), '${safeTimezone}')`

    let parsedOptions: {
      showResolved?: boolean
    } = {}

    try {
      parsedOptions = JSON.parse(options)
    } catch (reason) {
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
        SELECT eid, name, message, filename, created
        FROM errors
        WHERE pid = {pid:FixedString(12)}
          AND created BETWEEN ${tzFromDate} AND ${tzToDate}
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

    const result = await clickhouse.query(query, paramsData).toPromise()

    return result
  }

  async getErrorDetails(
    pid: string,
    eid: string,
    safeTimezone: string,
    groupFrom: string,
    groupTo: string,
    timeBucket: any,
  ): Promise<any> {
    const tzFromDate = `toTimeZone(parseDateTimeBestEffort({groupFrom:String}), '${safeTimezone}')`
    const tzToDate = `toTimeZone(parseDateTimeBestEffort({groupTo:String}), '${safeTimezone}')`

    const queryErrorDetails = `
      SELECT
        subquery.eid,
        any(subquery.name) AS name,
        any(subquery.message) AS message,
        any(subquery.filename) AS filename,
        any(subquery.colno) AS colno,
        any(subquery.lineno) AS lineno,
        count(*) AS count,
        status.status
      FROM (
        SELECT
          eid,
          name,
          message,
          filename,
          colno,
          lineno
        FROM errors
        WHERE pid = {pid:FixedString(12)}
          AND eid = {eid:FixedString(32)}
          AND created BETWEEN ${tzFromDate} AND ${tzToDate}
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

    const paramsData = {
      params: {
        pid,
        eid,
        groupFrom,
        groupTo,
      },
    }

    const details = (
      await clickhouse.query(queryErrorDetails, paramsData).toPromise()
    )[0]

    const occurenceDetails = (
      await clickhouse.query(queryFirstLastSeen, paramsData).toPromise()
    )[0]

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
      ...groupedChart,
      timeBucket,
    }
  }

  getErrorID(errorDTO: ErrorDTO): string {
    const { name, message, colno, lineno, filename } = errorDTO

    return hash(`${name}${message}${colno}${lineno}${filename}`, {
      length: 16,
    }).toString('hex')
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
      ;[result] = await clickhouse
        .query(query, { params: { ...params, pid } })
        .toPromise()
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
    const params = _reduce(
      eids,
      (acc, curr, index) => ({
        ...acc,
        [`e_${index}`]: curr,
      }),
      {},
    )

    const query = `INSERT INTO error_statuses (eid, pid, status) VALUES ${_map(
      params,
      (val, key) =>
        `({${key}:FixedString(32)}, {pid:FixedString(12)}, '${status}')`,
    ).join(', ')}`

    try {
      await clickhouse.query(query, { params: { ...params, pid } }).toPromise()
    } catch (reason) {
      console.error('Error at PATCH error-status:')
      console.error(reason)
      throw new InternalServerErrorException(
        'Error occured while updating error status',
      )
    }
  }

  async getOnlineCountByProjectId(projectId: string) {
    // @ts-ignore
    return redis.countKeysByPattern(`hb:${projectId}:*`)
  }

  checkIfPerfMeasureIsValid(measure: PerfMeasure) {
    const validMeasures = ['average', 'median', 'p95', 'quantiles']

    if (!_includes(validMeasures, measure)) {
      throw new UnprocessableEntityException(
        `Please provide a valid "measure" parameter, it must be one of ${validMeasures}`,
      )
    }
  }

  async getGeneralStats(): Promise<{
    users: number
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

    const users = await this.userService.count()
    const projects = await this.projectService.count()
    const results = await clickhouse.query(query).toPromise()
    // @ts-expect-error
    const events = results.reduce((total, row) => total + row.count, 0)

    await redis.set(REDIS_USERS_COUNT_KEY, users, 'EX', 630)
    await redis.set(REDIS_PROJECTS_COUNT_KEY, projects, 'EX', 630)
    await redis.set(REDIS_EVENTS_COUNT_KEY, events, 'EX', 630)

    return {
      users,
      projects,
      events,
    }
  }
}

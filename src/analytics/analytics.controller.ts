import * as _isEmpty from 'lodash/isEmpty'
import * as _isArray from 'lodash/isArray'
import * as _toNumber from 'lodash/toNumber'
import * as _last from 'lodash/last'
import * as _pick from 'lodash/pick'
import * as _map from 'lodash/map'
import * as _uniqBy from 'lodash/uniqBy'
import * as _round from 'lodash/round'
import * as dayjs from 'dayjs'
import * as utc from 'dayjs/plugin/utc'
import * as dayjsTimezone from 'dayjs/plugin/timezone'
import { hash } from 'blake3'
import ct from 'countries-and-timezones'
import {
  Controller,
  Body,
  Query,
  UseGuards,
  Get,
  Post,
  Headers,
  BadRequestException,
  InternalServerErrorException,
  UnprocessableEntityException,
  PreconditionFailedException,
  Ip,
  ForbiddenException,
  Response,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
// @ts-ignore
import * as UAParser from 'ua-parser-js'
import * as isbot from 'isbot'

import { OptionalJwtAccessTokenGuard } from 'src/auth/guards'
import { Auth, Public } from 'src/auth/decorators'
import {
  AnalyticsService,
  getSessionKey,
  isValidTimezone,
  isValidDate,
  checkIfTBAllowed,
} from './analytics.service'
import { TaskManagerService } from '../task-manager/task-manager.service'
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator'
import { DEFAULT_TIMEZONE } from '../user/entities/user.entity'
import { RolesGuard } from '../auth/guards/roles.guard'
import { PageviewsDTO } from './dto/pageviews.dto'
import { EventsDTO } from './dto/events.dto'
import { AnalyticsGET_DTO } from './dto/getData.dto'
import { AppLoggerService } from '../logger/logger.service'
import { SelfhostedGuard } from '../common/guards/selfhosted.guard'
import {
  REDIS_LOG_DATA_CACHE_KEY,
  REDIS_LOG_PERF_CACHE_KEY,
  redis,
  REDIS_LOG_CUSTOM_CACHE_KEY,
  HEARTBEAT_SID_LIFE_TIME,
  REDIS_USERS_COUNT_KEY,
  REDIS_PROJECTS_COUNT_KEY,
  REDIS_PAGEVIEWS_COUNT_KEY,
  REDIS_SESSION_SALT_KEY,
  REDIS_PERFORMANCE_COUNT_KEY,
  clickhouse,
} from '../common/constants'
import { BotDetection } from '../common/decorators/bot-detection.decorator'
import { BotDetectionGuard } from '../common/guards/bot-detection.guard'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mysql = require('mysql2')

dayjs.extend(utc)
dayjs.extend(dayjsTimezone)

const getSessionKeyCustom = (
  ip: string,
  ua: string,
  pid: string,
  ev: string,
  salt = '',
) => `cses_${hash(`${ua}${ip}${pid}${ev}${salt}`).toString('hex')}`

const analyticsDTO = (
  sid: string,
  pid: string,
  pg: string,
  dv: string,
  br: string,
  os: string,
  lc: string,
  ref: string,
  so: string,
  me: string,
  ca: string,
  cc: string,
  sdur: number | string,
  unique: number,
): Array<string | number> => {
  return [
    sid,
    pid,
    pg,
    dv,
    br,
    os,
    lc,
    ref,
    so,
    me,
    ca,
    cc,
    sdur,
    unique,
    dayjs.utc().format('YYYY-MM-DD HH:mm:ss'),
  ]
}

const performanceDTO = (
  pid: string,
  pg: string,
  dv: string,
  br: string,
  cc: string,
  dns: number,
  tls: number,
  conn: number,
  response: number,
  render: number,
  domLoad: number,
  pageLoad: number,
  ttfb: number,
): Array<string | number> => {
  return [
    pid,
    pg,
    dv,
    br,
    cc,
    _round(dns),
    _round(tls),
    _round(conn),
    _round(response),
    _round(render),
    _round(domLoad),
    _round(pageLoad),
    _round(ttfb),
    dayjs.utc().format('YYYY-MM-DD HH:mm:ss'),
  ]
}

const customLogDTO = (
  pid: string,
  ev: string,
  pg: string,
  dv: string,
  br: string,
  os: string,
  lc: string,
  ref: string,
  so: string,
  me: string,
  ca: string,
  cc: string,
): Array<string | number> => {
  return [
    pid,
    ev,
    pg,
    dv,
    br,
    os,
    lc,
    ref,
    so,
    me,
    ca,
    cc,
    dayjs.utc().format('YYYY-MM-DD HH:mm:ss'),
  ]
}

export const getElValue = el => {
  if (el === undefined || el === null || el === 'NULL') return 'NULL'
  return mysql.escape(el)
}

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

export const getPIDsArray = (pids, pid) => {
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
  } catch (e) {
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

// needed for serving 1x1 px GIF
const TRANSPARENT_GIF_BUFFER = Buffer.from(
  'R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=',
  'base64',
)

@ApiTags('Analytics')
@UseGuards(OptionalJwtAccessTokenGuard, RolesGuard)
@Controller(['log', 'v1/log'])
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly logger: AppLoggerService,
    private readonly taskManagerService: TaskManagerService,
  ) {}

  @Get('/')
  @Auth([], true, true)
  async getData(
    @Query() data: AnalyticsGET_DTO,
    @CurrentUserId() uid: string,
    isCaptcha = false,
  ): Promise<any> {
    const {
      pid,
      period,
      timeBucket,
      from,
      to,
      filters,
      timezone = DEFAULT_TIMEZONE,
    } = data
    this.analyticsService.validatePID(pid)

    if (!_isEmpty(period)) {
      this.analyticsService.validatePeriod(period)
    }

    this.analyticsService.validateTimebucket(timeBucket)
    const [filtersQuery, filtersParams] =
      this.analyticsService.getFiltersQuery(filters)
    await this.analyticsService.checkProjectAccess(pid, uid)

    let groupFrom = from
    let groupTo = to

    let queryCustoms = `SELECT ev, count() FROM customEV WHERE pid = {pid:FixedString(12)} ${filtersQuery} AND created BETWEEN {groupFrom:String} AND {groupTo:String} GROUP BY ev`
    // TODO: Refactor
    let subQuery = `FROM ${
      isCaptcha ? 'captcha' : 'analytics'
    } WHERE pid = {pid:FixedString(12)} ${filtersQuery} AND created BETWEEN {groupFrom:String} AND {groupTo:String}`
    let customEVFilterApplied = false

    // @ts-ignore
    if (filtersParams?.ev && !isCaptcha) {
      customEVFilterApplied = true
      queryCustoms = `SELECT ev, count() FROM customEV WHERE ${
        filtersParams.ev_exclusive ? 'NOT' : ''
      } ev = {ev:String} AND pid = {pid:FixedString(12)} ${filtersQuery} AND created BETWEEN {groupFrom:String} AND {groupTo:String} GROUP BY ev`

      subQuery = `FROM customEV WHERE ${
        filtersParams.ev_exclusive ? 'NOT' : ''
      } ev = {ev:String} AND pid = {pid:FixedString(12)} ${filtersQuery} AND created BETWEEN {groupFrom:String} AND {groupTo:String}`
    }

    const paramsData = {
      params: {
        pid,
        groupFrom: null,
        groupTo: null,
        ...filtersParams,
      },
    }

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

      checkIfTBAllowed(timeBucket, from, to)

      groupFrom = dayjs.tz(from, timezone).utc().format('YYYY-MM-DD HH:mm:ss')

      if (from === to) {
        groupTo = dayjs
          .tz(to, timezone)
          .add(1, 'day')
          .format('YYYY-MM-DD HH:mm:ss')
      } else {
        groupTo = dayjs.tz(to, timezone).format('YYYY-MM-DD HH:mm:ss')
      }
    } else if (!_isEmpty(period)) {
      if (period === 'today') {
        if (timezone !== DEFAULT_TIMEZONE && isValidTimezone(timezone)) {
          groupFrom = dayjs()
            .tz(timezone)
            .startOf('d')
            .utc()
            .format('YYYY-MM-DD HH:mm:ss')
          groupTo = dayjs().tz(timezone).utc().format('YYYY-MM-DD HH:mm:ss')
        } else {
          groupFrom = dayjs.utc().startOf('d').format('YYYY-MM-DD')
          groupTo = dayjs.utc().format('YYYY-MM-DD HH:mm:ss')
        }
      } else if (period === 'yesterday') {
        if (timezone !== DEFAULT_TIMEZONE && isValidTimezone(timezone)) {
          groupFrom = dayjs()
            .tz(timezone)
            .startOf('d')
            .subtract(1, 'day')
            .utc()
            .format('YYYY-MM-DD HH:mm:ss')
          groupTo = dayjs()
            .tz(timezone)
            .startOf('d')
            .utc()
            .format('YYYY-MM-DD HH:mm:ss')
        } else {
          groupFrom = dayjs
            .utc()
            .startOf('d')
            .subtract(1, 'day')
            .format('YYYY-MM-DD')
          groupTo = dayjs.utc().startOf('d').format('YYYY-MM-DD HH:mm:ss')
        }
      } else {
        groupFrom = dayjs
          .utc()
          .subtract(parseInt(period, 10), _last(period))
          .format('YYYY-MM-DD')
        groupTo = dayjs.utc().format('YYYY-MM-DD 23:59:59')

        checkIfTBAllowed(timeBucket, groupFrom, groupTo)
      }
    } else {
      throw new BadRequestException(
        'The timeframe (either from/to pair or period) has to be provided',
      )
    }

    paramsData.params = {
      ...paramsData.params,
      groupFrom,
      groupTo,
    }

    let result: object | void

    if (isCaptcha) {
      result = await this.analyticsService.groupCaptchaByTimeBucket(
        timeBucket,
        groupFrom,
        groupTo,
        subQuery,
        filtersQuery,
        paramsData,
        timezone,
      )
    } else {
      result = await this.analyticsService.groupByTimeBucket(
        timeBucket,
        groupFrom,
        groupTo,
        subQuery,
        filtersQuery,
        paramsData,
        timezone,
        customEVFilterApplied,
      )
    }

    let appliedFilters = filters

    if (filters) {
      try {
        appliedFilters = JSON.parse(filters)
        // eslint-disable-next-line no-empty
      } catch {}
    }

    if (isCaptcha) {
      return {
        ...result,
        appliedFilters,
      }
    }

    const customs = await this.analyticsService.processCustomEV(
      queryCustoms,
      paramsData,
    )

    return {
      ...result,
      customs,
      appliedFilters,
    }
  }

  @Get('/performance')
  @Auth([], true, true)
  async getPerfData(
    @Query() data: AnalyticsGET_DTO,
    @CurrentUserId() uid: string,
  ): Promise<any> {
    const {
      pid,
      period,
      timeBucket,
      from,
      to,
      filters,
      timezone = DEFAULT_TIMEZONE,
    } = data
    this.analyticsService.validatePID(pid)

    if (!_isEmpty(period)) {
      this.analyticsService.validatePeriod(period)
    }

    this.analyticsService.validateTimebucket(timeBucket)
    const [filtersQuery, filtersParams] =
      this.analyticsService.getFiltersQuery(filters)
    await this.analyticsService.checkProjectAccess(pid, uid)

    let groupFrom = from
    let groupTo = to

    const subQuery = `FROM performance WHERE pid = {pid:FixedString(12)} ${filtersQuery} AND created BETWEEN {groupFrom:String} AND {groupTo:String}`

    const paramsData = {
      params: {
        pid,
        groupFrom: null,
        groupTo: null,
        ...filtersParams,
      },
    }

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

      checkIfTBAllowed(timeBucket, from, to)

      groupFrom = dayjs.tz(from, timezone).utc().format('YYYY-MM-DD HH:mm:ss')

      if (from === to) {
        groupTo = dayjs
          .tz(to, timezone)
          .add(1, 'day')
          .format('YYYY-MM-DD HH:mm:ss')
      } else {
        groupTo = dayjs.tz(to, timezone).format('YYYY-MM-DD HH:mm:ss')
      }
    } else if (!_isEmpty(period)) {
      if (period === 'today') {
        if (timezone !== DEFAULT_TIMEZONE && isValidTimezone(timezone)) {
          groupFrom = dayjs()
            .tz(timezone)
            .startOf('d')
            .utc()
            .format('YYYY-MM-DD HH:mm:ss')
          groupTo = dayjs().tz(timezone).utc().format('YYYY-MM-DD HH:mm:ss')
        } else {
          groupFrom = dayjs.utc().startOf('d').format('YYYY-MM-DD')
          groupTo = dayjs.utc().format('YYYY-MM-DD HH:mm:ss')
        }
      } else if (period === 'yesterday') {
        if (timezone !== DEFAULT_TIMEZONE && isValidTimezone(timezone)) {
          groupFrom = dayjs()
            .tz(timezone)
            .startOf('d')
            .subtract(1, 'day')
            .utc()
            .format('YYYY-MM-DD HH:mm:ss')
          groupTo = dayjs()
            .tz(timezone)
            .startOf('d')
            .utc()
            .format('YYYY-MM-DD HH:mm:ss')
        } else {
          groupFrom = dayjs
            .utc()
            .startOf('d')
            .subtract(1, 'day')
            .format('YYYY-MM-DD')
          groupTo = dayjs.utc().startOf('d').format('YYYY-MM-DD HH:mm:ss')
        }
      } else {
        groupFrom = dayjs
          .utc()
          .subtract(parseInt(period, 10), _last(period))
          .format('YYYY-MM-DD')
        groupTo = dayjs.utc().format('YYYY-MM-DD 23:59:59')

        checkIfTBAllowed(timeBucket, groupFrom, groupTo)
      }
    } else {
      throw new BadRequestException(
        'The timeframe (either from/to pair or period) has to be provided',
      )
    }

    paramsData.params = {
      ...paramsData.params,
      groupFrom,
      groupTo,
    }

    const result = await this.analyticsService.groupPerfByTimeBucket(
      timeBucket,
      groupFrom,
      groupTo,
      subQuery,
      filtersQuery,
      paramsData,
      timezone,
    )

    let appliedFilters = filters

    if (filters) {
      try {
        appliedFilters = JSON.parse(filters)
        // eslint-disable-next-line no-empty
      } catch {}
    }

    return {
      ...result,
      appliedFilters,
    }
  }

  @Get('/captcha')
  @Auth([], true, true)
  async getCaptchaData(
    @Query() data: AnalyticsGET_DTO,
    @CurrentUserId() uid: string,
  ): Promise<any> {
    return this.getData(data, uid, true)
  }

  @Get('/birdseye')
  @Auth([], true, true)
  // returns overall short statistics per project
  async getOverallStats(
    @Query() data,
    @CurrentUserId() uid: string,
  ): Promise<any> {
    const { pids, pid } = data
    const pidsArray = getPIDsArray(pids, pid)

    const validationPromises = _map(pidsArray, async currentPID => {
      this.analyticsService.validatePID(currentPID)
      await this.analyticsService.checkProjectAccess(currentPID, uid)
    })

    await Promise.all(validationPromises)

    return this.analyticsService.getSummary(pidsArray, 'w')
  }

  @Get('/captcha/birdseye')
  @Auth([], true, true)
  // returns overall short statistics per CAPTCHA project
  async getCaptchaOverallStats(
    @Query() data,
    @CurrentUserId() uid: string,
  ): Promise<any> {
    const { pids, pid } = data
    const pidsArray = getPIDsArray(pids, pid)

    const validationPromises = _map(pidsArray, async currentPID => {
      this.analyticsService.validatePID(currentPID)
      await this.analyticsService.checkProjectAccess(currentPID, uid)
    })

    await Promise.all(validationPromises)

    return this.analyticsService.getCaptchaSummary(pidsArray, 'w')
  }

  @UseGuards(SelfhostedGuard)
  @Public()
  @Get('/generalStats')
  async getGeneralStats(): Promise<object> {
    const exists = await redis.exists(
      REDIS_USERS_COUNT_KEY,
      REDIS_PROJECTS_COUNT_KEY,
      REDIS_PAGEVIEWS_COUNT_KEY,
      REDIS_PERFORMANCE_COUNT_KEY,
    )

    if (exists) {
      const users = _toNumber(await redis.get(REDIS_USERS_COUNT_KEY))
      const projects = _toNumber(await redis.get(REDIS_PROJECTS_COUNT_KEY))
      const pageviews = _toNumber(await redis.get(REDIS_PAGEVIEWS_COUNT_KEY))
      const performance = _toNumber(
        await redis.get(REDIS_PERFORMANCE_COUNT_KEY),
      )

      return {
        users,
        projects,
        pageviews,
        performance,
      }
    }

    return this.taskManagerService.getGeneralStats()
  }

  @Get('/hb')
  async getHeartBeatStats(
    @Query() data,
    @CurrentUserId() uid: string,
  ): Promise<object> {
    const { pids, pid } = data
    const pidsArray = getPIDsArray(pids, pid)

    const validationPromises = _map(pidsArray, async currentPID => {
      this.analyticsService.validatePID(currentPID)
      await this.analyticsService.checkProjectAccess(currentPID, uid)
    })

    await Promise.all(validationPromises)

    const result = {}

    const keyCountPromises = _map(pidsArray, async currentPID => {
      // @ts-ignore
      const keysAmout = await redis.countKeysByPattern(`hb:${currentPID}:*`)
      result[currentPID] = keysAmout
    })

    await Promise.all(keyCountPromises).catch(reason => {
      this.logger.error(`[@Get('/hb')] ${reason}`)
    })

    return result
  }

  @Get('/liveVisitors')
  @Auth([], true, true)
  async getLiveVisitors(
    @Query() data,
    @CurrentUserId() uid: string,
  ): Promise<object> {
    const { pid } = data

    this.analyticsService.validatePID(pid)
    await this.analyticsService.checkProjectAccess(pid, uid)

    const keys = await redis.keys(`sd:*:${pid}`)

    if (_isEmpty(keys)) {
      return []
    }

    const sids = _map(keys, key => key.split(':')[1])

    const query = `SELECT sid, dv, br, os, cc FROM analytics WHERE sid IN (${sids
      .map(el => `'${el}'`)
      .join(',')})`
    const result = await clickhouse.query(query).toPromise()
    const processed = _map(_uniqBy(result, 'sid'), el =>
      _pick(el, ['dv', 'br', 'os', 'cc']),
    )

    return processed
  }

  // Log custom event
  @Post('/custom')
  @UseGuards(BotDetectionGuard)
  @BotDetection()
  @Public()
  async logCustom(
    @Body() eventsDTO: EventsDTO,
    @Headers() headers,
    @Ip() reqIP,
  ): Promise<any> {
    const { 'user-agent': userAgent, origin } = headers

    const ip =
      headers['cf-connecting-ip'] || headers['x-forwarded-for'] || reqIP || ''

    await this.analyticsService.validate(eventsDTO, origin, 'custom', ip)

    if (eventsDTO.unique) {
      const salt = await redis.get(REDIS_SESSION_SALT_KEY)
      const sessionHash = getSessionKeyCustom(
        ip,
        userAgent,
        eventsDTO.pid,
        eventsDTO.ev,
        salt,
      )
      const unique = await this.analyticsService.isUnique(sessionHash)

      if (!unique) {
        throw new ForbiddenException(
          'The unique option provided, while the custom event have already been created for this session',
        )
      }
    }

    const ua = UAParser(userAgent)
    const dv = ua.device.type || 'desktop'
    const br = ua.browser.name
    const os = ua.os.name
    // trying to get country from timezome, otherwise using CloudFlare's IP based country code as a fallback
    const cc =
      ct.getCountryForTimezone(eventsDTO.tz)?.id ||
      (headers['cf-ipcountry'] === 'XX' ? 'NULL' : headers['cf-ipcountry'])

    const dto = customLogDTO(
      eventsDTO.pid,
      eventsDTO.ev,
      eventsDTO.pg,
      dv,
      br,
      os,
      eventsDTO.lc,
      eventsDTO.ref,
      eventsDTO.so,
      eventsDTO.me,
      eventsDTO.ca,
      cc,
    )

    try {
      const values = `(${dto.map(getElValue).join(',')})`
      await redis.rpush(REDIS_LOG_CUSTOM_CACHE_KEY, values)
      return
    } catch (e) {
      this.logger.error(e)
      throw new InternalServerErrorException(
        'Error occured while saving the custom event',
      )
    }
  }

  @Post('/hb')
  @Auth([], true, true)
  async heartbeat(
    @Body() logDTO: PageviewsDTO,
    @Headers() headers,
    @Ip() reqIP,
  ): Promise<any> {
    const { 'user-agent': userAgent } = headers
    const { pid } = logDTO
    const ip =
      headers['cf-connecting-ip'] || headers['x-forwarded-for'] || reqIP || ''

    const sessionID = await this.analyticsService.validateHB(
      logDTO,
      userAgent,
      ip,
    )

    await redis.set(`hb:${pid}:${sessionID}`, 1, 'EX', HEARTBEAT_SID_LIFE_TIME)
    await this.analyticsService.processInteractionSD(sessionID, pid)
  }

  // Log pageview event
  @Post('/')
  @UseGuards(BotDetectionGuard)
  @BotDetection()
  @Public()
  async log(
    @Body() logDTO: PageviewsDTO,
    @Headers() headers,
    @Ip() reqIP,
  ): Promise<any> {
    const { 'user-agent': userAgent, origin } = headers

    const ip =
      headers['cf-connecting-ip'] || headers['x-forwarded-for'] || reqIP || ''

    await this.analyticsService.validate(logDTO, origin, 'log', ip)

    const salt = await redis.get(REDIS_SESSION_SALT_KEY)
    const sessionHash = getSessionKey(ip, userAgent, logDTO.pid, salt)
    const unique = await this.analyticsService.isUnique(sessionHash)
    this.analyticsService.processInteractionSD(sessionHash, logDTO.pid)
    let dto: Array<string | number>
    let perfDTO: Array<string | number> = []
    let ua: UAParser.IResult
    let cc

    if (unique) {
      ua = UAParser(userAgent)
      const dv = ua.device.type || 'desktop'
      const br = ua.browser.name
      const os = ua.os.name
      // trying to get country from timezome, otherwise using CloudFlare's IP based country code as a fallback
      cc =
        ct.getCountryForTimezone(logDTO.tz)?.id ||
        (headers['cf-ipcountry'] === 'XX' ? 'NULL' : headers['cf-ipcountry'])
      dto = analyticsDTO(
        sessionHash,
        logDTO.pid,
        logDTO.pg,
        dv,
        br,
        os,
        logDTO.lc,
        logDTO.ref,
        logDTO.so,
        logDTO.me,
        logDTO.ca,
        cc,
        0,
        1,
      )
    } else if (!logDTO.unique) {
      dto = analyticsDTO(
        'NULL',
        logDTO.pid,
        logDTO.pg,
        'NULL',
        'NULL',
        'NULL',
        'NULL',
        'NULL',
        'NULL',
        'NULL',
        'NULL',
        'NULL',
        'NULL',
        0,
      )
    } else {
      throw new BadRequestException(
        'Event was not saved because it was not unique while unique only param is provided',
      )
    }

    if (!_isEmpty(logDTO.perf) && isPerformanceValid(logDTO.perf)) {
      if (!ua) {
        ua = UAParser(userAgent)
      }

      if (!cc) {
        cc =
          ct.getCountryForTimezone(logDTO.tz)?.id ||
          (headers['cf-ipcountry'] === 'XX' ? 'NULL' : headers['cf-ipcountry'])
      }

      const dv = ua.device.type || 'desktop'
      const br = ua.browser.name

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

      perfDTO = performanceDTO(
        logDTO.pid,
        logDTO.pg,
        dv,
        br,
        cc,
        dns,
        tls,
        conn,
        response,
        render,
        domLoad,
        pageLoad,
        ttfb,
      )
    }

    const values = `(${dto.map(getElValue).join(',')})`
    const perfValues = `(${perfDTO.map(getElValue).join(',')})`
    try {
      await redis.rpush(REDIS_LOG_DATA_CACHE_KEY, values)

      if (!_isEmpty(perfDTO)) {
        await redis.rpush(REDIS_LOG_PERF_CACHE_KEY, perfValues)
      }

      return
    } catch (e) {
      this.logger.error(e)
      throw new InternalServerErrorException(
        'Error occured while saving the log data',
      )
    }
  }

  // Fallback for logging pageviews for users with JavaScript disabled
  // Returns 1x1 transparent gif
  @Get('/noscript')
  @Public()
  async noscript(
    @Query() data,
    @Headers() headers,
    @Ip() reqIP,
    @Response() res,
  ): Promise<any> {
    const { 'user-agent': userAgent, origin } = headers
    const { pid } = data

    // todo: create a decorator for bot traffic detection
    if (isbot(userAgent)) {
      res.writeHead(200, { 'Content-Type': 'image/gif' })
      return res.end(TRANSPARENT_GIF_BUFFER, 'binary')
    }

    const logDTO: PageviewsDTO = {
      pid,
    }

    await this.analyticsService.validate(logDTO, origin)

    const ip =
      headers['cf-connecting-ip'] || headers['x-forwarded-for'] || reqIP || ''

    const salt = await redis.get(REDIS_SESSION_SALT_KEY)
    const sessionHash = getSessionKey(ip, userAgent, logDTO.pid, salt)
    const unique = await this.analyticsService.isUnique(sessionHash)
    this.analyticsService.processInteractionSD(sessionHash, logDTO.pid)

    let dto: Array<string | number>

    if (unique) {
      const ua = UAParser(userAgent)
      const dv = ua.device.type || 'desktop'
      const br = ua.browser.name
      const os = ua.os.name
      // using CloudFlare's IP based country code
      const cc =
        headers['cf-ipcountry'] === 'XX' ? 'NULL' : headers['cf-ipcountry']
      dto = analyticsDTO(
        sessionHash,
        logDTO.pid,
        'NULL',
        dv,
        br,
        os,
        'NULL',
        'NULL',
        'NULL',
        'NULL',
        'NULL',
        cc,
        0,
        1,
      )
    } else {
      dto = analyticsDTO(
        'NULL',
        logDTO.pid,
        'NULL',
        'NULL',
        'NULL',
        'NULL',
        'NULL',
        'NULL',
        'NULL',
        'NULL',
        'NULL',
        'NULL',
        'NULL',
        0,
      )
    }

    const values = `(${dto.map(getElValue).join(',')})`
    try {
      await redis.rpush(REDIS_LOG_DATA_CACHE_KEY, values)
    } catch (e) {
      this.logger.error(e)
    }

    res.writeHead(200, { 'Content-Type': 'image/gif' })
    return res.end(TRANSPARENT_GIF_BUFFER, 'binary')
  }
}

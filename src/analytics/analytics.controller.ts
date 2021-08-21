import * as _isEmpty from 'lodash/isEmpty'
import * as _isNumber from 'lodash/isNumber'
import * as _isArray from 'lodash/isArray'
import * as _size from 'lodash/size'
import * as _last from 'lodash/last'
import * as _countBy from 'lodash/countBy'
import * as dayjs from 'dayjs'
import * as utc from 'dayjs/plugin/utc'
import { v4 as uuidv4 } from 'uuid'
import { hash } from 'blake3'
import {
  Controller, Body, Query, UseGuards, Get, Post, Headers, BadRequestException,
  InternalServerErrorException, NotImplementedException, UnprocessableEntityException, PreconditionFailedException,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import * as UAParser from 'ua-parser-js'

import { AnalyticsService } from './analytics.service'
import { ProjectService } from '../project/project.service'
import { UserType } from '../user/entities/user.entity'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from 'src/common/guards/roles.guard'
import { PageviewsDTO } from './dto/pageviews.dto'
import { EventsDTO } from './dto/events.dto'
import { AnalyticsGET_DTO } from './dto/getData.dto'
import { AppLoggerService } from '../logger/logger.service'
import {
  clickhouse, isValidPID, REDIS_LOG_DATA_CACHE_KEY, redis, REDIS_LOG_CUSTOM_CACHE_KEY,
} from '../common/constants'
import ct from '../common/countriesTimezones'

dayjs.extend(utc)

// todo: implement random salts
// store them in redis storage and reset every 24 hours
const getSessionKey = (ip: string, ua: string, pid: string, salt: string = '') => hash(`${ua}${ip}${pid}${salt}`).toString('hex')

const getSessionKeyCustom = (ip: string, ua: string, pid: string, ev: string, salt: string = '') => hash(`${ua}${ip}${pid}${ev}${salt}`).toString('hex')

const analyticsDTO = (pid: string, pg: string, dv: string, br: string, os: string, lc: string, ref: string, so: string, me: string, ca: string, lt: number | string, cc: string, unique: number): Array<string | number> => {
  return [uuidv4(), pid, pg, dv, br, os, lc, ref, so, me, ca, lt, cc, unique, dayjs.utc().format('YYYY-MM-DD HH:mm:ss')]
}

const customLogDTO = (pid: string, ev: string): Array<string> => {
  return [uuidv4(), pid, ev, dayjs.utc().format('YYYY-MM-DD HH:mm:ss')]
}

const getElValue = (el) => {
  if (el === undefined || el === null || el === 'NULL') return 'NULL'
  return `'${el}'`
}

@ApiTags('Analytics')
@UseGuards(RolesGuard)
@Controller('log')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly projectService: ProjectService,
    private readonly logger: AppLoggerService,
  ) { }

  @Get('/')
  @UseGuards(RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async getData(@Query() data: AnalyticsGET_DTO): Promise<any> {
    // this.logger.log({ ...data }, 'GET /log')

    const { pid, period, timeBucket, from, to } = data
    if (!isValidPID(pid)) throw new BadRequestException('The provided Project ID (pid) is incorrect')

    let groupFrom = from, groupTo = to
    // TODO: data validation
    // TODO: automatic timeBucket detection based on period provided

    let query = `SELECT * FROM analytics WHERE pid='${pid}'`
    let queryCustoms = `SELECT ev FROM customEV WHERE pid='${pid}'`

    if (!_isEmpty(from) && !_isEmpty(to)) {
      throw new NotImplementedException('Filtering by from/to params is currently not available')
      if (dayjs.utc(from).isAfter(dayjs.utc(to), 'second')) {
        throw new PreconditionFailedException('The timeframe \'from\' parameter cannot be greater than \'to\'')
      }

      if (dayjs.utc(to).isAfter(dayjs.utc(), 'second')) {
        groupTo = dayjs.utc().format('YYYY-MM-DD HH:mm:ss')
        query += `AND created BETWEEN ${from} AND ${groupTo}`
        queryCustoms += `AND created BETWEEN ${from} AND ${groupTo}`
      } else {
        query += `AND created BETWEEN ${from} AND ${to}`
        queryCustoms += `AND created BETWEEN ${from} AND ${to}`
      }
    } else if (!_isEmpty(period)) {
      groupFrom = dayjs.utc().subtract(parseInt(period), _last(period)).format('YYYY-MM-DD HH:mm:ss')
      groupTo = dayjs.utc().format('YYYY-MM-DD HH:mm:ss')
      query += `AND created BETWEEN '${groupFrom}' AND '${groupTo}'`
      queryCustoms += `AND created BETWEEN '${groupFrom}' AND '${groupTo}'`
    } else {
      throw new BadRequestException('The timeframe (either from/to pair or period) to be provided')
    }

    const response = await clickhouse.query(query).toPromise()
    const result = await this.analyticsService.groupByTimeBucket(response, timeBucket, groupFrom, groupTo)

    const customs = await clickhouse.query(queryCustoms).toPromise()

    return {
      ...result,
      customs: _countBy(customs, 'ev'),
    }
  }

  @Get('/birdseye')
  @UseGuards(RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  // returns overall short statistics per project
  async getOverallStats(@Query() data): Promise<any> {
    // this.logger.log({ ...data }, 'GET /birdseye')

    let { pids, pid } = data
    const pidsEmpty = _isEmpty(pids)
    const pidEmpty = _isEmpty(pid)
    if (pidsEmpty && pidEmpty) throw new BadRequestException('An array of Project ID\'s (pids) or a Project ID (pid) has to be provided')
    else if (!pidsEmpty && !pidEmpty) throw new BadRequestException('Please provide either an array of Project ID\'s (pids) or a Project ID (pid), but not both')
    else if (!pidEmpty) {
      pids = JSON.stringify([pid])
    }

    try {
      pids = JSON.parse(pids)
    } catch (e) {
      throw new UnprocessableEntityException('Cannot process the provided array of Project ID\'s')
    }

    if (!_isArray(pids)) {
      throw new UnprocessableEntityException('An array of Project ID\'s has to be provided as a \'pids\' param')
    }

    return this.analyticsService.getSummary(pids, 'w', true)
  }

  // Log custom event
  @Post('/custom')
  async logCustom(@Body() eventsDTO: EventsDTO, @Headers() headers): Promise<any> {
    // this.logger.log({ eventsDTO, headers }, 'POST /log/custom')

    const { 'user-agent': userAgent, origin } = headers
    await this.analyticsService.validate(eventsDTO, origin)

    const ip = headers['cf-connecting-ip'] || headers['x-forwarded-for'] || ''

    if (eventsDTO.unique) {
      const sessionHash = getSessionKeyCustom(ip, userAgent, eventsDTO.pid, eventsDTO.ev)
      const unique = await this.analyticsService.isUnique(sessionHash)

      if (!unique) {
        return
      }
    }

    const dto = customLogDTO(eventsDTO.pid, eventsDTO.ev)

    // todo: fix: may be vulnerable to sql injection attack
    const values = `(${dto.map(getElValue).join(',')})`
    try {
      await redis.rpush(REDIS_LOG_CUSTOM_CACHE_KEY, values)
      return
    } catch (e) {
      this.logger.error(e)
      throw new InternalServerErrorException('Error occured while saving the custom event')
    }
  }

  // Log pageview event
  @Post('/')
  async log(@Body() logDTO: PageviewsDTO, @Headers() headers): Promise<any> {
    // this.logger.log({ logDTO }, 'POST /log')

    const { 'user-agent': userAgent, origin } = headers
    await this.analyticsService.validate(logDTO, origin)

    // the NestJS server HAS TO be proxied either by Cloudflare or by NGINX, which are setting the request IP
    // if the app is hosted raw, @nestjs/common @Ip module should be used to retreive the request IP address
    const ip = headers['cf-connecting-ip'] || headers['x-forwarded-for'] || ''

    const sessionHash = getSessionKey(ip, userAgent, logDTO.pid)
    const unique = await this.analyticsService.isUnique(sessionHash)
    let dto: Array<string | number>

    if (unique) {
      const ua = UAParser(userAgent)
      const dv = ua.device.type || 'desktop'
      const br = ua.browser.name
      const os = ua.os.name
      // trying to get country from timezome, otherwise using CloudFlare's IP based country code as a fallback
      const cc = ct.getCountryForTimezone(logDTO.tz)?.id || (headers['cf-ipcountry'] === 'XX' ? 'NULL' : headers['cf-ipcountry'])
      dto = analyticsDTO(logDTO.pid, logDTO.pg, dv, br, os, logDTO.lc, logDTO.ref, logDTO.so, logDTO.me, logDTO.ca, logDTO.lt, cc, 1)
    } else if (!logDTO.unique) {
      dto = analyticsDTO(logDTO.pid, logDTO.pg, 'NULL', 'NULL', 'NULL', 'NULL', 'NULL', 'NULL', 'NULL', 'NULL', 'NULL', 'NULL', 0)
    } else {
      throw new BadRequestException('Event was not saved because it was not unique while unique only param is provided')
    }

    // todo: fix: may be vulnerable to sql injection attack
    const values = `(${dto.map(getElValue).join(',')})`
    try {
      await redis.rpush(REDIS_LOG_DATA_CACHE_KEY, values)
      return
    } catch (e) {
      this.logger.error(e)
      throw new InternalServerErrorException('Error occured while saving the log data')
    }
  }
}

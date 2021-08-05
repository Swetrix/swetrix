import * as _isEmpty from 'lodash/isEmpty'
import * as _isNumber from 'lodash/isNumber'
import * as _isArray from 'lodash/isArray'
import * as _size from 'lodash/size'
import * as _last from 'lodash/last'
import * as dayjs from 'dayjs'
import * as utc from 'dayjs/plugin/utc'
import { v4 as uuidv4 } from 'uuid'
import { hash } from 'blake3'
import {
  Controller, Body, Query, UseGuards, Get, Post, Ip, Headers, BadRequestException,
  InternalServerErrorException, NotImplementedException, UnprocessableEntityException,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

import { AnalyticsService } from './analytics.service'
import { ProjectService } from '../project/project.service'
import { UserType } from '../user/entities/user.entity'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from 'src/common/guards/roles.guard'
import { PageviewsDTO } from './dto/pageviews.dto'
import { AnalyticsGET_DTO } from './dto/getData.dto'
import { AppLoggerService } from '../logger/logger.service'
import {
  clickhouse, isValidPID, getPercentageChange, REDIS_LOG_DATA_CACHE_KEY, redis,
} from '../common/constants'
import ct from '../common/countriesTimezones'

dayjs.extend(utc)

// todo: implement random salts
// store them in redis storage and reset every 24 hours
const getSessionKey = (ip: string, ua: string, pid: string, salt: string = '') => hash(`${ua}${ip}${pid}${salt}`).toString('hex')

const analyticsDTO = (pid: string, ev: string, pg: string, lc: string, ref: string, sw: number | string, so: string, me: string, ca: string, lt: number | string, tz: string, unique: number): Array<string | number> => {
  const cc = tz === 'NULL' ? 'NULL' : ct.getCountryForTimezone(tz)?.id
  return [uuidv4(), pid, ev, pg, lc, ref, sw, so, me, ca, lt, cc, unique, dayjs.utc().format('YYYY-MM-DD HH:mm:ss')]
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
  // @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async getData(@Query() data: AnalyticsGET_DTO): Promise<any> {
    this.logger.log({ ...data }, 'GET /log')

    const { pid, period, timeBucket, from, to } = data
    if (!isValidPID(pid)) throw new BadRequestException('The provided Project ID (pid) is incorrect')

    let groupFrom = from, groupTo = to
    // TODO: data validation
    // TODO: automatic timeBucket detection based on period provided

    let query = `SELECT * FROM analytics WHERE pid='${pid}'`

    if (!_isEmpty(from) && !_isEmpty(to)) {
      throw new NotImplementedException('Filtering by from/to params is currently not available')
      if (dayjs.utc(from).isAfter(dayjs.utc(to), 'second')) {
        throw new BadRequestException('The timeframe \'from\' parameter cannot be greater than \'to\'')
      }

      if (dayjs.utc(to).isAfter(dayjs.utc(), 'second')) {
        groupTo = dayjs.utc().format('YYYY-MM-DD HH:mm:ss')
        query += `AND created BETWEEN ${from} AND ${groupTo}`
      } else {
        query += `AND created BETWEEN ${from} AND ${to}`
      }
    } else if (!_isEmpty(period)) {
      groupFrom = dayjs.utc().subtract(parseInt(period), _last(period)).format('YYYY-MM-DD HH:mm:ss')
      groupTo = dayjs.utc().format('YYYY-MM-DD HH:mm:ss')
      query += `AND created BETWEEN '${groupFrom}' AND '${groupTo}'`
    } else {
      throw new BadRequestException('The timeframe (either from/to pair or period) to be provided')
    }

    const response = await clickhouse.query(query).toPromise()
    const result = await this.analyticsService.groupByTimeBucket(response, timeBucket, groupFrom, groupTo)
    return result
  }

  @Get('/birdseye')
  @UseGuards(RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  // returns overall short statistics per project
  async getOverallStats(@Query() data): Promise<any> {
    this.logger.log({ ...data }, 'GET /birdseye')

    let { pids, pid } = data
    const pidsEmpty = _isEmpty(pids)
    const pidEmpty = _isEmpty(pid)
    if (pidsEmpty && pidEmpty) throw new BadRequestException('An array of Project ID\'s (pids) or a Project ID (pid) has to be provided')
    else if (!pidsEmpty && !pidEmpty) throw new BadRequestException('Please provide either an array of Project ID\'s (pids) or a Project ID (pid), but not both')
    else if (!pidEmpty) {
      pids = JSON.stringify([pid])
    }

    const result = { }

    try {
      pids = JSON.parse(pids)
    } catch (e) {
      throw new UnprocessableEntityException('Cannot process the provided array of Project ID\'s')
    }

    if (!_isArray(pids)) {
      throw new UnprocessableEntityException('An array of Project ID\'s has to be provided as a \'pids\' param')
    }

    for (let i = 0; i < _size(pids); ++i) {
      const pid = pids[i]
      if (!isValidPID(pid)) throw new BadRequestException(`The provided Project ID (${pid}) is incorrect`)

      const now = dayjs.utc().format('YYYY-MM-DD HH:mm:ss')
      const oneWRaw = dayjs.utc().subtract(1, 'w')
      const oneWeek = oneWRaw.format('YYYY-MM-DD HH:mm:ss')
      const twoWeeks = oneWRaw.subtract(1, 'w').format('YYYY-MM-DD HH:mm:ss')

      let query1 = `SELECT COUNT() FROM analytics WHERE pid='${pid}' AND created BETWEEN '${oneWeek}' AND '${now}'`
      let query2 = `SELECT COUNT() FROM analytics WHERE pid='${pid}' AND created BETWEEN '${twoWeeks}' AND '${oneWeek}'`

      // todo: save to redis
      try {
        const res1 = await clickhouse.query(query1).toPromise()
        const res2 = await clickhouse.query(query2).toPromise()
        const thisWeek = res1[0]['count()']
        const lastWeek = res2[0]['count()']

        result[pid] = {
          thisWeek,
          lastWeek,
          percChange: getPercentageChange(thisWeek, lastWeek),
        }
      } catch {
        throw new InternalServerErrorException('Can\'t process the provided PID. Please, try again later.')
      }
    }

    return result
  }

  @Post('/')
  async log(@Body() logDTO: PageviewsDTO, @Ip() ip, @Headers() headers): Promise<any> {
    this.logger.log({ logDTO, ip, headers }, 'POST /log')
    const { 'user-agent': userAgent, origin } = headers
    await this.analyticsService.validate(logDTO, origin)

    const sessionHash = getSessionKey(ip, userAgent, logDTO.pid)
    const unique = await this.analyticsService.isUnique(sessionHash)
    let dto: Array<string | number>

    if (unique) {
      dto = analyticsDTO(logDTO.pid, logDTO.ev, logDTO.pg, logDTO.lc, logDTO.ref, logDTO.sw, logDTO.so, logDTO.me, logDTO.ca, logDTO.lt, logDTO.tz, 1)
    } else {
      dto = analyticsDTO(logDTO.pid, logDTO.ev, logDTO.pg, 'NULL', 'NULL', 'NULL', 'NULL', 'NULL', 'NULL', 'NULL', 'NULL', 0)
    }

    // todo: fix: may be vulnerable to sql injection attack
    const values = `(${dto.map(getElValue).join(',')})`
    try {
      await redis.rpush(REDIS_LOG_DATA_CACHE_KEY, values)
      return
    } catch (e) {
      this.logger.error(e)
      throw new InternalServerErrorException(`Error error while saving the data: ${e}`)
    }
  }
}

import * as _isEmpty from 'lodash/isEmpty'
import * as _split from 'lodash/split'
import * as _size from 'lodash/size'
import * as _includes from 'lodash/includes'
import * as _map from 'lodash/map'
import * as _toUpper from 'lodash/toUpper'
import * as _join from 'lodash/join'
import * as _some from 'lodash/some'
import * as _find from 'lodash/find'
import * as _now from 'lodash/now'
import * as _values from 'lodash/values'
import * as _round from 'lodash/round'
import * as _clone from 'lodash/clone'
import * as _keys from 'lodash/keys'
import * as dayjs from 'dayjs'
import * as utc from 'dayjs/plugin/utc'
import * as dayjsTimezone from 'dayjs/plugin/timezone'
import * as ipRangeCheck from 'ip-range-check'
import validator from 'validator'
import { hash } from 'blake3'
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
  UnprocessableEntityException,
  PreconditionFailedException,
} from '@nestjs/common'

import {
  ACCOUNT_PLANS,
  DEFAULT_TIMEZONE,
  PlanCode,
} from '../user/entities/user.entity'
import {
  redis,
  isValidPID,
  UNIQUE_SESSION_LIFE_TIME,
  clickhouse,
  isSelfhosted,
  REDIS_SESSION_SALT_KEY,
} from '../common/constants'
import {
  calculateRelativePercentage,
  millisecondsToSeconds,
} from '../common/utils'
import { PageviewsDTO } from './dto/pageviews.dto'
import { EventsDTO } from './dto/events.dto'
import { ProjectService } from '../project/project.service'
import { Project } from '../project/entity/project.entity'
import { TimeBucketType } from './dto/getData.dto'

dayjs.extend(utc)
dayjs.extend(dayjsTimezone)

export const getSessionKey = (ip: string, ua: string, pid: string, salt = '') =>
  `ses_${hash(`${ua}${ip}${pid}${salt}`).toString('hex')}`

export const getSessionDurationKey = (sessionHash: string, pid: string) =>
  `sd:${sessionHash}:${pid}`

export const cols = [
  'cc',
  'pg',
  'lc',
  'br',
  'os',
  'dv',
  'ref',
  'so',
  'me',
  'ca',
]

export const captchaColumns = ['cc', 'br', 'os', 'dv']

export const perfCols = ['cc', 'pg', 'dv', 'br']

interface ChartCHResponse {
  index: number
  unique: number
  'count()': number
}

interface CustomsCHResponse {
  ev: string
  'count()': number
  index: number
}

const validPeriods = [
  'today',
  'yesterday',
  '1d',
  '7d',
  '4w',
  '3M',
  '12M',
  '24M',
]

const validTimebuckets = [
  TimeBucketType.HOUR,
  TimeBucketType.DAY,
  TimeBucketType.WEEK,
  TimeBucketType.MONTH,
]

// mapping of allowed timebuckets per difference between days
// (e.g. if difference is lower than (lt) (including) -> then the specified timebuckets are allowed to be applied)
const timeBucketToDays = [
  { lt: 7, tb: [TimeBucketType.HOUR, TimeBucketType.DAY] }, // 7 days
  { lt: 28, tb: [TimeBucketType.DAY, TimeBucketType.WEEK] }, // 4 weeks
  { lt: 366, tb: [TimeBucketType.WEEK, TimeBucketType.MONTH] }, // 12 months
  { lt: 732, tb: [TimeBucketType.MONTH] }, // 24 months
]

// Smaller than 64 characters, must start with an English letter and contain only letters (a-z A-Z), numbers (0-9), underscores (_) and dots (.)
// eslint-disable-next-line no-useless-escape
const customEVvalidate = /^[a-zA-Z](?:[\w\.]){0,62}$/

interface GetFiltersQuery extends Array<string | object> {
  0: string
  1: any
}

export const isValidTimezone = (timezone: string): boolean => {
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

export const checkIfTBAllowed = (
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

const nullifyMissingElements = (results: any[], size?: number): number[] => {
  if (!size) {
    return _map(results, r => r || 0)
  }

  const copy = _clone(results)

  for (let i = 0; i < size; ++i) {
    if (!copy[i]) {
      copy[i] = 0
    }
  }

  return copy
}

const generateParamsQuery = (col: string, subQuery: string): string => {
  // TODO: ??? idk, something should be done to improve it

  if (col === 'pg') {
    return `SELECT ${col}, count(*) ${subQuery} AND ${col} IS NOT NULL GROUP BY ${col}`
  }

  return `SELECT ${col}, count(*) ${subQuery} AND ${col} IS NOT NULL AND unique='1' GROUP BY ${col}`
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly projectService: ProjectService) {}

  async checkProjectAccess(pid: string, uid: string | null): Promise<void> {
    if (!isSelfhosted) {
      const project = await this.projectService.getRedisProject(pid)
      this.projectService.allowedToView(project, uid)
    }
  }

  checkOrigin(project: Project, origin: string): void {
    if (!_isEmpty(project.origins) && !_isEmpty(origin)) {
      if (origin === 'null') {
        if (!_includes(project.origins, 'null')) {
          throw new BadRequestException(
            "'null' origin is not added to your project's whitelist. To send requests from this origin either add it to your origins policy or leave it empty.",
          )
        }
      } else {
        const { hostname } = new URL(origin)
        if (!_includes(project.origins, hostname)) {
          throw new BadRequestException(
            "This origin is prohibited by the project's origins policy",
          )
        }
      }
    }
  }

  checkIpBlacklist(project: Project, ip: string): void {
    if (
      !_isEmpty(project.ipBlacklist) &&
      ipRangeCheck(ip, project.ipBlacklist)
    ) {
      throw new BadRequestException(
        'Incoming analytics is disabled for this IP address',
      )
    }
  }

  validatePID(pid: string): void {
    if (_isEmpty(pid))
      throw new BadRequestException('The Project ID (pid) has to be provided')
    if (!isValidPID(pid))
      throw new BadRequestException(
        'The provided Project ID (pid) is incorrect',
      )
  }

  async validate(
    logDTO: PageviewsDTO | EventsDTO,
    origin: string,
    type: 'custom' | 'log' = 'log',
    ip?: string,
  ): Promise<string | null> {
    if (_isEmpty(logDTO))
      throw new BadRequestException('The request cannot be empty')

    const { pid } = logDTO
    this.validatePID(pid)

    if (type === 'custom') {
      // @ts-ignore
      const { ev } = logDTO

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
    // @ts-ignore
    const { lc } = logDTO

    // validate locale ('lc' param)
    if (!_isEmpty(lc)) {
      if (validator.isLocale(lc)) {
        // uppercase the locale after '-' char, so for example both 'en-gb' and 'en-GB' in result will be 'en-GB'
        const lcParted = _split(lc, '-')

        if (_size(lcParted) > 1) {
          lcParted[1] = _toUpper(lcParted[1])
        }

        // @ts-ignore
        logDTO.lc = _join(lcParted, '-')
      } else {
        // @ts-ignore
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

    if (!isSelfhosted) {
      if (project.admin.planCode === PlanCode.none) {
        throw new ForbiddenException(
          'You cannot send analytics to this project due to no active subscription. Please upgrade your account plan to continue sending analytics.',
        )
      }

      const count = await this.projectService.getRedisCount(project.admin.id)
      const maxCount =
        ACCOUNT_PLANS[project.admin.planCode].monthlyUsageLimit || 0

      if (count >= maxCount) {
        throw new ForbiddenException(
          'You have exceeded the available monthly request limit for your account. Please upgrade your account plan if you need more requests.',
        )
      }
    }

    this.checkOrigin(project, origin)

    return null
  }

  async validateHB(
    logDTO: PageviewsDTO,
    userAgent: string,
    ip: string,
  ): Promise<string | null> {
    if (_isEmpty(logDTO))
      throw new BadRequestException('The request cannot be empty')

    const { pid } = logDTO
    this.validatePID(pid)

    const salt = await redis.get(REDIS_SESSION_SALT_KEY)
    const sessionHash = getSessionKey(ip, userAgent, pid, salt)
    const sessionExists = await this.isSessionOpen(sessionHash)

    if (!sessionExists)
      throw new ForbiddenException('The Heartbeat session does not exist')

    return sessionHash
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

  // returns SQL filters query in a format like 'AND col=value AND ...'
  getFiltersQuery(filters: string): GetFiltersQuery {
    // TODO: Use captchaColumns for validation of CAPTCHA filters
    let parsed = []
    let query = ''
    let params = {}

    if (_isEmpty(filters)) {
      return [query, params]
    }

    try {
      parsed = JSON.parse(filters)
    } catch (e) {
      console.error(`Cannot parse the filters array: ${filters}`)
      return [query, params]
    }

    if (_isEmpty(parsed)) {
      return [query, params]
    }

    for (let i = 0; i < _size(parsed); ++i) {
      const { column, filter, isExclusive } = parsed[i]

      if (column === 'ev') {
        params = {
          ...params,
          [column]: filter,
          [`${column}_exclusive`]: isExclusive,
        }

        continue
      }

      if (!_includes(cols, column)) {
        throw new UnprocessableEntityException(
          `The provided filter (${column}) is not supported`,
        )
      }
      // working only on 1 filter per 1 column
      const colFilter = `cf_${column}`

      params = {
        ...params,
        [colFilter]: filter,
      }
      query += ` ${
        isExclusive ? 'AND NOT' : 'AND'
      } ${column}={${colFilter}:String}`
    }

    return [query, params]
  }

  validateTimebucket(tb: TimeBucketType): void {
    if (!_includes(validTimebuckets, tb)) {
      throw new UnprocessableEntityException(
        'The provided timebucket is incorrect',
      )
    }
  }

  async isUnique(sessionHash: string) {
    const session = await redis.get(sessionHash)
    await redis.set(sessionHash, 1, 'EX', UNIQUE_SESSION_LIFE_TIME)
    return !session
  }

  async isSessionOpen(sessionHash: string) {
    const session = await redis.get(sessionHash)
    return Boolean(session)
  }

  async getSummary(
    pids: string[],
    period: 'w' | 'M' = 'w',
    amountToSubtract = 1,
  ): Promise<object> {
    const result = {}

    const promises = _map(pids, async pid => {
      if (!isValidPID(pid)) {
        throw new BadRequestException(
          `The provided Project ID (${pid}) is incorrect`,
        )
      }

      const now = dayjs.utc().format('YYYY-MM-DD HH:mm:ss')
      const oneWRaw = dayjs.utc().subtract(amountToSubtract, period)
      const oneWeek = oneWRaw.format('YYYY-MM-DD HH:mm:ss')
      const twoWeeks = oneWRaw
        .subtract(amountToSubtract, period)
        .format('YYYY-MM-DD HH:mm:ss')

      const query1 = `SELECT unique, count() FROM analytics WHERE pid = {pid:FixedString(12)} AND created BETWEEN {oneWeek:String} AND {now:String} GROUP BY unique`
      const query2 = `SELECT unique, count() FROM analytics WHERE pid = {pid:FixedString(12)} AND created BETWEEN {twoWeeks:String} AND {oneWeek:String} GROUP BY unique`

      const paramsData = {
        params: {
          pid,
          oneWeek,
          twoWeeks,
          now,
        },
      }

      try {
        const q1res = await clickhouse.query(query1, paramsData).toPromise()
        const q2res = await clickhouse.query(query2, paramsData).toPromise()

        const thisWeekUnique =
          _find(q1res, ({ unique }) => unique)?.['count()'] || 0
        const thisWeekPV =
          (_find(q1res, ({ unique }) => !unique)?.['count()'] || 0) +
          thisWeekUnique
        const lastWeekUnique =
          _find(q2res, ({ unique }) => unique)?.['count()'] || 0
        const lastWeekPV =
          (_find(q2res, ({ unique }) => !unique)?.['count()'] || 0) +
          lastWeekUnique

        result[pid] = {
          thisWeek: thisWeekPV,
          lastWeek: lastWeekPV,
          thisWeekUnique,
          lastWeekUnique,
          percChange: calculateRelativePercentage(lastWeekPV, thisWeekPV),
          percChangeUnique: calculateRelativePercentage(
            lastWeekUnique,
            thisWeekUnique,
          ),
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

  async getCaptchaSummary(
    pids: string[],
    period: 'w' | 'M' = 'w',
  ): Promise<object> {
    const result = {}

    const promises = _map(pids, async pid => {
      if (!isValidPID(pid)) {
        throw new BadRequestException(
          `The provided Project ID (${pid}) is incorrect`,
        )
      }

      const now = dayjs.utc().format('YYYY-MM-DD HH:mm:ss')
      const oneWRaw = dayjs.utc().subtract(1, period)
      const oneWeek = oneWRaw.format('YYYY-MM-DD HH:mm:ss')
      const twoWeeks = oneWRaw.subtract(1, period).format('YYYY-MM-DD HH:mm:ss')

      const query1 = `SELECT count() FROM captcha WHERE pid = {pid:FixedString(12)} AND created BETWEEN {oneWeek:String} AND {now:String}`
      const query2 = `SELECT count() FROM captcha WHERE pid = {pid:FixedString(12)} AND created BETWEEN {twoWeeks:String} AND {oneWeek:String}`

      const paramsData = {
        params: {
          pid,
          oneWeek,
          twoWeeks,
          now,
        },
      }

      try {
        const q1res = await clickhouse.query(query1, paramsData).toPromise()
        const q2res = await clickhouse.query(query2, paramsData).toPromise()

        const thisWeek = q1res?.['count()'] || 0
        const lastWeek = q2res?.['count()'] || 0

        result[pid] = {
          thisWeek,
          lastWeek,
          percChange: calculateRelativePercentage(lastWeek, thisWeek),
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

  async groupByTimeBucket(
    timeBucket: TimeBucketType,
    from: string,
    to: string,
    subQuery: string,
    filtersQuery: string,
    paramsData: any,
    timezone: string,
    customEVFilterApplied: boolean,
  ): Promise<object | void> {
    const params = {}

    const paramsPromises = _map(cols, async col => {
      const query1 = generateParamsQuery(col, subQuery)
      const res = await clickhouse.query(query1, paramsData).toPromise()

      params[col] = {}

      const size = _size(res)
      for (let j = 0; j < size; ++j) {
        const key = res[j][col]
        const value = res[j]['count()']
        params[col][key] = value
      }
    })

    await Promise.all(paramsPromises)

    if (!_some(_values(params), val => !_isEmpty(val))) {
      return Promise.resolve()
    }

    // Average session duration calculation
    let avgSdur = 0
    if (!customEVFilterApplied) {
      const avgSdurQuery = `SELECT avg(sdur) ${subQuery} AND sdur IS NOT NULL`
      const avgSdurObject = await clickhouse
        .query(avgSdurQuery, paramsData)
        .toPromise()
      avgSdur = _round(avgSdurObject[0]['avg(sdur)'])
    }

    let groupDateIterator
    const now = dayjs.utc().endOf(timeBucket)
    const djsTo = dayjs.utc(to).endOf(timeBucket)
    const iterateTo = djsTo > now ? now : djsTo

    switch (timeBucket) {
      case TimeBucketType.HOUR:
        groupDateIterator = dayjs.utc(from).startOf('hour')
        break

      case TimeBucketType.DAY:
      case TimeBucketType.WEEK:
      case TimeBucketType.MONTH:
        groupDateIterator = dayjs.utc(from).startOf('day')
        break

      default:
        return Promise.reject()
    }

    let x = []

    while (groupDateIterator < iterateTo) {
      const nextIteration = groupDateIterator.add(1, timeBucket)
      x.push(groupDateIterator.format('YYYY-MM-DD HH:mm:ss'))
      groupDateIterator = nextIteration
    }

    const xM = [...x, groupDateIterator.format('YYYY-MM-DD HH:mm:ss')]
    let query = ''

    if (customEVFilterApplied) {
      for (let i = 0; i < _size(x); ++i) {
        if (i > 0) {
          query += ' UNION ALL '
        }

        query += `select ${i} index, count() from customEV where ${
          paramsData.params.ev_exclusive ? 'NOT' : ''
        } ev = {ev:String} AND pid = {pid:FixedString(12)} and created between '${
          xM[i]
        }' and '${xM[1 + i]}' ${filtersQuery}`
      }

      // @ts-ignore
      const result: Array<ChartCHResponse> = (
        await clickhouse.query(query, paramsData).toPromise()
      )
        // @ts-ignore
        .sort((a, b) => a.index - b.index)

      const uniques = []
      const sdur = []

      for (let i = 0; i < _size(x); ++i) {
        uniques[i] = result[i]['count()']
        sdur[i] = 0
      }

      if (timezone !== DEFAULT_TIMEZONE && isValidTimezone(timezone)) {
        x = _map(x, el =>
          dayjs.utc(el).tz(timezone).format('YYYY-MM-DD HH:mm:ss'),
        )
      }

      return Promise.resolve({
        params,
        chart: {
          x,
          visits: uniques,
          uniques,
          sdur,
        },
        avgSdur,
      })
    }

    for (let i = 0; i < _size(x); ++i) {
      if (i > 0) {
        query += ' UNION ALL '
      }

      query += `select ${i} index, unique, count(), avg(sdur) from analytics where pid = {pid:FixedString(12)} and created between '${
        xM[i]
      }' and '${xM[1 + i]}' ${filtersQuery} group by unique`
    }

    // @ts-ignore
    const result: Array<ChartCHResponse> = (
      await clickhouse.query(query, paramsData).toPromise()
    )
      // @ts-ignore
      .sort((a, b) => a.index - b.index)

    let visits = []
    let uniques = []
    let sdur = []

    let idx = 0
    const resSize = _size(result)

    while (idx < resSize) {
      const { index } = result[idx]
      const v = result[idx]['count()']

      if (index === result[1 + idx]?.index) {
        const u = result[1 + idx]['count()']
        const s = result[1 + idx]['avg(sdur)']
        sdur[index] = _round(s)
        visits[index] = v + u
        uniques[index] = u
        idx += 2
        continue
      }

      const { unique } = result[idx]

      if (unique) {
        visits[index] = v
        uniques[index] = v
        const s = result[idx]['avg(sdur)']
        sdur[index] = _round(s)
      } else {
        visits[index] = v
        uniques[index] = 0
        sdur[index] = 0
      }
      idx++
    }

    visits = nullifyMissingElements(visits, _size(x))
    uniques = nullifyMissingElements(uniques, _size(x))

    if (timezone !== DEFAULT_TIMEZONE && isValidTimezone(timezone)) {
      x = _map(x, el =>
        dayjs.utc(el).tz(timezone).format('YYYY-MM-DD HH:mm:ss'),
      )
    }

    // to replace nulls with zeros
    sdur = _map(sdur, el => el || 0)

    // length of sdur is sometimes lower than uniques, let's fix it by adding zeros
    while (_size(sdur) < _size(uniques)) {
      sdur.push(0)
    }

    return Promise.resolve({
      params,
      chart: {
        x,
        visits,
        uniques,
        sdur,
      },
      avgSdur,
    })
  }

  async groupCaptchaByTimeBucket(
    timeBucket: TimeBucketType,
    from: string,
    to: string,
    subQuery: string,
    filtersQuery: string,
    paramsData: object,
    timezone: string,
  ): Promise<object | void> {
    const params = {}

    const paramsPromises = _map(captchaColumns, async captchaColumn => {
      const query1 = `SELECT ${captchaColumn}, count(*) ${subQuery} AND ${captchaColumn} IS NOT NULL GROUP BY ${captchaColumn}`
      const res = await clickhouse.query(query1, paramsData).toPromise()

      params[captchaColumn] = {}

      const size = _size(res)
      for (let j = 0; j < size; ++j) {
        const key = res[j][captchaColumn]
        const value = res[j]['count()']
        params[captchaColumn][key] = value
      }
    })

    await Promise.all(paramsPromises)

    if (!_some(_values(params), val => !_isEmpty(val))) {
      return Promise.resolve()
    }

    let groupDateIterator
    const now = dayjs.utc().endOf(timeBucket)
    const djsTo = dayjs.utc(to).endOf(timeBucket)
    const iterateTo = djsTo > now ? now : djsTo

    switch (timeBucket) {
      case TimeBucketType.HOUR:
        groupDateIterator = dayjs.utc(from).startOf('hour')
        break

      case TimeBucketType.DAY:
      case TimeBucketType.WEEK:
      case TimeBucketType.MONTH:
        groupDateIterator = dayjs.utc(from).startOf('day')
        break

      default:
        return Promise.reject()
    }

    let x = []

    while (groupDateIterator < iterateTo) {
      const nextIteration = groupDateIterator.add(1, timeBucket)
      x.push(groupDateIterator.format('YYYY-MM-DD HH:mm:ss'))
      groupDateIterator = nextIteration
    }

    const xM = [...x, groupDateIterator.format('YYYY-MM-DD HH:mm:ss')]
    let query = ''

    for (let i = 0; i < _size(x); ++i) {
      if (i > 0) {
        query += ' UNION ALL '
      }

      query += `select ${i} index, count() from captcha where pid = {pid:FixedString(12)} and created between '${
        xM[i]
      }' and '${xM[1 + i]}' ${filtersQuery}`
    }

    // @ts-ignore
    const result: Array<ChartCHResponse> = (
      await clickhouse.query(query, paramsData).toPromise()
    )
      // @ts-ignore
      .sort((a, b) => a.index - b.index)
    let results = []

    let idx = 0
    const resSize = _size(result)

    while (idx < resSize) {
      const { index } = result[idx]
      const v = result[idx]['count()']
      results[index] = v
      idx++
    }

    results = nullifyMissingElements(results, _size(x))

    if (timezone !== DEFAULT_TIMEZONE && isValidTimezone(timezone)) {
      x = _map(x, el =>
        dayjs.utc(el).tz(timezone).format('YYYY-MM-DD HH:mm:ss'),
      )
    }

    return Promise.resolve({
      params,
      chart: {
        x,
        results,
      },
    })
  }

  async groupPerfByTimeBucket(
    timeBucket: TimeBucketType,
    from: string,
    to: string,
    subQuery: string,
    filtersQuery: string,
    paramsData: object,
    timezone: string,
  ): Promise<object | void> {
    const params = {}

    const paramsPromises = _map(perfCols, async perfColumn => {
      const query = `SELECT ${perfColumn}, avg(pageLoad) ${subQuery} AND ${perfColumn} IS NOT NULL GROUP BY ${perfColumn}`
      const res = await clickhouse.query(query, paramsData).toPromise()

      params[perfColumn] = {}

      const size = _size(res)
      for (let j = 0; j < size; ++j) {
        const key = res[j][perfColumn]
        params[perfColumn][key] = _round(
          millisecondsToSeconds(res[j]['avg(pageLoad)']),
          2,
        )
      }
    })

    await Promise.all(paramsPromises)

    if (!_some(_values(params), val => !_isEmpty(val))) {
      return Promise.resolve()
    }

    let groupDateIterator
    const now = dayjs.utc().endOf(timeBucket)
    const djsTo = dayjs.utc(to).endOf(timeBucket)
    const iterateTo = djsTo > now ? now : djsTo

    switch (timeBucket) {
      case TimeBucketType.HOUR:
        groupDateIterator = dayjs.utc(from).startOf('hour')
        break

      case TimeBucketType.DAY:
      case TimeBucketType.WEEK:
      case TimeBucketType.MONTH:
        groupDateIterator = dayjs.utc(from).startOf('day')
        break

      default:
        return Promise.reject()
    }

    let x = []

    while (groupDateIterator < iterateTo) {
      const nextIteration = groupDateIterator.add(1, timeBucket)
      x.push(groupDateIterator.format('YYYY-MM-DD HH:mm:ss'))
      groupDateIterator = nextIteration
    }

    const xM = [...x, groupDateIterator.format('YYYY-MM-DD HH:mm:ss')]
    let query = ''

    for (let i = 0; i < _size(x); ++i) {
      if (i > 0) {
        query += ' UNION ALL '
      }

      query += `select ${i} index, avg(dns), avg(tls), avg(conn), avg(response), avg(render), avg(domLoad), avg(ttfb) from performance where pid = {pid:FixedString(12)} and created between '${
        xM[i]
      }' and '${xM[1 + i]}' ${filtersQuery} group by pid`
    }

    // @ts-ignore
    const result: Array<ChartCHResponse> = (
      await clickhouse.query(query, paramsData).toPromise()
    )
      // @ts-ignore
      .sort((a, b) => a.index - b.index)

    const dns = []
    const tls = []
    const conn = []
    const response = []
    const render = []
    const domLoad = []
    const ttfb = []

    let idx = 0
    const resSize = _size(result)

    while (idx < resSize) {
      const res = result[idx]
      const { index } = res

      dns[index] = _round(millisecondsToSeconds(res['avg(dns)']), 2)
      tls[index] = _round(millisecondsToSeconds(res['avg(tls)']), 2)
      conn[index] = _round(millisecondsToSeconds(res['avg(conn)']), 2)
      response[index] = _round(millisecondsToSeconds(res['avg(response)']), 2)
      render[index] = _round(millisecondsToSeconds(res['avg(render)']), 2)
      domLoad[index] = _round(millisecondsToSeconds(res['avg(domLoad)']), 2)
      ttfb[index] = _round(millisecondsToSeconds(res['avg(ttfb)']), 2)

      idx++
    }

    for (let i = 0; i < _size(x); ++i) {
      if (!dns[i]) dns[i] = 0
      if (!tls[i]) tls[i] = 0
      if (!conn[i]) conn[i] = 0
      if (!response[i]) response[i] = 0
      if (!render[i]) render[i] = 0
      if (!domLoad[i]) domLoad[i] = 0
      if (!ttfb[i]) ttfb[i] = 0
    }

    if (timezone !== DEFAULT_TIMEZONE && isValidTimezone(timezone)) {
      x = _map(x, el =>
        dayjs.utc(el).tz(timezone).format('YYYY-MM-DD HH:mm:ss'),
      )
    }

    return Promise.resolve({
      params,
      chart: {
        x,
        dns,
        tls,
        conn,
        response,
        render,
        domLoad,
        ttfb,
      },
    })
  }

  async processCustomEV(query: string, params: object): Promise<object> {
    const result = {}

    // @ts-ignore
    const rawCustoms: Array<CustomsCHResponse> = await clickhouse
      .query(query, params)
      .toPromise()
    const size = _size(rawCustoms)

    for (let i = 0; i < size; ++i) {
      const { ev, 'count()': c } = rawCustoms[i]
      result[ev] = c
    }

    return result
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
    timezone: string,
  ): Promise<object | void> {
    let groupDateIterator
    const now = dayjs.utc().endOf(timeBucket)
    const djsTo = dayjs.utc(to).endOf(timeBucket)
    const iterateTo = djsTo > now ? now : djsTo

    switch (timeBucket) {
      case TimeBucketType.HOUR:
        groupDateIterator = dayjs.utc(from).startOf('hour')
        break

      case TimeBucketType.DAY:
      case TimeBucketType.WEEK:
      case TimeBucketType.MONTH:
        groupDateIterator = dayjs.utc(from).startOf('day')
        break

      default:
        return Promise.reject()
    }

    let x = []

    while (groupDateIterator < iterateTo) {
      const nextIteration = groupDateIterator.add(1, timeBucket)
      x.push(groupDateIterator.format('YYYY-MM-DD HH:mm:ss'))
      groupDateIterator = nextIteration
    }

    const xM = [...x, groupDateIterator.format('YYYY-MM-DD HH:mm:ss')]
    let query = ''

    for (let i = 0; i < _size(x); ++i) {
      if (i > 0) {
        query += ' UNION ALL '
      }

      query += `select ${i} index, ev, count() from customEV where pid = {pid:FixedString(12)} and created between '${
        xM[i]
      }' and '${xM[1 + i]}' ${filtersQuery} group by pid, ev`
    }

    // @ts-ignore
    const result: Array<CustomsCHResponse> = (
      await clickhouse.query(query, paramsData).toPromise()
    )
      // @ts-ignore
      .sort((a, b) => a.index - b.index)

    const customEvents = {}

    for (let i = 0; i < _size(result); ++i) {
      const { ev, index } = result[i]

      if (!customEvents[ev]) {
        customEvents[ev] = []
      }

      customEvents[ev][index] = result[i]['count()']
    }

    const processedCustomEvents = _keys(customEvents)

    for (let i = 0; i < _size(processedCustomEvents); ++i) {
      const ev = processedCustomEvents[i]
      customEvents[ev] = nullifyMissingElements(customEvents[ev], _size(x))
    }

    if (timezone !== DEFAULT_TIMEZONE && isValidTimezone(timezone)) {
      x = _map(x, el =>
        dayjs.utc(el).tz(timezone).format('YYYY-MM-DD HH:mm:ss'),
      )
    }

    return Promise.resolve({
      chart: {
        x,
        events: customEvents,
      },
    })
  }
}

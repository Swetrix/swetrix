import * as _isEmpty from 'lodash/isEmpty'
import * as _isString from 'lodash/isString'
import * as _split from 'lodash/split'
import * as _filter from 'lodash/filter'
import * as _size from 'lodash/size'
import * as _isNull from 'lodash/isNull'
import * as _includes from 'lodash/includes'
import * as _map from 'lodash/map'
import * as _join from 'lodash/join'
import * as _every from 'lodash/every'
import * as _keys from 'lodash/keys'
import * as _values from 'lodash/values'
import * as dayjs from 'dayjs'
import * as utc from 'dayjs/plugin/utc'
import { hash } from 'blake3'
import {
  Injectable, BadRequestException, InternalServerErrorException, ForbiddenException,
} from '@nestjs/common'

import { ACCOUNT_PLANS } from '../user/entities/user.entity'
import {
  redis, isValidPID, getRedisProjectKey, redisProjectCacheTimeout,
  UNIQUE_SESSION_LIFE_TIME, clickhouse, getPercentageChange, getRedisUserCountKey,
  redisProjectCountCacheTimeout, isSelfhosted, // REDIS_SESSION_SALT_KEY,
} from '../common/constants'
import { getProjectsClickhouse } from '../common/utils'
import { PageviewsDTO } from './dto/pageviews.dto'
import { EventsDTO } from './dto/events.dto'
import { ProjectService } from '../project/project.service'
import { Project } from '../project/entity/project.entity'
import { TimeBucketType } from './dto/getData.dto'

dayjs.extend(utc)

export const getSessionKey = (ip: string, ua: string, pid: string, salt: string = '') => `ses_${hash(`${ua}${ip}${pid}${salt}`).toString('hex')}`

const cols = [
  'cc', 'pg', 'lc', 'br', 'os', 'dv', 'ref','so', 'me', 'ca',
]

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly projectService: ProjectService,
  ) { }

  async getRedisProject(pid: string): Promise<Project | null> {
    const pidKey = getRedisProjectKey(pid)
    let project: string | Project = await redis.get(pidKey)

    if (_isEmpty(project)) {
      if (isSelfhosted) {
        project = await getProjectsClickhouse(pid)
      } else {
        project = await this.projectService.findOne(pid, {
          relations: ['admin'],
          select: ['origins', 'active', 'admin', 'public']
        })
      }
      if (_isEmpty(project)) throw new BadRequestException('The provided Project ID (pid) is incorrect')
      await redis.set(pidKey, JSON.stringify(project), 'EX', redisProjectCacheTimeout)
    } else {
      try {
        project = JSON.parse(project)
      } catch {
        throw new InternalServerErrorException('Error while processing project')
      }
    }

    // @ts-ignore
    return project
  }

  async checkProjectAccess(pid: string, uid: string | null): Promise<void> {
    if (!isSelfhosted) {
      const project = await this.getRedisProject(pid)
      this.projectService.allowedToView(project, uid)
    }
  }

  // Returns amount of existing events starting from month
  async getRedisCount(uid: string): Promise<number | null> {
    const countKey = getRedisUserCountKey(uid)
    let count = await redis.get(countKey)

    if (_isEmpty(count)) {
      const now = dayjs.utc().format('YYYY-MM-DD HH:mm:ss')
      const monthStart = dayjs.utc().startOf('month').format('YYYY-MM-DD HH:mm:ss')

      let pids

      if (isSelfhosted) {
        const projects = await getProjectsClickhouse()
        pids = _map(projects, ({ id }) => id)
      } else {
        pids = await this.projectService.find({
          where: {
            admin: uid,
          },
          select: ['id'],
        })
      }

      const count_query = `SELECT COUNT() FROM analytics WHERE pid IN (${_join(_map(pids, el => `'${el.id}'`), ',')}) AND created BETWEEN '${monthStart}' AND '${now}'`
      const result = await clickhouse.query(count_query).toPromise()

      const pageviews = result[0]['count()']
      count = pageviews
      
      await redis.set(countKey, `${pageviews}`, 'EX', redisProjectCountCacheTimeout)
    } else {
      try {
        // @ts-ignore
        count = Number(count)
      } catch (e) {
        console.error(e)
        throw new InternalServerErrorException('Error while processing project')
      }
    }

    // @ts-ignore
    return count
  }

  checkOrigin(project: Project, origin: string): void {
    if (!_isEmpty(project.origins) && !_isEmpty(origin)) {
      if (origin === 'null') {
        if (!_includes(project.origins, 'null')) {
          throw new BadRequestException('\'null\' origin is not added to your project\'s whitelist. To send requests from this origin either add it to your origins policy or leave it empty.')
        }
      } else {
        const hostname = new URL(origin).hostname
        if (!_includes(project.origins, hostname)) {
          throw new BadRequestException('This origin is prohibited by the project\'s origins policy')
        }
      }
    }
  }

  validatePID(pid: string): void {
    if (_isEmpty(pid)) throw new BadRequestException('The Project ID (pid) has to be provided')
    if (!isValidPID(pid)) throw new BadRequestException('The provided Project ID (pid) is incorrect')
  }

  async validate(logDTO: PageviewsDTO | EventsDTO, origin: string): Promise<string | null> {
    if (_isEmpty(logDTO)) throw new BadRequestException('The request cannot be empty')

    const { pid } = logDTO
    this.validatePID(pid)

    if (logDTO instanceof EventsDTO && !_isEmpty(logDTO.ev) && _size(logDTO.ev) > 64) {
      throw new BadRequestException('An incorrect event name (ev) is provided')
    }

    const project = await this.getRedisProject(pid)

    if (!project.active) throw new BadRequestException('Incoming analytics is disabled for this project')

    if (!isSelfhosted) {
      const count = await this.getRedisCount(project.admin.id)
      const maxCount = ACCOUNT_PLANS[project.admin.planCode].monthlyUsageLimit || 0
  
      if (count >= maxCount) {
        throw new ForbiddenException('You have exceeded the available monthly request limit for your account. Please upgrade your account plan if you need more requests.')
      }
    }

    this.checkOrigin(project, origin)

    return null
  }

  async validateHB(logDTO: PageviewsDTO, userAgent: string, ip: string): Promise<string | null> {
    if (_isEmpty(logDTO)) throw new BadRequestException('The request cannot be empty')

    const { pid } = logDTO
    this.validatePID(pid)

    // const salt = await redis.get(REDIS_SESSION_SALT_KEY)
    const sessionHash = getSessionKey(ip, userAgent, pid/*, salt */)
    const sessionExists = await this.isSessionOpen(sessionHash)

    if (!sessionExists) throw new ForbiddenException('The Heartbeat session does not exist')

    return sessionHash
  }

  async isUnique(hash: string) {
    const session = await redis.get(hash)
    await redis.set(hash, 1, 'EX', UNIQUE_SESSION_LIFE_TIME)
    return !Boolean(session)
  }

  async isSessionOpen(hash: string) {
    const session = await redis.get(hash)
    return Boolean(session)
  }

  async getSummary(pids: string[], period: 'w' | 'M' = 'w', advanced: boolean = false): Promise<Object> {
    const result = {}
    for (let i = 0; i < _size(pids); ++i) {
      const pid = pids[i]
      if (!isValidPID(pid)) throw new BadRequestException(`The provided Project ID (${pid}) is incorrect`)

      const now = dayjs.utc().format('YYYY-MM-DD HH:mm:ss')
      const oneWRaw = dayjs.utc().subtract(1, period)
      const oneWeek = oneWRaw.format('YYYY-MM-DD HH:mm:ss')
      const twoWeeks = oneWRaw.subtract(1, period).format('YYYY-MM-DD HH:mm:ss')

      const query1_pageviews = `SELECT COUNT() FROM analytics WHERE pid='${pid}' AND created BETWEEN '${oneWeek}' AND '${now}'`
      const query2_pageviews = `SELECT COUNT() FROM analytics WHERE pid='${pid}' AND created BETWEEN '${twoWeeks}' AND '${oneWeek}'`
      const query1_unique = `SELECT COUNT() FROM analytics WHERE pid='${pid}' AND unique=1 AND created BETWEEN '${oneWeek}' AND '${now}'`
      const query2_unique = `SELECT COUNT() FROM analytics WHERE pid='${pid}' AND unique=1 AND created BETWEEN '${twoWeeks}' AND '${oneWeek}'`

      const query1 = `SELECT unique, count() FROM analytics WHERE pid='${pid}' AND created BETWEEN '${oneWeek}' AND '${now}' GROUP BY unique`
      const query2 = `SELECT unique, count() FROM analytics WHERE pid='${pid}' AND created BETWEEN '${twoWeeks}' AND '${oneWeek}' GROUP BY unique`

      const q1res = await clickhouse.query(query1).toPromise()
      const q2res = await clickhouse.query(query2).toPromise()

      console.log(q1res, q2res)

      try {
        const res1_pageviews = await clickhouse.query(query1_pageviews).toPromise()
        const res2_pageviews = await clickhouse.query(query2_pageviews).toPromise()
        const thisWeekPV = res1_pageviews[0]['count()']
        const lastWeekPV = res2_pageviews[0]['count()']

        if (advanced) {
          const res1_unique = await clickhouse.query(query1_unique).toPromise()
          const res2_unique = await clickhouse.query(query2_unique).toPromise()
          const thisWeekUnique = res1_unique[0]['count()']
          const lastWeekUnique = res2_unique[0]['count()']

          result[pid] = {
            thisWeek: thisWeekPV,
            lastWeek: lastWeekPV,
            thisWeekUnique,
            lastWeekUnique,
            percChange: getPercentageChange(thisWeekPV, lastWeekPV),
            percChangeUnique: getPercentageChange(thisWeekUnique, lastWeekUnique),
          }
        } else {
          result[pid] = {
            thisWeek: thisWeekPV,
            lastWeek: lastWeekPV,
            percChange: getPercentageChange(thisWeekPV, lastWeekPV),
          }
        }
      } catch {
        throw new InternalServerErrorException('Can\'t process the provided PID. Please, try again later.')
      }
    }

    return result
  }

  async groupByTimeBucket(timeBucket: TimeBucketType, from: string, to: string, subQuery: string, pid: string): Promise<object | void> {
    const params = {}

    for (let i of cols) {
      const query1 = `SELECT ${i}, count(*) ${subQuery} AND ${i} IS NOT NULL GROUP BY ${i}`
      const res = await clickhouse.query(query1).toPromise()

      params[i] = {}

      const size = _size(res)
      for (let j = 0; j < size; ++j) {
        const key = res[j][i]
        const value = res[j]['count()']
        params[i][key] = value
      }
    }

    if (_every(_values(params), _isEmpty)) {
      return Promise.resolve()
    }

    let groupDateIterator
    const now = dayjs.utc().endOf(timeBucket)
    const djsTo = dayjs.utc(to).endOf(timeBucket)
    const iterateTo = djsTo > now ? now : djsTo

    switch (timeBucket) {
      case TimeBucketType.MINUTE:
        groupDateIterator = dayjs.utc(from).startOf('minute')
        break

      case TimeBucketType.HOUR:
        groupDateIterator = dayjs.utc(from).startOf('hour')
        break

      case TimeBucketType.DAY:
      case TimeBucketType.WEEK:
      case TimeBucketType.MONTH:
      case TimeBucketType.YEAR:
        groupDateIterator = dayjs.utc(from).startOf('day')
        break

      default:
        return Promise.reject()
    }

    const x = []

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

      query += `select ${i} index, unique, count() from analytics where pid='${pid}' and created between '${xM[i]}' and '${xM[1 + i]}' group by unique`
    }

    // @ts-ignore
    const result = (await clickhouse.query(query).toPromise()).sort((a, b) => a.index - b.index)
    const visits = []
    const uniques = []

    for (let i = 0; i < _size(result); i += 2) {
      const v = result[i]['count()']
      const u = result[1 + i]['count()']
      // @ts-ignore
      const index = result[i].index

      visits[index] = v + u
      uniques[index] = u
    }

    for (let i = 0; i < _size(x); ++i) {
      if (!visits[i]) {
        visits[i] = 0
        uniques[i] = 0
      }
    }

    // TODO: SEEMS LIKE IT RETURNS INCORRECT DATA FOR HOUR PERIOD
    return Promise.resolve({
      params,
      chart: {
        x,
        visits,
        uniques,
      },
    })
  }
}

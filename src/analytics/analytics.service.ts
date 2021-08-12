import * as _isEmpty from 'lodash/isEmpty'
import * as _filter from 'lodash/filter'
import * as _size from 'lodash/size'
import * as _isNull from 'lodash/isNull'
import * as _includes from 'lodash/includes'
import * as _map from 'lodash/map'
import * as _join from 'lodash/join'
import * as _keys from 'lodash/keys'
import * as dayjs from 'dayjs'
import * as utc from 'dayjs/plugin/utc'
import {
  Injectable, BadRequestException, InternalServerErrorException, ForbiddenException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { ACCOUNT_PLANS } from '../user/entities/user.entity'
import {
  redis, isValidPID, getRedisProjectKey, redisProjectCacheTimeout,
  UNIQUE_SESSION_LIFE_TIME, clickhouse, getPercentageChange, getRedisUserCountKey,
  redisProjectCountCacheTimeout,
} from '../common/constants'
import { Analytics } from './entities/analytics.entity'
import { PageviewsDTO } from './dto/pageviews.dto'
import { EventsDTO } from './dto/events.dto'
import { ProjectService } from '../project/project.service'
import { Project } from '../project/entity/project.entity'
import { TimeBucketType } from './dto/getData.dto'

dayjs.extend(utc)

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Analytics)
    private analyticsRepository: Repository<Analytics>,
    private readonly projectService: ProjectService,
  ) { }

  count(): Promise<number> {
    return this.analyticsRepository.count()
  }

  async create(project: PageviewsDTO | Analytics): Promise<PageviewsDTO | Analytics> {
    return this.analyticsRepository.save(project)
  }

  async update(id: string, eventsDTO: PageviewsDTO): Promise<any> {
    return this.analyticsRepository.update(id, eventsDTO)
  }

  async delete(id: string): Promise<any> {
    return this.analyticsRepository.delete(id)
  }

  findOne(id: string): Promise<Analytics | null> {
    return this.analyticsRepository.findOne(id)
  }

  findOneWhere(where: Record<string, unknown>): Promise<Analytics> {
    return this.analyticsRepository.findOne({ where })
  }

  findWhere(where: Record<string, unknown>): Promise<Analytics[]> {
    return this.analyticsRepository.find({ where })
  }

  async getRedisProject(pid: string): Promise<Project | null> {
    const pidKey = getRedisProjectKey(pid)
    let project = await redis.get(pidKey)
    if (_isEmpty(project)) {
      project = await this.projectService.findOneWithRelations(pid)
      if (_isEmpty(project)) throw new BadRequestException('The provided Project ID (pid) is incorrect')
      await redis.set(pidKey, JSON.stringify(project), 'EX', redisProjectCacheTimeout)
    } else {
      try {
        project = JSON.parse(project)
      } catch {
        throw new InternalServerErrorException('Error while processing project')
      }
    }

    return project
  }

  // Returns amount of existing events starting from month
  async getRedisCount(uid: string): Promise<number | null> {
    const countKey = getRedisUserCountKey(uid)
    let count = await redis.get(countKey)

    if (_isEmpty(count)) {
      const now = dayjs.utc().format('YYYY-MM-DD HH:mm:ss')
      const monthStart = dayjs.utc().startOf('month').format('YYYY-MM-DD HH:mm:ss')
      const pids = await this.projectService.find({
        where: {
          admin: uid,
        },
        select: ['id'],
      })

      const count_query = `SELECT COUNT() FROM analytics WHERE pid IN (${_join(_map(pids, el => `'${el.id}'`), ',')}) AND created BETWEEN '${monthStart}' AND '${now}'`
      const result = await clickhouse.query(count_query).toPromise()

      const pageviews = result[0]['count()']
      count = pageviews
      
      await redis.set(countKey, `${pageviews}`, 'EX', redisProjectCountCacheTimeout)
    } else {
      try {
        count = Number(count)
      } catch (e) {
        console.error(e)
        throw new InternalServerErrorException('Error while processing project')
      }
    }
    
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
  
  // TODO: Remove unnecessary checks (because some of them are already checked in the DTO)
  async validate(logDTO: PageviewsDTO | EventsDTO, origin: string): Promise<string | null> {
    if (_isEmpty(logDTO)) throw new BadRequestException('The request cannot be empty')
    const { pid } = logDTO

    if (_isEmpty(pid)) throw new BadRequestException('The Project ID (pid) has to be provided')
    if (!isValidPID(pid)) throw new BadRequestException('The provided Project ID (pid) is incorrect')

    if (logDTO instanceof EventsDTO && !_isEmpty(logDTO.ev) && _size(logDTO.ev) > 64) {
      throw new BadRequestException('An incorrect event name (ev) is provided')
    }

    const project = await this.getRedisProject(pid)

    if (!project.active) throw new BadRequestException('Incoming analytics is disabled for this project')

    const count = await this.getRedisCount(project.admin.id)
    const maxCount = ACCOUNT_PLANS[project.admin.planCode].monthlyUsageLimit || 0

    if (count >= maxCount) {
      throw new ForbiddenException('You have exceeded the available monthly request limit for your account. Please upgrade your account plan if you need more requests.')
    }

    this.checkOrigin(project, origin)

    return null
  }

  async isUnique(hash: string) {
    const session = await redis.get(hash)
    await redis.set(hash, 1, 'EX', UNIQUE_SESSION_LIFE_TIME)
    return !Boolean(session)
  }

  processData(data: object): object {
    const res = {
      cc: {},
      pg: {},
      lc: {},
      br: {},
      os: {},
      dv: {},
      ref: {},
      so: {},
      me: {},
      ca: {},
      lt: {},
    }
    const whitelist = _keys(res)
  
    for (let i = 0; i < _size(data); ++i) {
      const tfData = data[i].data
      for (let j = 0; j < _size(tfData); ++j) {
        for (let z = 0; z < _size(whitelist); ++z) {
          const currWLItem = whitelist[z]
          const tfDataRecord = tfData[j][currWLItem]
          if (!_isNull(tfDataRecord)) {
            res[currWLItem][tfDataRecord] = 1 + (res[currWLItem][tfDataRecord] || 0)
          }
        }
      }
    }
  
    return res
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

      // todo: save to redis
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

  // TODO: Refactor; check if there's no date/time shifts
  async groupByTimeBucket(data: Object[], timeBucket: TimeBucketType, from: string, to: string): Promise<object | void> {
    if (_isEmpty(data)) return Promise.resolve()
    let groupDateIterator
    let clone = [...data]
    const res = []

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

    // the database has to use UTC timezone for this to work normally
    while (groupDateIterator < iterateTo) {
      const nextIteration = groupDateIterator.add(1, timeBucket)
      const temp = []
      const tempUnique = []
      
      clone = _filter(clone, el => {
        const createdAt = dayjs.utc(el.created)
        if (groupDateIterator <= createdAt && createdAt < nextIteration) {
          if (el.unique) {
            tempUnique.push(el)
          }
          temp.push(el)
          return false
        } else {
          return true
        }
      })

      res.push({
        data: temp,
        total: _size(temp),
        totalUnique: _size(tempUnique),
        timeFrame: groupDateIterator.format('YYYY-MM-DD HH:mm:ss'),
      })
      groupDateIterator = nextIteration
    }

    return Promise.resolve({
      params: this.processData(res),
      chart: {
        x: _map(res, el => el.timeFrame),
        visits: _map(res, el => el.total),
        uniques: _map(res, el => el.totalUnique),
      },
    })
  }
}

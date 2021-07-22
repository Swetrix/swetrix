import * as _isEmpty from 'lodash/isEmpty'
import * as _filter from 'lodash/filter'
import * as _size from 'lodash/size'
import * as _isNull from 'lodash/isNull'
import * as _includes from 'lodash/includes'
import * as _map from 'lodash/map'
import * as _keys from 'lodash/keys'
import * as dayjs from 'dayjs'
import * as utc from 'dayjs/plugin/utc'
import { ForbiddenException, Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { Pagination, PaginationOptionsInterface } from '../common/pagination'
import {
  redis, isValidPID, getRedisProjectKey, redisProjectCacheTimeout,
  UNIQUE_SESSION_LIFE_TIME,
} from '../common/constants'
import { Analytics } from './entities/analytics.entity'
import { PageviewsDTO } from './dto/pageviews.dto'
import { ProjectService } from '../project/project.service'
import { TimeBucketType } from './dto/getData.dto'

dayjs.extend(utc)

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Analytics)
    private analyticsRepository: Repository<Analytics>,
    private readonly projectService: ProjectService,
  ) { }

  // async paginate(options: PaginationOptionsInterface, where: Record<string, unknown> | undefined): Promise<Pagination<Analytics>> {
  //   const [results, total] = await this.analyticsRepository.findAndCount({
  //     take: options.take || 10,
  //     skip: options.skip || 0,
  //     where: where,
  //     order: {
  //       name: 'ASC',
  //     }
  //   })

  //   return new Pagination<Analytics>({
  //     results,
  //     total,
  //   })
  // }

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

  async validate(logDTO: PageviewsDTO, origin: string): Promise<string | null> {
    if (_isEmpty(logDTO)) throw new BadRequestException('The request cannot be empty')
    const { pid } = logDTO 

    if (_isEmpty(pid)) throw new BadRequestException('The Project ID (pid) has to be provided')
    if (!isValidPID(pid)) throw new BadRequestException('The provided Project ID (pid) is incorrect')

    const pidKey = getRedisProjectKey(pid)
    let project = await redis.get(pidKey)
    if (_isEmpty(project)) {
      project = await this.projectService.findOne(pid)
      if (_isEmpty(project)) throw new BadRequestException('The provided Project ID (pid) is incorrect')
      await redis.set(pidKey, JSON.stringify(project), 'EX', redisProjectCacheTimeout)
    } else {
      try {
        project = JSON.parse(project)
      } catch {
        throw new InternalServerErrorException('Error while processing project')
      }
    }

    if (!project.active) throw new BadRequestException('Incoming analytics is disabled for this project')

    if (!_isEmpty(project.origins) && !_isEmpty(origin)) {
      const hostname = new URL(origin).hostname
      if (!_includes(project.origins, hostname)) {
        throw new BadRequestException('This origin is prohibited by the project\'s origins policy')
      }
    }

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
      ref: {},
      sw: {},
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

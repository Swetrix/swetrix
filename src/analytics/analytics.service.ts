import * as _isEmpty from 'lodash/isEmpty'
import * as _filter from 'lodash/filter'
import * as _size from 'lodash/size'
import * as moment from 'moment'
import { ForbiddenException, Injectable, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { Pagination, PaginationOptionsInterface } from '../common/pagination'
import { Analytics } from './entities/analytics.entity'
import { PageviewsDTO } from './dto/pageviews.dto'
import { ProjectService } from '../project/project.service'
import { TimeBucketType } from './dto/getData.dto'

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

  async validate(logDTO: PageviewsDTO): Promise<string | null> {
    const errors = []
    if (_isEmpty(logDTO)) errors.push('The request cannot be empty')
    if (_isEmpty(logDTO.pid)) errors.push('The Project ID (pid) has to be provided')

    const project = await this.projectService.findOne(logDTO.pid)
    if (_isEmpty(project)) errors.push('The provided Project ID (pid) is incorrect')

    if (!_isEmpty(errors)) {
      throw new BadRequestException(errors)
    }

    return null
  }

  // TODO: Refactor; check if there's no date/time shifts
  async groupByTimeBucket(data: Analytics[], timeBucket: TimeBucketType, from: string, to: string): Promise<object | void> {
    if (_isEmpty(data)) return Promise.resolve()
    let clone = [...data]
    const res = []
    let groupDateIterator, iterateTo

    switch (timeBucket) {
      case TimeBucketType.HOUR:
        groupDateIterator = moment.utc(from).startOf('hour')
        iterateTo = moment.utc(to).endOf('hour')
        break

      case TimeBucketType.DAY:
      case TimeBucketType.WEEK:
      case TimeBucketType.MONTH:
      case TimeBucketType.YEAR:
        groupDateIterator = moment.utc(from).startOf('day')
        iterateTo = moment.utc(to).endOf('day')
        break

      default:
        return Promise.reject()
    }

    while (groupDateIterator < iterateTo) {
      const nextIteration = moment(groupDateIterator).add(1, timeBucket)
      const temp = []
      
      clone = _filter(clone, el => {
        const createdAt = moment.utc(el.created)
        if (groupDateIterator <= createdAt && createdAt < nextIteration) {
          temp.push(el)
          return false
        } else {
          return true
        }
      })
      
      res.push({
        data: temp,
        total: _size(temp),
        timeFrame: groupDateIterator.format('YYYY-MM-DD HH:mm:ss'),
        timeBucket,
      })
      groupDateIterator = nextIteration
    }

    return Promise.resolve(res)
  }
}

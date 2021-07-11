import * as _isEmpty from 'lodash/isEmpty'
import { ForbiddenException, Injectable, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { Pagination, PaginationOptionsInterface } from '../common/pagination'
import { Analytics } from './entities/analytics.entity'
import { PageviewsDTO } from './dto/pageviews.dto'
import { ProjectService } from '../project/project.service'

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Analytics)
    private analyticsRepository: Repository<Analytics>,
    private readonly projectService: ProjectService
  ) {}

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

  async create(project: PageviewsDTO | Analytics): Promise<Analytics> {
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

  validate(logDTO: PageviewsDTO): string | null {
    const errors = []
    if (_isEmpty(logDTO)) errors.push('The request cannot be empty')
    if (_isEmpty(logDTO.pid)) errors.push('The Project ID has to be provided')

    if (!_isEmpty(errors)) {
      throw new BadRequestException(errors)
    }

    return null
  }
}

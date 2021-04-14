import { ForbiddenException, Injectable, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { Pagination, PaginationOptionsInterface } from '../common/pagination'
import { Analytics } from './entity/analytics.entity'
import { EventsDTO } from './dto/events.dto'
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

  async create(project: EventsDTO | Analytics): Promise<Analytics> {
    return this.analyticsRepository.save(project)
  }

  async update(id: string, eventsDTO: EventsDTO): Promise<any> {
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
}

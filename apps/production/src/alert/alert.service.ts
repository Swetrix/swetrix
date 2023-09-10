import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Pagination, PaginationOptionsInterface } from '../common/pagination'
import { Alert } from './entity/alert.entity'
import { AlertDTO } from './dto/alert.dto'

@Injectable()
export class AlertService {
  constructor(
    @InjectRepository(Alert)
    private alertsReporsitory: Repository<Alert>,
  ) {}

  async paginate(
    options: PaginationOptionsInterface,
    where: Record<string, unknown> | undefined,
    relations?: Array<string>,
  ): Promise<Pagination<Alert>> {
    const [results, total] = await this.alertsReporsitory.findAndCount({
      take: options.take || 100,
      skip: options.skip || 0,
      where,
      order: {
        name: 'ASC',
      },
      relations,
    })

    return new Pagination<Alert>({
      results,
      total,
    })
  }

  findOneWithRelations(id: string): Promise<Alert | null> {
    return this.alertsReporsitory.findOne(id, {
      relations: ['project', 'project.admin'],
    })
  }

  async count(options: object = {}): Promise<number> {
    return this.alertsReporsitory.count(options)
  }

  findOne(id: string, params: object = {}): Promise<Alert | null> {
    return this.alertsReporsitory.findOne(id, params)
  }

  findWhere(
    where: Record<string, unknown>,
    relations?: string[],
  ): Promise<Alert[]> {
    return this.alertsReporsitory.find({ where, relations })
  }

  find(params: object): Promise<Alert[]> {
    return this.alertsReporsitory.find(params)
  }

  findOneWhere(
    where: Record<string, unknown>,
    params: object = {},
  ): Promise<Alert> {
    return this.alertsReporsitory.findOne({ where, ...params })
  }

  async create(alert: AlertDTO | Alert): Promise<Alert> {
    return this.alertsReporsitory.save(alert)
  }

  async update(id: string, alertDTO: AlertDTO | Alert): Promise<any> {
    return this.alertsReporsitory.update(id, alertDTO)
  }

  async delete(id: string): Promise<any> {
    return this.alertsReporsitory.delete(id)
  }

  async deleteMultiple(ids: string[]): Promise<any> {
    return (
      this.alertsReporsitory
        .createQueryBuilder()
        .delete()
        // TODO: !!! Enforce Prepared Statements and Parameterization
        .where(`id IN (${ids})`)
        .execute()
    )
  }
}

import {
  Injectable,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Alert } from './entity/alert.entity'
import { AlertDTO } from './dto/alert.dto'

@Injectable()
export class AlertService {
  constructor(
    @InjectRepository(Alert)
    private alertsReporsitory: Repository<Alert>,
  ) {}

  findOneWithRelations(id: string): Promise<Alert | null> {
    return this.alertsReporsitory.findOne(id, { relations: ['project'] })
  }

  findOne(id: string, params: Object = {}): Promise<Alert | null> {
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

  async create(project: AlertDTO | Alert): Promise<Alert> {
    return this.alertsReporsitory.save(project)
  }

  async update(
    id: string,
    alertDTO: AlertDTO | Alert,
  ): Promise<any> {
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

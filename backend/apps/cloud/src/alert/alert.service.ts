import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { FindManyOptions, FindOneOptions, Repository } from 'typeorm'
import { Pagination, PaginationOptionsInterface } from '../common/pagination'
import { Alert } from './entity/alert.entity'
import { AlertDTO } from './dto/alert.dto'
import { NotificationChannel } from '../notification-channel/entity/notification-channel.entity'

@Injectable()
export class AlertService {
  constructor(
    @InjectRepository(Alert)
    private alertsReporsitory: Repository<Alert>,
  ) {}

  async paginate(
    options: PaginationOptionsInterface,
    where: FindManyOptions<Alert>['where'],
    relations?: Array<string>,
  ): Promise<Pagination<Alert>> {
    const [results, total] = await this.alertsReporsitory.findAndCount({
      take: options.take || 100,
      skip: options.skip || 0,
      where,
      order: {
        name: 'ASC',
      },
      relations: relations
        ? [...new Set([...relations, 'channels'])]
        : ['channels'],
    })

    return new Pagination<Alert>({
      results,
      total,
    })
  }

  findOneWithRelations(id: string): Promise<Alert | null> {
    return this.alertsReporsitory.findOne({
      where: { id },
      relations: ['project', 'project.admin', 'channels'],
    })
  }

  async setChannels(
    id: string,
    channels: NotificationChannel[],
  ): Promise<void> {
    const alert = await this.alertsReporsitory.findOne({
      where: { id },
      relations: ['channels'],
    })
    if (!alert) return
    alert.channels = channels
    await this.alertsReporsitory.save(alert)
  }

  async count(options: FindManyOptions<Alert> = {}): Promise<number> {
    return this.alertsReporsitory.count(options)
  }

  findOne(options: FindOneOptions<Alert>): Promise<Alert | null> {
    return this.alertsReporsitory.findOne(options)
  }

  find(options: FindManyOptions<Alert>): Promise<Alert[]> {
    return this.alertsReporsitory.find(options)
  }

  findOneWhere(options: FindOneOptions<Alert>): Promise<Alert | null> {
    return this.alertsReporsitory.findOne(options)
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
}

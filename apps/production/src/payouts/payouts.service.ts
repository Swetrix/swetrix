import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Payout, PayoutStatus } from './entities/payouts.entity'
import { Pagination, PaginationOptionsInterface } from '../common/pagination'

@Injectable()
export class PayoutsService {
  constructor(
    @InjectRepository(Payout)
    private payoutsRepository: Repository<Payout>,
  ) {}

  async create(
    payout: Pick<Payout, 'amount' | 'currency' | 'referralId' | 'user'>,
  ): Promise<Payout> {
    return this.payoutsRepository.save(payout)
  }

  async update(criteria: any, update: Record<string, unknown>): Promise<any> {
    return this.payoutsRepository.update(criteria, update)
  }

  async delete(id: string): Promise<any> {
    return this.payoutsRepository.delete(id)
  }

  async find(params: any): Promise<Payout[]> {
    return this.payoutsRepository.find(params)
  }

  async findOne(where: any, params: any = {}): Promise<Payout> {
    return this.payoutsRepository.findOne({
      where,
      ...params,
    })
  }

  async sumAmountByReferrerId(
    referrerId: string,
    status: PayoutStatus,
  ): Promise<number> {
    const result = await this.payoutsRepository
      .createQueryBuilder('payout')
      .select('SUM(payout.amount)', 'sum')
      .where('payout.userId = :referrerId', { referrerId })
      .andWhere('payout.status = :status', { status })
      .getRawOne()

    return result.sum
  }

  async paginate(
    options: PaginationOptionsInterface,
    where: Record<string, unknown> | undefined,
  ): Promise<Pagination<Payout>> {
    const [results, total] = await this.payoutsRepository.findAndCount({
      take: options.take || 100,
      skip: options.skip || 0,
      where,
      order: {
        created: 'DESC',
      },
    })

    return new Pagination<Payout>({
      results,
      total,
    })
  }
}

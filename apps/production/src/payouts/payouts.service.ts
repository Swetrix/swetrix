import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Payout } from './entities/payouts.entity'

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

  async update(id: string, update: Record<string, unknown>): Promise<any> {
    return this.payoutsRepository.update({ id }, update)
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
}

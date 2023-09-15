import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Payouts } from './entities/payouts.entity'

@Injectable()
export class PayoutsService {
  constructor(
    @InjectRepository(Payouts)
    private payoutsRepository: Repository<Payouts>,
  ) {}
}

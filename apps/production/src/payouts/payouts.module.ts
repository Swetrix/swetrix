import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { PayoutsService } from './payouts.service'
import { Payout } from './entities/payouts.entity'
import { AppLoggerModule } from '../logger/logger.module'

@Module({
  imports: [TypeOrmModule.forFeature([Payout]), AppLoggerModule],
  providers: [PayoutsService],
  exports: [PayoutsService],
})
export class PayoutsModule {}

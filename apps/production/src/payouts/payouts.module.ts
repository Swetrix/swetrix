import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { PayoutsService } from './payouts.service'
import { Payouts } from './entities/payouts.entity'
import { AppLoggerModule } from '../logger/logger.module'

@Module({
  imports: [TypeOrmModule.forFeature([Payouts]), AppLoggerModule],
  providers: [PayoutsService],
  exports: [PayoutsService],
})
export class PayoutsModule {}

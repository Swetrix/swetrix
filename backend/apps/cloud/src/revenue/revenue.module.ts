import { Module, forwardRef } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { ProjectModule } from '../project/project.module'
import { AppLoggerModule } from '../logger/logger.module'
import { AnalyticsModule } from '../analytics/analytics.module'
import { Project } from '../project/entity/project.entity'
import { RevenueService } from './revenue.service'
import {
  RevenueController,
  RevenueAnalyticsController,
} from './revenue.controller'
import { PaddleAdapter } from './adapters/paddle.adapter'
import { StripeAdapter } from './adapters/stripe.adapter'

@Module({
  imports: [
    TypeOrmModule.forFeature([Project]),
    forwardRef(() => ProjectModule),
    AppLoggerModule,
    forwardRef(() => AnalyticsModule),
  ],
  providers: [RevenueService, PaddleAdapter, StripeAdapter],
  exports: [RevenueService, PaddleAdapter, StripeAdapter],
  controllers: [RevenueController, RevenueAnalyticsController],
})
export class RevenueModule {}

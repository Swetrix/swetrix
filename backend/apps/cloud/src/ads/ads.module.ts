import { Module, forwardRef } from '@nestjs/common'

import { ProjectModule } from '../project/project.module'
import { AppLoggerModule } from '../logger/logger.module'
import { RevenueModule } from '../revenue/revenue.module'
import { AnalyticsModule } from '../analytics/analytics.module'
import { AdsService } from './ads.service'
import { AdsController } from './ads.controller'
import { AdsAnalyticsController } from './ads-analytics.controller'
import { GoogleAdsAdapter } from './adapters/google-ads.adapter'

@Module({
  imports: [
    forwardRef(() => ProjectModule),
    AppLoggerModule,
    forwardRef(() => RevenueModule),
    forwardRef(() => AnalyticsModule),
  ],
  providers: [AdsService, GoogleAdsAdapter],
  exports: [AdsService, GoogleAdsAdapter],
  controllers: [AdsController, AdsAnalyticsController],
})
export class AdsModule {}

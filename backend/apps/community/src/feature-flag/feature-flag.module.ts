import { Module } from '@nestjs/common'

import { ProjectModule } from '../project/project.module'
import { AppLoggerModule } from '../logger/logger.module'
import { AnalyticsModule } from '../analytics/analytics.module'
import { FeatureFlagService } from './feature-flag.service'
import { FeatureFlagController } from './feature-flag.controller'

@Module({
  imports: [ProjectModule, AppLoggerModule, AnalyticsModule],
  providers: [FeatureFlagService],
  exports: [FeatureFlagService],
  controllers: [FeatureFlagController],
})
export class FeatureFlagModule {}

import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { ProjectModule } from '../project/project.module'
import { AppLoggerModule } from '../logger/logger.module'
import { UserModule } from '../user/user.module'
import { AnalyticsModule } from '../analytics/analytics.module'
import { FeatureFlagService } from './feature-flag.service'
import { FeatureFlag } from './entity/feature-flag.entity'
import { FeatureFlagController } from './feature-flag.controller'

@Module({
  imports: [
    TypeOrmModule.forFeature([FeatureFlag]),
    ProjectModule,
    AppLoggerModule,
    UserModule,
    AnalyticsModule,
  ],
  providers: [FeatureFlagService],
  exports: [FeatureFlagService],
  controllers: [FeatureFlagController],
})
export class FeatureFlagModule {}

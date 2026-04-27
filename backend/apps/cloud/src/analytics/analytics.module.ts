import { Module, forwardRef } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AnalyticsService } from './analytics.service'
import { AnalyticsController } from './analytics.controller'
import { BotDetectionService } from './bot-detection.service'
import { HeartbeatGateway } from './heartbeat.gateway'
import { SaltService } from './salt.service'
import { Salt } from './entities/salt.entity'
import { UserModule } from '../user/user.module'
import { AppLoggerModule } from '../logger/logger.module'
import { ProjectModule } from '../project/project.module'
import { RevenueModule } from '../revenue/revenue.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Salt]),
    forwardRef(() => UserModule),
    AppLoggerModule,
    ProjectModule,
    forwardRef(() => RevenueModule),
  ],
  providers: [
    AnalyticsService,
    BotDetectionService,
    SaltService,
    HeartbeatGateway,
  ],
  exports: [AnalyticsService, BotDetectionService, SaltService],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}

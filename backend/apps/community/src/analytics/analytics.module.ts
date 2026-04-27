import { Module } from '@nestjs/common'

import { AnalyticsService } from './analytics.service'
import { AnalyticsController } from './analytics.controller'
import { BotDetectionService } from './bot-detection.service'
import { HeartbeatGateway } from './heartbeat.gateway'
import { SaltService } from './salt.service'
import { AppLoggerModule } from '../logger/logger.module'
import { ProjectModule } from '../project/project.module'

@Module({
  imports: [AppLoggerModule, ProjectModule],
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

import { Module } from '@nestjs/common'

import { AnalyticsService } from './analytics.service'
import { AnalyticsController } from './analytics.controller'
import { HeartbeatGateway } from './heartbeat.gateway'
import { SaltService } from './salt.service'
import { AppLoggerModule } from '../logger/logger.module'
import { ProjectModule } from '../project/project.module'

@Module({
  imports: [AppLoggerModule, ProjectModule],
  providers: [AnalyticsService, SaltService, HeartbeatGateway],
  exports: [AnalyticsService, SaltService],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}

import { Module, forwardRef } from '@nestjs/common'

import { AnalyticsService } from './analytics.service'
import { AnalyticsController } from './analytics.controller'
import { BotDetectionService } from './bot-detection.service'
import { HeartbeatGateway } from './heartbeat.gateway'
import { SaltService } from './salt.service'
import { AppLoggerModule } from '../logger/logger.module'
import { ProjectModule } from '../project/project.module'
import { ExperimentModule } from '../experiment/experiment.module'

@Module({
  imports: [AppLoggerModule, ProjectModule, forwardRef(() => ExperimentModule)],
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

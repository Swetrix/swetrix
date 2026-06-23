import { Module, forwardRef } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BullModule } from '@nestjs/bullmq'

import { AnalyticsService } from './analytics.service'
import { AnalyticsController } from './analytics.controller'
import { BotDetectionService } from './bot-detection.service'
import { AnalyticsReadGuard } from './protection/analytics-read.guard'
import { PublicProjectCacheInterceptor } from './protection/public-project-cache.interceptor'
import { HeartbeatGateway } from './heartbeat.gateway'
import { SaltService } from './salt.service'
import { Salt } from './entities/salt.entity'
import { SessionReplayS3Service } from './session-replay-s3.service'
import { UserModule } from '../user/user.module'
import { AppLoggerModule } from '../logger/logger.module'
import { ProjectModule } from '../project/project.module'
import { RevenueModule } from '../revenue/revenue.module'
import { ExperimentModule } from '../experiment/experiment.module'
import {
  SessionReplayExportService,
  SESSION_REPLAY_EXPORT_QUEUE,
} from './session-replay-export.service'
import { SessionReplayExportProcessor } from './session-replay-export.processor'

@Module({
  imports: [
    TypeOrmModule.forFeature([Salt]),
    forwardRef(() => UserModule),
    AppLoggerModule,
    ProjectModule,
    forwardRef(() => RevenueModule),
    forwardRef(() => ExperimentModule),
    BullModule.registerQueue({ name: SESSION_REPLAY_EXPORT_QUEUE }),
  ],
  providers: [
    AnalyticsService,
    BotDetectionService,
    SaltService,
    SessionReplayS3Service,
    SessionReplayExportService,
    SessionReplayExportProcessor,
    HeartbeatGateway,
    AnalyticsReadGuard,
    PublicProjectCacheInterceptor,
  ],
  exports: [AnalyticsService, BotDetectionService, SaltService],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}

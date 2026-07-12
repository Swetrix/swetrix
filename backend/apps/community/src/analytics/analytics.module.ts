import { Module, forwardRef } from '@nestjs/common'

import { AnalyticsService } from './analytics.service'
import { AnalyticsController } from './analytics.controller'
import { BotDetectionService } from './bot-detection.service'
import { AnalyticsReadGuard } from './protection/analytics-read.guard'
import { PublicProjectCacheInterceptor } from './protection/public-project-cache.interceptor'
import { HeartbeatGateway } from './heartbeat.gateway'
import { SaltService } from './salt.service'
import { AppLoggerModule } from '../logger/logger.module'
import { ProjectModule } from '../project/project.module'
import { ExperimentModule } from '../experiment/experiment.module'
import { AnalyticsV2Service } from './v2/analytics-v2.service'
import { TrafficV2Controller } from './v2/controllers/traffic-v2.controller'
import { PerformanceV2Controller } from './v2/controllers/performance-v2.controller'
import { CaptchaV2Controller } from './v2/controllers/captcha-v2.controller'
import { ErrorsV2Controller } from './v2/controllers/errors-v2.controller'
import { SessionsV2Controller } from './v2/controllers/sessions-v2.controller'
import { ProfilesV2Controller } from './v2/controllers/profiles-v2.controller'
import { ProjectV2Controller } from './v2/controllers/project-v2.controller'

@Module({
  imports: [AppLoggerModule, ProjectModule, forwardRef(() => ExperimentModule)],
  providers: [
    AnalyticsService,
    AnalyticsV2Service,
    BotDetectionService,
    SaltService,
    HeartbeatGateway,
    AnalyticsReadGuard,
    PublicProjectCacheInterceptor,
  ],
  exports: [AnalyticsService, BotDetectionService, SaltService],
  controllers: [
    AnalyticsController,
    TrafficV2Controller,
    PerformanceV2Controller,
    CaptchaV2Controller,
    ErrorsV2Controller,
    SessionsV2Controller,
    ProfilesV2Controller,
    ProjectV2Controller,
  ],
})
export class AnalyticsModule {}

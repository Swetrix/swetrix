import { Module } from '@nestjs/common'

import { ProjectModule } from '../project/project.module'
import { AppLoggerModule } from '../logger/logger.module'
import { AnalyticsModule } from '../analytics/analytics.module'
import { GoalModule } from '../goal/goal.module'
import { AiService } from './ai.service'
import { AiController } from './ai.controller'

@Module({
  imports: [ProjectModule, AppLoggerModule, AnalyticsModule, GoalModule],
  providers: [AiService],
  controllers: [AiController],
})
export class AiModule {}

import { Module, forwardRef } from '@nestjs/common'

import { ProjectModule } from '../project/project.module'
import { AppLoggerModule } from '../logger/logger.module'
import { AnalyticsModule } from '../analytics/analytics.module'
import { GoalService } from './goal.service'
import { GoalController } from './goal.controller'

@Module({
  imports: [ProjectModule, AppLoggerModule, forwardRef(() => AnalyticsModule)],
  providers: [GoalService],
  exports: [GoalService],
  controllers: [GoalController],
})
export class GoalModule {}

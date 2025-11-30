import { Module, forwardRef } from '@nestjs/common'
import { TaskManagerService } from './task-manager.service'
import { AppLoggerModule } from '../logger/logger.module'
import { AnalyticsModule } from '../analytics/analytics.module'

@Module({
  imports: [AppLoggerModule, forwardRef(() => AnalyticsModule)],
  providers: [TaskManagerService],
  exports: [TaskManagerService],
})
export class TaskManagerModule {}

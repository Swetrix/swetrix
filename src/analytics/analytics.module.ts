import { Module, forwardRef } from '@nestjs/common'

import { AnalyticsService } from './analytics.service'
import { AnalyticsController } from './analytics.controller'
import { UserModule } from '../user/user.module'
import { AppLoggerModule } from '../logger/logger.module'
import { ProjectModule } from '../project/project.module'
import { TaskManagerModule } from '../task-manager/task-manager.module'
import { TypeOrmModule } from '@nestjs/typeorm'

@Module({
  imports: [
    forwardRef(() => UserModule),
    TaskManagerModule,
    AppLoggerModule,
    ProjectModule,
  ],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}

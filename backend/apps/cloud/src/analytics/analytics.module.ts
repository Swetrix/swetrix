import { Module, forwardRef } from '@nestjs/common'

import { AnalyticsService } from './analytics.service'
import { AnalyticsController } from './analytics.controller'
import { UserModule } from '../user/user.module'
import { AppLoggerModule } from '../logger/logger.module'
import { ProjectModule } from '../project/project.module'

@Module({
  imports: [forwardRef(() => UserModule), AppLoggerModule, ProjectModule],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}

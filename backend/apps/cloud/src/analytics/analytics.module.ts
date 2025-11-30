import { Module, forwardRef } from '@nestjs/common'

import { AnalyticsService } from './analytics.service'
import { AnalyticsController } from './analytics.controller'
import { SaltService } from './salt.service'
import { UserModule } from '../user/user.module'
import { AppLoggerModule } from '../logger/logger.module'
import { ProjectModule } from '../project/project.module'

@Module({
  imports: [forwardRef(() => UserModule), AppLoggerModule, ProjectModule],
  providers: [AnalyticsService, SaltService],
  exports: [AnalyticsService, SaltService],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}

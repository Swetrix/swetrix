import { AnalyticsModule } from '../analytics/analytics.module'
import { Module, forwardRef } from '@nestjs/common'

import { ProjectService } from './project.service'
import { ProjectController } from './project.controller'
import { GSCService } from './gsc.service'
import { GSCController } from './gsc.controller'
import { AppLoggerModule } from '../logger/logger.module'
import { UserModule } from '../user/user.module'
import { MailerModule } from '../mailer/mailer.module'

@Module({
  imports: [
    forwardRef(() => AnalyticsModule),
    AppLoggerModule,
    forwardRef(() => UserModule),
    MailerModule,
  ],
  providers: [ProjectService, GSCService],
  exports: [ProjectService, GSCService],
  controllers: [ProjectController, GSCController],
})
export class ProjectModule {}

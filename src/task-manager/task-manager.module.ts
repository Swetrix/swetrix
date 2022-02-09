import { Module, forwardRef } from '@nestjs/common'
import { TaskManagerService } from './task-manager.service'
import { MailerModule } from '../mailer/mailer.module'
import { UserModule } from '../user/user.module'
import { ProjectModule } from '../project/project.module'
import { AnalyticsModule } from '../analytics/analytics.module'

@Module({
  imports: [
    ProjectModule,
    MailerModule,
    UserModule,
    forwardRef(() => AnalyticsModule),
  ],
  providers: [TaskManagerService],
  exports: [TaskManagerService],
})
export class TaskManagerModule {}

import { Module, HttpModule } from '@nestjs/common'
import { TaskManagerService } from './task-manager.service'
import { MailerModule } from '../mailer/mailer.module'
import { UserModule } from '../user/user.module'
import { AnalyticsModule } from '../analytics/analytics.module'

@Module({
  imports: [MailerModule, HttpModule, UserModule, AnalyticsModule],
  providers: [TaskManagerService]
})
export class TaskManagerModule {}

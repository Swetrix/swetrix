import { Module, HttpModule } from '@nestjs/common'
import { TaskManagerService } from './task-manager.service'
import { MailerModule } from '../mailer/mailer.module'

@Module({
  imports: [MailerModule, HttpModule],
  providers: [TaskManagerService]
})
export class TaskManagerModule {}

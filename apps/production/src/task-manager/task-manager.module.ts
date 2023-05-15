import { Module, forwardRef } from '@nestjs/common'
import { AlertModule } from 'src/alert/alert.module'
import { ExtensionsModule } from 'src/marketplace/extensions/extensions.module'
import { TelegramService } from 'src/integrations/telegram/telegram.service'
import { TaskManagerService } from './task-manager.service'
import { MailerModule } from '../mailer/mailer.module'
import { UserModule } from '../user/user.module'
import { ProjectModule } from '../project/project.module'
import { AnalyticsModule } from '../analytics/analytics.module'
import { ActionTokensModule } from '../action-tokens/action-tokens.module'
import { AppLoggerModule } from '../logger/logger.module'

@Module({
  imports: [
    ProjectModule,
    MailerModule,
    UserModule,
    ActionTokensModule,
    AlertModule,
    forwardRef(() => AnalyticsModule),
    ExtensionsModule,
    AppLoggerModule,
  ],
  providers: [TaskManagerService, TelegramService],
  exports: [TaskManagerService],
})
export class TaskManagerModule {}

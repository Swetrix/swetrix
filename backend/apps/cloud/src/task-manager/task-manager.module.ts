import { Module, forwardRef } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AlertModule } from '../alert/alert.module'
import { TelegramService } from '../integrations/telegram/telegram.service'
import { TaskManagerService } from './task-manager.service'
import { MailerModule } from '../mailer/mailer.module'
import { UserModule } from '../user/user.module'
import { ProjectModule } from '../project/project.module'
import { AnalyticsModule } from '../analytics/analytics.module'
import { ActionTokensModule } from '../action-tokens/action-tokens.module'
import { AppLoggerModule } from '../logger/logger.module'
import { Message } from '../integrations/telegram/entities/message.entity'
import { DiscordModule } from '../integrations/discord/discord.module'
import { SlackModule } from '../integrations/slack/slack.module'
import { GoalModule } from '../goal/goal.module'
import { RevenueModule } from '../revenue/revenue.module'

@Module({
  imports: [
    ProjectModule,
    MailerModule,
    UserModule,
    ActionTokensModule,
    AlertModule,
    forwardRef(() => AnalyticsModule),
    AppLoggerModule,
    TypeOrmModule.forFeature([Message]),
    DiscordModule,
    SlackModule,
    GoalModule,
    RevenueModule,
  ],
  providers: [TaskManagerService, TelegramService],
  exports: [TaskManagerService],
})
export class TaskManagerModule {}

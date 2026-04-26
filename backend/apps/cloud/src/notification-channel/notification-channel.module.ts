import { forwardRef, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { NotificationChannel } from './entity/notification-channel.entity'
import { NotificationChannelService } from './notification-channel.service'
import { NotificationChannelController } from './notification-channel.controller'
import { TemplateRendererService } from './template-renderer.service'

import { ChannelDispatcherService } from './dispatchers/channel-dispatcher.service'
import { EmailChannelService } from './dispatchers/email-channel.service'
import { TelegramChannelService } from './dispatchers/telegram-channel.service'
import { DiscordChannelService } from './dispatchers/discord-channel.service'
import { SlackChannelService } from './dispatchers/slack-channel.service'
import { WebhookChannelService } from './dispatchers/webhook-channel.service'
import { WebpushChannelService } from './dispatchers/webpush-channel.service'

import { ProjectModule } from '../project/project.module'
import { OrganisationModule } from '../organisation/organisation.module'
import { MailerModule } from '../mailer/mailer.module'
import { AppLoggerModule } from '../logger/logger.module'
import { TelegramModule } from '../integrations/telegram/telegram.module'
import { DiscordModule } from '../integrations/discord/discord.module'
import { SlackModule } from '../integrations/slack/slack.module'

const telegramImports =
  process.env.ENABLE_TELEGRAM_INTEGRATION === 'true'
    ? [forwardRef(() => TelegramModule)]
    : []

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationChannel]),
    forwardRef(() => ProjectModule),
    OrganisationModule,
    MailerModule,
    AppLoggerModule,
    DiscordModule,
    SlackModule,
    ...telegramImports,
  ],
  providers: [
    NotificationChannelService,
    TemplateRendererService,
    ChannelDispatcherService,
    EmailChannelService,
    TelegramChannelService,
    DiscordChannelService,
    SlackChannelService,
    WebhookChannelService,
    WebpushChannelService,
  ],
  controllers: [NotificationChannelController],
  exports: [
    NotificationChannelService,
    TemplateRendererService,
    ChannelDispatcherService,
  ],
})
export class NotificationChannelModule {}

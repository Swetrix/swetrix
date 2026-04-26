import { Injectable, Logger } from '@nestjs/common'
import {
  NotificationChannel,
  NotificationChannelType,
} from '../entity/notification-channel.entity'
import { ChannelDispatcher, RenderedAlertMessage } from './types'
import { EmailChannelService } from './email-channel.service'
import { TelegramChannelService } from './telegram-channel.service'
import { DiscordChannelService } from './discord-channel.service'
import { SlackChannelService } from './slack-channel.service'
import { WebhookChannelService } from './webhook-channel.service'
import { WebpushChannelService } from './webpush-channel.service'

@Injectable()
export class ChannelDispatcherService {
  private readonly logger = new Logger(ChannelDispatcherService.name)

  private readonly registry: Map<NotificationChannelType, ChannelDispatcher>

  constructor(
    emailDispatcher: EmailChannelService,
    telegramDispatcher: TelegramChannelService,
    discordDispatcher: DiscordChannelService,
    slackDispatcher: SlackChannelService,
    webhookDispatcher: WebhookChannelService,
    webpushDispatcher: WebpushChannelService,
  ) {
    this.registry = new Map<NotificationChannelType, ChannelDispatcher>([
      [NotificationChannelType.EMAIL, emailDispatcher],
      [NotificationChannelType.TELEGRAM, telegramDispatcher],
      [NotificationChannelType.DISCORD, discordDispatcher],
      [NotificationChannelType.SLACK, slackDispatcher],
      [NotificationChannelType.WEBHOOK, webhookDispatcher],
      [NotificationChannelType.WEBPUSH, webpushDispatcher],
    ])
  }

  isVerifiedAndActive(channel: NotificationChannel): boolean {
    if (!channel.isVerified) return false
    if (channel.type === NotificationChannelType.EMAIL) {
      const cfg = channel.config as { unsubscribed?: boolean }
      if (cfg?.unsubscribed) return false
    }
    return true
  }

  async dispatch(
    channels: NotificationChannel[],
    message: RenderedAlertMessage,
    options: { ignoreVerification?: boolean } = {},
  ): Promise<void> {
    const tasks = channels
      .filter((c) => options.ignoreVerification || this.isVerifiedAndActive(c))
      .map(async (channel) => {
        const dispatcher = this.registry.get(channel.type)
        if (!dispatcher) {
          this.logger.warn(`No dispatcher registered for type ${channel.type}`)
          return
        }
        try {
          await dispatcher.send(channel, message)
        } catch (reason) {
          this.logger.error(
            `Dispatcher for ${channel.type} failed on channel ${channel.id}: ${reason}`,
          )
        }
      })
    await Promise.allSettled(tasks)
  }
}

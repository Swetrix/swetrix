import { Injectable, Logger } from '@nestjs/common'
import { DiscordService } from '../../integrations/discord/discord.service'
import {
  NotificationChannel,
  NotificationChannelType,
} from '../entity/notification-channel.entity'
import { ChannelDispatcher, RenderedAlertMessage } from './types'

@Injectable()
export class DiscordChannelService implements ChannelDispatcher {
  readonly type = NotificationChannelType.DISCORD

  private readonly logger = new Logger(DiscordChannelService.name)

  constructor(private readonly discordService: DiscordService) {}

  async send(
    channel: NotificationChannel,
    message: RenderedAlertMessage,
  ): Promise<void> {
    const cfg = channel.config as { url?: string }
    if (!cfg?.url) return
    try {
      await this.discordService.sendWebhook(cfg.url, message.body)
    } catch (reason) {
      this.logger.error(`Failed to send Discord alert: ${reason}`)
    }
  }
}

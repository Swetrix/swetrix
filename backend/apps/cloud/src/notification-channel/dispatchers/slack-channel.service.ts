import { Injectable, Logger } from '@nestjs/common'
import { SlackService } from '../../integrations/slack/slack.service'
import {
  NotificationChannel,
  NotificationChannelType,
} from '../entity/notification-channel.entity'
import { ChannelDispatcher, RenderedAlertMessage } from './types'

@Injectable()
export class SlackChannelService implements ChannelDispatcher {
  readonly type = NotificationChannelType.SLACK

  private readonly logger = new Logger(SlackChannelService.name)

  constructor(private readonly slackService: SlackService) {}

  async send(
    channel: NotificationChannel,
    message: RenderedAlertMessage,
  ): Promise<void> {
    const cfg = channel.config as { url?: string }
    if (!cfg?.url) return
    try {
      await this.slackService.sendWebhook(cfg.url, message.body)
    } catch (reason) {
      this.logger.error(`Failed to send Slack alert: ${reason}`)
    }
  }
}

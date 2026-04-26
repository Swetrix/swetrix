import { Injectable, Logger, Optional } from '@nestjs/common'
import { TelegramService } from '../../integrations/telegram/telegram.service'
import {
  NotificationChannel,
  NotificationChannelType,
} from '../entity/notification-channel.entity'
import { ChannelDispatcher, RenderedAlertMessage } from './types'

@Injectable()
export class TelegramChannelService implements ChannelDispatcher {
  readonly type = NotificationChannelType.TELEGRAM

  private readonly logger = new Logger(TelegramChannelService.name)

  constructor(
    @Optional() private readonly telegramService: TelegramService | null,
  ) {}

  async send(
    channel: NotificationChannel,
    message: RenderedAlertMessage,
  ): Promise<void> {
    const cfg = channel.config as { chatId?: string }
    if (!cfg?.chatId || !this.telegramService) return
    try {
      await this.telegramService.addMessage(
        cfg.chatId,
        message.telegramBody || message.body,
        {
          parse_mode: 'Markdown',
          // @ts-expect-error untyped option
          disable_web_page_preview: true,
        },
      )
    } catch (reason) {
      this.logger.error(`Failed to queue Telegram alert: ${reason}`)
    }
  }
}

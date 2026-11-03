import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { Telegraf, TelegramError } from 'telegraf'
import { Repository } from 'typeorm'
import { Message } from './entities/message.entity'

@Injectable()
export class TelegramMessageWorker {
  private readonly logger = new Logger(TelegramMessageWorker.name)
  private retryAfter = 0

  constructor(
    private readonly bot: Telegraf,
    @InjectRepository(Message)
    private readonly messages: Repository<Message>,
  ) {}

  @Cron(CronExpression.EVERY_5_SECONDS, { waitForCompletion: true })
  async sendQueuedMessages() {
    if (Date.now() < this.retryAfter) return

    const messages = await this.messages.find({
      take: 25,
      order: { createdAt: 'ASC', id: 'ASC' },
    })
    for (const message of messages) {
      try {
        await this.bot.telegram.sendMessage(
          message.chatId,
          message.text,
          message.extra ?? undefined,
        )
      } catch (error) {
        if (!(error instanceof TelegramError)) {
          this.logger.warn(
            `Telegram request failed for message ${message.id}. Will retry.`,
          )
          return
        }
        this.logger.warn(
          `Telegram rejected message ${message.id}: ${error.message}`,
        )
        if (error.code === 429) {
          this.retryAfter =
            Date.now() + (error.parameters?.retry_after ?? 5) * 1000
        }
        if (error.code !== 400 && error.code !== 403) return
      }
      await this.messages.delete(message.id)
    }
  }
}

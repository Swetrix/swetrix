import { Injectable, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectBot } from 'nestjs-telegraf'
import { Markup, Telegraf } from 'telegraf'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Context } from './interface/context.interface'
import { Message } from './entities/message.entity'
import { UserService } from '../../user/user.service'
import { ExtraReplyMessage } from 'telegraf/typings/telegram-types'

@Injectable()
export class TelegramService {
  constructor(
    @Optional() @InjectBot() private readonly bot: Telegraf<Context>,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}

  async getStartMessage(telegramId: number) {
    const user = await this.userService.getUserByTelegramId(
      telegramId.toString(),
    )

    let text = ''
    let extra: ExtraReplyMessage = {}

    if (!user) {
      text =
        'Welcome to the Swetrix Bot!' +
        '\n\n' +
        'Your Telegram ID is: ' +
        `<code>${telegramId.toString()}</code>` +
        '\n\n' +
        'You can use this ID to link your Telegram account with your Swetrix account.' +
        '\n\n' +
        'To do this, go to your <a href="https://swetrix.com/settings">Swetrix account settings</a> and enter this ID in the Telegram field.' +
        '\n\n' +
        'After that, you can use the bot to manage your projects.'
      extra = {
        // @ts-expect-error It's not typed
        disable_web_page_preview: true,
        reply_markup: { remove_keyboard: true },
      }
    }

    if (user) {
      text = 'Welcome to the Swetrix Bot!'
      extra = {
        ...Markup.keyboard([['📂 Projects', '⚙️ Settings']])
          .oneTime()
          .resize(),
      }
    }

    return { text, extra }
  }

  async confirmLinkAccount(userId: string, chatId: number) {
    if (
      this.configService.get<string>('ENABLE_INTEGRATIONS') !== 'true' &&
      this.configService.get<string>('ENABLE_TELEGRAM_INTEGRATION') !== 'true'
    ) {
      return
    }

    // Ensure the confirming Telegram user matches the pending chat ID on the user.
    // This prevents confirming from a different chat/user if callback data ever leaks.
    const user = await this.userService.findOne({ where: { id: userId } })
    if (
      !user ||
      user.isTelegramChatIdConfirmed ||
      user.telegramChatId !== String(chatId)
    ) {
      return
    }

    await this.userService.updateUserTelegramId(userId, chatId, true)
  }

  async cancelLinkAccount(userId: string, chatId: number) {
    if (
      this.configService.get<string>('ENABLE_INTEGRATIONS') !== 'true' &&
      this.configService.get<string>('ENABLE_TELEGRAM_INTEGRATION') !== 'true'
    ) {
      return
    }

    const user = await this.userService.findOne({ where: { id: userId } })
    if (!user || user.isTelegramChatIdConfirmed) {
      return
    }

    // Only allow cancelling if the pending chat ID matches the current chat.
    if (user.telegramChatId !== String(chatId)) {
      return
    }

    await this.userService.updateUserTelegramId(userId, null)
  }

  async confirmUnlinkAccount(chatId: number) {
    if (
      this.configService.get<string>('ENABLE_INTEGRATIONS') !== 'true' &&
      this.configService.get<string>('ENABLE_TELEGRAM_INTEGRATION') !== 'true'
    ) {
      return
    }

    const user = await this.userService.getUserByTelegramId(chatId.toString())
    if (!user) {
      return
    }
    await this.userService.updateUserTelegramId(user.id, null)
  }

  async addMessage(chatId: string, text: string, extra?: ExtraReplyMessage) {
    await this.messageRepository.save({ chatId, text, extra })
  }

  async getMessages() {
    const messagesCount = 25
    return this.messageRepository.find({
      take: messagesCount,
      order: { createdAt: 'DESC' },
    })
  }

  escapeTelegramMarkdownV2(text?: string | null) {
    if (text === null || text === undefined) return ''

    // Characters to escape for MarkdownV2: _ * [ ] ( ) ~ ` > # + - = | { } . ! and \ (not requested by Telegram, but CodeQL is complaining)
    const charsToEscapeRegex = /[_*[\]()~`>#+\-=|{}.!\\]/g
    return text.replace(charsToEscapeRegex, '\\$&')
  }

  escapeTelegramMarkdown(text?: string | null) {
    if (text === null || text === undefined) return ''

    // Characters to escape for legacy Markdown: _, *, `, [, \
    const charsToEscapeRegex = /[_*`[\]\\]/g
    return text.replace(charsToEscapeRegex, '\\$&')
  }

  async sendMessage(
    messageId: string,
    chatId: string,
    text: string,
    extra?: ExtraReplyMessage,
  ) {
    if (
      this.configService.get<string>('ENABLE_INTEGRATIONS') !== 'true' &&
      this.configService.get<string>('ENABLE_TELEGRAM_INTEGRATION') !== 'true'
    ) {
      return
    }

    // If the bot isn't launched on this node (e.g. non-primary instance),
    // do nothing here and let the primary node handle queued messages.
    if (!this.bot) {
      return
    }

    const chat = await this.bot.telegram.getChat(chatId)

    if (!chat) {
      await this.deleteMessage(messageId)
      return
    }

    await this.bot.telegram.sendMessage(chatId, text, extra)
    await this.deleteMessage(messageId)
  }

  async deleteMessage(messageId: string) {
    await this.messageRepository.delete(messageId)
  }
}

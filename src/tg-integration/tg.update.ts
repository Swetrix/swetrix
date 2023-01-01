import { Ctx, On, Sender, Start, Update } from 'nestjs-telegraf'
import { SWETRIX_SETTINGS_URL } from 'src/tg-integration/constants'
import { UserService } from 'src/user/user.service'
import { Context } from 'telegraf'

@Update()
export class SwetrixUpdate {
  constructor(private readonly userService: UserService) {}

  @Start()
  async start(
    @Ctx() ctx: Context,
    @Sender('first_name') firstName: string,
    @Sender('id') chatId: string,
  ): Promise<void> {
    const text =
      `Hello, *${firstName}*!` +
      '\n' +
      `Your chat ID is \`${chatId}\`` +
      '\n\n' +
      `Use this chat ID to connect your Telegram account to your Swetrix account on ${SWETRIX_SETTINGS_URL}.`
    await ctx.reply(text, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    })
  }

  @On('callback_query')
  async callbackQuery(@Ctx() ctx: Context): Promise<void> {
    const [action, userId] = ctx.callbackQuery?.['data'].split(':')

    if (action === 'confirmTelegramChatId') {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        ctx.callbackQuery?.['message'].message_id,
        undefined,
        '✅ Your Telegram account is connected to your Swetrix account.',
      )

      await this.userService.update(userId, {
        telegramChatId: ctx.chat.id,
        isTelegramChatIdConfirmed: true,
      })
    }

    if (action === 'cancelTelegramChatId') {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        ctx.callbackQuery?.['message'].message_id,
        undefined,
        '❌ Your Telegram account is not connected to your Swetrix account.',
      )

      await this.userService.update(userId, {
        telegramChatId: null,
      })
    }
  }
}

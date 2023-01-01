import { Ctx, Sender, Start, Update } from 'nestjs-telegraf'
import { SWETRIX_SETTINGS_URL } from 'src/tg-integration/constants'
import { Context } from 'telegraf'

@Update()
export class SwetrixUpdate {
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
}

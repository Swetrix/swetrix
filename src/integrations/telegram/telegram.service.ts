import { Injectable } from '@nestjs/common'
import { UserService } from 'src/user/user.service'
import { Markup } from 'telegraf'

@Injectable()
export class TelegramService {
  constructor(private readonly userService: UserService) {}

  async getStartMessage(telgramId: number) {
    const user = await this.userService.getUserByTelegramId(telgramId)

    let text: string
    let extra: unknown = {}

    if (!user) {
      text =
        'Welcome to the Swetrix Bot!' +
        '\n\n' +
        'Your Telegram ID is: ' +
        `<code>${telgramId.toString()}</code>` +
        '\n\n' +
        'You can use this ID to link your Telegram account with your Swetrix account.' +
        '\n\n' +
        'To do this, go to your <a href="https://swetrix.com/settings">Swetrix account settings</a> and enter this ID in the Telegram field.' +
        '\n\n' +
        'After that, you can use the bot to manage your projects.'
      extra = { disable_web_page_preview: true }
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
}

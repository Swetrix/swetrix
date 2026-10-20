import { Injectable } from '@nestjs/common'
import { Markup } from 'telegraf'
import { UserService } from '../../../user/user.service'
import { Context } from '../interface/context.interface'
import { START_SCENE_ID } from '../telegram.constants'
import { TelegramService } from '../telegram.service'

@Injectable()
export class UnlinkAccountScene {
  constructor(
    private readonly telegramService: TelegramService,
    private readonly userService: UserService,
  ) {}

  async onSceneEnter(context: Context) {
    const user = await this.userService.getUserByTelegramId(context.from.id)

    if (!user) {
      await context.scene.enter(START_SCENE_ID)
      return
    }

    await context.reply(
      'Are you sure you want to unlink your account?',
      Markup.keyboard([['✅ Yes', '❌ No']])
        .oneTime()
        .resize(),
    )
  }

  async onYes(context: Context) {
    const user = await this.userService.getUserByTelegramId(context.from.id)

    if (!user) {
      await context.scene.enter(START_SCENE_ID)
      return
    }

    await this.telegramService.confirmUnlinkAccount(context.from.id)
    await context.reply('Your account has been unlinked successfully.')
    await context.scene.enter(START_SCENE_ID)
  }

  async onNo(context: Context) {
    const user = await this.userService.getUserByTelegramId(context.from.id)

    if (!user) {
      await context.scene.enter(START_SCENE_ID)
      return
    }

    await context.reply('Your account has not been unlinked.')
    await context.scene.enter(START_SCENE_ID)
  }
}

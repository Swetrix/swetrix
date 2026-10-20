import { Injectable } from '@nestjs/common'
import { Markup } from 'telegraf'
import { UserService } from '../../../user/user.service'
import { Context } from '../interface/context.interface'
import { UNLINK_ACCOUNT_SCENE_ID, START_SCENE_ID } from '../telegram.constants'

@Injectable()
export class SettingsScene {
  constructor(private readonly userService: UserService) {}

  async onSceneEnter(context: Context) {
    const user = await this.userService.getUserByTelegramId(context.from.id)

    if (!user) {
      await context.scene.enter(START_SCENE_ID)
      return
    }

    await context.reply(
      'Settings',
      Markup.keyboard(['🔓 Unlink account', '🔙 Back']).oneTime().resize(),
    )
  }

  async onUnlinkAccount(context: Context) {
    const user = await this.userService.getUserByTelegramId(context.from.id)

    if (!user) {
      await context.scene.enter(START_SCENE_ID)
      return
    }

    await context.scene.enter(UNLINK_ACCOUNT_SCENE_ID)
  }

  async onBack(context: Context) {
    const user = await this.userService.getUserByTelegramId(context.from.id)

    if (!user) {
      await context.scene.enter(START_SCENE_ID)
      return
    }

    await context.scene.enter(START_SCENE_ID)
  }
}

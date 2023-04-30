import { Ctx, Hears, Scene, SceneEnter } from 'nestjs-telegraf'
import { Markup } from 'telegraf'
import { UserService } from 'src/user/user.service'
import { Context } from '../interface/context.interface'
import { UNLINK_ACCOUNT_SCENE_ID } from './unlink-account.scene'
import { START_SCENE_ID } from './start.scene'

export const SETTINGS_SCENE_ID = 'settings'
@Scene(SETTINGS_SCENE_ID)
export class SettingsScene {
  constructor(private readonly userService: UserService) {}

  @SceneEnter()
  async onSceneEnter(@Ctx() context: Context) {
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

  @Hears('🔓 Unlink account')
  async onUnlinkAccount(@Ctx() context: Context) {
    const user = await this.userService.getUserByTelegramId(context.from.id)

    if (!user) {
      await context.scene.enter(START_SCENE_ID)
      return
    }

    await context.scene.enter(UNLINK_ACCOUNT_SCENE_ID)
  }

  @Hears('🔙 Back')
  async onBack(@Ctx() context: Context) {
    const user = await this.userService.getUserByTelegramId(context.from.id)

    if (!user) {
      await context.scene.enter(START_SCENE_ID)
      return
    }

    await context.scene.enter(START_SCENE_ID)
  }
}

import { Ctx, Hears, Scene, SceneEnter } from 'nestjs-telegraf'
import { Markup } from 'telegraf'
import { Context } from '../interface/context.interface'
import { UNLINK_ACCOUNT_SCENE_ID } from './unlink-account.scene'
import { START_SCENE_ID } from './start.scene'

export const SETTINGS_SCENE_ID = 'settings'
@Scene(SETTINGS_SCENE_ID)
export class SettingsScene {
  @SceneEnter()
  async onSceneEnter(@Ctx() context: Context) {
    await context.reply(
      '...',
      Markup.keyboard(['🔓 Unlink account', '🔙 Back']).oneTime().resize(),
    )
  }

  @Hears('🔓 Unlink account')
  async onUnlinkAccount(@Ctx() context: Context) {
    await context.scene.enter(UNLINK_ACCOUNT_SCENE_ID)
  }

  @Hears('🔙 Back')
  async onBack(@Ctx() context: Context) {
    await context.scene.enter(START_SCENE_ID)
  }
}

import { Ctx, Hears, Scene, SceneEnter } from 'nestjs-telegraf'
import { Markup } from 'telegraf'
import { Context } from '../interface/context.interface'
import { START_SCENE_ID } from './start.scene'

export const UNLINK_ACCOUNT_SCENE_ID = 'unlink-account'
@Scene(UNLINK_ACCOUNT_SCENE_ID)
export class UnlinkAccountScene {
  @SceneEnter()
  async onSceneEnter(@Ctx() context: Context) {
    await context.reply(
      '...',
      Markup.keyboard([['✅ Yes', '❌ No']])
        .oneTime()
        .resize(),
    )
  }

  @Hears('✅ Yes')
  async onYes(@Ctx() context: Context) {
    await context.reply('...')
    await context.scene.enter(START_SCENE_ID)
  }

  @Hears('❌ No')
  async onNo(@Ctx() context: Context) {
    await context.reply('...')
    await context.scene.enter(START_SCENE_ID)
  }
}

import { Ctx, Hears, Scene, SceneEnter } from 'nestjs-telegraf'
import { Markup } from 'telegraf'
import { Context } from '../interface/context.interface'
import { PROJECTS_SCENE_ID } from './projects.scene'
import { SETTINGS_SCENE_ID } from './settings.scene'

export const START_SCENE_ID = 'start'
@Scene(START_SCENE_ID)
export class StartScene {
  @SceneEnter()
  async onSceneEnter(@Ctx() context: Context) {
    await context.reply(
      '...',
      Markup.keyboard([['📂 Projects', '⚙️ Settings']])
        .oneTime()
        .resize(),
    )
  }

  @Hears('📂 Projects')
  async onProjects(@Ctx() context: Context) {
    await context.scene.enter(PROJECTS_SCENE_ID)
  }

  @Hears('⚙️ Settings')
  async onSettings(@Ctx() context: Context) {
    await context.scene.enter(SETTINGS_SCENE_ID)
  }
}

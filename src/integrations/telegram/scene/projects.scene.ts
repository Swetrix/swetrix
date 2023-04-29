import { Ctx, Hears, Scene, SceneEnter } from 'nestjs-telegraf'
import { Markup } from 'telegraf'
import { Context } from '../interface/context.interface'
import { START_SCENE_ID } from './start.scene'

export const PROJECTS_SCENE_ID = 'projects'
@Scene(PROJECTS_SCENE_ID)
export class ProjectsScene {
  @SceneEnter()
  async onSceneEnter(@Ctx() context: Context) {
    await context.reply(
      '...',
      Markup.keyboard([['🔙 Back']])
        .oneTime()
        .resize(),
    )
  }

  @Hears('🔙 Back')
  async onBack(@Ctx() context: Context) {
    await context.scene.enter(START_SCENE_ID)
  }
}

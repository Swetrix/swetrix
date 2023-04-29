import { Ctx, Hears, Scene, SceneEnter } from 'nestjs-telegraf'
import { Context } from '../interface/context.interface'
import { PROJECTS_SCENE_ID } from './projects.scene'
import { SETTINGS_SCENE_ID } from './settings.scene'
import { TelegramService } from '../telegram.service'

export const START_SCENE_ID = 'start'
@Scene(START_SCENE_ID)
export class StartScene {
  constructor(private readonly telegramService: TelegramService) {}

  @SceneEnter()
  async onSceneEnter(@Ctx() context: Context) {
    const { text, extra } = await this.telegramService.getStartMessage(
      context.from.id,
    )
    await context.replyWithHTML(text, extra)
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

import { Ctx, Hears, Scene, SceneEnter } from 'nestjs-telegraf'
import { UserService } from 'src/user/user.service'
import { Context } from '../interface/context.interface'
import { PROJECTS_SCENE_ID } from './projects.scene'
import { SETTINGS_SCENE_ID } from './settings.scene'
import { TelegramService } from '../telegram.service'

export const START_SCENE_ID = 'start'
@Scene(START_SCENE_ID)
export class StartScene {
  constructor(
    private readonly telegramService: TelegramService,
    private readonly userService: UserService,
  ) {}

  @SceneEnter()
  async onSceneEnter(@Ctx() context: Context) {
    const { text, extra } = await this.telegramService.getStartMessage(
      context.from.id,
    )
    await context.replyWithHTML(text, extra)
  }

  @Hears('📂 Projects')
  async onProjects(@Ctx() context: Context) {
    const user = await this.userService.getUserByTelegramId(context.from.id)
    if (!user) return
    await context.scene.enter(PROJECTS_SCENE_ID)
  }

  @Hears('⚙️ Settings')
  async onSettings(@Ctx() context: Context) {
    const user = await this.userService.getUserByTelegramId(context.from.id)
    if (!user) return
    await context.scene.enter(SETTINGS_SCENE_ID)
  }
}

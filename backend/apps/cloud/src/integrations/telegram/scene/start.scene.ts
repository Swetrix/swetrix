import { Injectable } from '@nestjs/common'
import { UserService } from '../../../user/user.service'
import { Context } from '../interface/context.interface'
import { PROJECTS_SCENE_ID, SETTINGS_SCENE_ID } from '../telegram.constants'
import { TelegramService } from '../telegram.service'

@Injectable()
export class StartScene {
  constructor(
    private readonly telegramService: TelegramService,
    private readonly userService: UserService,
  ) {}

  async onSceneEnter(context: Context) {
    const { text, extra } = await this.telegramService.getStartMessage(
      context.from.id,
    )
    await context.replyWithHTML(text, extra)
  }

  async onProjects(context: Context) {
    const user = await this.userService.getUserByTelegramId(context.from.id)
    if (!user) return
    await context.scene.enter(PROJECTS_SCENE_ID)
  }

  async onSettings(context: Context) {
    const user = await this.userService.getUserByTelegramId(context.from.id)
    if (!user) return
    await context.scene.enter(SETTINGS_SCENE_ID)
  }
}

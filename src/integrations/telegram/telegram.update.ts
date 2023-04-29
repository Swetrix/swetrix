import { Ctx, Start, Update } from 'nestjs-telegraf'
import { Context } from './interface/context.interface'
import { START_SCENE_ID } from './scene/start.scene'

@Update()
export class TelegramUpdate {
  @Start()
  async onStart(@Ctx() context: Context) {
    await context.scene.enter(START_SCENE_ID)
  }
}

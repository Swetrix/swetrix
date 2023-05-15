import { Ctx, Hears, Scene, SceneEnter } from 'nestjs-telegraf'
import { Markup } from 'telegraf'
import { UserService } from 'src/user/user.service'
import { Context } from '../interface/context.interface'
import { START_SCENE_ID } from './start.scene'
import { TelegramService } from '../telegram.service'

export const UNLINK_ACCOUNT_SCENE_ID = 'unlink-account'
@Scene(UNLINK_ACCOUNT_SCENE_ID)
export class UnlinkAccountScene {
  constructor(
    private readonly telegramService: TelegramService,
    private readonly userService: UserService,
  ) {}

  @SceneEnter()
  async onSceneEnter(@Ctx() context: Context) {
    const user = await this.userService.getUserByTelegramId(context.from.id)

    if (!user) {
      await context.scene.enter(START_SCENE_ID)
      return
    }

    await context.reply(
      'Are you sure you want to unlink your account?',
      Markup.keyboard([['✅ Yes', '❌ No']])
        .oneTime()
        .resize(),
    )
  }

  @Hears('✅ Yes')
  async onYes(@Ctx() context: Context) {
    const user = await this.userService.getUserByTelegramId(context.from.id)

    if (!user) {
      await context.scene.enter(START_SCENE_ID)
      return
    }

    await this.telegramService.confirmUnlinkAccount(context.from.id)
    await context.reply('Your account has been unlinked successfully.')
    await context.scene.enter(START_SCENE_ID)
  }

  @Hears('❌ No')
  async onNo(@Ctx() context: Context) {
    const user = await this.userService.getUserByTelegramId(context.from.id)

    if (!user) {
      await context.scene.enter(START_SCENE_ID)
      return
    }

    await context.reply('Your account has not been unlinked.')
    await context.scene.enter(START_SCENE_ID)
  }
}

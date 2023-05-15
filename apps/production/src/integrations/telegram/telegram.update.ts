import { Action, Ctx, Start, Update } from 'nestjs-telegraf'
import { TelegramService } from './telegram.service'
import { Context } from './interface/context.interface'
import { START_SCENE_ID } from './scene/start.scene'

@Update()
export class TelegramUpdate {
  constructor(private readonly telegramService: TelegramService) {}

  @Start()
  async onStart(@Ctx() context: Context) {
    await context.scene.enter(START_SCENE_ID)
  }

  @Action(/link-account:confirm:(.+)/)
  async onLinkAccountConfirm(@Ctx() context: Context & { match: unknown }) {
    await context.answerCbQuery()
    await this.telegramService.confirmLinkAccount(
      context.match[1] as string,
      context.from.id,
    )
    await context.editMessageText('Your account has been linked successfully.')
    await context.scene.enter(START_SCENE_ID)
  }

  @Action(/link-account:cancel:(.+)/)
  async onLinkAccountCancel(@Ctx() context: Context & { match: unknown }) {
    await context.answerCbQuery()
    await this.telegramService.cancelLinkAccount(context.match[1] as string)
    await context.editMessageText('Your account has not been linked.')
    await context.scene.leave()
  }
}

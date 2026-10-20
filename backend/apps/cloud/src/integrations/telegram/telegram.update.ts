import { Injectable } from '@nestjs/common'
import { TelegramService } from './telegram.service'
import { Context } from './interface/context.interface'
import { START_SCENE_ID } from './telegram.constants'

@Injectable()
export class TelegramUpdate {
  constructor(private readonly telegramService: TelegramService) {}

  async onStart(context: Context) {
    await context.scene.enter(START_SCENE_ID)
  }

  async onLinkAccountConfirm(context: Context & { match: RegExpExecArray }) {
    await context.answerCbQuery()
    await this.telegramService.confirmLinkAccount(
      context.match[1] as string,
      context.from.id,
    )
    await context.editMessageText('Your account has been linked successfully.')
    await context.scene.enter(START_SCENE_ID)
  }

  async onLinkAccountCancel(context: Context & { match: RegExpExecArray }) {
    await context.answerCbQuery()
    await this.telegramService.cancelLinkAccount(
      context.match[1] as string,
      context.from.id,
    )
    await context.editMessageText('Your account has not been linked.')
    await context.scene.leave()
  }
}

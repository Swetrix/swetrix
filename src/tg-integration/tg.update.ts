import { Command, Ctx, Hears, Start, Update, Sender } from 'nestjs-telegraf'
import { UpdateType as TelegrafUpdateType } from 'telegraf/typings/telegram-types'
import { Context } from '../common/interfaces/context.interface'
import { UpdateType } from '../common/decorators/update-type.decorator'

const HELLO_SCENE_ID = 'HELLO_SCENE_ID'

const SWETRIX_SETTINGS_URL = 'https://swetrix.com/settings'

@Update()
export class SwetrixUpdate {
  @Start()
  onStart(
    @Sender('id') chatId: number,
    @Sender('first_name') firstName: string,
  ): string {
    return `Hello ${firstName}!\nYour Chat ID is ${chatId}\n\nUse this Chat ID to connect your Telegram account to your Swetrix account on ${SWETRIX_SETTINGS_URL}.`
  }

  @Hears(['hi', 'hello', 'hey', 'qq'])
  onGreetings(
    @UpdateType() updateType: TelegrafUpdateType,
    @Sender('first_name') firstName: string,
  ): string {
    return `Hey ${firstName}`
  }

  @Command('scene')
  async onSceneCommand(@Ctx() ctx: Context): Promise<void> {
    await ctx.scene.enter(HELLO_SCENE_ID)
  }
}

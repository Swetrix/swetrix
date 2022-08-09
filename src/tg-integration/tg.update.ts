import { Command, Ctx, Hears, Start, Update, Sender } from 'nestjs-telegraf'
import { UpdateType as TelegrafUpdateType } from 'telegraf/typings/telegram-types'
import { Context } from 'src/common/interfaces/context.interface'
import { UpdateType } from 'src/common/decorators/update-type.decorator'

const HELLO_SCENE_ID = 'HELLO_SCENE_ID'

@Update()
export class SwetrixUpdate {
  @Start()
  onStart(): string {
    return 'Say hello to me';
  }

  @Hears(['hi', 'hello', 'hey', 'qq'])
  onGreetings(
    @UpdateType() updateType: TelegrafUpdateType,
    @Sender('first_name') firstName: string,
  ): string {
    return `Hey ${firstName}`;
  }

  @Command('scene')
  async onSceneCommand(@Ctx() ctx: Context): Promise<void> {
    await ctx.scene.enter(HELLO_SCENE_ID);
  }
}

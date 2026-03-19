import { Module, OnModuleInit, Logger, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { TelegrafModule, InjectBot } from 'nestjs-telegraf'
import { session, Telegraf } from 'telegraf'
import { TypeOrmModule } from '@nestjs/typeorm'
import { TelegramUpdate } from './telegram.update'
import { StartScene } from './scene/start.scene'
import { ProjectsScene } from './scene/projects.scene'
import { SettingsScene } from './scene/settings.scene'
import { UnlinkAccountScene } from './scene/unlink-account.scene'
import { TelegramService } from './telegram.service'
import { Message } from './entities/message.entity'
import { UserModule } from '../../user/user.module'
import { ProjectModule } from '../../project/project.module'
import { AnalyticsModule } from '../../analytics/analytics.module'
import { isPrimaryNode, isPrimaryClusterNode } from '../../common/utils'
import { Context } from './interface/context.interface'

const shouldBotBeLaunched = isPrimaryNode() && isPrimaryClusterNode()
const hasTelegramToken = !!process.env.TELEGRAM_BOT_TOKEN

@Module({
  imports: [
    shouldBotBeLaunched &&
      hasTelegramToken &&
      TelegrafModule.forRootAsync({
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          token: configService.get<string>('TELEGRAM_BOT_TOKEN'),
          launchOptions: false,
          middlewares: [session()],
        }),
      }),
    TypeOrmModule.forFeature([Message]),
    UserModule,
    ProjectModule,
    AnalyticsModule,
  ].filter((m) => !!m),
  providers: [
    ...(shouldBotBeLaunched && hasTelegramToken
      ? [
          TelegramUpdate,
          StartScene,
          ProjectsScene,
          SettingsScene,
          UnlinkAccountScene,
        ]
      : []),
    TelegramService,
  ],
  exports: [TelegramService],
})
export class TelegramModule implements OnModuleInit {
  private readonly logger = new Logger(TelegramModule.name)

  constructor(
    @Optional() @InjectBot() private readonly bot: Telegraf<Context>,
  ) {}

  async onModuleInit() {
    if (!this.bot) return

    this.bot.launch({ dropPendingUpdates: false }).catch((reason) => {
      this.logger.warn(
        `Telegram bot failed to launch: ${reason.message}. Bot features will be unavailable.`,
      )
    })
  }
}

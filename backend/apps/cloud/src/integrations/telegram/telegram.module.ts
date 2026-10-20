import {
  forwardRef,
  Module,
  OnModuleInit,
  OnApplicationShutdown,
  Logger,
  Optional,
  Inject,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Telegraf } from 'telegraf'
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
import { NotificationChannelModule } from '../../notification-channel/notification-channel.module'
import { registerTelegramHandlers } from './telegram.bot'

const shouldBotBeLaunched = isPrimaryNode() && isPrimaryClusterNode()
const hasTelegramToken = !!process.env.TELEGRAM_BOT_TOKEN

@Module({
  imports: [
    TypeOrmModule.forFeature([Message]),
    UserModule,
    ProjectModule,
    AnalyticsModule,
    forwardRef(() => NotificationChannelModule),
  ],
  providers: [
    ...(shouldBotBeLaunched && hasTelegramToken
      ? [
          {
            provide: Telegraf,
            inject: [ConfigService],
            useFactory: (configService: ConfigService) =>
              new Telegraf<Context>(
                configService.get<string>('TELEGRAM_BOT_TOKEN'),
              ),
          },
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
export class TelegramModule implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(TelegramModule.name)

  constructor(
    @Optional() @Inject(Telegraf) private readonly bot: Telegraf<Context>,
    @Optional() private readonly updates: TelegramUpdate,
    @Optional() private readonly start: StartScene,
    @Optional() private readonly projects: ProjectsScene,
    @Optional() private readonly settings: SettingsScene,
    @Optional() private readonly unlinkAccount: UnlinkAccountScene,
  ) {}

  async onModuleInit() {
    if (!this.bot) return

    registerTelegramHandlers(this.bot, {
      updates: this.updates,
      start: this.start,
      projects: this.projects,
      settings: this.settings,
      unlinkAccount: this.unlinkAccount,
    })

    this.bot.catch((error) => {
      this.logger.error(
        'Telegram update failed',
        error instanceof Error ? error.stack : String(error),
      )
    })

    this.bot.launch({ dropPendingUpdates: false }).catch((reason) => {
      this.logger.warn(
        `Telegram bot failed to launch: ${reason.message}. Bot features will be unavailable.`,
      )
    })
  }

  onApplicationShutdown() {
    if (!this.bot) return

    try {
      this.bot.stop()
    } catch (error) {
      if (
        !(error instanceof Error) ||
        error.message !== 'Bot is not running!'
      ) {
        throw error
      }
    }
  }
}

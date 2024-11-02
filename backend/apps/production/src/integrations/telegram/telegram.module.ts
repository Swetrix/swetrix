import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { TelegrafModule } from 'nestjs-telegraf'
import { session } from 'telegraf'
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

const shouldBotBeLaunched = isPrimaryNode() && isPrimaryClusterNode()

@Module({
  imports: [
    shouldBotBeLaunched &&
      TelegrafModule.forRootAsync({
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          token: configService.get<string>('TELEGRAM_BOT_TOKEN'),
          launchOptions: {
            dropPendingUpdates: false,
          },
          middlewares: [session()],
        }),
      }),
    TypeOrmModule.forFeature([Message]),
    UserModule,
    ProjectModule,
    AnalyticsModule,
  ].filter(m => !!m),
  providers: [
    TelegramUpdate,
    StartScene,
    ProjectsScene,
    SettingsScene,
    UnlinkAccountScene,
    TelegramService,
  ],
  exports: [TelegramService],
})
export class TelegramModule {}

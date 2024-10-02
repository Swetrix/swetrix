import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { TelegrafModule } from 'nestjs-telegraf'
import { session } from 'telegraf'
import { UserModule } from 'src/user/user.module'
import { ProjectModule } from 'src/project/project.module'
import { AnalyticsModule } from 'src/analytics/analytics.module'
import { TypeOrmModule } from '@nestjs/typeorm'
import { TelegramController } from './telegram.controller'
import { TelegramUpdate } from './telegram.update'
import { StartScene } from './scene/start.scene'
import { ProjectsScene } from './scene/projects.scene'
import { SettingsScene } from './scene/settings.scene'
import { UnlinkAccountScene } from './scene/unlink-account.scene'
import { TelegramService } from './telegram.service'
import { Message } from './entities/message.entity'

@Module({
  imports: [
    TelegrafModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        token: configService.get<string>('TELEGRAM_BOT_TOKEN'),
        launchOptions: {
          dropPendingUpdates: false,
          ...(process.env.NODE_ENV === 'production' && {
            webhook: {
              domain: configService.get<string>('TELEGRAM_WEBHOOK_DOMAIN'),
              hookPath: configService.get<string>('TELEGRAM_WEBHOOK_PATH'),
              // ipAddress: configService.get<string>(
              //   'TELEGRAM_WEBHOOK_IP_ADDRESS',
              // ),
              maxConnections: 100,
              secretToken: configService.get<string>(
                'TELEGRAM_WEBHOOK_SECRET_TOKEN',
              ),
            },
          }),
        },
        middlewares: [session()],
      }),
    }),
    TypeOrmModule.forFeature([Message]),
    UserModule,
    ProjectModule,
    AnalyticsModule,
  ],
  controllers: [TelegramController],
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

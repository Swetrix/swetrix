import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { TelegrafModule } from 'nestjs-telegraf'
import { TelegramController } from './telegram.controller'

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
              ipAddress: configService.get<string>(
                'TELEGRAM_WEBHOOK_IP_ADDRESS',
              ),
              maxConnections: 100,
              secretToken: configService.get<string>(
                'TELEGRAM_WEBHOOK_SECRET_TOKEN',
              ),
            },
          }),
        },
      }),
    }),
  ],
  controllers: [TelegramController],
})
export class TelegramModule {}

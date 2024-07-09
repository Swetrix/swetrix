import { Module } from '@nestjs/common'
import { TelegramModule } from './telegram/telegram.module'
import { DiscordModule } from './discord/discord.module'

@Module({
  imports: [
    ...(process.env.ENABLE_TELEGRAM_INTEGRATION === 'true'
      ? [TelegramModule]
      : []),
    DiscordModule,
  ],
})
export class IntegrationsModule {}

import { Module } from '@nestjs/common'
import { TelegramModule } from './telegram/telegram.module'

@Module({
  imports: [
    ...(process.env.ENABLE_TELEGRAM_INTEGRATION === 'true'
      ? [TelegramModule]
      : []),
  ],
})
export class IntegrationsModule {}

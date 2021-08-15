import { Module, forwardRef } from '@nestjs/common'

import { WebhookController } from './webhook.controller'
import { UserModule } from '../user/user.module'
import { AppLoggerModule } from '../logger/logger.module'

@Module({
  imports: [
    forwardRef(() => UserModule),
    AppLoggerModule,
  ],
  controllers: [WebhookController],
})
export class WebhookModule {}

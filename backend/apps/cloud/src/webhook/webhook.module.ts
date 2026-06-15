import { Module, forwardRef } from '@nestjs/common'

import { ProjectModule } from '../project/project.module'
import { WebhookController } from './webhook.controller'
import { UserModule } from '../user/user.module'
import { AppLoggerModule } from '../logger/logger.module'
import { MailerModule } from '../mailer/mailer.module'
import { WebhookService } from './webhook.service'
import { RevenueModule } from '../revenue/revenue.module'

@Module({
  imports: [
    forwardRef(() => UserModule),
    ProjectModule,
    AppLoggerModule,
    MailerModule,
    RevenueModule,
  ],
  providers: [WebhookService],
  exports: [WebhookService],
  controllers: [WebhookController],
})
export class WebhookModule {}

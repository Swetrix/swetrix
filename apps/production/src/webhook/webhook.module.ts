import { Module, forwardRef } from '@nestjs/common'

import { ProjectModule } from '../project/project.module'
import { PayoutsModule } from '../payouts/payouts.module'
import { WebhookController } from './webhook.controller'
import { UserModule } from '../user/user.module'
import { AppLoggerModule } from '../logger/logger.module'
import { MailerModule } from '../mailer/mailer.module'
import { WebhookService } from './webhook.service'

@Module({
  imports: [
    forwardRef(() => UserModule),
    ProjectModule,
    PayoutsModule,
    AppLoggerModule,
    MailerModule,
  ],
  providers: [WebhookService],
  exports: [WebhookService],
  controllers: [WebhookController],
})
export class WebhookModule {}

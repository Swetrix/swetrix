import { Module, forwardRef } from '@nestjs/common'

import { ProjectModule } from 'src/project/project.module'
import { WebhookController } from './webhook.controller'
import { UserModule } from '../user/user.module'
import { AppLoggerModule } from '../logger/logger.module'
import { WebhookService } from './webhook.service'

@Module({
  imports: [forwardRef(() => UserModule), ProjectModule, AppLoggerModule],
  providers: [WebhookService],
  exports: [WebhookService],
  controllers: [WebhookController],
})
export class WebhookModule {}

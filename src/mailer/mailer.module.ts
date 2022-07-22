import { Module } from '@nestjs/common'
import { AppLoggerModule } from 'src/logger/logger.module'
import { MailerService } from './mailer.service'

@Module({
  providers: [MailerService],
  exports: [MailerService],
  imports: [AppLoggerModule],
})
export class MailerModule {}

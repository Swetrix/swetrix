import { Module } from '@nestjs/common'

import { ProjectService } from './project.service'
import { ProjectController } from './project.controller'
import { AppLoggerModule } from '../logger/logger.module'
import { UserModule } from '../user/user.module'
import { MailerModule } from '../mailer/mailer.module'

@Module({
  imports: [AppLoggerModule, UserModule, MailerModule],
  providers: [ProjectService],
  exports: [ProjectService],
  controllers: [ProjectController],
})
export class ProjectModule {}

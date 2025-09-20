import { Module, forwardRef } from '@nestjs/common'

import { UserController } from './user.controller'
import { UserService } from './user.service'
import { AppLoggerModule } from '../logger/logger.module'
import { MailerModule } from '../mailer/mailer.module'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [AppLoggerModule, MailerModule, forwardRef(() => AuthModule)],
  providers: [UserService],
  exports: [UserService],
  controllers: [UserController],
})
export class UserModule {}

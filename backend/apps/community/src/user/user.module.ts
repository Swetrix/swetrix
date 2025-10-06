import { Module, forwardRef } from '@nestjs/common'

import { UserController } from './user.controller'
import { UserService } from './user.service'
import { AppLoggerModule } from '../logger/logger.module'
import { MailerModule } from '../mailer/mailer.module'
import { AuthModule } from '../auth/auth.module'
import { ProjectModule } from '../project/project.module'

@Module({
  imports: [
    AppLoggerModule,
    MailerModule,
    forwardRef(() => AuthModule),
    ProjectModule,
  ],
  providers: [UserService],
  exports: [UserService],
  controllers: [UserController],
})
export class UserModule {}

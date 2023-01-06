import { Module, forwardRef } from '@nestjs/common'
import { OldAuthService } from './auth.service'
import { UserModule } from '../user/user.module'
import { OldAuthController } from './auth.controller'
import { MailerModule } from '../mailer/mailer.module'
import { ProjectModule } from '../project/project.module'
import { ActionTokensModule } from '../action-tokens/action-tokens.module'
import { AppLoggerModule } from '../logger/logger.module'

@Module({
  imports: [
    forwardRef(() => UserModule),
    MailerModule,
    ActionTokensModule,
    AppLoggerModule,
    ProjectModule,
  ],
  controllers: [OldAuthController],
  providers: [OldAuthService],
  exports: [OldAuthService],
})
export class OldAuthModule {}

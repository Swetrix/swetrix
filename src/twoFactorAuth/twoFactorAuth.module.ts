import { Module } from '@nestjs/common'
import { TwoFactorAuthService } from './twoFactorAuth.service'
import { UserModule } from '../user/user.module'
import { OldAuthModule } from '../old-auth/auth.module'
import { TwoFactorAuthController } from './twoFactorAuth.controller'
import { AppLoggerModule } from '../logger/logger.module'
import { MailerModule } from '../mailer/mailer.module'

@Module({
  imports: [UserModule, AppLoggerModule, OldAuthModule, MailerModule],
  controllers: [TwoFactorAuthController],
  providers: [TwoFactorAuthService],
  exports: [TwoFactorAuthService],
})
export class TwoFactorAuthModule {}

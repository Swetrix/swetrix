import { Module } from '@nestjs/common'
import { TwoFactorAuthService } from './twoFactorAuth.service'
import { UserModule } from '../user/user.module'
import { AuthModule } from 'src/auth/auth.module'
import { TwoFactorAuthController } from './twoFactorAuth.controller'
import { AppLoggerModule } from '../logger/logger.module'
import { MailerModule } from '../mailer/mailer.module'

@Module({
  imports: [UserModule, AppLoggerModule, AuthModule, MailerModule],
  controllers: [TwoFactorAuthController],
  providers: [TwoFactorAuthService],
  exports: [TwoFactorAuthService],
})
export class TwoFactorAuthModule {}

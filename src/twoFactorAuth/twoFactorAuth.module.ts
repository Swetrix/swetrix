import { Module } from '@nestjs/common'
import { TwoFactorAuthService } from './twoFactorAuth.service'
import { UserModule } from '../user/user.module'
import { AuthModule } from 'src/auth/auth.module'
import { TwoFactorAuthController } from './twoFactorAuth.controller'
import { ActionTokensModule } from '../action-tokens/action-tokens.module'
import { AppLoggerModule } from '../logger/logger.module'

@Module({
  imports: [
    UserModule,
    ActionTokensModule,
    AppLoggerModule,
    AuthModule,
  ],
  controllers: [TwoFactorAuthController],
  providers: [TwoFactorAuthService],
  exports: [TwoFactorAuthService],
})
export class TwoFactorAuthModule {}

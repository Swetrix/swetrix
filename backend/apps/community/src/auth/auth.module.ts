import { forwardRef, Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { AuthController } from './auth.controller'
import { UserModule } from '../user/user.module'
import { AuthService } from './auth.service'
import {
  ApiKeyStrategy,
  JwtAccessTokenStrategy,
  JwtRefreshTokenStrategy,
} from './strategies'
import { MailerModule } from '../mailer/mailer.module'

@Module({
  imports: [
    JwtModule.register({}),
    PassportModule,
    forwardRef(() => UserModule),
    MailerModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAccessTokenStrategy,
    JwtRefreshTokenStrategy,
    ApiKeyStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}

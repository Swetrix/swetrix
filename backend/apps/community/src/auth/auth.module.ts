import { Module } from '@nestjs/common'
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

@Module({
  imports: [JwtModule.register({}), PassportModule, UserModule],
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

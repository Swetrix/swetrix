import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import {
  // ApiKeyStrategy,
  JwtAccessTokenStrategy,
  JwtRefreshTokenStrategy,
} from './strategies'

@Module({
  imports: [JwtModule.register({}), PassportModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAccessTokenStrategy,
    JwtRefreshTokenStrategy,
    // ApiKeyStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}

import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtAccessTokenStrategy } from './strategies'

@Module({
  imports: [PassportModule],
  controllers: [AuthController],
  providers: [AuthService, JwtAccessTokenStrategy],
})
export class AuthModule {}

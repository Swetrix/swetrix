import { Module } from '@nestjs/common'
import { GoogleOauthController } from './google.controller'
import { GoogleOauthStrategy } from '../strategies/google-oauth.strategy'

@Module({
  imports: [],
  controllers: [GoogleOauthController],
  providers: [GoogleOauthStrategy],
})
export class GoogleOauthModule {}

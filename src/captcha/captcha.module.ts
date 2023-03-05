import { Module } from '@nestjs/common'

import { AppLoggerModule } from '../logger/logger.module'
import { CaptchaController } from './captcha.controller'
import { CaptchaService } from './captcha.service'

@Module({
  imports: [AppLoggerModule],
  providers: [CaptchaService],
  exports: [CaptchaService],
  controllers: [CaptchaController],
})
export class CaptchaModule {}

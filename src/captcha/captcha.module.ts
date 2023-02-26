import { Module, forwardRef } from '@nestjs/common'

import { CaptchaController } from './captcha.controller'
import { CaptchaService } from './captcha.service'

@Module({
  imports: [],
  providers: [CaptchaService],
  exports: [CaptchaService],
  controllers: [CaptchaController],
})
export class AnalyticsModule {}

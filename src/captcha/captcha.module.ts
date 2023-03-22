import { Module } from '@nestjs/common'

import { AppLoggerModule } from '../logger/logger.module'
import { CaptchaController } from './captcha.controller'
import { CaptchaService } from './captcha.service'
import { ProjectModule } from '../project/project.module'

@Module({
  imports: [AppLoggerModule, ProjectModule],
  providers: [CaptchaService],
  exports: [CaptchaService],
  controllers: [CaptchaController],
})
export class CaptchaModule {}

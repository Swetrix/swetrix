import { Controller } from '@nestjs/common'
import { CaptchaService } from './captcha.service'

@Controller({
  version: '1',
  path: 'captcha',
})
export class CaptchaController {
  constructor(
    private readonly captchaService: CaptchaService,
  ) { }
}

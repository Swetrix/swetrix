import {
  Injectable,
} from '@nestjs/common'
import * as svgCaptcha from 'svg-captcha'
import { hash } from 'blake3'

import { CAPTCHA_SALT } from '../common/constants'

interface GeneratedCaptcha {
  data: string
  hash: string
}

@Injectable()
export class CaptchaService {
  constructor(
  ) { }

  hashCaptcha(text: string): string {
    return hash(`${text}${CAPTCHA_SALT}`).toString('hex')
  }

  async generateCaptcha(): Promise<GeneratedCaptcha> {
    const captcha = svgCaptcha.create()
    const hash = this.hashCaptcha(captcha.text)

    return {
      data: captcha.data,
      hash,
    }
  }

  verifyCaptcha(text: string, hash: string): boolean {
    const hashedText = this.hashCaptcha(text)
    return hashedText === hash
  }

  async autoVerify(jwtCookie: string | undefined): Promise<boolean> {
    // TODO

    return false
  }
}

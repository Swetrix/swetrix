import {
  Controller, Post, Body, UseGuards, ForbiddenException, InternalServerErrorException,
  Headers, Ip, Request, Req, Response, Res, HttpCode, Get,
} from '@nestjs/common'

import { CaptchaService } from './captcha.service'
import { BotDetectionGuard } from '../common/guards/bot-detection.guard'
import { BotDetection } from '../common/decorators/bot-detection.decorator'
import { isDevelopment } from '../common/constants'
import { ManualDTO } from './dtos/manual.dto'

const CAPTCHA_COOKIE_KEY = 'swetrix-captcha-token'

@Controller({
  version: '1',
  path: 'captcha',
})
export class CaptchaController {
  constructor(
    private readonly captchaService: CaptchaService,
  ) { }

  @Post('/generate')
  @HttpCode(200)
  @UseGuards(BotDetectionGuard)
  @BotDetection()
  async generateCaptcha(
    // @Req() request: Request,
    // @Res({ passthrough: true }) response: Response,
  ): Promise<any> {
    return await this.captchaService.generateCaptcha()
  }

  @Post('/verify-manual')
  @HttpCode(200)
  @UseGuards(BotDetectionGuard)
  @BotDetection()
  async verifyManual(
    @Body() manualDTO: ManualDTO,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<any> {
    // @ts-ignore
    const tokenCookie = request?.cookies?.[CAPTCHA_COOKIE_KEY]
    const { code, hash } = manualDTO

    if (!this.captchaService.verifyCaptcha(code, hash)) {
      throw new ForbiddenException('Incorrect captcha')
    }

    let decrypted

    try {
      decrypted = await this.captchaService.decryptTokenCaptcha(tokenCookie)
    } catch (e) {
      decrypted = {
        manuallyVerified: 0,
        automaticallyVerified: 0,
      }
    }

    console.log(decrypted)

    const {
      manuallyVerified, automaticallyVerified,
    } = this.captchaService.incrementManuallyVerified(decrypted)

    const newTokenCookie = this.captchaService.getTokenCaptcha(manuallyVerified, automaticallyVerified)

    // Set the new cookie
    if (isDevelopment) {
      // @ts-ignore
      response.cookie(CAPTCHA_COOKIE_KEY, newTokenCookie, {
        httpOnly: true,
        // 300 days
        maxAge: 300 * 24 * 60 * 60 * 1000,
      })
    } else {
      // @ts-ignore
      response.cookie(CAPTCHA_COOKIE_KEY, newTokenCookie, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        // 300 days
        maxAge: 300 * 24 * 60 * 60 * 1000,
      })
    }

    // TODO: return token
    return {
      success: true,
      token: 'token',
    }
  }

  @Post('/verify')
  @HttpCode(200)
  @UseGuards(BotDetectionGuard)
  @BotDetection()
  async autoVerifiable(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<any> {
    // @ts-ignore
    const tokenCookie = request?.cookies?.[CAPTCHA_COOKIE_KEY]

    let verifiable

    try {
      verifiable = await this.captchaService.autoVerifiable(tokenCookie)
    } catch (e) {
      // Either there was no cookie or the cookie was invalid
      let newTokenCookie

      // Set a new cookie
      try {
        newTokenCookie = await this.captchaService.getTokenCaptcha()
      } catch (e) {
        console.error(e)
        throw new InternalServerErrorException('Could not generate a captcha cookie')
      }

      if (isDevelopment) {
        // @ts-ignore
        response.cookie(CAPTCHA_COOKIE_KEY, newTokenCookie, {
          httpOnly: true,
          // 300 days
          maxAge: 300 * 24 * 60 * 60 * 1000,
        })
      } else {
        // @ts-ignore
        response.cookie(CAPTCHA_COOKIE_KEY, newTokenCookie, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          // 300 days
          maxAge: 300 * 24 * 60 * 60 * 1000,
        })
      }
    }

    if (!verifiable) {
      throw new ForbiddenException('Captcha required')
    }

    // TODO: Increase auto

    // TODO: return token
    return {
      success: true,
      token: 'token',
    }
  }
}

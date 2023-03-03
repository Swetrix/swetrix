import {
  Controller, Post, Body, UseGuards, ForbiddenException, InternalServerErrorException,
  Headers, Ip, Request, Req, Response, Res, HttpCode, Get,
} from '@nestjs/common'
import { ApiResponse } from '@nestjs/swagger'

import { CaptchaService } from './captcha.service'
import { BotDetectionGuard } from '../common/guards/bot-detection.guard'
import { BotDetection } from '../common/decorators/bot-detection.decorator'
import { isDevelopment } from '../common/constants'

const CAPTCHA_COOKIE_KEY = 'swetrix-captcha-token'

@Controller({
  version: '1',
  path: 'captcha',
})
export class CaptchaController {
  constructor(
    private readonly captchaService: CaptchaService,
  ) { }

  @Get('/auto-verifiable')
  @HttpCode(204)
  @UseGuards(BotDetectionGuard)
  @BotDetection()
  @ApiResponse({ status: 204, description: 'Empty body' })
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

      // Set a new cookie
      const newTokenCookie = await this.captchaService.setTokenCaptcha()

      if (isDevelopment) {
        console.log('New captcha cookie:', newTokenCookie)

        // @ts-ignore
        response.cookie(CAPTCHA_COOKIE_KEY, newTokenCookie, {
          httpOnly: true,
        })
      } else {
        // @ts-ignore
        response.cookie(CAPTCHA_COOKIE_KEY, newTokenCookie, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
        })
      }
    }

    if (!verifiable) {
      throw new ForbiddenException('Captcha required')
    }
  }
}

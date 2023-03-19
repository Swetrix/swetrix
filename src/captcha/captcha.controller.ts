import {
  Controller, Post, Body, UseGuards, ForbiddenException, InternalServerErrorException,
  Headers, Request, Req, Response, Res, HttpCode,
} from '@nestjs/common'
import * as dayjs from 'dayjs'
import * as utc from 'dayjs/plugin/utc'

import { AppLoggerService } from '../logger/logger.service'
import { CAPTCHA_COOKIE_KEY } from '../common/constants'
import { CaptchaService, DUMMY_PIDS, isDummyPID } from './captcha.service'
import { BotDetectionGuard } from '../common/guards/bot-detection.guard'
import { BotDetection } from '../common/decorators/bot-detection.decorator'
import { ManualDTO } from './dtos/manual.dto'
import { ValidateDTO } from './dtos/validate.dto'
import { AutomaticDTO } from './dtos/automatic.dto'
import { GenerateDTO, DEFAULT_THEME } from './dtos/generate.dto'

dayjs.extend(utc)

@Controller({
  version: '1',
  path: 'captcha',
})
export class CaptchaController {
  constructor(
    private readonly captchaService: CaptchaService,
    private readonly logger: AppLoggerService,
  ) { }

  @Post('/generate')
  @HttpCode(200)
  @UseGuards(BotDetectionGuard)
  @BotDetection()
  async generateCaptcha(
    @Body() generateDTO: GenerateDTO,
  ): Promise<any> {
    this.logger.log({ generateDTO }, 'POST /captcha/generate')

    const {
      theme = DEFAULT_THEME, pid,
    } = generateDTO

    await this.captchaService.validatePIDForCAPTCHA(pid)

    return await this.captchaService.generateCaptcha(theme, pid)
  }

  @Post('/verify-manual')
  @HttpCode(200)
  @UseGuards(BotDetectionGuard)
  @BotDetection()
  async verifyManual(
    @Body() manualDTO: ManualDTO,
    @Req() request: Request,
    @Headers() headers,
    @Res({ passthrough: true }) response: Response,
  ): Promise<any> {
    this.logger.log({ manualDTO }, 'POST /captcha/verify-manual')

    const { 'user-agent': userAgent } = headers
    // todo: add origin checks

    // @ts-ignore
    const tokenCookie = request?.cookies?.[CAPTCHA_COOKIE_KEY]
    const {
      code, hash, pid,
    } = manualDTO

    await this.captchaService.validatePIDForCAPTCHA(pid)

    if (pid === DUMMY_PIDS.ALWAYS_FAIL || !this.captchaService.verifyCaptcha(code, hash, pid)) {
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

    const timestamp = dayjs.utc().unix()
    const token = await this.captchaService.generateToken(pid, hash, timestamp, false)

    // For dummy (test) PIDs
    if (pid === DUMMY_PIDS.MANUAL_PASS) {
      return {
        success: true,
        token,
        timestamp,
        hash,
        pid,
      }
    }

    const {
      manuallyVerified, automaticallyVerified,
    } = this.captchaService.incrementManuallyVerified(decrypted)

    const newTokenCookie = this.captchaService.getTokenCaptcha(manuallyVerified, automaticallyVerified)
    this.captchaService.setTokenCookie(response, newTokenCookie)

    await this.captchaService.logCaptchaPass(pid, userAgent, headers, timestamp, true)

    return {
      success: true,
      token,
      timestamp,
      hash,
      pid,
    }
  }

  @Post('/verify')
  @HttpCode(200)
  @UseGuards(BotDetectionGuard)
  @BotDetection()
  async autoVerifiable(
    @Body() automaticDTO: AutomaticDTO,
    @Req() request: Request,
    @Headers() headers,
    @Res({ passthrough: true }) response: Response,
  ): Promise<any> {
    this.logger.log(automaticDTO, 'POST /captcha/verify')

    const { 'user-agent': userAgent } = headers
    // todo: add origin checks

    const { pid } = automaticDTO

    await this.captchaService.validatePIDForCAPTCHA(pid)

    // @ts-ignore
    let tokenCookie = request?.cookies?.[CAPTCHA_COOKIE_KEY]

    let verifiable

    try {
      verifiable = await this.captchaService.autoVerifiable(pid, tokenCookie)
    } catch (e) {
      // Either there was no cookie or the cookie was invalid
      let newTokenCookie

      if (isDummyPID(pid) && (pid !== DUMMY_PIDS.AUTO_PASS || pid === DUMMY_PIDS.ALWAYS_FAIL)) {
        throw new ForbiddenException('Captcha required')
      }

      // Set a new cookie
      try {
        newTokenCookie = this.captchaService.getTokenCaptcha()
      } catch (e) {
        console.error(e)
        throw new InternalServerErrorException('Could not generate a captcha cookie')
      }

      tokenCookie = newTokenCookie

      this.captchaService.setTokenCookie(response, newTokenCookie)
    }

    if (!verifiable) {
      throw new ForbiddenException('Captcha required')
    }

    let decrypted

    try {
      decrypted = await this.captchaService.decryptTokenCaptcha(tokenCookie)
    } catch (e) {
      throw new InternalServerErrorException('Could not decrypt captcha cookie')
    }

    const timestamp = dayjs.utc().unix()
    const token = await this.captchaService.generateToken(pid, null, timestamp, true)

    if (pid === DUMMY_PIDS.AUTO_PASS) {
      return {
        success: true,
        token,
        timestamp,
        hash: null,
      }
    }

    const {
      manuallyVerified, automaticallyVerified,
    } = this.captchaService.incrementAutomaticallyVerified(decrypted)

    const newTokenCookie = this.captchaService.getTokenCaptcha(manuallyVerified, automaticallyVerified)

    this.captchaService.setTokenCookie(response, newTokenCookie)

    await this.captchaService.logCaptchaPass(pid, userAgent, headers, timestamp, false)

    return {
      success: true,
      token,
      timestamp,
      hash: null,
    }
  }

  @Post('/validate')
  @HttpCode(200)
  async validateToken(
    @Body() validateDTO: ValidateDTO,
  ): Promise<any> {
    this.logger.log({ validateDTO }, 'POST /captcha/validate')

    const {
      token, secret,
    } = validateDTO

    return {
      success: true,
      data: await this.captchaService.validateToken(token, secret),
    }
  }
}

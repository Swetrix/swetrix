import {
  Controller,
  Post,
  Body,
  UseGuards,
  ForbiddenException,
  Headers,
  Ip,
  HttpCode,
} from '@nestjs/common'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

import { AppLoggerService } from '../logger/logger.service'
import { getIPFromHeaders } from '../common/utils'
import { CaptchaService, DUMMY_PIDS } from './captcha.service'
import { BotDetectionGuard } from '../common/guards/bot-detection.guard'
import { BotDetection } from '../common/decorators/bot-detection.decorator'
import { VerifyDto } from './dtos/manual.dto'
import { ValidateDto } from './dtos/validate.dto'
import { GenerateDto, DEFAULT_THEME } from './dtos/generate.dto'

dayjs.extend(utc)

@Controller({
  version: '1',
  path: 'captcha',
})
export class CaptchaController {
  constructor(
    private readonly captchaService: CaptchaService,
    private readonly logger: AppLoggerService,
  ) {}

  @Post('/generate')
  @HttpCode(200)
  @UseGuards(BotDetectionGuard)
  @BotDetection()
  async generateCaptcha(@Body() generateDTO: GenerateDto): Promise<any> {
    this.logger.log({ generateDTO }, 'POST /captcha/generate')

    const { theme = DEFAULT_THEME, pid } = generateDTO

    await this.captchaService.validatePIDForCAPTCHA(pid)

    return this.captchaService.generateCaptcha(theme)
  }

  @Post('/verify')
  @HttpCode(200)
  @UseGuards(BotDetectionGuard)
  @BotDetection()
  async verify(
    @Body() verifyDto: VerifyDto,
    @Headers() headers,
    @Ip() reqIP,
  ): Promise<any> {
    this.logger.log({ manualDTO: verifyDto }, 'POST /captcha/verify')
    // todo: add origin checks

    const { code, hash, pid } = verifyDto

    await this.captchaService.validatePIDForCAPTCHA(pid)

    const timestamp = dayjs.utc().unix() * 1000

    // For dummy (test) PIDs
    if (pid === DUMMY_PIDS.ALWAYS_PASS) {
      const dummyToken = this.captchaService.generateDummyToken()
      return {
        success: true,
        token: dummyToken,
        timestamp,
        hash,
        pid,
      }
    }

    if (
      pid === DUMMY_PIDS.ALWAYS_FAIL ||
      !this.captchaService.verifyCaptcha(code, hash)
    ) {
      throw new ForbiddenException('Incorrect captcha')
    }

    const token = await this.captchaService.generateToken(pid, hash, timestamp)

    const ip = getIPFromHeaders(headers) || reqIP || ''

    try {
      await this.captchaService.logCaptchaPass(pid, headers, timestamp, ip)
    } catch (reason) {
      this.logger.error(
        `[CaptchaController -> verify] Failed to log captcha pass: ${reason}`,
      )
    }

    return {
      success: true,
      token,
      timestamp,
      hash,
      pid,
    }
  }

  @Post('/validate')
  @HttpCode(200)
  async validateToken(@Body() validateDTO: ValidateDto): Promise<any> {
    this.logger.log({ validateDTO }, 'POST /captcha/validate')

    const { token, secret } = validateDTO

    return {
      success: true,
      data: await this.captchaService.validateToken(token, secret),
    }
  }
}

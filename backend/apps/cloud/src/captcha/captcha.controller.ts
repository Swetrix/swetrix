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
import { getIPFromHeaders, checkRateLimit } from '../common/utils'
import { CaptchaService, DUMMY_PIDS } from './captcha.service'
import { BotDetectionGuard } from '../common/guards/bot-detection.guard'
import { BotDetection } from '../common/decorators/bot-detection.decorator'
import { VerifyDto } from './dtos/manual.dto'
import { ValidateDto } from './dtos/validate.dto'
import { GenerateDto } from './dtos/generate.dto'

dayjs.extend(utc)

// Rate limit: 30 requests per IP per minute for challenge generation
const CAPTCHA_GENERATE_RL_REQUESTS_IP = 30
const CAPTCHA_GENERATE_RL_TIMEOUT = 60 // 1 minute

// Rate limit: 100 requests per project per minute for challenge generation
const CAPTCHA_GENERATE_RL_REQUESTS_PID = 100

// Rate limit: verification attempts per IP per minute
const CAPTCHA_VERIFY_RL_REQUESTS_IP = 60
const CAPTCHA_VERIFY_RL_TIMEOUT = 60 // 1 minute

// Rate limit: token validations per IP per minute
const CAPTCHA_VALIDATE_RL_REQUESTS_IP = 120
const CAPTCHA_VALIDATE_RL_TIMEOUT = 60 // 1 minute

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
  async generateCaptcha(
    @Body() generateDTO: GenerateDto,
    @Headers() headers,
    @Ip() reqIP,
  ): Promise<any> {
    const { pid } = generateDTO
    const ip = getIPFromHeaders(headers, true) || reqIP || ''

    this.logger.log({ pid }, 'POST /captcha/generate')

    await checkRateLimit(
      ip,
      'captcha-generate',
      CAPTCHA_GENERATE_RL_REQUESTS_IP,
      CAPTCHA_GENERATE_RL_TIMEOUT,
    )
    await checkRateLimit(
      pid,
      'captcha-generate',
      CAPTCHA_GENERATE_RL_REQUESTS_PID,
      CAPTCHA_GENERATE_RL_TIMEOUT,
    )

    await this.captchaService.validatePIDForCAPTCHA(pid)

    return this.captchaService.generateChallenge(pid)
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
    const { challenge, nonce, solution, pid } = verifyDto

    this.logger.log({ pid }, 'POST /captcha/verify')

    const ip = getIPFromHeaders(headers, true) || reqIP || ''

    await checkRateLimit(
      ip,
      'captcha-verify',
      CAPTCHA_VERIFY_RL_REQUESTS_IP,
      CAPTCHA_VERIFY_RL_TIMEOUT,
    )

    await this.captchaService.validatePIDForCAPTCHA(pid)

    const timestamp = dayjs.utc().unix() * 1000

    // For dummy (test) PIDs
    if (pid === DUMMY_PIDS.ALWAYS_PASS) {
      const dummyToken = await this.captchaService.generateDummyToken()
      return {
        success: true,
        token: dummyToken,
        timestamp,
        challenge,
        pid,
      }
    }

    if (pid === DUMMY_PIDS.ALWAYS_FAIL) {
      throw new ForbiddenException('PoW verification failed')
    }

    // Verify the PoW solution
    const isValid = await this.captchaService.verifyPoW(
      challenge,
      nonce,
      solution,
      pid,
    )

    if (!isValid) {
      throw new ForbiddenException('PoW verification failed')
    }

    const token = await this.captchaService.generateToken(
      pid,
      challenge,
      timestamp,
    )

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
      challenge,
      pid,
    }
  }

  @Post('/validate')
  @HttpCode(200)
  async validateToken(
    @Body() validateDTO: ValidateDto,
    @Headers() headers,
    @Ip() reqIP,
  ): Promise<any> {
    this.logger.log(validateDTO, 'POST /captcha/validate')

    const { token, secret } = validateDTO
    const ip = getIPFromHeaders(headers, true) || reqIP || ''

    await checkRateLimit(
      ip,
      'captcha-validate',
      CAPTCHA_VALIDATE_RL_REQUESTS_IP,
      CAPTCHA_VALIDATE_RL_TIMEOUT,
    )

    return {
      success: true,
      data: await this.captchaService.validateToken(token, secret),
    }
  }
}

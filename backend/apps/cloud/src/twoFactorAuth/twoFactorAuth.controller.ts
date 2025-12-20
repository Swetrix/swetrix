import {
  Controller,
  Post,
  HttpCode,
  Body,
  BadRequestException,
  Headers,
  Ip,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import { Auth } from '../auth/decorators'
import { TwoFactorAuthService } from './twoFactorAuth.service'
import { UserService } from '../user/user.service'
import { AuthService } from '../auth/auth.service'
import { AppLoggerService } from '../logger/logger.service'
import { MailerService } from '../mailer/mailer.service'
import { LetterTemplate } from '../mailer/letter'
import { TwoFaNotRequired, CurrentUserId } from '../auth/decorators'
import { TwoFactorAuthDTO } from './dto/2fa-auth.dto'
import {
  generateRecoveryCode,
  checkRateLimit,
  getIPFromHeaders,
} from '../common/utils'

@ApiTags('2fa')
@Controller('2fa')
export class TwoFactorAuthController {
  constructor(
    private twoFactorAuthService: TwoFactorAuthService,
    private userService: UserService,
    private authService: AuthService,
    private readonly logger: AppLoggerService,
    private readonly mailerService: MailerService,
  ) {}

  @ApiBearerAuth()
  @Post('generate')
  @Auth()
  @TwoFaNotRequired()
  async register(@CurrentUserId() id: string) {
    const user = await this.userService.findOne({ where: { id } })

    if (!user) {
      throw new BadRequestException('User not found')
    }

    // Prevent re-issuing a new secret while 2FA is already enabled (would allow secret rotation
    // using only a pre-2FA access token).
    if (user.isTwoFactorAuthenticationEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled')
    }

    return this.twoFactorAuthService.generateTwoFactorAuthenticationSecret(user)
  }

  @ApiBearerAuth()
  @Post('enable')
  @Auth()
  @TwoFaNotRequired()
  async turnOnTwoFactorAuthentication(
    @Body() body: TwoFactorAuthDTO,
    @CurrentUserId() id: string,
    @Headers() headers,
    @Ip() reqIP,
  ) {
    this.logger.log({}, 'POST /2fa/enable')

    const ip = getIPFromHeaders(headers) || reqIP || ''
    await checkRateLimit(ip, '2fa-enable', 5, 1800)
    await checkRateLimit(id, '2fa-enable', 5, 1800)

    const user = await this.userService.findOne({ where: { id } })
    const { twoFactorAuthenticationCode } = body

    if (!user) {
      throw new BadRequestException('User not found')
    }

    if (user.isTwoFactorAuthenticationEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled')
    }

    if (!user.twoFactorAuthenticationSecret) {
      throw new BadRequestException('Two-factor authentication is not initialised')
    }

    const isCodeValid =
      this.twoFactorAuthService.isTwoFactorAuthenticationCodeValid(
        twoFactorAuthenticationCode,
        user,
      )

    if (!isCodeValid) {
      throw new BadRequestException('Wrong authentication code')
    }

    const twoFactorRecoveryCode = generateRecoveryCode()

    await this.userService.update(user.id, {
      isTwoFactorAuthenticationEnabled: true,
      twoFactorRecoveryCode,
    })

    await this.mailerService.sendEmail(user.email, LetterTemplate.TwoFAOn)

    user.isTwoFactorAuthenticationEnabled = true

    const authData = await this.authService.generateJwtTokens(user.id, true)

    return {
      twoFactorRecoveryCode,
      ...authData,
    }
  }

  @ApiBearerAuth()
  @Post('disable')
  @HttpCode(200)
  @Auth()
  async turnOffTwoFactorAuthentication(
    @Body() body: TwoFactorAuthDTO,
    @CurrentUserId() id: string,
    @Headers() headers,
    @Ip() reqIP,
  ) {
    this.logger.log({}, 'POST /2fa/disable')

    const ip = getIPFromHeaders(headers) || reqIP || ''
    await checkRateLimit(ip, '2fa-disable', 5, 1800)
    await checkRateLimit(id, '2fa-disable', 5, 1800)

    const user = await this.userService.findOne({ where: { id } })
    const { twoFactorAuthenticationCode } = body

    if (!user) {
      throw new BadRequestException('User not found')
    }

    const isRecoveryCodeValid =
      !!user.twoFactorRecoveryCode &&
      user.twoFactorRecoveryCode === twoFactorAuthenticationCode
    const isTotpValid =
      this.twoFactorAuthService.isTwoFactorAuthenticationCodeValid(
        twoFactorAuthenticationCode,
        user,
      )
    const isCodeValid = isRecoveryCodeValid || isTotpValid

    if (!isCodeValid) {
      throw new BadRequestException('Wrong authentication code')
    }

    await this.mailerService.sendEmail(user.email, LetterTemplate.TwoFAOff)

    await this.userService.update(user.id, {
      isTwoFactorAuthenticationEnabled: false,
      twoFactorRecoveryCode: null,
      twoFactorAuthenticationSecret: null,
    })
  }

  @ApiBearerAuth()
  @Post('authenticate')
  @HttpCode(200)
  @Auth()
  @TwoFaNotRequired()
  async authenticate(
    @Body() body: TwoFactorAuthDTO,
    @CurrentUserId() id: string,
    @Headers() headers,
    @Ip() reqIP,
  ) {
    this.logger.log({}, 'POST /2fa/authenticate')

    const ip = getIPFromHeaders(headers) || reqIP || ''
    await checkRateLimit(ip, '2fa-auth', 10, 1800)
    await checkRateLimit(id, '2fa-auth', 10, 1800)

    const user = await this.userService.findOne({ where: { id } })
    const { twoFactorAuthenticationCode } = body

    if (!user) {
      throw new BadRequestException('User not found')
    }

    if (!user.isTwoFactorAuthenticationEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled')
    }

    const isRecoveryCodeValid =
      !!user.twoFactorRecoveryCode &&
      user.twoFactorRecoveryCode === twoFactorAuthenticationCode
    const isTotpValid =
      this.twoFactorAuthService.isTwoFactorAuthenticationCodeValid(
        twoFactorAuthenticationCode,
        user,
      )
    const isCodeValid = isRecoveryCodeValid || isTotpValid

    if (!isCodeValid) {
      throw new BadRequestException('Wrong authentication code')
    }

    const tokens = await this.authService.generateJwtTokens(user.id, true)

    return {
      ...tokens,
      user: this.userService.omitSensitiveData(user),
    }
  }
}

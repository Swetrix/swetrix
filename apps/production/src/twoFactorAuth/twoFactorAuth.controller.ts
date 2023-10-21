import {
  Controller,
  Post,
  UseGuards,
  HttpCode,
  Body,
  BadRequestException,
  Headers,
  Ip,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

import { JwtAccessTokenGuard } from '../auth/guards'
import { TwoFactorAuthService } from './twoFactorAuth.service'
import { UserService } from '../user/user.service'
import { AuthService } from '../auth/auth.service'
import { UserType } from '../user/entities/user.entity'
import { AppLoggerService } from '../logger/logger.service'
import { MailerService } from '../mailer/mailer.service'
import { LetterTemplate } from '../mailer/letter'
import { TwoFaNotRequired, Roles, CurrentUserId } from '../auth/decorators'
import { RolesGuard } from '../auth/guards/roles.guard'
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

  @Post('generate')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  @TwoFaNotRequired()
  async register(@CurrentUserId() id: string) {
    const user = await this.userService.findOneWhere({ id })

    return this.twoFactorAuthService.generateTwoFactorAuthenticationSecret(user)
  }

  @Post('enable')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  @TwoFaNotRequired()
  async turnOnTwoFactorAuthentication(
    @Body() body: TwoFactorAuthDTO,
    @CurrentUserId() id: string,
    @Headers() headers,
    @Ip() reqIP,
  ) {
    this.logger.log({ body }, 'POST /2fa/enable')

    const ip = getIPFromHeaders(headers) || reqIP || ''
    await checkRateLimit(ip, '2fa-enable', 10, 1800)

    const user = await this.userService.findOneWhere({ id })
    const { twoFactorAuthenticationCode } = body

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

  @Post('disable')
  @HttpCode(200)
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async turnOffTwoFactorAuthentication(
    @Body() body: TwoFactorAuthDTO,
    @CurrentUserId() id: string,
    @Headers() headers,
    @Ip() reqIP,
  ) {
    this.logger.log({ body }, 'POST /2fa/disable')

    const ip = getIPFromHeaders(headers) || reqIP || ''
    await checkRateLimit(ip, '2fa-disable', 10, 1800)

    const user = await this.userService.findOneWhere({ id })
    const { twoFactorAuthenticationCode } = body

    const isCodeValid =
      user.twoFactorRecoveryCode === twoFactorAuthenticationCode ||
      this.twoFactorAuthService.isTwoFactorAuthenticationCodeValid(
        twoFactorAuthenticationCode,
        user,
      )

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

  @Post('authenticate')
  @HttpCode(200)
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  @TwoFaNotRequired()
  async authenticate(
    @Body() body: TwoFactorAuthDTO,
    @CurrentUserId() id: string,
    @Headers() headers,
    @Ip() reqIP,
  ) {
    this.logger.log({ body }, 'POST /2fa/authenticate')

    const ip = getIPFromHeaders(headers) || reqIP || ''
    await checkRateLimit(ip, '2fa-auth', 10, 1800)

    const user = await this.userService.findOneWhere({ id })
    const { twoFactorAuthenticationCode } = body

    const isCodeValid =
      user.twoFactorRecoveryCode === twoFactorAuthenticationCode ||
      this.twoFactorAuthService.isTwoFactorAuthenticationCodeValid(
        twoFactorAuthenticationCode,
        user,
      )

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

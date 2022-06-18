import { 
  Controller, Post, Res, UseGuards, HttpCode, Body, UnauthorizedException,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Response } from 'express'

import { TwoFactorAuthService } from './twoFactorAuth.service'
import { UserService } from '../user/user.service'
import { AuthService } from 'src/auth/auth.service'
import { UserType } from '../user/entities/user.entity'
import { ActionTokensService } from '../action-tokens/action-tokens.service'
import { AppLoggerService } from '../logger/logger.service'
import { CurrentUserId } from 'src/common/decorators/current-user-id.decorator'
import { SelfhostedGuard } from '../common/guards/selfhosted.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { TwoFaNotRequired } from '../common/decorators/2fa-disabled.decorator'
import { RolesGuard } from 'src/common/guards/roles.guard'
import { TwoFactorAuthDTO } from './dto/2fa-auth.dto'
import {
  isSelfhosted, SELFHOSTED_EMAIL, SELFHOSTED_PASSWORD, SELFHOSTED_UUID,
} from 'src/common/constants'

@ApiTags('2fa')
@Controller('2fa')
export class TwoFactorAuthController {
  constructor(
    private twoFactorAuthService: TwoFactorAuthService,
    private userService: UserService,
    private authService: AuthService,
    private actionTokensService: ActionTokensService,
    private readonly logger: AppLoggerService
  ) {}

  @Post('generate')
  @UseGuards(RolesGuard)
  @UseGuards(SelfhostedGuard) // temporary this feature is not available for selfhosted
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  @TwoFaNotRequired()
  async register(@Res() response: Response, @CurrentUserId() id: string) {
    const user = await this.userService.findOneWhere({ id })

    const { otpauthUrl } = await this.twoFactorAuthService.generateTwoFactorAuthenticationSecret(user)
 
    return this.twoFactorAuthService.pipeQrCodeStream(response, otpauthUrl)
  }

  @Post('enable')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @UseGuards(SelfhostedGuard) // temporary this feature is not available for selfhosted
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  @TwoFaNotRequired()
  async turnOnTwoFactorAuthentication(@Body() body: TwoFactorAuthDTO, @CurrentUserId() id: string) {
    this.logger.log({ body }, 'POST /2fa/enable')
    const user = await this.userService.findOneWhere({ id })
    const { twoFactorAuthenticationCode } = body

    const isCodeValid = this.twoFactorAuthService.isTwoFactorAuthenticationCodeValid(
      twoFactorAuthenticationCode, user,
    )

    if (!isCodeValid) {
      throw new UnauthorizedException('Wrong authentication code')
    }

    await this.userService.update(user.id, {
      isTwoFactorAuthenticationEnabled: true,
    })
  }

  @Post('authenticate')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @UseGuards(SelfhostedGuard) // temporary this feature is not available for selfhosted
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  @TwoFaNotRequired()
  async authenticate(@Body() body: TwoFactorAuthDTO, @CurrentUserId() id: string) {
    this.logger.log({ body }, 'POST /2fa/authenticate')
    const user = await this.userService.findOneWhere({ id })
    const { twoFactorAuthenticationCode } = body

    const isCodeValid = this.twoFactorAuthService.isTwoFactorAuthenticationCodeValid(
      twoFactorAuthenticationCode, user,
    )

    if (!isCodeValid) {
      throw new UnauthorizedException('Wrong authentication code')
    }

    return this.authService.login(user, true)
  }
}

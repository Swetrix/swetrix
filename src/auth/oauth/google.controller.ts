import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common'
import { Request, Response } from 'express'

import { AuthService } from '../auth.service'
import { UserService } from '../../user/user.service'
import { GoogleOauthGuard } from '../guards/google-oauth.guard'

@Controller('auth/google')
export class GoogleOauthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @Get()
  @UseGuards(GoogleOauthGuard)
  async googleAuth(@Req() _req) {
    // Guard redirects
  }

  @Get('redirect')
  @UseGuards(GoogleOauthGuard)
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {\
    const { user } = req

    console.log('req.user', user)

    const jwtTokens = await this.authService.generateJwtTokens(
      user.id,
      // !user.isTwoFactorAuthenticationEnabled,
      false,
    )

    // await this.authService.sendTelegramNotification(user.id, headers, ip)
    return {
      accessToken: jwtTokens.accessToken,
      refreshToken: jwtTokens.refreshToken,
      user: this.userService.omitSensitiveData(user),
    }
  }
}

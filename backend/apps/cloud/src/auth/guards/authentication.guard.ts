import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ExtractJwt } from 'passport-jwt'
import { verify } from 'jsonwebtoken'

import { UserService } from '../../user/user.service'
import { JWT_ACCESS_TOKEN_SECRET } from '../../common/constants'
import { IS_TWO_FA_NOT_REQUIRED_KEY } from '../decorators'

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const isTwoFaNotRequired = this.reflector.get<boolean>(
      IS_TWO_FA_NOT_REQUIRED_KEY,
      context.getHandler(),
    )

    const request = context.switchToHttp().getRequest()
    const userFromRequest = request.user

    const user = await this.userService.findUserById(userFromRequest?.id)

    let token = ''
    if (request.cookies.token) {
      token = request.cookies.token
    } else {
      const extract = ExtractJwt.fromAuthHeaderAsBearerToken()
      token = extract(request)
    }

    if (isTwoFaNotRequired || !token) {
      return true
    }

    try {
      const decoded: any = verify(token, JWT_ACCESS_TOKEN_SECRET)

      // If the token is not decoded, it means it's invalid
      if (!decoded) {
        return false
      }

      // If the user has 2FA enabled, but the token is temporary (meant to be used for 2FA routes only) then return false
      if (
        user?.isTwoFactorAuthenticationEnabled &&
        !decoded.isSecondFactorAuthenticated
      ) {
        return false
      }
    } catch {
      return false
    }

    return true
  }
}

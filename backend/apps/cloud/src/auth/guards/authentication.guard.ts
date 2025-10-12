import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { IS_TWO_FA_NOT_REQUIRED_KEY } from '../decorators'

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext) {
    const isTwoFaNotRequired = this.reflector.get<boolean>(
      IS_TWO_FA_NOT_REQUIRED_KEY,
      context.getHandler(),
    )

    const request = context.switchToHttp().getRequest()
    const user = request.user

    if (isTwoFaNotRequired) {
      return true
    }

    // If user is missing here, upstream guards (e.g., JwtAccessTokenGuard) already rejected the request,
    // or this route allows API key auth via MultiAuthGuard. When using API key, skip 2FA enforcement.
    if (!user) return true

    if (
      user?.isTwoFactorAuthenticationEnabled &&
      !user?.isSecondFactorAuthenticated
    ) {
      return false
    }

    return true
  }
}

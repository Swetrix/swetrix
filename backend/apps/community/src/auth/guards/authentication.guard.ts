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

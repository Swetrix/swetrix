import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { UserType } from 'src/user/entities/user.entity'
import { UserService } from 'src/user/user.service'
import { IS_ROLES_KEY, IS_TWO_FA_NOT_REQUIRED_KEY } from '../decorators'
import { IJwtPayload } from '../interfaces'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const roles = this.reflector.get<UserType[]>(
      IS_ROLES_KEY,
      context.getHandler(),
    )

    const isTwoFaNotRequired = this.reflector.get<boolean>(
      IS_TWO_FA_NOT_REQUIRED_KEY,
      context.getHandler(),
    )

    if (!roles) return true

    const request = context.switchToHttp().getRequest()
    const userFromRequest = request.user as IJwtPayload

    const user = await this.userService.findUserById(userFromRequest.sub)

    const hasRole = user.roles.some(role => roles.includes(role))

    if (!hasRole) return false

    if (
      !isTwoFaNotRequired &&
      user.isTwoFactorAuthenticationEnabled &&
      !userFromRequest.isSecondFactorAuthenticated
    ) {
      return false
    }

    return true
  }
}

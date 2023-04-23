import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { UserType } from 'src/user/entities/user.entity'
import { UserService } from 'src/user/user.service'
import { IS_TWO_FA_NOT_REQUIRED_KEY, ROLES_KEY } from '../decorators'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const roles = this.reflector.get<UserType[]>(
      ROLES_KEY,
      context.getHandler(),
    )

    const isTwoFaNotRequired = this.reflector.get<boolean>(
      IS_TWO_FA_NOT_REQUIRED_KEY,
      context.getHandler(),
    )

    if (!roles || roles.length === 0) return true

    const request = context.switchToHttp().getRequest()
    const userFromRequest = request.user

    const user = await this.userService.findUserById(userFromRequest.id)

    // this is a temp measure as well due to some fucking bug related to undefined user, will revert it when I find the cause
    let hasRole
    try {
      hasRole = user.roles.some(role => roles.includes(role))
    } catch (error) {
      console.error(`[AUTH ERROR - ROLES GUARD] ${error.message}`)
      console.error(user, roles)
      console.error(request?.path, request?.originalUrl, request?.method)
    }

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

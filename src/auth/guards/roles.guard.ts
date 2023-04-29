import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ExtractJwt } from 'passport-jwt'
import { verify } from 'jsonwebtoken'

import { UserType, generateSelfhostedUser } from 'src/user/entities/user.entity'
import { UserService } from 'src/user/user.service'
import { IS_TWO_FA_NOT_REQUIRED_KEY, ROLES_KEY } from '../decorators'
import { isSelfhosted } from 'src/common/constants'

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_TOKEN_SECRET

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

    const user = isSelfhosted
      ? generateSelfhostedUser()
      : await this.userService.findUserById(userFromRequest.id)

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

    let token = ''
    if (request.cookies.token) {
      token = request.cookies.token
    } else {
      const extract = ExtractJwt.fromAuthHeaderAsBearerToken()
      token = extract(request)
    }

    if (isSelfhosted) {
      try {
        const decoded: any = verify(token, ACCESS_TOKEN_SECRET)
  
        // If the token is not decoded, it means it's invalid
        if (!decoded) {
          return false
        }
      } catch {
        return false
      }

      return true
    }

    if (isTwoFaNotRequired) {
      return true
    }

    try {
      const decoded: any = verify(token, ACCESS_TOKEN_SECRET)

      // If the token is not decoded, it means it's invalid
      if (!decoded) {
        return false
      }

      // If the user has 2FA enabled, but the token is temporary (meant to be used for 2FA routes only) then return false
      if (
        user.isTwoFactorAuthenticationEnabled &&
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

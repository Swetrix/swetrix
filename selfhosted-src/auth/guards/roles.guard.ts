import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ExtractJwt } from 'passport-jwt'
import { verify } from 'jsonwebtoken'

import { UserType } from 'selfhosted-src/user/entities/user.entity'
import { JWT_ACCESS_TOKEN_SECRET } from 'selfhosted-src/common/constants'
import { ROLES_KEY } from '../decorators'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext) {
    const roles = this.reflector.get<UserType[]>(
      ROLES_KEY,
      context.getHandler(),
    )

    if (!roles || roles.length === 0) return true

    const request = context.switchToHttp().getRequest()

    let token = ''
    if (request.cookies.token) {
      token = request.cookies.token
    } else {
      const extract = ExtractJwt.fromAuthHeaderAsBearerToken()
      token = extract(request)
    }

    try {
      const decoded: any = verify(token, JWT_ACCESS_TOKEN_SECRET)

      // If the token is not decoded, it means it's invalid
      if (!decoded) {
        return false
      }
    } catch {
      return false
    }

    return true
  }
}

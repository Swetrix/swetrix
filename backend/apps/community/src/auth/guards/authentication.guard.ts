import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ExtractJwt } from 'passport-jwt'
import { verify } from 'jsonwebtoken'

import { JWT_ACCESS_TOKEN_SECRET } from '../../common/constants'

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest()

    let token = ''
    if (request.cookies.token) {
      token = request.cookies.token
    } else {
      const extract = ExtractJwt.fromAuthHeaderAsBearerToken()
      token = extract(request)
    }

    if (!token) {
      return true
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

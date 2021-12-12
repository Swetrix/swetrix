import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Request } from 'express'
import { verify } from 'jsonwebtoken'
import { ExtractJwt } from 'passport-jwt'

import { UserService } from '../../user/user.service'
import { User } from '../../user/entities/user.entity'
import { isSelfhosted } from '../constants'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private userService: UserService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const secret = process.env.JWT_SECRET
    const roles = this.reflector.get<string[]>('roles', context.getHandler())
    if (!roles || isSelfhosted) {
      return true
    }

    const request: Request = context.switchToHttp().getRequest()
    let token = ''
    if (request.cookies['token']) {
      token = request.cookies['token']
    } else {
      const extract = ExtractJwt.fromAuthHeaderAsBearerToken()
      token = extract(request)
    }

    try {
      const decoded: any = verify(token, secret)
      if (decoded) {
        let user: User = await this.userService.findOneWhere({ id: decoded.user_id })
        const hasRole = user.roles.some(role => !!roles.find(item => item === role))
        return hasRole
      }
    } catch {
      throw new UnauthorizedException()
    }
  }
}

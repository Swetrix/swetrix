import { ForbiddenException, Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Request } from 'express'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { IJwtPayload } from '../interfaces'
import { JWT_REFRESH_TOKEN_SECRET } from '../../common/constants'

@Injectable()
export class JwtRefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh-token',
) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: JWT_REFRESH_TOKEN_SECRET,
      passReqToCallback: true,
    })
  }

  public validate(request: Request, payload: IJwtPayload) {
    const refreshToken = request.headers.authorization.split(' ')[1]

    if (!refreshToken) throw new ForbiddenException()

    return { ...payload, refreshToken }
  }
}

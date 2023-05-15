import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy, ExtractJwt } from 'passport-jwt'

import {
  SELFHOSTED_UUID,
  JWT_ACCESS_TOKEN_SECRET,
} from 'src/common/constants'
import { generateSelfhostedUser } from 'src/user/entities/user.entity'
import { IJwtPayload } from '../interfaces'

@Injectable()
export class JwtAccessTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-access-token',
) {
  constructor(public readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JWT_ACCESS_TOKEN_SECRET,
    })
  }

  public async validate(payload: IJwtPayload) {
    if (payload.sub !== SELFHOSTED_UUID) {
      throw new UnauthorizedException()
    }

    return generateSelfhostedUser()
  }
}

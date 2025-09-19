import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy, ExtractJwt } from 'passport-jwt'

import { JWT_ACCESS_TOKEN_SECRET } from '../../common/constants'
import { IJwtPayload } from '../interfaces'
import { UserService } from '../../user/user.service'

@Injectable()
export class JwtAccessTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-access-token',
) {
  constructor(
    public readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JWT_ACCESS_TOKEN_SECRET,
    })
  }

  public async validate(payload: IJwtPayload) {
    const user = await this.userService.findOne({ id: payload.sub })

    if (!user) {
      throw new UnauthorizedException()
    }

    return user
  }
}

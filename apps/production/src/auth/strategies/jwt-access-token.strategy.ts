import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy, ExtractJwt } from 'passport-jwt'

import { JWT_ACCESS_TOKEN_SECRET } from 'src/common/constants'
import { UserService } from 'src/user/user.service'
import { IJwtPayload } from '../interfaces'

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
    const user = await this.userService.findUserById(payload.sub)

    if (!user) {
      throw new UnauthorizedException()
    }

    return user
  }
}

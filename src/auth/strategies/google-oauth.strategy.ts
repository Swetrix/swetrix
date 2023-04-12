import { PassportStrategy } from '@nestjs/passport'
import { Profile, Strategy } from 'passport-google-oauth20'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { UserService } from 'src/user/user.service'

@Injectable()
export class GoogleOauthStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      // Put config in `.env`
      clientID: configService.get<string>('OAUTH_GOOGLE_ID'),
      clientSecret: configService.get<string>('OAUTH_GOOGLE_SECRET'),
      callbackURL: configService.get<string>('OAUTH_GOOGLE_REDIRECT_URL'),
      scope: ['email', 'profile'],
    })
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ) {
    const { id, name, emails } = profile

    // Here a custom User object is returned. In the the repo I'm using a UserService with repository pattern, learn more here: https://docs.nestjs.com/techniques/database
    return {
      provider: 'google',
      providerId: id,
      name: name.givenName,
      username: emails[0].value,
    }
  }
}
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { HeaderAPIKeyStrategy } from 'passport-headerapikey'
import { AuthService } from '../auth.service'

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(
  HeaderAPIKeyStrategy,
  'api-key',
) {
  constructor(private readonly authService: AuthService) {
    super(
      { header: 'X-Api-Key', prefix: '' },
      true,
      // eslint-disable-next-line consistent-return
      async (apiKey: string, done: any) => {
        const user = await this.authService.validateApiKey(apiKey)
        if (!user) return done(new UnauthorizedException(), false)
        done(null, user)
      },
    )
  }
}

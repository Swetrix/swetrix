import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { HeaderAPIKeyStrategy } from 'passport-headerapikey'
import { AuthService } from '../auth.service'
import { getSelfhostedUser } from '../../user/entities/user.entity'

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
        const isValid = this.authService.isApiKeyValid(apiKey)
        if (!isValid) return done(new UnauthorizedException(), false)

        const user = await getSelfhostedUser()
        done(null, user)
      },
    )
  }
}

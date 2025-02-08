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
      // TODO: What the fuck is this? As of Nest V 11 - this code should not work.
      // Test is later on. https://github.com/nestjs/passport/pull/1439
      // @ts-expect-error
      async (apiKey: string, done: (err: any, user: any) => void) => {
        return this.validate(apiKey, done)
      },
    )
  }

  async validate(apiKey: string, done: (err: any, user: any) => void) {
    const isValid = this.authService.isApiKeyValid(apiKey)
    if (!isValid) return done(new UnauthorizedException(), false)

    const user = await getSelfhostedUser()
    return done(null, user)
  }
}

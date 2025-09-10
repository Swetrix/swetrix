import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { HeaderAPIKeyStrategy } from 'passport-headerapikey'
import { UserService } from '../../user/user.service'

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(
  HeaderAPIKeyStrategy,
  'api-key',
) {
  constructor(private readonly userService: UserService) {
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
    const user = await this.userService.findOne({ apiKey })
    if (!user) return done(new UnauthorizedException(), false)

    return done(null, user)
  }
}

import { Injectable } from '@nestjs/common'
import { authenticator } from 'otplib'

import { UserService } from '../user/user.service'
import { User } from '../user/entities/user.entity'
import {
  TWO_FACTOR_AUTHENTICATION_APP_NAME,
} from '../common/constants'

@Injectable()
export class TwoFactorAuthService {
  constructor(
    private userService: UserService,
  ) { }

  async generateTwoFactorAuthenticationSecret(user: User) {
    const secret = authenticator.generateSecret()
    const otpauthUrl = authenticator.keyuri(user.email, TWO_FACTOR_AUTHENTICATION_APP_NAME, secret)

    await this.userService.update(user.id, {
      twoFactorAuthenticationSecret: secret,
    })

    return {
      secret,
      otpauthUrl,
    }
  }

  isTwoFactorAuthenticationCodeValid(twoFactorAuthenticationCode: string, user: User) {
    return authenticator.verify({
      token: twoFactorAuthenticationCode,
      secret: user.twoFactorAuthenticationSecret,
    })
  }
}

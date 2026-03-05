import { Injectable } from '@nestjs/common'
import { generateSecret, generateURI, verify } from 'otplib'

import { UserService } from '../user/user.service'
import { User } from '../common/types'
import { TWO_FACTOR_AUTHENTICATION_APP_NAME } from '../common/constants'

@Injectable()
export class TwoFactorAuthService {
  constructor(private userService: UserService) {}

  async generateTwoFactorAuthenticationSecret(user: User) {
    const secret = generateSecret()
    const otpauthUrl = generateURI({
      issuer: TWO_FACTOR_AUTHENTICATION_APP_NAME,
      label: user.email,
      secret,
    })

    await this.userService.update(user.id, {
      twoFactorAuthenticationSecret: secret,
    })

    return {
      secret,
      otpauthUrl,
    }
  }

  async isTwoFactorAuthenticationCodeValid(
    twoFactorAuthenticationCode: string,
    user: User,
  ) {
    if (!twoFactorAuthenticationCode) return false
    if (!user?.twoFactorAuthenticationSecret) return false

    try {
      const result = await verify({
        token: twoFactorAuthenticationCode,
        secret: user.twoFactorAuthenticationSecret,
      })

      return result.valid
    } catch {
      return false
    }
  }
}

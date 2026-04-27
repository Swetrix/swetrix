import { Injectable } from '@nestjs/common'
import { generateSecret, generateURI, verify } from 'otplib'
import { genSalt, hash, compare } from 'bcrypt'

import { UserService } from '../user/user.service'
import { User } from '../user/entities/user.entity'
import { TWO_FACTOR_AUTHENTICATION_APP_NAME } from '../common/constants'

@Injectable()
export class TwoFactorAuthService {
  constructor(private userService: UserService) {}

  async hashRecoveryCode(code: string): Promise<string> {
    const salt = await genSalt(10)
    return hash(code, salt)
  }

  async compareRecoveryCode(
    code: string,
    hashedCode: string,
  ): Promise<boolean> {
    return compare(code, hashedCode)
  }

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
        epochTolerance: 30,
      })

      return result.valid
    } catch (error) {
      console.error('[TwoFactorAuthService] TOTP verification error:', error)
      return false
    }
  }
}

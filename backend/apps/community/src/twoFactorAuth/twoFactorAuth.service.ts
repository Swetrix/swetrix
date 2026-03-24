import { Injectable } from '@nestjs/common'
import { generateSecret, generateURI, verify, createGuardrails } from 'otplib'
import { genSalt, hash, compare } from 'bcrypt'

import { UserService } from '../user/user.service'
import { User } from '../common/types'
import { TWO_FACTOR_AUTHENTICATION_APP_NAME } from '../common/constants'

// otplib v13 defaults to MIN_SECRET_BYTES=16, but secrets created under v12
// are 10 bytes (16 Base32 chars). Relax the guardrail so existing users can
// still verify.
const verifyGuardrails = createGuardrails({ MIN_SECRET_BYTES: 10 })

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
        guardrails: verifyGuardrails,
      })

      return result.valid
    } catch (error) {
      console.error('[TwoFactorAuthService] TOTP verification error:', error)
      return false
    }
  }
}

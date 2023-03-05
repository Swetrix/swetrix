import {
  Injectable, BadRequestException,
} from '@nestjs/common'
import * as svgCaptcha from 'svg-captcha'
import * as CryptoJS from 'crypto-js'
import { hash } from 'blake3'
import * as _toLower from 'lodash/toLower'

import { isDevelopment } from '../common/constants'

import {
  CAPTCHA_SALT, CAPTCHA_ENCRYPTION_KEY,
} from '../common/constants'

interface GeneratedCaptcha {
  data: string
  hash: string
}

interface TokenCaptcha {
  manuallyVerified: number
  automaticallyVerified: number
}

const encryptString = (text: string, key: string): string => {
  return CryptoJS.Rabbit.encrypt(text, key).toString()
}

const decryptString = (text: string, key: string): string => {
  const bytes = CryptoJS.Rabbit.decrypt(text, key)
  return bytes.toString(CryptoJS.enc.Utf8)
}

// Set the weights for the manual and automatic verifications
const MANUAL_WEIGHT = 2
const AUTO_WEIGHT = 1
const THRESHOLD = 1.5

// 300 days
const COOKIE_MAX_AGE = 300 * 24 * 60 * 60 * 1000

const captchaString = (text: string) => `${_toLower(text)}${CAPTCHA_SALT}`

const TEST_SECRET_KEY = 'wfOw1Jw3JAjcrHaQFvIvBS4qdG'

export const CAPTCHA_COOKIE_KEY = 'swetrix-captcha-token'

@Injectable()
export class CaptchaService {
  constructor(
  ) { }

  generateToken(publicKey: string, hash: string, timestamp: number, autoVerified: boolean): string {
    // todo: lookup the secret key from the public key in the database
    const secretKey = TEST_SECRET_KEY

    const token = {
      hash, timestamp, autoVerified,
    }

    return encryptString(JSON.stringify(token), secretKey)
  }

  validateToken(token: string, secretKey: string, hash: string, timestamp: number): boolean {
    let parsed

    try {
      const decrypted = decryptString(token, secretKey)
      parsed = JSON.parse(decrypted)
    } catch (e) {
      throw new BadRequestException('Could not decrypt token')
    }

    if (!parsed.autoVerified && parsed.hash !== hash) {
      throw new BadRequestException('Token: captcha pass hash does not match')
    }

    if (parsed.timestamp !== timestamp) {
      throw new BadRequestException('Token: timestamp does not match')
    }

    return true
  }

  hashCaptcha(text: string): string {
    return hash(captchaString(text)).toString('hex')
  }

  async generateCaptcha(): Promise<GeneratedCaptcha> {
    const captcha = svgCaptcha.create({
      size: 6,
      ignoreChars: '0o1il',
      noise: 2,
    })
    const hash = this.hashCaptcha(
      _toLower(captcha.text)
    )

    return {
      data: captcha.data,
      hash,
    }
  }

  verifyCaptcha(text: string, hash: string): boolean {
    return hash === this.hashCaptcha(text)
  }

  incrementManuallyVerified(tokenCaptcha: TokenCaptcha): TokenCaptcha {
    return {
      ...tokenCaptcha,
      manuallyVerified: 1 + tokenCaptcha.manuallyVerified,
    }
  }

  incrementAutomaticallyVerified(tokenCaptcha: TokenCaptcha): TokenCaptcha {
    return {
      ...tokenCaptcha,
      automaticallyVerified: 1 + tokenCaptcha.automaticallyVerified,
    }
  }

  private async canPassWithoutVerification(tokenCaptcha: TokenCaptcha): Promise<boolean> {
    const { manuallyVerified, automaticallyVerified } = tokenCaptcha

    // Calculate the weighted average of the manual and automatic verifications
    const weightedAverage = (MANUAL_WEIGHT * manuallyVerified + AUTO_WEIGHT * automaticallyVerified) /
      (MANUAL_WEIGHT + AUTO_WEIGHT)

    // If the weighted average is above a certain threshold, the user can pass without verification
    return weightedAverage >= THRESHOLD
  }

  async decryptTokenCaptcha(jwtCookie: string | undefined): Promise<TokenCaptcha> {
    try {
      const decryptedtokenCaptcha = decryptString(jwtCookie, CAPTCHA_ENCRYPTION_KEY)

      // @ts-ignore
      return JSON.parse(decryptedtokenCaptcha)
    } catch (e) {
      throw new Error('Invalid JWT captcha')
    }
  }

  getTokenCaptcha(manuallyVerified: number = 0, automaticallyVerified: number = 0): string {
    const tokenCaptcha: TokenCaptcha = {
      manuallyVerified,
      automaticallyVerified,
    }

    // @ts-ignore
    const encryptedTokenCaptcha: string = encryptString(JSON.stringify(tokenCaptcha), CAPTCHA_ENCRYPTION_KEY)

    return encryptedTokenCaptcha
  }

  async autoVerifiable(tokenCookie: string | undefined): Promise<boolean> {
    if (!tokenCookie) {
      throw new Error('No JWT captcha cookie')
    }

    const tokenCaptcha: TokenCaptcha = await this.decryptTokenCaptcha(tokenCookie)

    return this.canPassWithoutVerification(tokenCaptcha)
  }

  setTokenCookie(response: any, tokenCookie: string): void {
    if (isDevelopment) {
      // @ts-ignore
      response.cookie(CAPTCHA_COOKIE_KEY, tokenCookie, {
        httpOnly: true,
        maxAge: COOKIE_MAX_AGE,
      })
    } else {
      // @ts-ignore
      response.cookie(CAPTCHA_COOKIE_KEY, tokenCookie, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: COOKIE_MAX_AGE,
      })
    }
  }
}

import {
  Injectable,
} from '@nestjs/common'
import * as svgCaptcha from 'svg-captcha'
import * as CryptoJS from 'crypto-js'
import { hash } from 'blake3'

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

@Injectable()
export class CaptchaService {
  constructor(
  ) { }

  hashCaptcha(text: string): string {
    return hash(`${text}${CAPTCHA_SALT}`).toString('hex')
  }

  async generateCaptcha(): Promise<GeneratedCaptcha> {
    const captcha = svgCaptcha.create()
    const hash = this.hashCaptcha(captcha.text)

    return {
      data: captcha.data,
      hash,
    }
  }

  verifyCaptcha(text: string, hash: string): boolean {
    const hashedText = this.hashCaptcha(text)
    return hashedText === hash
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

  async getTokenCaptcha(manuallyVerified: number = 0, automaticallyVerified: number = 0): Promise<string> {
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
}

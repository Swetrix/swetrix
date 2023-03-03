import {
  Injectable,
} from '@nestjs/common'
import * as svgCaptcha from 'svg-captcha'
import { hash } from 'blake3'
import * as crypto from 'crypto'
import { promisify } from 'util'

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

// Encrypts a string using ChaCha20 algorithm with a given key
function encryptString(str: string, key: string | undefined = CAPTCHA_ENCRYPTION_KEY): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('chacha20', key, iv)
  const encrypted = Buffer.concat([cipher.update(str, 'utf8'), cipher.final()])
  return Buffer.concat([iv, encrypted]).toString('hex')
}

// Decrypts an encrypted string using ChaCha20 algorithm with a given key
function decryptString(encryptedStr: string, key: string | undefined = CAPTCHA_ENCRYPTION_KEY): string {
  const input = Buffer.from(encryptedStr, 'hex')
  const iv = input.slice(0, 12)
  const encrypted = input.slice(12)
  const decipher = crypto.createDecipheriv('chacha20', key, iv)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString('utf8')
}

// Promisify the encryption and decryption functions
const encryptStringAsync = promisify(encryptString)
const decryptStringAsync = promisify(decryptString)

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
    const decryptedtokenCaptcha = await decryptStringAsync(jwtCookie, CAPTCHA_ENCRYPTION_KEY)

    try {
      // @ts-ignore
      return JSON.parse(decryptedtokenCaptcha)
    } catch (e) {
      throw new Error('Invalid JWT captcha')
    }
  }

  async setTokenCaptcha(manuallyVerified: number = 0, automaticallyVerified: number = 0): Promise<string> {
    const tokenCaptcha: TokenCaptcha = {
      manuallyVerified,
      automaticallyVerified,
    }

    // @ts-ignore
    const encryptedtokenCaptcha: string = await encryptStringAsync(JSON.stringify(tokenCaptcha), CAPTCHA_ENCRYPTION_KEY)

    return encryptedtokenCaptcha
  }

  async autoVerifiable(tokenCookie: string | undefined): Promise<boolean> {
    if (!tokenCookie) {
      throw new Error('No JWT captcha cookie')
    }

    const tokenCaptcha: TokenCaptcha = await this.decryptTokenCaptcha(tokenCookie)

    return this.canPassWithoutVerification(tokenCaptcha)
  }
}

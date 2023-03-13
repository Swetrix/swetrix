import {
  Injectable, BadRequestException,
} from '@nestjs/common'
import { hash } from 'blake3'
import * as svgCaptcha from 'svg-captcha'
import * as CryptoJS from 'crypto-js'
import * as _toLower from 'lodash/toLower'
import * as UAParser from 'ua-parser-js'
import * as _map from 'lodash/map'
import * as dayjs from 'dayjs'
import * as utc from 'dayjs/plugin/utc'

import { AppLoggerService } from '../logger/logger.service'
import {
  isDevelopment, redis, REDIS_LOG_CAPTCHA_CACHE_KEY, isValidPID,
} from '../common/constants'
import { getElValue } from '../analytics/analytics.controller'
import { ProjectService } from 'src/project/project.service'

import {
  CAPTCHA_SALT, CAPTCHA_ENCRYPTION_KEY,
} from '../common/constants'

dayjs.extend(utc)

interface GeneratedCaptcha {
  data: string
  hash: string
}

interface TokenCaptcha {
  manuallyVerified: number
  automaticallyVerified: number
}

const encryptString = (text: string, key: string): string => {
  return CryptoJS.Rabbit.encrypt(text, key + key).toString()
}

const decryptString = (text: string, key: string): string => {
  const bytes = CryptoJS.Rabbit.decrypt(text, key + key)
  return bytes.toString(CryptoJS.enc.Utf8)
}

// Set the weights for the manual and automatic verifications
const MANUAL_WEIGHT = 2
const AUTO_WEIGHT = 1
const THRESHOLD = 1.5

// 300 days
const COOKIE_MAX_AGE = 300 * 24 * 60 * 60 * 1000

const captchaString = (text: string) => `${_toLower(text)}${CAPTCHA_SALT}`

export const CAPTCHA_COOKIE_KEY = 'swetrix-captcha-token'
export const CAPTCHA_TOKEN_LIFETIME = 300 // seconds (5 minutes).

const captchaDTO = (
  pid: string,
  dv: string,
  br: string,
  os: string,
  cc: string,
  isManual: boolean,
  timestamp: number
): Array<string | number> => {
  return [
    pid,
    dv,
    br,
    os,
    cc,
    isManual ? 1 : 0,
    dayjs.utc(timestamp).format('YYYY-MM-DD HH:mm:ss'),
  ]
}

@Injectable()
export class CaptchaService {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly projectService: ProjectService,
  ) { }

  // checks if captcha is enabled for pid
  async _isCaptchaEnabledForPID(pid: string): Promise<boolean> {
    const project = await this.projectService.getRedisProject(pid)
    
    if (!project) {
      return false
    }

    return project.isCaptchaEnabled
  }

  // validates pid, checks if captcha is enabled and throws an error otherwise
  async validatePIDForCAPTCHA(pid: string): Promise<void> {
    if (!isValidPID(pid)) {
      throw new BadRequestException(
        'The provided Project ID (pid) is incorrect',
      )
    }

    if (!(await this._isCaptchaEnabledForPID(pid))) {
      throw new BadRequestException(
        'CAPTCHA is not enabled for this Project',
      )
    }
  }

  async logCaptchaPass(pid: string, userAgent: string, headers: any, timestamp: number, isManual: boolean): Promise<void> {
    const ua = UAParser(userAgent)
    const dv = ua.device.type || 'desktop'
    const br = ua.browser.name
    const os = ua.os.name
    const cc = headers['cf-ipcountry'] === 'XX' ? 'NULL' : headers['cf-ipcountry']

    const dto = captchaDTO(pid, dv, br, os, cc, isManual, timestamp)

    const values = `(${_map(dto, getElValue).join(',')})`

    try {
      await redis.rpush(REDIS_LOG_CAPTCHA_CACHE_KEY, values)
    } catch (e) {
      this.logger.error(`[CaptchaService -> logCaptchaPass] ${e}`)
    }
  }

  async generateToken(pid: string, hash: string, timestamp: number, autoVerified: boolean): Promise<string> {
    const project = await this.projectService.getRedisProject(pid)

    if (!project) {
      throw new BadRequestException('Project not found')
    }

    // @ts-ignore
    const secretKey = project.captchaSecretKey

    if (!secretKey) {
      throw new BadRequestException('No secret key generated for this project')
    }

    const token = {
      hash, timestamp, autoVerified, pid,
    }

    return encryptString(JSON.stringify(token), secretKey)
  }

  validateToken(token: string, secretKey: string): object {
    let parsed

    try {
      const decrypted = decryptString(token, secretKey)
      parsed = JSON.parse(decrypted)
    } catch (e) {
      throw new BadRequestException('Could not decrypt token')
    }

    if (dayjs().unix() - parsed.timestamp > CAPTCHA_TOKEN_LIFETIME) {
      throw new BadRequestException('Token expired')
    }

    return parsed
  }

  hashCaptcha(text: string, pid: string): string {
    return hash(captchaString(text)).toString('hex')
  }

  async generateCaptcha(theme: string, pid: string): Promise<GeneratedCaptcha> {
    const themeParams = theme === 'light' ? {} : {
      background: '#1f2937',
      color: true,
    }

    const captcha = svgCaptcha.create({
      size: 6,
      ignoreChars: '0o1iIl',
      noise: 2,
      ...themeParams,
    })
    const hash = this.hashCaptcha(
      _toLower(captcha.text), pid,
    )

    return {
      data: captcha.data,
      hash,
    }
  }

  verifyCaptcha(text: string, hash: string, pid: string): boolean {
    return hash === this.hashCaptcha(text, pid)
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

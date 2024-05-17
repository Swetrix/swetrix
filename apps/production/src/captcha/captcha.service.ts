import { Injectable, BadRequestException } from '@nestjs/common'
import { hash } from 'blake3'
import * as svgCaptcha from 'svg-captcha'
import * as CryptoJS from 'crypto-js'
import * as _toLower from 'lodash/toLower'
import * as UAParser from 'ua-parser-js'
import * as _map from 'lodash/map'
import * as _values from 'lodash/values'
import * as _includes from 'lodash/includes'
import * as dayjs from 'dayjs'
import * as utc from 'dayjs/plugin/utc'

import { ProjectService } from '../project/project.service'
import { AppLoggerService } from '../logger/logger.service'
import {
  redis,
  REDIS_LOG_CAPTCHA_CACHE_KEY,
  isValidPID,
  getRedisCaptchaKey,
  CAPTCHA_SALT,
  CAPTCHA_TOKEN_LIFETIME,
} from '../common/constants'
import { getGeoDetails } from '../common/utils'
import { getElValue } from '../analytics/analytics.controller'
import { GeneratedCaptcha } from './interfaces/generated-captcha'

dayjs.extend(utc)

export const DUMMY_PIDS = {
  ALWAYS_PASS: 'AP00000000000',
  ALWAYS_FAIL: 'FAIL000000000',
}

const DUMMY_SECRETS = {
  ALWAYS_PASS: 'PASS000000000000000000',
  ALWAYS_FAIL: 'FAIL000000000000000000',
  TOKEN_USED_FAIL: 'USED000000000000000000',
}

export const isDummyPID = (pid: string): boolean => {
  return _includes(_values(DUMMY_PIDS), pid)
}

const encryptString = (text: string, key: string): string => {
  return CryptoJS.Rabbit.encrypt(text, key).toString()
}

const decryptString = (text: string, key: string): string => {
  const bytes = CryptoJS.Rabbit.decrypt(text, key)
  return bytes.toString(CryptoJS.enc.Utf8)
}

const captchaString = (text: string) => `${_toLower(text)}${CAPTCHA_SALT}`

const isTokenAlreadyUsed = async (token: string): Promise<boolean> => {
  const captchaKey = getRedisCaptchaKey(token)
  const key = await redis.get(captchaKey)

  if (key) {
    return true
  }

  await redis.set(captchaKey, '1', 'EX', CAPTCHA_TOKEN_LIFETIME)

  return false
}

const captchaDTO = (
  pid: string,
  dv: string,
  br: string,
  os: string,
  cc: string,
  isManual: boolean,
  timestamp: number,
): Array<string | number> => {
  return [
    pid,
    dv,
    br,
    os,
    cc,
    isManual ? 1 : 0,
    dayjs.unix(timestamp).format('YYYY-MM-DD HH:mm:ss'),
  ]
}

@Injectable()
export class CaptchaService {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly projectService: ProjectService,
  ) {}

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
    if (isDummyPID(pid)) {
      return
    }

    if (!isValidPID(pid)) {
      throw new BadRequestException(
        'The provided Project ID (pid) is incorrect',
      )
    }

    if (!(await this._isCaptchaEnabledForPID(pid))) {
      throw new BadRequestException('CAPTCHA is not enabled for this Project')
    }
  }

  async logCaptchaPass(
    pid: string,
    userAgent: string,
    timestamp: number,
    isManual: boolean,
    ip: string,
  ): Promise<void> {
    const ua = UAParser(userAgent)
    const dv = ua.device.type || 'desktop'
    const br = ua.browser.name
    const os = ua.os.name

    const { country = 'NULL' } = getGeoDetails(ip)
    const dto = captchaDTO(pid, dv, br, os, country, isManual, timestamp)
    const values = `(${_map(dto, getElValue).join(',')})`

    try {
      await redis.rpush(REDIS_LOG_CAPTCHA_CACHE_KEY, values)
    } catch (e) {
      this.logger.error(`[CaptchaService -> logCaptchaPass] ${e}`)
    }
  }

  async generateDummyToken() {
    return encryptString(
      'DUMMY_TOKEN00000111112222233333444445555566666777778888899999',
      DUMMY_SECRETS.ALWAYS_PASS,
    )
  }

  async generateToken(
    pid: string,
    captchaHash: string,
    timestamp: number,
  ): Promise<string> {
    if (isDummyPID(pid)) {
      return this.generateDummyToken()
    }

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
      hash: captchaHash,
      timestamp,
      pid,
    }

    return encryptString(JSON.stringify(token), secretKey)
  }

  async validateToken(token: string, secretKey: string): Promise<object> {
    let parsed

    if (secretKey === DUMMY_SECRETS.ALWAYS_FAIL) {
      throw new BadRequestException('Could not decrypt token')
    }

    if (secretKey === DUMMY_SECRETS.TOKEN_USED_FAIL) {
      throw new BadRequestException('Token already used')
    }

    if (secretKey === DUMMY_SECRETS.ALWAYS_PASS) {
      return {
        hash: 'DUMMY_HASH00000111112222233333444445555566666777778888899999',
        timestamp: dayjs().unix(),
        pid: DUMMY_PIDS.ALWAYS_PASS,
      }
    }

    try {
      const decrypted = decryptString(token, secretKey)
      parsed = JSON.parse(decrypted)
    } catch (e) {
      throw new BadRequestException('Could not decrypt token')
    }

    if (dayjs().unix() - parsed.timestamp > CAPTCHA_TOKEN_LIFETIME) {
      throw new BadRequestException('Token expired')
    }

    const tokenUsed = await isTokenAlreadyUsed(token)

    if (tokenUsed) {
      throw new BadRequestException('Token already used')
    }

    return parsed
  }

  hashCaptcha(text: string): string {
    return hash(captchaString(text)).toString('hex')
  }

  async generateCaptcha(theme: string): Promise<GeneratedCaptcha> {
    const themeParams =
      theme === 'light'
        ? {}
        : {
            background: '#1f2937',
            color: true,
          }

    const captcha = svgCaptcha.create({
      size: 6,
      ignoreChars: '0o1iIl',
      noise: 2,
      ...themeParams,
    })
    const captchaHash = this.hashCaptcha(_toLower(captcha.text))

    return {
      data: captcha.data,
      hash: captchaHash,
    }
  }

  verifyCaptcha(text: string, captchaHash: string): boolean {
    return captchaHash === this.hashCaptcha(text)
  }
}

import { Injectable, BadRequestException } from '@nestjs/common'
import svgCaptcha from 'svg-captcha'
import CryptoJS from 'crypto-js'
import _toLower from 'lodash/toLower'
import { UAParser } from '@ua-parser-js/pro-business'
import _values from 'lodash/values'
import _includes from 'lodash/includes'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

import { ProjectService } from '../project/project.service'
import { AppLoggerService } from '../logger/logger.service'
import {
  redis,
  isValidPID,
  getRedisCaptchaKey,
  CAPTCHA_SALT,
  CAPTCHA_TOKEN_LIFETIME,
} from '../common/constants'
import { getGeoDetails, hash } from '../common/utils'
import { GeneratedCaptcha } from './interfaces/generated-captcha'
import { captchaTransformer } from './utils/transformers'
import { clickhouse } from '../common/integrations/clickhouse'

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

const isDummyPID = (pid: string): boolean => {
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

@Injectable()
export class CaptchaService {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly projectService: ProjectService,
  ) {}

  // checks if captcha is enabled for pid (by checking if captchaSecretKey exists)
  async _isCaptchaEnabledForPID(pid: string) {
    const project = await this.projectService.getRedisProject(pid)

    if (!project) {
      return false
    }

    return !!project.captchaSecretKey
  }

  // validates pid, checks if captcha is enabled and throws an error otherwise
  async validatePIDForCAPTCHA(pid: string) {
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
    headers: Record<string, string>,
    timestamp: number,
    ip: string,
  ) {
    const ua = await UAParser(
      headers?.['user-agent'],
      undefined,
      headers,
    ).withClientHints()
    const deviceType = ua.device.type || 'desktop'
    const browserName = ua.browser.name
    const osName = ua.os.name

    const { country } = getGeoDetails(ip)
    const transformed = captchaTransformer(
      pid,
      deviceType,
      browserName,
      osName,
      country,
      timestamp,
    )

    try {
      await clickhouse.insert({
        table: 'captcha',
        format: 'JSONEachRow',
        values: [transformed],
        clickhouse_settings: {
          async_insert: 1,
        },
      })
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

  async generateToken(pid: string, captchaHash: string, timestamp: number) {
    if (isDummyPID(pid)) {
      return this.generateDummyToken()
    }

    const project = await this.projectService.getRedisProject(pid)

    if (!project) {
      throw new BadRequestException('Project not found')
    }

    if (!project.captchaSecretKey) {
      throw new BadRequestException('No secret key generated for this project')
    }

    const token = {
      hash: captchaHash,
      timestamp,
      pid,
    }

    return encryptString(JSON.stringify(token), project.captchaSecretKey)
  }

  async validateToken(token: string, secretKey: string) {
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
        timestamp: dayjs().unix() * 1000,
        pid: DUMMY_PIDS.ALWAYS_PASS,
      }
    }

    try {
      const decrypted = decryptString(token, secretKey)
      parsed = JSON.parse(decrypted)
    } catch {
      throw new BadRequestException('Could not decrypt token')
    }

    if (dayjs().unix() * 1000 - parsed.timestamp > CAPTCHA_TOKEN_LIFETIME) {
      throw new BadRequestException('Token expired')
    }

    const tokenUsed = await isTokenAlreadyUsed(token)

    if (tokenUsed) {
      throw new BadRequestException('Token already used')
    }

    return parsed
  }

  hashCaptcha(text: string): string {
    return hash(captchaString(text))
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

  verifyCaptcha(text: string, captchaHash: string) {
    return captchaHash === this.hashCaptcha(text)
  }
}

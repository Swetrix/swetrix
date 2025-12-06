import { Injectable, BadRequestException } from '@nestjs/common'
import * as crypto from 'crypto'
import CryptoJS from 'crypto-js'
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
  CAPTCHA_TOKEN_LIFETIME,
} from '../common/constants'
import { getGeoDetails } from '../common/utils'
import { GeneratedChallenge } from './interfaces/generated-captcha'
import { captchaTransformer } from './utils/transformers'
import { clickhouse } from '../common/integrations/clickhouse'

dayjs.extend(utc)

// Default difficulty: number of leading hex zeros required (4 = ~65k iterations avg)
export const DEFAULT_POW_DIFFICULTY = 4

// Challenge TTL in seconds (5 minutes)
const CHALLENGE_TTL = 300

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

const getChallengeCacheKey = (challenge: string): string => {
  return `pow_challenge:${challenge}`
}

const isTokenAlreadyUsed = async (token: string): Promise<boolean> => {
  const captchaKey = getRedisCaptchaKey(token)
  const key = await redis.get(captchaKey)

  if (key) {
    return true
  }

  await redis.set(captchaKey, '1', 'EX', CAPTCHA_TOKEN_LIFETIME / 1000)

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

  // Get project's configured PoW difficulty, or default
  async _getProjectDifficulty(pid: string): Promise<number> {
    if (isDummyPID(pid)) {
      return DEFAULT_POW_DIFFICULTY
    }

    const project = await this.projectService.getRedisProject(pid)

    // Use project's configured difficulty if available, otherwise default
    return project?.captchaDifficulty || DEFAULT_POW_DIFFICULTY
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

  async generateToken(pid: string, challenge: string, timestamp: number) {
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
      challenge,
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
        challenge:
          'DUMMY_CHALLENGE00000111112222233333444445555566666777778888899999',
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

  // Generate SHA-256 hash of the input
  sha256(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex')
  }

  // Check if hash has required number of leading zeros
  hasValidPrefix(hash: string, difficulty: number): boolean {
    const prefix = '0'.repeat(difficulty)
    return hash.startsWith(prefix)
  }

  // Generate a PoW challenge
  async generateChallenge(pid: string): Promise<GeneratedChallenge> {
    const difficulty = await this._getProjectDifficulty(pid)

    // Generate a random challenge string
    const challenge = crypto.randomBytes(32).toString('hex')

    // Store challenge in Redis with TTL to prevent replay attacks
    const cacheKey = getChallengeCacheKey(challenge)
    await redis.set(cacheKey, difficulty.toString(), 'EX', CHALLENGE_TTL)

    return {
      challenge,
      difficulty,
    }
  }

  // Verify a PoW solution
  async verifyPoW(
    challenge: string,
    nonce: number,
    solution: string,
  ): Promise<boolean> {
    // Check if challenge exists and hasn't been used
    const cacheKey = getChallengeCacheKey(challenge)
    const storedDifficulty = await redis.get(cacheKey)

    if (!storedDifficulty) {
      throw new BadRequestException('Invalid or expired challenge')
    }

    const difficulty = parseInt(storedDifficulty, 10)

    // Compute the expected hash
    const input = `${challenge}:${nonce}`
    const computedHash = this.sha256(input)

    // Verify the solution matches and has required prefix
    if (computedHash !== solution) {
      return false
    }

    if (!this.hasValidPrefix(computedHash, difficulty)) {
      return false
    }

    // Mark challenge as used by deleting it
    await redis.del(cacheKey)

    return true
  }
}

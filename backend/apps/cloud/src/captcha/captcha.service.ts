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
import { getIPDetails } from '../common/utils'
import { GeneratedChallenge } from './interfaces/generated-captcha'
import { eventTransformer } from '../analytics/utils/transformers'
import { clickhouse } from '../common/integrations/clickhouse'

dayjs.extend(utc)

// Default difficulty: number of leading hex zeros required (4 = ~65k iterations avg)
const DEFAULT_POW_DIFFICULTY = 4
const MIN_POW_DIFFICULTY = 2
const MAX_POW_DIFFICULTY = 6

// Challenge TTL in seconds (5 minutes)
const CHALLENGE_TTL = 300
const CAPTCHA_COUNTER_PREFIX = 'captcha:auto'

type CaptchaDifficultyMode = 'manual' | 'auto'
type CaptchaEventName =
  | 'generate'
  | 'pass'
  | 'verify_fail'
  | 'validation_fail'
  | 'replay'

interface CaptchaHeaders {
  [key: string]: string | string[] | undefined
}

interface CaptchaDifficultyDecision {
  difficulty: number
  mode: CaptchaDifficultyMode
  reasons: string[]
  score: number
}

interface ChallengePayload {
  pid?: string
  difficulty: number
  difficultyMode?: CaptchaDifficultyMode
  autoReasons?: string[]
  issuedAt?: number
}

interface PowVerificationResult extends ChallengePayload {
  valid: boolean
  solveMs?: number
  failureReason?: string
}

interface CaptchaEventMeta {
  difficulty?: number
  difficultyMode?: CaptchaDifficultyMode
  autoReasons?: string[]
  solveMs?: number
  failureReason?: string
}

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

const clampDifficulty = (difficulty?: number | null): number => {
  if (!Number.isFinite(difficulty)) {
    return DEFAULT_POW_DIFFICULTY
  }

  return Math.min(
    MAX_POW_DIFFICULTY,
    Math.max(MIN_POW_DIFFICULTY, Number(difficulty)),
  )
}

const getHeaderValue = (
  headers: CaptchaHeaders | undefined,
  name: string,
): string => {
  const value = headers?.[name] ?? headers?.[name.toLowerCase()]
  if (Array.isArray(value)) {
    return value[0] || ''
  }

  return value ? String(value) : ''
}

const hasSuspiciousHeaders = (headers: CaptchaHeaders | undefined): boolean => {
  const required = ['accept', 'accept-language', 'accept-encoding']
  const missing = required.filter((header) => !getHeaderValue(headers, header))

  return missing.length >= 2
}

const hasHeadlessUserAgent = (headers: CaptchaHeaders | undefined): boolean => {
  return /HeadlessChrome|PhantomJS|SlimerJS|Selenium|WebDriver|Puppeteer|Playwright|Cypress|Nightmare|Splash/i.test(
    getHeaderValue(headers, 'user-agent'),
  )
}

const hashIP = (pid: string, ip: string): string => {
  return crypto
    .createHash('sha256')
    .update(`${pid}:${ip}`)
    .digest('hex')
    .slice(0, 16)
}

const getCounterKey = (
  pid: string,
  event: string,
  window: string,
  scope = 'project',
  bucket = 'all',
): string =>
  `${CAPTCHA_COUNTER_PREFIX}:${window}:${event}:${scope}:${pid}:${bucket}`

const incrCounter = async (key: string, ttl: number): Promise<number> => {
  const value = await redis.eval(
    "local value = redis.call('INCR', KEYS[1]); if value == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; return value",
    1,
    key,
    ttl,
  )

  return Number(value)
}

const getCounter = async (key: string): Promise<number> => {
  const value = await redis.get(key)
  const parsed = Number(value || 0)

  return Number.isFinite(parsed) ? parsed : 0
}

const consumeChallenge = async (cacheKey: string): Promise<string | null> => {
  const getdel = (redis as any).getdel

  if (typeof getdel === 'function') {
    return getdel.call(redis, cacheKey)
  }

  const result = await redis.eval(
    "local value = redis.call('GET', KEYS[1]); if value then redis.call('DEL', KEYS[1]); end; return value",
    1,
    cacheKey,
  )

  return typeof result === 'string' ? result : null
}

const signCaptchaCiphertext = (ciphertext: string, key: string): string => {
  // NOTE: Encryption alone (CryptoJS.Rabbit) is malleable; we add an HMAC to
  // prevent token tampering and replay-bypass via ciphertext bitflips.
  return crypto.createHmac('sha256', key).update(ciphertext).digest('base64url')
}

const timingSafeEqualString = (a: string, b: string): boolean => {
  try {
    const aBuf = Buffer.from(a)
    const bBuf = Buffer.from(b)
    if (aBuf.length !== bBuf.length) return false
    return crypto.timingSafeEqual(aBuf, bBuf)
  } catch {
    return false
  }
}

const isTokenAlreadyUsed = async (token: string): Promise<boolean> => {
  const captchaKey = getRedisCaptchaKey(token)
  const setResult = await redis.set(
    captchaKey,
    '1',
    'EX',
    CAPTCHA_TOKEN_LIFETIME / 1000,
    'NX',
  )

  // ioredis returns null when key already exists (i.e. token already used)
  return setResult === null
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

    return clampDifficulty(project?.captchaDifficulty)
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
      throw new BadRequestException(
        'CAPTCHA not available for this project - please generate a secret key first in the project settings',
      )
    }
  }

  private async logCaptchaEvent(
    pid: string,
    event: CaptchaEventName,
    headers: CaptchaHeaders,
    timestamp: number,
    ip: string,
    meta: CaptchaEventMeta = {},
  ) {
    if (isDummyPID(pid)) {
      return
    }

    const ua = await UAParser(
      getHeaderValue(headers, 'user-agent'),
      undefined,
      headers,
    ).withClientHints()
    const deviceType = ua.device.type || 'desktop'
    const browserName = ua.browser.name
    const osName = ua.os.name

    const { country } = getIPDetails(ip)
    const eventMeta: Record<string, string> = {
      captcha_event: event,
    }

    if (meta.difficulty !== undefined) {
      eventMeta.captcha_difficulty = String(meta.difficulty)
    }

    if (meta.difficultyMode) {
      eventMeta.captcha_difficulty_mode = meta.difficultyMode
    }

    if (meta.autoReasons?.length) {
      eventMeta.captcha_reason = meta.autoReasons[0]
    }

    if (meta.solveMs !== undefined) {
      eventMeta.solve_ms = String(Math.max(0, Math.round(meta.solveMs)))
    }

    if (meta.failureReason) {
      eventMeta.failure_reason = meta.failureReason
    }

    const transformed = eventTransformer({
      type: 'captcha',
      pid,
      dv: deviceType,
      br: browserName,
      os: osName,
      cc: country,
      meta: eventMeta,
      timestamp,
    })

    try {
      await clickhouse.insert({
        table: 'events',
        format: 'JSONEachRow',
        values: [transformed],
        clickhouse_settings: {
          async_insert: 1,
        },
      })
    } catch (e) {
      this.logger.error(`[CaptchaService -> logCaptchaEvent] ${e}`)
    }
  }

  async logCaptchaPass(
    pid: string,
    headers: CaptchaHeaders,
    timestamp: number,
    ip: string,
    verification: PowVerificationResult,
  ) {
    await this.recordCaptchaOutcome(pid, 'pass', ip, verification)
    await this.logCaptchaEvent(pid, 'pass', headers, timestamp, ip, {
      difficulty: verification.difficulty,
      difficultyMode: verification.difficultyMode || 'manual',
      autoReasons: verification.autoReasons,
      solveMs: verification.solveMs,
    })
  }

  async logCaptchaFailure(
    pid: string,
    headers: CaptchaHeaders,
    timestamp: number,
    ip: string,
    verification: PowVerificationResult,
  ) {
    await this.recordCaptchaOutcome(pid, 'verify_fail', ip, verification)
    await this.logCaptchaEvent(pid, 'verify_fail', headers, timestamp, ip, {
      difficulty: verification.difficulty,
      difficultyMode: verification.difficultyMode || 'manual',
      autoReasons: verification.autoReasons,
      solveMs: verification.solveMs,
      failureReason: verification.failureReason || 'invalid_pow',
    })
  }

  async logCaptchaReplay(
    pid: string,
    headers: CaptchaHeaders,
    timestamp: number,
    ip: string,
    failureReason = 'expired_or_replayed',
  ) {
    await this.recordCaptchaOutcome(pid, 'replay', ip)
    await this.logCaptchaEvent(pid, 'replay', headers, timestamp, ip, {
      failureReason,
    })
  }

  private async recordCaptchaOutcome(
    pid: string,
    event: CaptchaEventName,
    ip: string,
    verification?: Partial<PowVerificationResult>,
  ) {
    if (isDummyPID(pid)) {
      return
    }

    const ipHash = ip ? hashIP(pid, ip) : 'unknown'
    const promises = [
      incrCounter(getCounterKey(pid, event, '5m'), 300),
      incrCounter(getCounterKey(pid, event, '15m'), 900),
      incrCounter(getCounterKey(pid, event, '5m', 'ip', ipHash), 300),
    ]

    if (verification?.solveMs !== undefined) {
      promises.push(incrCounter(getCounterKey(pid, 'solve', '5m'), 300))
    }

    await Promise.all(promises)
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

    const ciphertext = encryptString(
      JSON.stringify(token),
      project.captchaSecretKey,
    )
    const signature = signCaptchaCiphertext(
      ciphertext,
      project.captchaSecretKey,
    )

    // Token format: <ciphertext>.<hmac_sha256(ciphertext)>
    return `${ciphertext}.${signature}`
  }

  async validateToken(
    token: string,
    secretKey: string,
    headers: CaptchaHeaders = {},
    ip = '',
  ) {
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
      const parts = token.split('.')

      if (parts.length !== 2) {
        throw new BadRequestException('Invalid token format')
      }

      const [ciphertext, providedSignature] = parts
      const expectedSignature = signCaptchaCiphertext(ciphertext, secretKey)

      if (!timingSafeEqualString(providedSignature, expectedSignature)) {
        throw new BadRequestException('Invalid token signature')
      }

      const decrypted = decryptString(ciphertext, secretKey)
      parsed = JSON.parse(decrypted)
    } catch {
      throw new BadRequestException('Could not decrypt token')
    }

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.pid !== 'string' ||
      typeof parsed.challenge !== 'string' ||
      typeof parsed.timestamp !== 'number' ||
      !Number.isFinite(parsed.timestamp)
    ) {
      if (typeof parsed?.pid === 'string') {
        await this.logValidationFailure(
          parsed.pid,
          headers,
          ip,
          'invalid_payload',
        )
      }

      throw new BadRequestException('Invalid token payload')
    }

    if (!isDummyPID(parsed.pid) && !isValidPID(parsed.pid)) {
      await this.logValidationFailure(parsed.pid, headers, ip, 'invalid_pid')
      throw new BadRequestException('Invalid token payload')
    }

    if (dayjs().unix() * 1000 - parsed.timestamp > CAPTCHA_TOKEN_LIFETIME) {
      await this.logValidationFailure(parsed.pid, headers, ip, 'token_expired')
      throw new BadRequestException('Token expired')
    }

    const tokenUsed = await isTokenAlreadyUsed(token)

    if (tokenUsed) {
      await this.recordCaptchaOutcome(parsed.pid, 'replay', ip)
      await this.logValidationFailure(parsed.pid, headers, ip, 'token_replay')
      throw new BadRequestException('Token already used')
    }

    return parsed
  }

  private async logValidationFailure(
    pid: string,
    headers: CaptchaHeaders,
    ip: string,
    failureReason: string,
  ) {
    if (isDummyPID(pid) || !isValidPID(pid)) {
      return
    }

    await this.recordCaptchaOutcome(pid, 'validation_fail', ip)
    await this.logCaptchaEvent(
      pid,
      'validation_fail',
      headers,
      dayjs.utc().unix() * 1000,
      ip,
      { failureReason },
    )
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

  private async selectDifficulty(
    pid: string,
    headers: CaptchaHeaders,
    ip: string,
  ): Promise<CaptchaDifficultyDecision> {
    const project = isDummyPID(pid)
      ? null
      : await this.projectService.getRedisProject(pid)
    const mode = (project?.captchaDifficultyMode ||
      'manual') as CaptchaDifficultyMode
    const baseDifficulty = clampDifficulty(project?.captchaDifficulty)

    if (mode !== 'auto' || isDummyPID(pid)) {
      return {
        difficulty: baseDifficulty,
        mode: 'manual',
        reasons: ['manual'],
        score: 0,
      }
    }

    const { country, isHosting } = getIPDetails(ip)
    const countryBucket = country || 'xx'
    const ipHash = ip ? hashIP(pid, ip) : 'unknown'

    const [
      projectGenerate1m,
      projectGenerate5m,
      countryGenerate5m,
      ipGenerate1m,
    ] = await Promise.all([
      incrCounter(getCounterKey(pid, 'generate', '1m'), 60),
      incrCounter(getCounterKey(pid, 'generate', '5m'), 300),
      incrCounter(
        getCounterKey(pid, 'generate', '5m', 'country', countryBucket),
        300,
      ),
      incrCounter(getCounterKey(pid, 'generate', '1m', 'ip', ipHash), 60),
    ])

    const [
      projectPass5m,
      projectFail5m,
      projectReplay5m,
      projectValidationFail5m,
      ipFail5m,
      ipReplay5m,
    ] = await Promise.all([
      getCounter(getCounterKey(pid, 'pass', '5m')),
      getCounter(getCounterKey(pid, 'verify_fail', '5m')),
      getCounter(getCounterKey(pid, 'replay', '5m')),
      getCounter(getCounterKey(pid, 'validation_fail', '5m')),
      getCounter(getCounterKey(pid, 'verify_fail', '5m', 'ip', ipHash)),
      getCounter(getCounterKey(pid, 'replay', '5m', 'ip', ipHash)),
    ])

    const reasons: string[] = []
    let score = 0
    const passRatio =
      projectGenerate5m > 0 ? projectPass5m / projectGenerate5m : 1
    const verifyAttempts = projectPass5m + projectFail5m
    const failRatio = verifyAttempts > 0 ? projectFail5m / verifyAttempts : 0

    const addRisk = (condition: boolean, reason: string, weight = 1) => {
      if (!condition) {
        return
      }

      score += weight
      reasons.push(reason)
    }

    addRisk(isHosting, 'hosting_ip')
    addRisk(hasHeadlessUserAgent(headers), 'headless_browser')
    addRisk(hasSuspiciousHeaders(headers), 'suspicious_headers')
    addRisk(projectGenerate1m >= 50, 'project_spike')
    addRisk(countryGenerate5m >= 50, 'country_spike')
    addRisk(ipGenerate1m >= 8, 'ip_pressure')
    addRisk(projectGenerate5m >= 30 && passRatio < 0.25, 'low_pass_ratio')
    addRisk(verifyAttempts >= 20 && failRatio > 0.35, 'verify_failures')
    addRisk(projectValidationFail5m >= 5, 'validation_failures')
    addRisk(projectReplay5m >= 2 || ipReplay5m >= 1, 'replay_attempts')
    addRisk(ipFail5m >= 3, 'ip_verify_failures')

    const adjustment = score >= 5 ? 2 : score >= 2 ? 1 : 0

    return {
      difficulty: clampDifficulty(baseDifficulty + adjustment),
      mode: 'auto',
      reasons: adjustment > 0 ? reasons.slice(0, 4) : ['baseline'],
      score,
    }
  }

  async generateChallenge(
    pid: string,
    headers: CaptchaHeaders = {},
    ip = '',
  ): Promise<GeneratedChallenge> {
    const decision = await this.selectDifficulty(pid, headers, ip)

    const challenge = crypto.randomBytes(32).toString('hex')
    const issuedAt = dayjs.utc().unix() * 1000

    const cacheKey = getChallengeCacheKey(challenge)
    const challengeData = JSON.stringify({
      pid,
      difficulty: decision.difficulty,
      difficultyMode: decision.mode,
      autoReasons: decision.reasons,
      issuedAt,
    })
    await redis.set(cacheKey, challengeData, 'EX', CHALLENGE_TTL)

    await this.logCaptchaEvent(pid, 'generate', headers, issuedAt, ip, {
      difficulty: decision.difficulty,
      difficultyMode: decision.mode,
      autoReasons: decision.reasons,
    })

    return {
      challenge,
      difficulty: decision.difficulty,
    }
  }

  async verifyPoW(
    challenge: string,
    nonce: number,
    solution: string,
    pid: string,
  ): Promise<PowVerificationResult> {
    const cacheKey = getChallengeCacheKey(challenge)
    const storedData = await consumeChallenge(cacheKey)

    if (!storedData) {
      throw new BadRequestException('Invalid or expired challenge')
    }

    let payload: ChallengePayload

    try {
      const parsed = JSON.parse(storedData)
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'difficulty' in parsed
      ) {
        payload = parsed
      } else {
        payload = { difficulty: parseInt(storedData, 10) }
      }
    } catch {
      payload = { difficulty: parseInt(storedData, 10) }
    }

    const difficulty = Number(payload.difficulty)

    if (
      !Number.isFinite(difficulty) ||
      difficulty < MIN_POW_DIFFICULTY ||
      difficulty > MAX_POW_DIFFICULTY
    ) {
      throw new BadRequestException('Invalid challenge difficulty')
    }

    if (payload.pid !== undefined && payload.pid !== pid) {
      throw new BadRequestException(
        'Challenge was issued for a different project',
      )
    }

    const input = `${challenge}:${nonce}`
    const computedHash = this.sha256(input)
    const solveMs = payload.issuedAt
      ? dayjs.utc().unix() * 1000 - payload.issuedAt
      : undefined
    const resultBase = {
      difficulty,
      difficultyMode: payload.difficultyMode || 'manual',
      autoReasons: payload.autoReasons || [],
      issuedAt: payload.issuedAt,
      solveMs,
    }

    if (computedHash !== solution) {
      return {
        ...resultBase,
        valid: false,
        failureReason: 'solution_mismatch',
      }
    }

    if (!this.hasValidPrefix(computedHash, difficulty)) {
      return {
        ...resultBase,
        valid: false,
        failureReason: 'difficulty_mismatch',
      }
    }

    return {
      ...resultBase,
      valid: true,
    }
  }
}

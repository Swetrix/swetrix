import { Injectable, Logger } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

import { redis } from '../common/constants'
import { getSaltClickhouse, saveSaltClickhouse } from '../common/utils'

dayjs.extend(utc)

const REDIS_SALT_DAILY = 'salt:daily'
const REDIS_SALT_MONTHLY = 'salt:monthly'
const REDIS_CACHE_TTL = 600 // 10 minutes in seconds

type SaltRotationType = 'daily' | 'monthly'

const getEndOfPeriod = (rotation: SaltRotationType): dayjs.Dayjs => {
  const now = dayjs.utc()

  switch (rotation) {
    case 'monthly':
      return now.endOf('month')
    case 'daily':
    default:
      return now.endOf('day')
  }
}

const getRedisKeyForRotation = (rotation: SaltRotationType): string => {
  return rotation === 'monthly' ? REDIS_SALT_MONTHLY : REDIS_SALT_DAILY
}

@Injectable()
export class SaltService {
  private readonly logger = new Logger(SaltService.name)

  constructor() {}

  private async generateSalt(): Promise<string> {
    return bcrypt.genSalt(10)
  }

  async getSaltForSession(): Promise<string> {
    return this.getGlobalSalt('daily')
  }

  async getSaltForProfile(): Promise<string> {
    return this.getGlobalSalt('monthly')
  }

  /** @deprecated Use getSaltForSession() instead */
  async getSaltForProject(_pid: string): Promise<string> {
    return this.getSaltForSession()
  }

  async getGlobalSalt(rotation: SaltRotationType = 'daily'): Promise<string> {
    const redisKey = getRedisKeyForRotation(rotation)

    // Check Redis cache first
    const cachedSalt = await redis.get(redisKey)
    if (cachedSalt) {
      return cachedSalt
    }

    // Check ClickHouse
    const now = dayjs.utc()
    const existingSalt = await getSaltClickhouse(rotation)

    if (existingSalt && dayjs.utc(existingSalt.expiresAt).isAfter(now)) {
      // Cache in Redis with 10-minute TTL
      await redis.set(redisKey, existingSalt.salt, 'EX', REDIS_CACHE_TTL)
      return existingSalt.salt
    }

    // Generate new salt
    const salt = await this.generateSalt()
    const expiresAt = getEndOfPeriod(rotation)

    // Save to ClickHouse (upsert)
    await saveSaltClickhouse({
      rotation,
      salt,
      expiresAt: expiresAt.format('YYYY-MM-DD HH:mm:ss'),
      created: dayjs.utc().format('YYYY-MM-DD HH:mm:ss'),
    })

    // Cache in Redis with 10-minute TTL
    await redis.set(redisKey, salt, 'EX', REDIS_CACHE_TTL)

    this.logger.log(
      `Generated new ${rotation} salt, expires at ${expiresAt.toISOString()}`,
    )

    return salt
  }

  async regenerateExpiredSalts(): Promise<void> {
    const rotations: SaltRotationType[] = ['daily', 'monthly']
    const now = dayjs.utc()

    for (const rotation of rotations) {
      const existingSalt = await getSaltClickhouse(rotation)

      if (!existingSalt || dayjs.utc(existingSalt.expiresAt).isBefore(now)) {
        const salt = await this.generateSalt()
        const expiresAt = getEndOfPeriod(rotation)

        await saveSaltClickhouse({
          rotation,
          salt,
          expiresAt: expiresAt.format('YYYY-MM-DD HH:mm:ss'),
          created: dayjs.utc().format('YYYY-MM-DD HH:mm:ss'),
        })

        // Cache in Redis with 10-minute TTL
        const redisKey = getRedisKeyForRotation(rotation)
        await redis.set(redisKey, salt, 'EX', REDIS_CACHE_TTL)

        this.logger.log(
          `Regenerated ${rotation} salt, expires at ${expiresAt.toISOString()}`,
        )
      }
    }
  }
}

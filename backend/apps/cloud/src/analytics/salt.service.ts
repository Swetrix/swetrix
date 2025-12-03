import { Injectable, Logger } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

import { redis } from '../common/constants'

dayjs.extend(utc)

const REDIS_SALT_DAILY = 'salt:daily'
const REDIS_SALT_MONTHLY = 'salt:monthly'

export type SaltRotationType = 'daily' | 'monthly'

const getTTLUntilEndOfPeriod = (rotation: SaltRotationType): number => {
  const now = dayjs.utc()
  let endOfPeriod: dayjs.Dayjs

  switch (rotation) {
    case 'monthly':
      endOfPeriod = now.endOf('month')
      break
    case 'daily':
    default:
      endOfPeriod = now.endOf('day')
  }

  return Math.max(1, endOfPeriod.diff(now, 'second'))
}

const getRedisKeyForRotation = (rotation: SaltRotationType): string => {
  return rotation === 'monthly' ? REDIS_SALT_MONTHLY : REDIS_SALT_DAILY
}

@Injectable()
export class SaltService {
  private readonly logger = new Logger(SaltService.name)

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

    const existingSalt = await redis.get(redisKey)
    if (existingSalt) {
      return existingSalt
    }

    const salt = await this.generateSalt()
    const ttl = getTTLUntilEndOfPeriod(rotation)
    await redis.set(redisKey, salt, 'EX', ttl)

    this.logger.log(`Generated new ${rotation} salt with TTL ${ttl}s`)

    return salt
  }

  async regenerateExpiredSalts(): Promise<void> {
    const rotations: SaltRotationType[] = ['daily', 'monthly']

    for (const rotation of rotations) {
      const redisKey = getRedisKeyForRotation(rotation)
      const exists = await redis.exists(redisKey)

      if (!exists) {
        const salt = await this.generateSalt()
        const ttl = getTTLUntilEndOfPeriod(rotation)
        await redis.set(redisKey, salt, 'EX', ttl)
        this.logger.log(`Regenerated ${rotation} salt with TTL ${ttl}s`)
      }
    }
  }
}

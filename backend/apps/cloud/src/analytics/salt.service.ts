import { Injectable, Logger } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

import { SaltRotation } from '../project/entity/project.entity'
import { redis } from '../common/constants'
import { ProjectService } from '../project/project.service'

dayjs.extend(utc)

// Redis keys for global salts (one per rotation period)
const REDIS_SALT_DAILY = 'salt:daily'
const REDIS_SALT_WEEKLY = 'salt:weekly'
const REDIS_SALT_MONTHLY = 'salt:monthly'

// Calculate TTL until end of period
const getTTLUntilEndOfPeriod = (rotation: SaltRotation): number => {
  const now = dayjs.utc()
  let endOfPeriod: dayjs.Dayjs

  switch (rotation) {
    case SaltRotation.DAILY:
      endOfPeriod = now.endOf('day')
      break
    case SaltRotation.WEEKLY:
      endOfPeriod = now.endOf('week')
      break
    case SaltRotation.MONTHLY:
      endOfPeriod = now.endOf('month')
      break
    default:
      endOfPeriod = now.endOf('day')
  }

  return Math.max(1, endOfPeriod.diff(now, 'second'))
}

// Get Redis key for rotation type
const getRedisKeyForRotation = (rotation: SaltRotation): string => {
  switch (rotation) {
    case SaltRotation.WEEKLY:
      return REDIS_SALT_WEEKLY
    case SaltRotation.MONTHLY:
      return REDIS_SALT_MONTHLY
    default:
      return REDIS_SALT_DAILY
  }
}

@Injectable()
export class SaltService {
  private readonly logger = new Logger(SaltService.name)

  constructor(private readonly projectService: ProjectService) {}

  /**
   * Generate a new salt value
   */
  private async generateSalt(): Promise<string> {
    return bcrypt.genSalt(10)
  }

  /**
   * Get the appropriate global salt based on the project's rotation setting.
   * Since the hash includes project ID, the same global salt produces unique hashes per project.
   */
  async getSaltForProject(pid: string): Promise<string> {
    // Get the project's salt rotation setting
    let rotation = SaltRotation.DAILY

    try {
      const project = await this.projectService.getRedisProject(pid)
      if (project?.saltRotation) {
        rotation = project.saltRotation
      }
    } catch {
      // Default to daily if project not found
    }

    return this.getGlobalSalt(rotation)
  }

  /**
   * Get or create a global salt for the specified rotation period
   */
  async getGlobalSalt(
    rotation: SaltRotation = SaltRotation.DAILY,
  ): Promise<string> {
    const redisKey = getRedisKeyForRotation(rotation)

    // Check if salt exists
    const existingSalt = await redis.get(redisKey)
    if (existingSalt) {
      return existingSalt
    }

    // Generate new salt and store with TTL
    const salt = await this.generateSalt()
    const ttl = getTTLUntilEndOfPeriod(rotation)
    await redis.set(redisKey, salt, 'EX', ttl)

    this.logger.log(`Generated new ${rotation} salt with TTL ${ttl}s`)

    return salt
  }

  /**
   * Regenerate all global salts (called by cron at midnight UTC)
   * This ensures salts exist even if no requests come in at period boundaries
   */
  async regenerateExpiredSalts(): Promise<void> {
    const rotations = [
      SaltRotation.DAILY,
      SaltRotation.WEEKLY,
      SaltRotation.MONTHLY,
    ]

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

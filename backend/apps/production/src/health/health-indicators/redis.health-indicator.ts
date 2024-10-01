import { Injectable } from '@nestjs/common'
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus'
import { redis } from '../../common/constants'

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    const isHealthy = (await redis.ping()) === 'PONG'
    const result = this.getStatus(key, isHealthy)

    if (isHealthy) return result

    throw new HealthCheckError('Redis check failed', result)
  }
}

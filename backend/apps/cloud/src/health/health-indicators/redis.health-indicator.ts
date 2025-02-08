import { Injectable } from '@nestjs/common'
import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus'
import { redis } from '../../common/constants'

@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key)

    const isHealthy = (await redis.ping()) === 'PONG'

    if (!isHealthy) {
      return indicator.down('Redis check failed')
    }

    return indicator.up()
  }
}

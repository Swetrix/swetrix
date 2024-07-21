import { Controller, Get } from '@nestjs/common'
import {
  HealthCheckService,
  TypeOrmHealthIndicator,
  HealthCheck,
} from '@nestjs/terminus'
import { RedisHealthIndicator } from './health-indicators/redis.health-indicator'
import { ClickhouseHealthIndicator } from './health-indicators/clickhouse.health-indicator'

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly typeOrmHealthIndicator: TypeOrmHealthIndicator,
    private readonly redisHealthIndicator: RedisHealthIndicator,
    private readonly clickhouseHealthIndicator: ClickhouseHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  async check() {
    return this.health.check([
      () => this.typeOrmHealthIndicator.pingCheck('database'),
      () => this.clickhouseHealthIndicator.pingCheck('analyticsDatabase'),
      () => this.redisHealthIndicator.pingCheck('cache'),
    ])
  }
}

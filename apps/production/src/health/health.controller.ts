import { Controller, Get } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  HealthCheckService,
  TypeOrmHealthIndicator,
  HttpHealthIndicator,
  HealthCheck,
} from '@nestjs/terminus'
import { RedisHealthIndicator } from './health-indicators/redis.health-indicator'

@Controller('health')
export class HealthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly health: HealthCheckService,
    private readonly typeOrmHealthIndicator: TypeOrmHealthIndicator,
    private readonly httpHealthIndicator: HttpHealthIndicator,
    private readonly redisHealthIndicator: RedisHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  async check() {
    const clickhouseHost = this.configService.get<string>('CLICKHOUSE_HOST')
    const clickhousePort = Number(
      this.configService.get<number>('CLICKHOUSE_PORT'),
    )
    const clickhousePingUrl = `${clickhouseHost}:${clickhousePort}/ping`

    return this.health.check([
      () => this.typeOrmHealthIndicator.pingCheck('database'),
      () =>
        this.httpHealthIndicator.responseCheck(
          'analyticsDatabase',
          clickhousePingUrl,
          res => res.data === 'Ok.\n',
        ),
      () => this.redisHealthIndicator.pingCheck('cache'),
    ])
  }
}

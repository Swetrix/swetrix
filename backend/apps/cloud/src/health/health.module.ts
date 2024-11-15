import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { RedisHealthIndicator } from './health-indicators/redis.health-indicator'
import { ClickhouseHealthIndicator } from './health-indicators/clickhouse.health-indicator'
import { HealthController } from './health.controller'

@Module({
  imports: [TerminusModule.forRoot({ logger: false })],
  controllers: [HealthController],
  providers: [RedisHealthIndicator, ClickhouseHealthIndicator],
})
export class HealthModule {}

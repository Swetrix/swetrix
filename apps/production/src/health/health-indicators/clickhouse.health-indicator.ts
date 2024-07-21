import { Injectable } from '@nestjs/common'
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus'
import { clickhouse } from '../../common/integrations/clickhouse'

@Injectable()
export class ClickhouseHealthIndicator extends HealthIndicator {
  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    const ping = await clickhouse.ping()
    const result = this.getStatus(key, ping.success)

    // I'm doing "=== true" because otherwise Typescript complains that "ping.error" beneath if undefined
    if (ping.success === true) return result

    throw new HealthCheckError('Clickhouse check failed', ping.error)
  }
}

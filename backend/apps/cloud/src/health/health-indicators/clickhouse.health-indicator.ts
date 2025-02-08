import { Injectable } from '@nestjs/common'
import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus'
import { clickhouse } from '../../common/integrations/clickhouse'

@Injectable()
export class ClickhouseHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key)

    const ping = await clickhouse.ping()

    // I'm doing "!== true" because otherwise Typescript complains that "ping.error" beneath if undefined
    if (ping.success !== true) {
      return indicator.down({ error: ping.error })
    }

    return indicator.up()
  }
}

import { Process, Processor } from '@nestjs/bull'
import { Inject, InternalServerErrorException, Logger } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { Job } from 'bull'
import { firstValueFrom } from 'rxjs'
import { CreateMonitorHttpRequestDTO } from '../dto/create-monitor.dto'
import { clickhouse } from '../../common/integrations/clickhouse'

@Processor('monitor')
export class MonitorConsumer {
  constructor(@Inject('MONITOR_SERVICE') private monitorService: ClientProxy) {}

  private readonly logger = new Logger(MonitorConsumer.name)

  @Process('http-request')
  async httpRequestProcess(
    job: Job<CreateMonitorHttpRequestDTO & { monitorID: string }>,
  ): Promise<any> {
    this.logger.debug(`Consumer works ${JSON.stringify(job.data)}`)
    const res: {
      responseTime: number
      statusCode: number
      timestamp: number
      region: string
    } = await firstValueFrom(this.monitorService.send('http-request', job.data))
    this.logger.debug(`Consumer works ${JSON.stringify(res)}`)

    try {
      await clickhouse.insert({
        table: 'monitor_responses',
        format: 'JSONEachRow',
        values: [
          {
            monitorID: job.data.monitorID,
            region: res.region,
            responseTime: res.responseTime,
            timestamp: res.timestamp,
            statusCode: res.statusCode,
          },
        ],
      })
    } catch (e) {
      this.logger.error(e)
      throw new InternalServerErrorException(
        'Error occurred while saving the monitor data',
      )
    }
  }
}

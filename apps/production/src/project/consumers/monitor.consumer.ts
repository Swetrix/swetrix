import { Process, Processor } from '@nestjs/bull'
import { Inject, Logger } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { Job } from 'bullmq'
import { firstValueFrom } from 'rxjs'
import { CreateMonitorHttpRequestDTO } from '../dto/create-monitor.dto'

@Processor('monitor')
export class MonitorConsumer {
  constructor(@Inject('MONITOR_SERVICE') private monitorService: ClientProxy) {}

  private readonly logger = new Logger(MonitorConsumer.name)

  @Process('http-request')
  async httpRequestProcess(
    job: Job<CreateMonitorHttpRequestDTO>,
  ): Promise<any> {
    this.logger.debug(`Consumer works ${JSON.stringify(job.data)}`)
    const res = await firstValueFrom(
      this.monitorService.send('http-request', job.data),
    )
    this.logger.debug(`Consumer works ${JSON.stringify(res)}`)
    return res
  }
}

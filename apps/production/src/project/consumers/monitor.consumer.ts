import { Process, Processor } from '@nestjs/bull'
import { Inject, InternalServerErrorException, Logger } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { Job } from 'bull'
import { firstValueFrom } from 'rxjs'
import { CreateMonitorHttpRequestDTO } from '../dto/create-monitor.dto'
import { clickhouse } from '../../common/integrations/clickhouse'
import { ProjectService } from '../project.service'
import { MailerService } from '../../mailer/mailer.service'
import { LetterTemplate } from '../../mailer/letter'

@Processor('monitor')
export class MonitorConsumer {
  constructor(
    @Inject('MONITOR_SERVICE') private monitorService: ClientProxy,
    private readonly projectService: ProjectService,
    private readonly mailerService: MailerService,
  ) {}

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

    const monitor = await this.projectService.getMonitor(job.data.monitorID)

    if (!monitor.acceptedStatusCodes.includes(res.statusCode)) {
      // await this.mailerService.sed(monitor.group.project.admin.email, 'fuck')
      await this.mailerService.sendEmail(
        monitor.group.project.admin.email,
        LetterTemplate.UptimeMonitoringFailure,
      )
    }
    // this.logger.debug(`Monitor ${JSON.stringify(monitor)}`)

    // this.logger.debug(`1`)
    //

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

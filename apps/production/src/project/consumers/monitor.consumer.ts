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
    job: Job<CreateMonitorHttpRequestDTO & { monitorId: number }>,
  ): Promise<any> {
    const res: {
      responseTime: number
      statusCode: number
      timestamp: number
      region: string
    } = await firstValueFrom(this.monitorService.send('http-request', job.data))

    const monitor = await this.projectService.getMonitor(job.data.monitorId)

    if (!monitor.acceptedStatusCodes.includes(res.statusCode)) {
      try {
        await this.mailerService.sendEmail(
          monitor.group.project.admin.email,
          LetterTemplate.UptimeMonitoringFailure,
          {
            projectName: monitor.group.project.name,
            monitorName: monitor.name,
            groupName: monitor.group.name,
          },
        )
      } catch (reason) {
        console.error('Monitor failure: sendEmail action failed')
        console.error(reason)
      }
    }

    try {
      await clickhouse.insert({
        table: 'monitor_responses',
        format: 'JSONEachRow',
        values: [
          {
            monitorId: job.data.monitorId,
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

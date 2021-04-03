import { Injectable, HttpService } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
// import * as moment from 'moment'

import { MailerService } from '../mailer/mailer.service'

@Injectable()
export class TaskManagerService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly httpService: HttpService
  ) {}

  @Cron(CronExpression.EVERY_6_MONTHS)
  async someTask(): Promise<void> {
    
  }
}
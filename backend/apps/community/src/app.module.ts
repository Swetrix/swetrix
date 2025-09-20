import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { NestjsFormDataModule } from 'nestjs-form-data'
import { MailerModule as NodeMailerModule } from '@nestjs-modules/mailer'

import { I18nModule } from 'nestjs-i18n'
import { UserModule } from './user/user.module'
import { AnalyticsModule } from './analytics/analytics.module'
import { ProjectModule } from './project/project.module'
import { TaskManagerModule } from './task-manager/task-manager.module'
import { PingModule } from './ping/ping.module'
import { getI18nConfig } from './configs'
import { AuthModule } from './auth/auth.module'
import { AppController } from './app.controller'
import { isPrimaryNode } from './common/utils'
import { MailerModule } from './mailer/mailer.module'

const modules = [
  ConfigModule.forRoot({
    cache: true,
    envFilePath: '.env',
    expandVariables: true,
    isGlobal: true,
  }),
  NodeMailerModule.forRoot({
    transport: {
      sendingRate: 14,
      // pool: true, // if true - set up pooled connections against a SMTP server
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: true, // if false - upgrade later with STARTTLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    },
    defaults: {
      from: `"Swetrix Community Edition" <${process.env.FROM_EMAIL || 'noreply@ce.swetrix.org'}>`, // outgoing email ID
    },
  }),
  I18nModule.forRootAsync(getI18nConfig()),
  ScheduleModule.forRoot(),
  NestjsFormDataModule.config({ isGlobal: true }),
  UserModule,
  MailerModule,
  ProjectModule,
  AnalyticsModule,
  PingModule,
  AuthModule,
]

@Module({
  imports: [...modules, ...(isPrimaryNode() ? [TaskManagerModule] : [])],
  controllers: [AppController],
})
export class AppModule {}

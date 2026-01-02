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
import { GoalModule } from './goal/goal.module'
import { FeatureFlagModule } from './feature-flag/feature-flag.module'
import { CaptchaModule } from './captcha/captcha.module'
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
  NodeMailerModule.forRootAsync({
    useFactory: () => {
      const hasSmtpConfig = !!process.env.SMTP_HOST && !!process.env.SMTP_PORT

      const defaults = {
        from: `"Swetrix Community Edition" <${process.env.FROM_EMAIL || 'noreply@ce.swetrix.org'}>`,
      }

      if (hasSmtpConfig) {
        return {
          transport: {
            secure: true,
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASSWORD,
            },
          },
          defaults,
        }
      }

      // Fallback transport so the module initializes without SMTP; actual sending
      // will be handled directly in the MailerService via MX lookups
      return {
        transport: {
          streamTransport: true,
        },
        defaults,
      }
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
  GoalModule,
  FeatureFlagModule,
  CaptchaModule,
  AuthModule,
]

@Module({
  imports: [...modules, ...(isPrimaryNode() ? [TaskManagerModule] : [])],
  controllers: [AppController],
})
export class AppModule {}

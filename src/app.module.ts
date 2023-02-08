import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { TelegrafModule } from 'nestjs-telegraf'

import { UserModule } from './user/user.module'
import { AnalyticsModule } from './analytics/analytics.module'
import { ProjectModule } from './project/project.module'
import { MailerModule } from './mailer/mailer.module'
import { ActionTokensModule } from './action-tokens/action-tokens.module'
import { TwoFactorAuthModule } from './twoFactorAuth/twoFactorAuth.module'
import { TaskManagerModule } from './task-manager/task-manager.module'
import { WebhookModule } from './webhook/webhook.module'
import { PingModule } from './ping/ping.module'
import { TGModule } from './tg-integration/tg.module'
import { MarketplaceModule } from './marketplace/marketplace.module'
import { AlertModule } from './alert/alert.module'
import { I18nModule } from 'nestjs-i18n'
import { getI18nConfig } from './configs'
import { AuthModule } from './auth/auth.module'

const modules = [
  ConfigModule.forRoot({ envFilePath: '.env', isGlobal: true }),
  TypeOrmModule.forRoot({
    type: 'mysql',
    host: process.env.MYSQL_HOST,
    port: 3306,
    username: process.env.MYSQL_USER,
    password: process.env.MYSQL_ROOT_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    synchronize: process.env.NODE_ENV === 'development',
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
  }),
  I18nModule.forRootAsync(getI18nConfig()),
  ScheduleModule.forRoot(),
  TaskManagerModule,
  UserModule,
  MailerModule,
  ActionTokensModule,
  TwoFactorAuthModule,
  ProjectModule,
  AnalyticsModule,
  WebhookModule,
  PingModule,
  TGModule,
  MarketplaceModule,
  AlertModule,
  AuthModule,
]

if (process.env.TG_BOT_TOKEN) {
  modules.push(
    TelegrafModule.forRoot({
      token: process.env.TG_BOT_TOKEN,
    }),
  )
}

@Module({
  imports: modules,
})
export class AppModule {}

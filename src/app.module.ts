import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule' 

import { AuthModule } from './auth/auth.module'
import { UserModule } from './user/user.module'
import { AnalyticsModule } from './analytics/analytics.module'
import { User } from './user/entities/user.entity'
import { Project } from './project/entity/project.entity'
import { ProjectModule } from './project/project.module'
import { MailerModule } from './mailer/mailer.module'
import { ActionTokensModule } from './action-tokens/action-tokens.module'
import { ActionToken } from './action-tokens/action-token.entity'
import { TaskManagerModule } from './task-manager/task-manager.module'
import { WebhookModule } from './webhook/webhook.module'
import { PingModule } from './ping/ping.module'
import { isSelfhosted } from './common/constants'

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: '.env' }),
    TypeOrmModule.forRoot({
      type: isSelfhosted ? 'mysql' : 'sqlite',
      host: isSelfhosted && process.env.MYSQL_HOST,
      port: isSelfhosted && 3306,
      username: isSelfhosted && process.env.MYSQL_USER,
      password: isSelfhosted && process.env.MYSQL_ROOT_PASSWORD,
      database: isSelfhosted ? process.env.MYSQL_DATABASE : './dummy.sql',
      synchronize: false,
      entities: [User, ActionToken, Project],
    }),
    ScheduleModule.forRoot(),
    TaskManagerModule,
    AuthModule,
    UserModule,
    MailerModule,
    ActionTokensModule,
    ProjectModule,
    AnalyticsModule,
    WebhookModule,
    PingModule,
  ],
})

export class AppModule {}

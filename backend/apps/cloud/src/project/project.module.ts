import { Module, forwardRef } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { HttpModule } from '@nestjs/axios'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ClientsModule, Transport } from '@nestjs/microservices'
import { BullModule } from '@nestjs/bull'

import { ProjectService } from './project.service'
import { ProjectController } from './project.controller'
import { UserModule } from '../user/user.module'
import { ActionTokensModule } from '../action-tokens/action-tokens.module'
import { MailerModule } from '../mailer/mailer.module'
import { AppLoggerModule } from '../logger/logger.module'
import { Project, ProjectSubscriber, Funnel, ProjectShare } from './entity'
import { ProjectsViewsRepository } from './repositories/projects-views.repository'
import { ProjectViewEntity } from './entity/project-view.entity'
import { ProjectViewCustomEventEntity } from './entity/project-view-custom-event.entity'
import { MonitorConsumer } from './consumers/monitor.consumer'
import { MonitorEntity } from './entity/monitor.entity'
import { OrganisationModule } from '../organisation/organisation.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      ProjectShare,
      ProjectSubscriber,
      Funnel,
      ProjectViewEntity,
      ProjectViewCustomEventEntity,
      MonitorEntity,
    ]),
    forwardRef(() => UserModule),
    forwardRef(() => OrganisationModule),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        baseURL: configService.get('AI_URL'),
      }),
    }),
    ClientsModule.register([
      {
        name: 'MONITOR_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.MONITOR_QUEUE_URL],
          queue: 'monitor_queue',
          queueOptions: {
            durable: false,
          },
        },
      },
    ]),
    BullModule.registerQueue({
      name: 'monitor',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: 25,
      },
    }),
    AppLoggerModule,
    ActionTokensModule,
    MailerModule,
  ],
  providers: [ProjectService, ProjectsViewsRepository, MonitorConsumer],
  exports: [ProjectService, ProjectsViewsRepository],
  controllers: [ProjectController],
})
export class ProjectModule {}

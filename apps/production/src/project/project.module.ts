import { MiddlewareConsumer, Module, NestModule, forwardRef } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { ProjectService } from './project.service'
import { ProjectController } from './project.controller'
import { UserModule } from '../user/user.module'
import { ActionTokensModule } from '../action-tokens/action-tokens.module'
import { MailerModule } from '../mailer/mailer.module'
import { AppLoggerModule } from '../logger/logger.module'
import { Project, ProjectSubscriber, Funnel, ProjectShare } from './entity'
import { CustomPrometheusModule } from '../prometheus/prometheus.module'
import { MetricsMiddleware } from '../prometheus/metrics.middleware'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      ProjectShare,
      ProjectSubscriber,
      Funnel,
    ]),
    forwardRef(() => UserModule),
    AppLoggerModule,
    ActionTokensModule,
    MailerModule,
    CustomPrometheusModule,
  ],
  providers: [ProjectService],
  exports: [ProjectService],
  controllers: [ProjectController],
})

export class ProjectModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(MetricsMiddleware)
      .forRoutes(ProjectController);
  }
}
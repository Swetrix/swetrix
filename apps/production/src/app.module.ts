import { Injectable, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { NestjsFormDataModule } from 'nestjs-form-data'
import { MailerModule as NodeMailerModule } from '@nestjs-modules/mailer'

import { I18nModule } from 'nestjs-i18n'
import { UserModule } from './user/user.module'
import { AnalyticsModule } from './analytics/analytics.module'
import { ProjectModule } from './project/project.module'
import { MailerModule } from './mailer/mailer.module'
import { ActionTokensModule } from './action-tokens/action-tokens.module'
import { TwoFactorAuthModule } from './twoFactorAuth/twoFactorAuth.module'
import { TaskManagerModule } from './task-manager/task-manager.module'
import { BlogModule } from './blog/blog.module'
import { WebhookModule } from './webhook/webhook.module'
import { PingModule } from './ping/ping.module'
import { MarketplaceModule } from './marketplace/marketplace.module'
import { AlertModule } from './alert/alert.module'
import { getI18nConfig } from './configs'
import { AuthModule } from './auth/auth.module'
import { CaptchaModule } from './captcha/captcha.module'
import { OgImageModule } from './og-image/og-image.module'
import { IntegrationsModule } from './integrations/integrations.module'
import { HealthModule } from './health/health.module'
import { AppController } from './app.controller'
import { PrometheusModule } from "@willsoto/nestjs-prometheus";
import { CustomPrometheusModule } from './prometheus/prometheus.module'


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
      from: `"Swetrix" <${process.env.FROM_EMAIL}>`, // outgoing email ID
    },
  }),
  TypeOrmModule.forRoot({
    type: 'mysql',
    host: process.env.MYSQL_HOST,
    port: 3306,
    username: process.env.MYSQL_USER,
    password: process.env.MYSQL_ROOT_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    synchronize: false, // process.env.NODE_ENV !== 'production',
    entities: [`${__dirname}/**/*.entity{.ts,.js}`],
  }),
  I18nModule.forRootAsync(getI18nConfig()),
  ScheduleModule.forRoot(),
  NestjsFormDataModule.config({ isGlobal: true }),
  BlogModule,
  UserModule,
  MailerModule,
  ActionTokensModule,
  TwoFactorAuthModule,
  ProjectModule,
  AnalyticsModule,
  WebhookModule,
  PingModule,
  MarketplaceModule,
  AlertModule,
  AuthModule,
  CaptchaModule,
  OgImageModule,
  HealthModule,
  CustomPrometheusModule
]

@Module({
  imports: [
    ...modules,
    ...(process.env.ENABLE_INTEGRATIONS === 'true' ? [IntegrationsModule] : []),
    ...(process.env.IS_MASTER_NODE === 'true' ? [TaskManagerModule] : []),
    PrometheusModule
    
  ],
  controllers: [AppController],
})
export class AppModule {}


/*

Leaving the comments here (will need to move on the MR description later on):

So, in order to gather metrics into graphana:

The following needs to be done:

1) Create the default Prometheus Module

- Make custom providers to that module, don't forget to add label names and register the module itself

@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
      },
    }),
  ],
  providers: [
    makeCounterProvider({
      name: 'http_project_requests_total',
      help: 'Total number of HTTP requests for PROJECT',
      labelNames: ['method', 'path', 'status'], // !!!!!!!!!!!!!!!!!
    }),
  ],
  exports: [
    PrometheusModule,
    makeCounterProvider({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'], // Ensure this is also exported with labels !!!!!!!!!!!!!!!!!
    }),
  ],
})

2) Define the middleware:


@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(
    @InjectMetric('http_requests_total') private readonly httpRequestsTotal: Counter<string>,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    res.on('finish', () => {
      this.httpRequestsTotal.inc({
        method: req.method,
        path: req.route ? req.route.path : req.path,
        status: res.statusCode.toString(), // Ensure status is a string
      });
    });
    next();
  }
}


and inject it into the module we want to use later on, I have tested it on the project


3) Apply the middleware to the project

export class ProjectModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(MetricsMiddleware)
      .forRoutes(ProjectController);
  }
}

4) The next steps will be to analyse the metrics we would like to gather from the endpoints and step by step implement them, visualising the on the graphana dashboard


...

steps
*/
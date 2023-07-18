import { NestFactory } from '@nestjs/core'
import { ValidationPipe, VersioningType } from '@nestjs/common'
import * as cookieParser from 'cookie-parser'
import * as bodyParser from 'body-parser'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { getBotToken } from 'nestjs-telegraf'

import { ConfigService } from '@nestjs/config'
import * as Sentry from '@sentry/node'
import { isDevelopment } from './common/constants'
import { AppModule } from './app.module'
import { SentryInterceptor } from './common/interceptors/sentry.interceptor'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  const configService = app.get(ConfigService)

  const isSentryEnabled = configService.getOrThrow<boolean>('SENTRY_ENABLED')

  if (isSentryEnabled) {
    const isProduction =
      configService.getOrThrow<string>('NODE_ENV') === 'production'

    Sentry.init({
      dsn: configService.get<string>('SENTRY_DSN'),
      tracesSampleRate: isProduction ? 0.1 : 1.0,
    })

    app.useGlobalInterceptors(new SentryInterceptor())
  }

  app.use(cookieParser())
  app.useGlobalPipes(new ValidationPipe())

  app.enableVersioning({
    type: VersioningType.URI,
  })

  if (isDevelopment) {
    const config = new DocumentBuilder()
      .setTitle('Swetrix API')
      .setDescription('Swetrix Analytics & Marketplace API')
      .setVersion(process.env.npm_package_version)
      .build()
    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('api', app, document)
  }

  // eslint-disable-next-line consistent-return
  app.use(async (req, res, next) => {
    res.header(
      'Cross-Origin-Embedder-Policy',
      "require-corp; report-to='default'",
    )
    res.header('Cross-Origin-Opener-Policy', "same-site; report-to='default'")
    res.header('Cross-Origin-Resource-Policy', 'same-site')
    res.header('Permissions-Policy', 'interest-cohort=()')
    res.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.header('X-Frame-Options', 'DENY')
    res.header('X-Powered-By', 'Mountain Dew')
    res.header('X-XSS-Protection', '1; mode=block')
    res.header('Access-Control-Allow-Origin', process.env.API_ORIGINS || '*')
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH')
    res.header('Access-Control-Allow-Headers', 'Authorization, *')

    if (req.method === 'OPTIONS') {
      // TODO: INVESTIGATE
      // eslint-disable-next-line @typescript-eslint/return-await
      return await res.sendStatus(204)
    }

    next()
  })

  app.use('/webhook', bodyParser.raw({ type: 'application/json' }))

  if (process.env.NODE_ENV === 'production') {
    const bot = app.get(getBotToken())
    app.use(bot.webhookCallback(process.env.TELEGRAM_WEBHOOK_PATH))
  }

  await app.listen(5005)
}
bootstrap()

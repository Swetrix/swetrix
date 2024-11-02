import './instrument'

import { NestFactory } from '@nestjs/core'
import { ValidationPipe, VersioningType } from '@nestjs/common'
import cookieParser from 'cookie-parser'
import bodyParser from 'body-parser'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'

import { isDevelopment } from './common/constants'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

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
      .addBearerAuth()
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
      // eslint-disable-next-line @typescript-eslint/return-await
      return await res.sendStatus(204)
    }

    next()
  })

  app.use('/webhook', bodyParser.raw({ type: 'application/json' }))

  app.use('/webhook/sns', bodyParser.raw())
  app.use('/webhook/sns', bodyParser.text())

  app.enableShutdownHooks()

  await app.listen(5005)
}
bootstrap()

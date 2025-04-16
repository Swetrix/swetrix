import { NestFactory } from '@nestjs/core'
import { ValidationPipe, VersioningType } from '@nestjs/common'
import cookieParser from 'cookie-parser'
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
      .setDescription('Swetrix Selfhosted API')
      .setVersion(process.env.npm_package_version)
      .build()
    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('api', app, document)
  }

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
    res.header('X-Content-Type-Options', 'nosniff')
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH')
    res.header('Access-Control-Allow-Headers', 'Authorization, *')

    const getHighEntropyValues =
      'Sec-CH-UA-Full-Version-List, Sec-CH-UA-Mobile, Sec-CH-UA-Model, Sec-CH-UA-Platform, Sec-CH-UA-Platform-Version, Sec-CH-UA-Arch, Sec-CH-UA-Bitness, Sec-CH-UA-Form-Factors'
    res.header('Accept-CH', getHighEntropyValues)
    res.header('Critical-CH', getHighEntropyValues)

    if (req.method === 'OPTIONS') {
      return await res.sendStatus(204)
    }

    next()
  })

  app.enableShutdownHooks()

  await app.listen(5005)
}
bootstrap()

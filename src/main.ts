import { NestFactory } from '@nestjs/core'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { ValidationPipe } from '@nestjs/common'
import * as cookieParser from 'cookie-parser'

import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableCors()
  app.use(cookieParser())
  app.useGlobalPipes(new ValidationPipe())

  const options = new DocumentBuilder()
    .setTitle('Analytics API')
    .addTag('Auth')
    .addTag('User')
    .setVersion('1.0')
    .build()
  const document = SwaggerModule.createDocument(app, options)

  SwaggerModule.setup('', app, document)

  await app.listen(3005)
}
bootstrap();

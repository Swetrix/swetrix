import { Module } from '@nestjs/common'
import { OgImageService } from './og-image.service'
import { OgImageController } from './og-image.controller'
import { AppLoggerModule } from '../logger/logger.module'

@Module({
  imports: [AppLoggerModule],
  providers: [OgImageService],
  exports: [OgImageService],
  controllers: [OgImageController],
})
export class OgImageModule {}

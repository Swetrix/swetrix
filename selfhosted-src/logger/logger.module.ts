import { Module } from '@nestjs/common'
import { AppLoggerService } from './logger.service'

@Module({
  providers: [AppLoggerService],
  exports: [AppLoggerService],
})
export class AppLoggerModule {}

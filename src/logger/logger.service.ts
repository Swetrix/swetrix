import { Logger } from '@nestjs/common'

export class AppLoggerService extends Logger {
  log(value, route) {
    if (process.env.NODE_ENV === 'development') {
      Logger.log(value, route)
    }
  }
}

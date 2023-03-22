import { Logger } from '@nestjs/common'

import { isDevelopment } from '../common/constants'

export class AppLoggerService extends Logger {
  log(value, route, forceLog = false) {
    if (isDevelopment || forceLog) {
      Logger.log(value, route)
    }
  }
}

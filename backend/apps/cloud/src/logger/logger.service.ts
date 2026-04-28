import { Logger } from '@nestjs/common'

import { isDevelopment } from '../common/constants'

export class AppLoggerService extends Logger {
  log(value, route, forceLog = false) {
    if (isDevelopment || forceLog) {
      Logger.log(value, route)
    }
  }
  warn(value, route, forceLog = false) {
    if (isDevelopment || forceLog) {
      Logger.warn(value, route)
    }
  }
  debug(value, route, forceLog = false) {
    if (isDevelopment || forceLog) {
      Logger.debug(value, route)
    }
  }
  verbose(value, route, forceLog = false) {
    if (isDevelopment || forceLog) {
      Logger.verbose(value, route)
    }
  }
}

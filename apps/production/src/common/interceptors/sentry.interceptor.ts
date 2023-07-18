import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common'
import { tap } from 'rxjs'
import * as Sentry from '@sentry/node'

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      tap({
        error: exception => {
          Sentry.captureException(exception)
        },
      }),
    )
  }
}

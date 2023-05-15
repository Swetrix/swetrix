import { ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthGuard } from '@nestjs/passport'
import { IS_OPTIONAL_AUTH_KEY } from '../decorators'

@Injectable()
export class MultiAuthGuard extends AuthGuard(['jwt-access-token']) {
  constructor(private readonly reflector: Reflector) {
    super()
  }

  handleRequest(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
    status?: any,
  ) {
    const isOptionalAuth = this.reflector.getAllAndOverride<boolean>(
      IS_OPTIONAL_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    )

    if (isOptionalAuth) return user

    return super.handleRequest(err, user, info, context, status)
  }
}

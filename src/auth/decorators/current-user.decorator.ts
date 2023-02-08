import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { IJwtRefreshTokenPayload } from '../interfaces'

export const CurrentUser = createParamDecorator(
  (
    data: keyof IJwtRefreshTokenPayload | undefined,
    context: ExecutionContext,
  ) => {
    const request = context.switchToHttp().getRequest()
    const user = request.user

    return data ? user && user[data] : user
  },
)

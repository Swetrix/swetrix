import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { IJwtPayload } from '../interfaces'

export const CurrentUserId = createParamDecorator(
  (_: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest()
    const user = request.user as IJwtPayload
    return user.sub
  },
)

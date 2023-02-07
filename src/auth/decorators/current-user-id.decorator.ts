import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const CurrentUserId = createParamDecorator(
  (_: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest()
    const user = request.user
    return user && (user.sub || user.id) ? user.sub || user.id : null
  },
)

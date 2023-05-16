import { ExecutionContext, createParamDecorator } from '@nestjs/common'

export const ProjectId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest()
    return request.params.projectId
  },
)

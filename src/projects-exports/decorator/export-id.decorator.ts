import { ExecutionContext, createParamDecorator } from '@nestjs/common'

export const ExportId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest()
    return request.params.exportId
  },
)

import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { Request } from 'express'
import { verify } from 'jsonwebtoken'
import { ExtractJwt } from 'passport-jwt'

export const CurrentUserId = createParamDecorator(
  async (data: unknown, context: ExecutionContext) => {
    const request: Request = context.switchToHttp().getRequest()
    let token = ''

    if (request.cookies.token) {
      token = request.cookies.token;
    } else {
      const extract = ExtractJwt.fromAuthHeaderAsBearerToken()
      token = extract(request)
    }

    try {
      const decoded: any = verify(token, process.env.JWT_SECRET)
      return decoded.user_id
    } catch {
      return null
    }
  },
);

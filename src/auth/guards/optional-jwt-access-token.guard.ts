import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class OptionalJwtAccessTokenGuard extends AuthGuard('jwt-access-token') {
  handleRequest(err: any, user: any) {
    return !err && user ? user : { sub: null }
  }
}

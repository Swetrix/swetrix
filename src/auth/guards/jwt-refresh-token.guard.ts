import { AuthGuard } from '@nestjs/passport'

export class JwtRefreshTokenGuard extends AuthGuard('jwt-refresh-token') {
  constructor() {
    super()
  }
}

import { Injectable, CanActivate } from '@nestjs/common'

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor() {}

  async canActivate() {
    // If upstream guards authenticated a user, they set request.user.
    // If unauthenticated (including API-key or optional auth cases), allow pass-through here.
    return true
  }
}

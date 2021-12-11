import { Injectable, CanActivate, ForbiddenException } from '@nestjs/common'
import { isSelfhosted } from '../constants'

@Injectable()
export class SelfhostedGuard implements CanActivate {
  canActivate(): boolean {
    if (isSelfhosted) {
      throw new ForbiddenException('This API route is disabled in selfhosted edition')
    }

    return true
  }
}

import { Injectable, CanActivate, NotImplementedException } from '@nestjs/common'
import { isSelfhosted } from '../constants'

@Injectable()
export class SelfhostedGuard implements CanActivate {
  canActivate(): boolean {
    if (isSelfhosted) {
      throw new NotImplementedException(
        'This API route is disabled in the Swetrix Selfhosted edition',
      )
    }

    return true
  }
}

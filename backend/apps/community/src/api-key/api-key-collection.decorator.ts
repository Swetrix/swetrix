import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiKeyGuard } from './api-key.guard'

@Injectable()
class CollectionKeyGuard extends AuthGuard('api-key') implements CanActivate {
  canActivate(context: ExecutionContext) {
    if (!context.switchToHttp().getRequest().headers?.['x-api-key']) return true
    return super.canActivate(context)
  }
}

export const ApiKeyCollection = () => UseGuards(CollectionKeyGuard, ApiKeyGuard)

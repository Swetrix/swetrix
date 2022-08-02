import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import * as isbot from 'isbot'
import { IS_BOT_DETECTION_ENABLED } from 'src/common/decorators/bot-detection.decorator'

@Injectable()
export class BotDetectionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    this.reflector.get(IS_BOT_DETECTION_ENABLED, context.getHandler())

    const { headers } = context.switchToHttp().getRequest()
    const { 'user-agent': userAgent } = headers

    if (isbot(userAgent)) {
      throw new ForbiddenException('Bot traffic is ignored')
    }

    return false
  }
}

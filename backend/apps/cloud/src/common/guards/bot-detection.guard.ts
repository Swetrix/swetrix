import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { isbot } from 'isbot'
import { IS_BOT_DETECTION_ENABLED } from '../decorators/bot-detection.decorator'

@Injectable()
export class BotDetectionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const enabled = this.reflector.getAllAndOverride<boolean>(
      IS_BOT_DETECTION_ENABLED,
      [context.getHandler(), context.getClass()],
    )

    if (!enabled) {
      return true
    }

    const { headers } = context.switchToHttp().getRequest()
    const userAgent = String(headers?.['user-agent'] ?? '')

    if (isbot(userAgent)) {
      throw new ForbiddenException('Bot traffic is ignored')
    }

    return true
  }
}

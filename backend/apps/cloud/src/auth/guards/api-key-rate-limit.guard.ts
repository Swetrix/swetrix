import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { checkRateLimitForApiKey } from '../../common/utils'
import {
  getEffectiveAccountLimits,
  PlanCode,
} from '../../user/entities/user.entity'

@Injectable()
export class ApiKeyRateLimitGuard implements CanActivate {
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest()
    const { user } = request

    if (user?.apiKeyAccess) {
      if (!user) return false

      const { apiRateLimitPerHour } = getEffectiveAccountLimits(user)
      const reqAmount =
        user.planCode === PlanCode.none ||
        user.isAccountBillingSuspended ||
        user.dashboardBlockReason !== null
          ? 0
          : apiRateLimitPerHour
      return checkRateLimitForApiKey(`account:${user.id}`, reqAmount)
    }

    return true
  }
}

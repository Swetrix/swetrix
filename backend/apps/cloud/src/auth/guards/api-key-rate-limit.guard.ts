import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { checkRateLimitForApiKey } from '../../common/utils'
import {
  getEffectivePlanType,
  getPlanTypeEntitlements,
  PlanCode,
} from '../../user/entities/user.entity'

@Injectable()
export class ApiKeyRateLimitGuard implements CanActivate {
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest()
    const { user } = request

    if (request.headers['x-api-key']) {
      if (!user) return false

      const effectivePlanType = getEffectivePlanType(user)
      const entitlements = effectivePlanType
        ? getPlanTypeEntitlements(effectivePlanType)
        : null
      const planTypeLimit = entitlements?.apiRateLimitPerHour
      const reqAmount =
        user.planCode === PlanCode.none ||
        user.isAccountBillingSuspended ||
        user.dashboardBlockReason !== null
          ? 0
          : typeof planTypeLimit === 'number'
            ? planTypeLimit
            : user.maxApiKeyRequestsPerHour
      return checkRateLimitForApiKey(user.apiKey, reqAmount)
    }

    return true
  }
}

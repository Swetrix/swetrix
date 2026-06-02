import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { checkRateLimitForApiKey } from '../../common/utils'
import {
  getEffectivePlanType,
  getPlanTypeEntitlements,
  PlanCode,
} from '../../user/entities/user.entity'

const getNumericOverride = (
  overrides: Record<string, unknown> | null | undefined,
  key: string,
) => {
  const value = overrides?.[key]

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

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
      const overrideLimit = getNumericOverride(
        user.entitlementOverrides,
        'apiRateLimitPerHour',
      )
      const planTypeLimit =
        overrideLimit ??
        (typeof entitlements?.apiRateLimitPerHour === 'number'
          ? entitlements.apiRateLimitPerHour
          : user.maxApiKeyRequestsPerHour)
      const reqAmount =
        user.planCode === PlanCode.none ||
        user.isAccountBillingSuspended ||
        user.dashboardBlockReason !== null
          ? 0
          : planTypeLimit
      return checkRateLimitForApiKey(user.apiKey, reqAmount)
    }

    return true
  }
}

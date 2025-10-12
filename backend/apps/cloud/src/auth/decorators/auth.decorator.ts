import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common'
import {
  ApiKeyRateLimitGuard,
  JwtAccessTokenGuard,
  MultiAuthGuard,
  AuthenticationGuard,
} from '../guards'

export const IS_OPTIONAL_AUTH_KEY = 'isOptionalAuth'
export function Auth(allowApiKeyAuth = false, isOptionalAuth = false) {
  return applyDecorators(
    SetMetadata(IS_OPTIONAL_AUTH_KEY, isOptionalAuth),
    allowApiKeyAuth
      ? UseGuards(MultiAuthGuard, ApiKeyRateLimitGuard, AuthenticationGuard)
      : UseGuards(JwtAccessTokenGuard, AuthenticationGuard),
  )
}

import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common'
import {
  JwtAccessTokenGuard,
  MultiAuthGuard,
  AuthenticationGuard,
} from '../guards'

export const IS_OPTIONAL_AUTH_KEY = 'isOptionalAuth'
export function Auth(isApiKeyAuth = false, isOptionalAuth = false) {
  return applyDecorators(
    SetMetadata(IS_OPTIONAL_AUTH_KEY, isOptionalAuth),
    isApiKeyAuth
      ? UseGuards(MultiAuthGuard, AuthenticationGuard)
      : UseGuards(JwtAccessTokenGuard, AuthenticationGuard),
  )
}

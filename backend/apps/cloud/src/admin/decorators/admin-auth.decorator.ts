import { applyDecorators, UseGuards } from '@nestjs/common'

import { Auth } from '../../auth/decorators'
import { AdminAccessGuard } from '../guards/admin-access.guard'

// Standard JWT auth (401 on expired tokens so the refresh flow works),
// then a 404 for anyone not on the ADMIN_EMAILS allowlist
export function AdminAuth() {
  return applyDecorators(Auth(), UseGuards(AdminAccessGuard))
}

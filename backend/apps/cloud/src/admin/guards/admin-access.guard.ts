import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common'

// Comma-separated list of emails allowed to access the admin panel.
// If unset, the admin panel is disabled entirely.
const getAdminEmails = (): string[] => {
  const raw = process.env.ADMIN_EMAILS || ''

  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

@Injectable()
export class AdminAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const user = request.user

    const adminEmails = getAdminEmails()

    if (
      !user?.email ||
      !user?.isActive ||
      !adminEmails.includes(user.email.toLowerCase())
    ) {
      // 404 on purpose - the admin panel should not reveal its existence
      throw new NotFoundException()
    }

    return true
  }
}

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'
import { isbot } from 'isbot'

import { ProjectService } from '../../project/project.service'
import { checkRateLimit, getIPDetails } from '../../common/utils'
import { AppLoggerService } from '../../logger/logger.service'
import { getTrustworthyIp, getSinglePid } from './analytics-read.util'

// Per-IP read rate limit. OPT-IN: unset env => disabled. This guard runs BEHIND
// the SSR proxy, so a careless per-IP limit keys on the proxy's IP and lumps
// every dashboard user into one bucket — which is exactly what 429'd everyone.
// So it's off by default (the front-end nginx already rate-limits per real IP),
// and even when on it only fires for PUBLIC projects with a resolved REAL client
// IP (see getTrustworthyIp, which returns '' rather than a proxy IP). Turn on
// only once the real client IP is confirmed to reach the API (realip /
// TRUSTED_PROXY_IPS), e.g. ANALYTICS_READ_RATE_LIMIT=120.
const READ_RATE_LIMIT = process.env.ANALYTICS_READ_RATE_LIMIT
  ? Number(process.env.ANALYTICS_READ_RATE_LIMIT)
  : null
const READ_RATE_WINDOW = Number(process.env.ANALYTICS_READ_RATE_WINDOW) || 60 // seconds

const BLOCK_DATACENTER_READS =
  process.env.ANALYTICS_BLOCK_DATACENTER_READS === 'true'

/**
 * Guards the read (GET) surface of the analytics controller.
 *
 * Scope: PUBLIC projects only (e.g. /demo) — the unauthenticated, expensive-to-
 * serve endpoints an attacker can hit for free. Private dashboard reads (the
 * bulk of legitimate traffic) are returned untouched before any limiting, so
 * this guard can never throttle a logged-in user's own dashboard.
 *
 * Every check fails OPEN: a protection bug must never take analytics down.
 */
@Injectable()
export class AnalyticsReadGuard implements CanActivate {
  constructor(
    private readonly projectService: ProjectService,
    private readonly logger: AppLoggerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest()

    // Only police read (GET) traffic. Ingestion has its own defenses.
    if (req.method !== 'GET') {
      return true
    }

    // API-key requests are metered separately, per plan — never touch them here.
    if (req.headers['x-api-key']) {
      return true
    }

    // Resolve the project first. Anything that isn't a single PUBLIC project —
    // including every private dashboard read — leaves the guard immediately.
    let isPublicProject = false
    try {
      const pid = getSinglePid(req.query || {})
      if (pid) {
        const project = await this.projectService.getRedisProject(pid)
        isPublicProject = Boolean(project?.public)
      }
    } catch (reason) {
      this.logger.warn(
        `AnalyticsReadGuard soft-failed: ${reason}`,
        'AnalyticsReadGuard',
      )
      return true
    }

    if (!isPublicProject) {
      return true
    }

    // --- Public-project protections only below this line ---

    // Bot user-agents never legitimately view a public dashboard.
    const userAgent = String(req.headers['user-agent'] || '')
    if (userAgent && isbot(userAgent)) {
      throw new ForbiddenException(
        'Automated traffic is not permitted for this resource',
      )
    }

    // The real visitor IP, or '' when only a proxy IP is visible (so we never
    // rate-limit or geo-check the shared proxy address).
    const ip = getTrustworthyIp(req)

    if (BLOCK_DATACENTER_READS && ip) {
      try {
        if (getIPDetails(ip).isHosting) {
          throw new ForbiddenException(
            'Automated traffic is not permitted for this resource',
          )
        }
      } catch (reason) {
        if (reason instanceof ForbiddenException) {
          throw reason
        }
        // GeoIP lookup failed — ignore, fail open.
      }
    }

    // Opt-in per-IP limit, public projects only, real client IP only.
    if (READ_RATE_LIMIT && ip) {
      await checkRateLimit(
        ip,
        'analytics-read',
        READ_RATE_LIMIT,
        READ_RATE_WINDOW,
      )
    }

    return true
  }
}

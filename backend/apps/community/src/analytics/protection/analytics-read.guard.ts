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

const READ_RATE_LIMIT = 300
const AUTHED_READ_RATE_LIMIT = 3000
const READ_RATE_WINDOW = 60

const BLOCK_DATACENTER_READS =
  process.env.ANALYTICS_BLOCK_DATACENTER_READS === 'true'

@Injectable()
export class AnalyticsReadGuard implements CanActivate {
  constructor(
    private readonly projectService: ProjectService,
    private readonly logger: AppLoggerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest()

    if (req.method !== 'GET') {
      return true
    }

    if (req.headers['x-api-key']) {
      return true
    }

    const uid = req.user?.sub || req.user?.id || null
    if (uid) {
      if (AUTHED_READ_RATE_LIMIT > 0) {
        await checkRateLimit(
          String(uid),
          'analytics-read-user',
          AUTHED_READ_RATE_LIMIT,
          READ_RATE_WINDOW,
        )
      }
      return true
    }

    let isPublicProject = false
    try {
      const pid = getSinglePid(req.query || {}, req.params || {})
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

    const userAgent = String(req.headers['user-agent'] || '')
    if (userAgent && isbot(userAgent)) {
      throw new ForbiddenException(
        'Automated traffic is not permitted for this resource',
      )
    }

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
      }
    }

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

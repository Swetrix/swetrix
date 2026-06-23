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

const READ_RATE_LIMIT = Number(process.env.ANALYTICS_READ_RATE_LIMIT) || 600 // requests
const READ_RATE_WINDOW = Number(process.env.ANALYTICS_READ_RATE_WINDOW) || 60 // seconds

const BLOCK_DATACENTER_READS =
  process.env.ANALYTICS_BLOCK_DATACENTER_READS === 'true'

/**
 * Guards the read (GET) surface of the analytics controller.
 *
 * Why this exists: the query endpoints run expensive ClickHouse aggregations,
 * require no auth for public projects (e.g. /demo), and unlike the ingestion
 * endpoints - had no rate limiting or bot detection. That made them the cheap
 * L7 DDoS target behind the CPU spikes.
 */
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

    // API key have their separate limits
    if (req.headers['x-api-key']) {
      return true
    }

    const ip = getTrustworthyIp(req)

    if (ip) {
      await checkRateLimit(
        ip,
        'analytics-read',
        READ_RATE_LIMIT,
        READ_RATE_WINDOW,
      )
    }

    try {
      const pid = getSinglePid(req.query || {})
      if (!pid) {
        return true
      }

      const project = await this.projectService.getRedisProject(pid)
      if (!project || !project.public) {
        return true
      }

      const userAgent = String(req.headers['user-agent'] || '')
      if (userAgent && isbot(userAgent)) {
        throw new ForbiddenException(
          'Automated traffic is not permitted for this resource',
        )
      }

      if (BLOCK_DATACENTER_READS && ip && getIPDetails(ip).isHosting) {
        throw new ForbiddenException(
          'Automated traffic is not permitted for this resource',
        )
      }
    } catch (reason) {
      if (reason instanceof ForbiddenException) {
        throw reason
      }
      this.logger.warn(
        `AnalyticsReadGuard soft-failed: ${reason}`,
        'AnalyticsReadGuard',
      )
      return true
    }

    return true
  }
}

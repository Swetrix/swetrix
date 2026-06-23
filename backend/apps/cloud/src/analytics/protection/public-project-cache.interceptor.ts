import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common'
import { Observable, of } from 'rxjs'
import { tap } from 'rxjs/operators'

import { ProjectService } from '../../project/project.service'
import { AppLoggerService } from '../../logger/logger.service'
import { redis } from '../../common/constants'
import { getSinglePid, getAnalyticsRoute } from './analytics-read.util'

const CACHE_TTL = Number(process.env.PUBLIC_PROJECT_CACHE_TTL) || 10 // seconds

const CACHE_PREFIX = 'arc' // analytics read cache

const CACHEABLE_ROUTES = new Set([
  '', // getData — dashboard overview
  'chart',
  'birdseye',
  'performance',
  'performance/chart',
  'performance/birdseye',
  'sessions',
  'profiles',
  'errors',
  'error-overview',
  'funnel',
  'funnel-sessions',
  'user-flow',
  'custom-events',
  'keywords',
  'gsc-dashboard',
  'gsc-details',
])

/**
 * Caches read responses for PUBLIC projects in Redis for a short window.
 */
@Injectable()
export class PublicProjectCacheInterceptor implements NestInterceptor {
  constructor(
    private readonly projectService: ProjectService,
    private readonly logger: AppLoggerService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest()

    if (req.method !== 'GET') {
      return next.handle()
    }

    const route = getAnalyticsRoute(req.path || '')
    if (!CACHEABLE_ROUTES.has(route)) {
      return next.handle()
    }

    const pid = getSinglePid(req.query || {})
    if (!pid) {
      return next.handle()
    }

    let isPublic = false
    try {
      const project = await this.projectService.getRedisProject(pid)
      isPublic = Boolean(project?.public)
    } catch {
      return next.handle()
    }

    if (!isPublic) {
      return next.handle()
    }

    const key = `${CACHE_PREFIX}:${req.originalUrl}`

    try {
      const cached = await redis.get(key)
      if (cached !== null) {
        return of(JSON.parse(cached))
      }
    } catch (reason) {
      this.logger.warn(
        `PublicProjectCacheInterceptor read failed: ${reason}`,
        'PublicProjectCacheInterceptor',
      )
      return next.handle()
    }

    return next.handle().pipe(
      tap((body) => {
        if (body === undefined || body === null) {
          return
        }
        redis
          .set(key, JSON.stringify(body), 'EX', CACHE_TTL)
          .catch((reason) => {
            this.logger.warn(
              `PublicProjectCacheInterceptor write failed: ${reason}`,
              'PublicProjectCacheInterceptor',
            )
          })
      }),
    )
  }
}

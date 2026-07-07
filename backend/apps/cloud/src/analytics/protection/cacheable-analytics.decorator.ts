import { SetMetadata } from '@nestjs/common'

export const CACHEABLE_ANALYTICS_KEY = 'cacheable_analytics'

/**
 * Opt a v2 analytics GET handler into the public-project Redis cache
 * (PublicProjectCacheInterceptor). v1 routes are matched by the
 * CACHEABLE_ROUTES set instead and don't need this decorator.
 */
export const CacheableAnalytics = () =>
  SetMetadata(CACHEABLE_ANALYTICS_KEY, true)

import { SetMetadata } from '@nestjs/common'

export const CACHEABLE_ANALYTICS_KEY = 'cacheable_analytics'

export const CacheableAnalytics = () =>
  SetMetadata(CACHEABLE_ANALYTICS_KEY, true)

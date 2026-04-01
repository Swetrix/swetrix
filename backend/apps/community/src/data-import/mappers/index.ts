import { ImportMapper } from './mapper.interface'
import { UmamiMapper } from './umami.mapper'
import { SimpleAnalyticsMapper } from './simple-analytics.mapper'

export const SUPPORTED_PROVIDERS = ['umami', 'simple-analytics'] as const

const mappers: Record<string, ImportMapper> = {
  umami: new UmamiMapper(),
  'simple-analytics': new SimpleAnalyticsMapper(),
}

export function getMapper(provider: string): ImportMapper | undefined {
  return mappers[provider]
}

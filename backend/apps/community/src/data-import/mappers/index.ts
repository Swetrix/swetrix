import { ImportMapper } from './mapper.interface'
import { UmamiMapper } from './umami.mapper'
import { SimpleAnalyticsMapper } from './simple-analytics.mapper'
import { FathomMapper } from './fathom.mapper'

export const SUPPORTED_PROVIDERS = [
  'umami',
  'simple-analytics',
  'fathom',
] as const

const mappers: Record<string, ImportMapper> = {
  umami: new UmamiMapper(),
  'simple-analytics': new SimpleAnalyticsMapper(),
  fathom: new FathomMapper(),
}

export function getMapper(provider: string): ImportMapper | undefined {
  return mappers[provider]
}

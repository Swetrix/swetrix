import { ImportMapper } from './mapper.interface'
import { UmamiMapper } from './umami.mapper'
import { SimpleAnalyticsMapper } from './simple-analytics.mapper'
import { FathomMapper } from './fathom.mapper'
import { Ga4Mapper } from './ga4.mapper'

export const SUPPORTED_PROVIDERS = [
  'umami',
  'simple-analytics',
  'fathom',
  'google-analytics',
] as const

const mappers: Record<string, ImportMapper> = {
  umami: new UmamiMapper(),
  'simple-analytics': new SimpleAnalyticsMapper(),
  fathom: new FathomMapper(),
  'google-analytics': new Ga4Mapper(),
}

export function getMapper(provider: string): ImportMapper | undefined {
  return mappers[provider]
}

import { ImportMapper } from './mapper.interface'
import { UmamiMapper } from './umami.mapper'
import { SimpleAnalyticsMapper } from './simple-analytics.mapper'
import { FathomMapper } from './fathom.mapper'
import { PlausibleMapper } from './plausible.mapper'

export const SUPPORTED_PROVIDERS = [
  'umami',
  'simple-analytics',
  'fathom',
  'plausible',
] as const

const mappers: Record<string, ImportMapper> = {
  umami: new UmamiMapper(),
  'simple-analytics': new SimpleAnalyticsMapper(),
  fathom: new FathomMapper(),
  plausible: new PlausibleMapper(),
}

export function getMapper(provider: string): ImportMapper | undefined {
  return mappers[provider]
}

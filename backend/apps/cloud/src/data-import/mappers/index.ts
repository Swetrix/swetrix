import { ImportMapper } from './mapper.interface'
import { UmamiMapper } from './umami.mapper'

export const SUPPORTED_PROVIDERS = ['umami'] as const

const mappers: Record<string, ImportMapper> = {
  umami: new UmamiMapper(),
}

export function getMapper(provider: string): ImportMapper | undefined {
  return mappers[provider]
}

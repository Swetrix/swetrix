import { V2Filter, V2FilterOperator } from '~/api/v2/types'
import {
  ALL_VALID_DIMENSIONS,
  KEYED_DIMENSIONS,
  V1_KEYED_PREFIX_TO_V2,
  V1_TO_V2_DIMENSION,
} from '~/lib/v2Dimensions'

const OPERATOR_BY_PREFIX: Record<string, V2FilterOperator> = {
  '!': 'is_not',
  '~': 'contains',
  '^': 'contains_not',
}

const PREFIX_BY_OPERATOR: Record<V2FilterOperator, string> = {
  is: '',
  is_not: '!',
  contains: '~',
  contains_not: '^',
}

interface ParsedFilterKey {
  dimension: string
  key?: string
  operator: V2FilterOperator
}

export const parseFilterKey = (rawKey: string): ParsedFilterKey | null => {
  let operator: V2FilterOperator = 'is'
  let key = rawKey

  const prefixOperator = OPERATOR_BY_PREFIX[key.charAt(0)]
  if (prefixOperator) {
    operator = prefixOperator
    key = key.substring(1)
  }

  for (const [prefix, dimension] of Object.entries(V1_KEYED_PREFIX_TO_V2)) {
    if (key.startsWith(prefix)) {
      const metaKey = key.substring(prefix.length)
      if (!metaKey) return null
      return { dimension, key: metaKey, operator }
    }
  }

  for (const dimension of KEYED_DIMENSIONS) {
    if (key.startsWith(`${dimension}:`)) {
      const metaKey = key.substring(dimension.length + 1)
      if (!metaKey) return null
      return { dimension, key: metaKey, operator }
    }
  }

  const aliased = V1_TO_V2_DIMENSION[key]
  if (aliased) {
    return { dimension: aliased, operator }
  }

  if (ALL_VALID_DIMENSIONS.includes(key)) {
    return { dimension: key, operator }
  }

  return null
}

export const filterToUrlKey = (
  filter: Pick<V2Filter, 'dimension' | 'operator' | 'key'>,
): string => {
  const prefix = PREFIX_BY_OPERATOR[filter.operator]
  const dimension = filter.key
    ? `${filter.dimension}:${filter.key}`
    : filter.dimension
  return `${prefix}${dimension}`
}

export const filterToUrlValue = (filter: V2Filter): string => {
  if (Array.isArray(filter.value)) {
    return filter.value.map((v) => v ?? 'null').join(',')
  }
  return filter.value ?? 'null'
}

export const parseFiltersFromUrl = (
  searchParams: URLSearchParams,
): V2Filter[] => {
  const filters: V2Filter[] = []

  for (const [rawKey, rawValue] of searchParams.entries()) {
    const parsed = parseFilterKey(rawKey)

    if (!parsed) {
      continue
    }

    filters.push({
      dimension: parsed.dimension,
      operator: parsed.operator,
      value: rawValue === '' || rawValue === 'null' ? null : rawValue,
      ...(parsed.key ? { key: parsed.key } : {}),
    })
  }

  return filters
}

export const isFilterUrlKey = (rawKey: string): boolean =>
  parseFilterKey(rawKey) !== null

export interface LegacyFilter {
  column: string
  filter: string
  isExclusive: boolean
  isContains?: boolean
}

export const legacyFilterToV2 = (legacy: LegacyFilter): V2Filter | null => {
  let dimension: string | undefined
  let key: string | undefined

  for (const [prefix, keyed] of Object.entries(V1_KEYED_PREFIX_TO_V2)) {
    if (legacy.column.startsWith(prefix)) {
      dimension = keyed
      key = legacy.column.substring(prefix.length)
      break
    }
  }

  if (!dimension) {
    dimension =
      V1_TO_V2_DIMENSION[legacy.column] ||
      (ALL_VALID_DIMENSIONS.includes(legacy.column) ? legacy.column : undefined)
  }

  if (!dimension) {
    return null
  }

  const operator: V2FilterOperator = legacy.isContains
    ? legacy.isExclusive
      ? 'contains_not'
      : 'contains'
    : legacy.isExclusive
      ? 'is_not'
      : 'is'

  return {
    dimension,
    operator,
    value: legacy.filter === '' ? null : legacy.filter,
    ...(key ? { key } : {}),
  }
}

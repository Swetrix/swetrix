import { UnprocessableEntityException } from '@nestjs/common'

import {
  findDimension,
  V2_KEYED_FILTER_DIMENSIONS,
  V2DataType,
} from '../registry'

const V2_FILTER_OPERATORS = [
  'is',
  'is_not',
  'contains',
  'contains_not',
] as const

type V2FilterOperator = (typeof V2_FILTER_OPERATORS)[number]

export interface V2Filter {
  dimension: string
  operator: V2FilterOperator
  value: string | null | (string | null)[]
  key?: string
}

interface V1Filter {
  column: string
  filter: string | null | (string | null)[]
  isExclusive: boolean
  isContains: boolean
}

const parseFiltersJson = (filters: string): unknown => {
  try {
    return JSON.parse(filters)
  } catch {
    throw new UnprocessableEntityException(
      'The provided filters are not a valid JSON array',
    )
  }
}

const resolveColumn = (
  filter: V2Filter,
  type: V2DataType,
  lenient: boolean,
): string | null => {
  const { dimension, key } = filter

  const keyedFamily = Object.hasOwn(V2_KEYED_FILTER_DIMENSIONS, dimension)
    ? V2_KEYED_FILTER_DIMENSIONS[dimension]
    : undefined

  if (keyedFamily) {
    if (!keyedFamily.types.includes(type)) {
      if (lenient) {
        return null
      }

      throw new UnprocessableEntityException(
        `The '${dimension}' filter is not supported for ${type} data`,
      )
    }

    return key ? `${keyedFamily.v1Prefix}${key}` : keyedFamily.v1KeyColumn
  }

  const def = findDimension(dimension, type)

  if (!def) {
    if (lenient) {
      return null
    }

    throw new UnprocessableEntityException(
      `Unknown ${type} filter dimension '${dimension}'`,
    )
  }

  return def.column
}

export const parseV2Filters = (filters: string | undefined): V2Filter[] => {
  if (!filters || filters === '""') {
    return []
  }

  const parsed = parseFiltersJson(filters)

  if (!Array.isArray(parsed)) {
    throw new UnprocessableEntityException(
      'The filters parameter must be a JSON array of filter objects',
    )
  }

  return parsed.map((raw, index) => {
    if (!raw || typeof raw !== 'object') {
      throw new UnprocessableEntityException(
        `Filter at index ${index} must be an object`,
      )
    }

    const { dimension, operator, value, key } = raw as Record<string, unknown>

    if (typeof dimension !== 'string' || !dimension) {
      throw new UnprocessableEntityException(
        `Filter at index ${index} is missing a 'dimension'`,
      )
    }

    if (!V2_FILTER_OPERATORS.includes(operator as V2FilterOperator)) {
      throw new UnprocessableEntityException(
        `Filter at index ${index} has an invalid operator. Supported operators: ${V2_FILTER_OPERATORS.join(', ')}`,
      )
    }

    const isValidValue = (v: unknown) => v === null || typeof v === 'string'

    if (Array.isArray(value)) {
      if (!value.every(isValidValue)) {
        throw new UnprocessableEntityException(
          `Filter at index ${index} has an invalid 'value'; array values must be strings or null`,
        )
      }
    } else if (!isValidValue(value)) {
      throw new UnprocessableEntityException(
        `Filter at index ${index} has an invalid 'value'; it must be a string, null or an array`,
      )
    }

    if (key !== undefined && (typeof key !== 'string' || !key)) {
      throw new UnprocessableEntityException(
        `Filter at index ${index} has an invalid 'key'; it must be a non-empty string`,
      )
    }

    if (
      key !== undefined &&
      !Object.hasOwn(V2_KEYED_FILTER_DIMENSIONS, dimension)
    ) {
      throw new UnprocessableEntityException(
        `Filter at index ${index} has a 'key', but the '${dimension}' dimension does not support keys. Keyed dimensions: ${Object.keys(V2_KEYED_FILTER_DIMENSIONS).join(', ')}`,
      )
    }

    const filter: V2Filter = {
      dimension,
      operator: operator as V2FilterOperator,
      value: value as V2Filter['value'],
    }

    if (typeof key === 'string' && key) {
      filter.key = key
    }

    return filter
  })
}

export const toV1FiltersJson = (
  filters: V2Filter[],
  type: V2DataType,
  options: { lenient?: boolean } = {},
): string => {
  if (filters.length === 0) {
    return ''
  }

  const v1Filters: V1Filter[] = []

  for (const filter of filters) {
    const column = resolveColumn(filter, type, Boolean(options.lenient))

    if (column === null) {
      continue
    }

    v1Filters.push({
      column,
      filter: filter.value,
      isExclusive:
        filter.operator === 'is_not' || filter.operator === 'contains_not',
      isContains:
        filter.operator === 'contains' || filter.operator === 'contains_not',
    })
  }

  return JSON.stringify(v1Filters)
}

export const normalizeFiltersToV1Json = (
  filters: string | undefined,
  type: V2DataType,
  options: { lenient?: boolean } = {},
): string => {
  if (!filters || filters === '""') {
    return ''
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(filters)
  } catch {
    return filters
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return ''
  }

  const isLegacyV1 = parsed.every(
    (filter) =>
      filter &&
      typeof filter === 'object' &&
      'column' in filter &&
      !('dimension' in filter),
  )

  if (isLegacyV1) {
    return filters
  }

  return toV1FiltersJson(parseV2Filters(filters), type, options)
}

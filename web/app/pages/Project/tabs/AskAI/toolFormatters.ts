import type { TFunction } from 'i18next'

import { tbPeriodPairs } from '~/lib/constants'

interface ToolCallFilter {
  column?: string
  filter?: string
  isExclusive?: boolean
  isContains?: boolean
}

export interface ToolCallParam {
  /** Locale key under project.askAi.params (with fallback) */
  labelKey: string
  /** Fallback label if no translation exists */
  fallbackLabel: string
  /** Plain string display value */
  value?: string
  /** Pre-formatted entries for list-style values (e.g. filters) */
  entries?: string[]
  /** Pretty-printed JSON for objects/arrays we don't have a special formatter for */
  json?: string
}

export interface ToolCallSummary {
  toolName: string
  params: ToolCallParam[]
}

const PERIOD_KEYS = new Set([
  '1h',
  'today',
  'yesterday',
  '1d',
  '7d',
  '4w',
  '3M',
  '12M',
  '24M',
  'all',
])

const FILTER_COLUMN_LABEL_KEYS: Record<string, string> = {
  pg: 'project.mapping.pg',
  cc: 'project.mapping.cc',
  rg: 'project.mapping.rg',
  ct: 'project.mapping.ct',
  br: 'project.mapping.br',
  brv: 'project.mapping.brv',
  os: 'project.mapping.os',
  osv: 'project.mapping.osv',
  dv: 'project.mapping.dv',
  ref: 'project.mapping.ref',
  so: 'project.mapping.so',
  me: 'project.mapping.me',
  ca: 'project.mapping.ca',
  te: 'project.mapping.te',
  co: 'project.mapping.co',
  lc: 'project.mapping.lc',
  host: 'project.mapping.host',
}

/** Keys that may contain raw SQL or query text. We never render these. */
const SENSITIVE_KEYS = new Set([
  'sql',
  'query',
  'queryText',
  'rawSql',
  'rawQuery',
])

const formatPeriod = (period: string, t: TFunction): string => {
  if (!PERIOD_KEYS.has(period)) return period
  const pair = tbPeriodPairs(t).find((p) => p.period === period)
  return pair?.label ?? period
}

const formatDate = (input: string): string => {
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return input
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const formatRange = (from: string, to: string): string => {
  const fromDate = new Date(from)
  const toDate = new Date(to)
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return `${from} – ${to}`
  }
  const sameYear = fromDate.getFullYear() === toDate.getFullYear()
  const fromOpts: Intl.DateTimeFormatOptions = sameYear
    ? { month: 'short', day: 'numeric' }
    : { year: 'numeric', month: 'short', day: 'numeric' }
  const toOpts: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }
  return `${fromDate.toLocaleDateString(undefined, fromOpts)} – ${toDate.toLocaleDateString(undefined, toOpts)}`
}

const formatFilter = (filter: ToolCallFilter, t: TFunction): string | null => {
  if (!filter || typeof filter.column !== 'string' || !filter.filter) {
    return null
  }
  const labelKey = FILTER_COLUMN_LABEL_KEYS[filter.column]
  const column = labelKey
    ? t(labelKey, { defaultValue: filter.column })
    : filter.column
  let operator: string
  if (filter.isExclusive && filter.isContains) {
    operator = t('project.askAi.params.opNotContains', {
      defaultValue: 'does not contain',
    })
  } else if (filter.isExclusive) {
    operator = '≠'
  } else if (filter.isContains) {
    operator = t('project.askAi.params.opContains', {
      defaultValue: 'contains',
    })
  } else {
    operator = '='
  }
  return `${column} ${operator} ${filter.filter}`
}

const formatDataType = (dataType: string, t: TFunction): string => {
  const key = `project.askAi.params.dataTypes.${dataType}`
  return t(key, { defaultValue: dataType })
}

const formatTimeBucket = (bucket: string, t: TFunction): string => {
  const key = `project.askAi.params.timeBuckets.${bucket}`
  return t(key, { defaultValue: bucket })
}

const formatMeasure = (measure: string, t: TFunction): string => {
  const key = `project.askAi.params.measures.${measure}`
  return t(key, { defaultValue: measure })
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Convert a single tool-call argument object into a structured, human-readable
 * list of parameters. SQL/raw-query keys are intentionally never rendered.
 */
export const formatToolCallSummary = (
  toolName: string,
  args: unknown,
  t: TFunction,
): ToolCallSummary => {
  if (!isPlainObject(args)) {
    return { toolName, params: [] }
  }

  const params: ToolCallParam[] = []

  const entries = Object.entries(args).filter(([key, value]) => {
    if (SENSITIVE_KEYS.has(key)) return false
    if (value === undefined || value === null) return false
    if (typeof value === 'string' && value.trim() === '') return false
    if (Array.isArray(value) && value.length === 0) return false
    return true
  })

  const has = (k: string) => entries.some(([key]) => key === k)
  const get = (k: string) => entries.find(([key]) => key === k)?.[1]

  // Combined date range: from + to → single "From – To" entry
  if (has('from') && has('to')) {
    params.push({
      labelKey: 'project.askAi.params.dateRange',
      fallbackLabel: 'Date range',
      value: formatRange(String(get('from')), String(get('to'))),
    })
  }

  for (const [key, value] of entries) {
    if (key === 'from' && has('to')) continue
    if (key === 'to' && has('from')) continue

    switch (key) {
      case 'period': {
        params.push({
          labelKey: 'project.askAi.params.period',
          fallbackLabel: 'Period',
          value: formatPeriod(String(value), t),
        })
        break
      }
      case 'from': {
        params.push({
          labelKey: 'project.askAi.params.from',
          fallbackLabel: 'From',
          value: formatDate(String(value)),
        })
        break
      }
      case 'to': {
        params.push({
          labelKey: 'project.askAi.params.to',
          fallbackLabel: 'To',
          value: formatDate(String(value)),
        })
        break
      }
      case 'dataType': {
        params.push({
          labelKey: 'project.askAi.params.dataType',
          fallbackLabel: 'Data type',
          value: formatDataType(String(value), t),
        })
        break
      }
      case 'timeBucket': {
        params.push({
          labelKey: 'project.askAi.params.timeBucket',
          fallbackLabel: 'Granularity',
          value: formatTimeBucket(String(value), t),
        })
        break
      }
      case 'measure': {
        params.push({
          labelKey: 'project.askAi.params.measure',
          fallbackLabel: 'Measure',
          value: formatMeasure(String(value), t),
        })
        break
      }
      case 'filters': {
        if (!Array.isArray(value)) break
        const formatted = value
          .map((f) => formatFilter(f as ToolCallFilter, t))
          .filter((entry): entry is string => Boolean(entry))
        if (formatted.length > 0) {
          params.push({
            labelKey: 'project.askAi.params.filters',
            fallbackLabel: 'Filters',
            entries: formatted,
          })
        }
        break
      }
      case 'goalId':
      case 'funnelId':
      case 'flagId':
      case 'experimentId': {
        const resolved = resolveEntityName(toolName, key, String(value), t)
        const labelKey = `project.askAi.params.${key}`
        const fallback =
          key === 'goalId'
            ? 'Goal'
            : key === 'funnelId'
              ? 'Funnel'
              : key === 'flagId'
                ? 'Feature flag'
                : 'Experiment'
        params.push({
          labelKey,
          fallbackLabel: fallback,
          value: resolved,
        })
        break
      }
      case 'country': {
        params.push({
          labelKey: 'project.askAi.params.country',
          fallbackLabel: 'Country',
          value: String(value),
        })
        break
      }
      case 'page': {
        params.push({
          labelKey: 'project.askAi.params.page',
          fallbackLabel: 'Page',
          value: String(value),
        })
        break
      }
      case 'take': {
        params.push({
          labelKey: 'project.askAi.params.take',
          fallbackLabel: 'Limit',
          value: String(value),
        })
        break
      }
      default: {
        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
        ) {
          params.push({
            labelKey: `project.askAi.params.${key}`,
            fallbackLabel: humaniseKey(key),
            value: String(value),
          })
        } else {
          params.push({
            labelKey: `project.askAi.params.${key}`,
            fallbackLabel: humaniseKey(key),
            json: JSON.stringify(value, null, 2),
          })
        }
      }
    }
  }

  return { toolName, params }
}

const humaniseKey = (key: string): string => {
  const spaced = key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

/**
 * Best-effort lookup of an entity name. Without project context, we just show
 * the raw ID with a "(ID)" hint so users can see the call was scoped to a
 * specific entity even when we don't yet know the friendly name.
 */
const resolveEntityName = (
  _toolName: string,
  _key: string,
  id: string,
  _t: TFunction,
): string => {
  return id
}

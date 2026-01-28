import _includes from 'lodash/includes'
import _keys from 'lodash/keys'
import _reduce from 'lodash/reduce'
import _some from 'lodash/some'
import _startsWith from 'lodash/startsWith'

import { Filter } from '../interfaces/traffic'

export const ERROR_FILTERS_MAPPING = {
  showResolved: 'showResolved',
}

export const FILTER_CHART_METRICS_MAPPING_FOR_COMPARE = [
  'bounce',
  'viewsPerUnique',
  'trendlines',
  'customEvents',
]

const validFilters = [
  'host',
  'cc',
  'rg',
  'ct',
  'pg',
  'entryPage',
  'exitPage',
  'lc',
  'ref',
  'refn',
  'dv',
  'br',
  'brv',
  'os',
  'osv',
  'so',
  'me',
  'ca',
  'te',
  'co',
  'ev',
  'tag:key',
  'tag:value',
  'ev:key',
  'ev:value',
]
// dynamic filters is when a filter column starts with a specific value and is followed by some arbitrary string
// this is done to build a connnection between dynamic column and value (e.g. for custom event metadata or page properties)
const validDynamicFilters = ['ev:key:', 'tag:key:']

export const isFilterValid = (filter: string, checkDynamicFilters = false) => {
  // normalise by removing operator prefixes from the URL key
  let normalised = filter
  if (
    _startsWith(normalised, '!') ||
    _startsWith(normalised, '~') ||
    _startsWith(normalised, '^')
  ) {
    normalised = normalised.substring(1)
  }

  if (_includes(validFilters, normalised)) {
    return true
  }

  if (
    checkDynamicFilters &&
    _some(validDynamicFilters, (prefix) => _startsWith(normalised, prefix))
  ) {
    return true
  }

  return false
}

export const parseFilters = (searchParams: URLSearchParams): Filter[] => {
  const filters: Filter[] = []

  const entries = Array.from(searchParams.entries())

  for (const [key, value] of entries) {
    let actualColumn = key

    let isExclusive = false
    let isContains = false

    if (key.startsWith('!')) {
      isExclusive = true
      actualColumn = key.substring(1)
    } else if (key.startsWith('~')) {
      isContains = true
      actualColumn = key.substring(1)
    } else if (key.startsWith('^')) {
      isExclusive = true
      isContains = true
      actualColumn = key.substring(1)
    }

    if (!isFilterValid(actualColumn, true)) {
      continue
    }

    filters.push({
      column: actualColumn,
      filter: value,
      isExclusive: isExclusive,
      isContains,
    })
  }

  return filters
}

import _includes from 'lodash/includes'
import _keys from 'lodash/keys'
import _reduce from 'lodash/reduce'
import _some from 'lodash/some'
import _startsWith from 'lodash/startsWith'

import { VALID_PERIODS, VALID_TIME_BUCKETS } from '~/lib/constants'

import { ProjectPreferences } from '../../../../providers/CurrentProjectProvider'
import { Filter } from '../interfaces/traffic'

export const ERROR_FILTERS_MAPPING = {
  showResolved: 'showResolved',
}

export const FILTER_CHART_METRICS_MAPPING_FOR_COMPARE = ['bounce', 'viewsPerUnique', 'trendlines', 'customEvents']

const validFilters = [
  'host',
  'cc',
  'rg',
  'ct',
  'pg',
  'lc',
  'ref',
  'dv',
  'br',
  'os',
  'so',
  'me',
  'ca',
  'ev',
  'tag:key',
  'tag:value',
  'ev:key',
  'ev:value',
]
// dynamic filters is when a filter column starts with a specific value and is followed by some arbitrary string
// this is done to build a connnection between dynamic column and value (e.g. for custom event metadata or page properties)
const validDynamicFilters = ['ev:key:', 'tag:key:']

export const filterInvalidPreferences = (
  prefs: Record<string, ProjectPreferences>,
): Record<string, ProjectPreferences> => {
  const pids = _keys(prefs)
  const filtered = _reduce(
    pids,
    (prev: string[], curr: string) => {
      const { period, timeBucket } = prefs[curr]

      if (!_includes(VALID_PERIODS, period) || !_includes(VALID_TIME_BUCKETS, timeBucket)) {
        return prev
      }

      return [...prev, curr]
    },
    [],
  )

  return _reduce(
    filtered,
    (prev: any, curr: string) => {
      return {
        ...prev,
        [curr]: prefs[curr],
      }
    },
    {},
  )
}

export const isFilterValid = (filter: string, checkDynamicFilters = false) => {
  if (_includes(validFilters, filter)) {
    return true
  }

  if (checkDynamicFilters && _some(validDynamicFilters, (prefix) => _startsWith(filter, prefix))) {
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

    if (key.startsWith('!')) {
      isExclusive = true
      actualColumn = key.substring(1)
    }

    if (!isFilterValid(actualColumn)) {
      continue
    }

    filters.push({
      column: actualColumn,
      filter: value,
      isExclusive: isExclusive,
    })
  }

  return filters
}

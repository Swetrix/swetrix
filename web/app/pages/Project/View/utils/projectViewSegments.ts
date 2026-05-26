import {
  ERRORS_FILTERS_PANELS_ORDER,
  FILTERS_PANELS_ORDER,
  PROJECT_TABS,
} from '~/lib/constants'

import { Filter } from '../interfaces/traffic'

type ProjectTab = keyof typeof PROJECT_TABS

const TRAFFIC_FILTER_COLUMNS = [
  ...FILTERS_PANELS_ORDER,
  'refn',
  'ev',
  'ev:key',
  'tag:key',
  'tag:value',
]

const PERFORMANCE_FILTER_COLUMNS = [
  'pg',
  'host',
  'cc',
  'rg',
  'ct',
  'dv',
  'br',
  'brv',
  'isp',
  'og',
  'ut',
  'ctp',
]

const ERRORS_FILTER_COLUMNS = [
  'host',
  ...ERRORS_FILTERS_PANELS_ORDER,
  'entryPage',
  'exitPage',
  'tag:key',
  'tag:value',
]

const CAPTCHA_FILTER_COLUMNS = ['cc', 'br', 'os', 'dv']

const SEO_FILTER_COLUMNS = ['pg', 'keywords', 'cc', 'dv']

const ANALYTICS_TABS = new Set<ProjectTab>([
  PROJECT_TABS.traffic,
  PROJECT_TABS.sessions,
  PROJECT_TABS.profiles,
  PROJECT_TABS.funnels,
  PROJECT_TABS.goals,
  PROJECT_TABS.experiments,
])

const FILTER_OPTIONS_BY_TAB: Partial<Record<ProjectTab, string[]>> = {
  [PROJECT_TABS.traffic]: FILTERS_PANELS_ORDER,
  [PROJECT_TABS.performance]: PERFORMANCE_FILTER_COLUMNS,
  [PROJECT_TABS.seo]: ['pg', 'cc', 'dv'],
  [PROJECT_TABS.sessions]: FILTERS_PANELS_ORDER,
  [PROJECT_TABS.profiles]: FILTERS_PANELS_ORDER,
  [PROJECT_TABS.funnels]: FILTERS_PANELS_ORDER,
  [PROJECT_TABS.goals]: FILTERS_PANELS_ORDER,
  [PROJECT_TABS.experiments]: FILTERS_PANELS_ORDER,
  [PROJECT_TABS.errors]: ['host', ...ERRORS_FILTERS_PANELS_ORDER],
  [PROJECT_TABS.captcha]: CAPTCHA_FILTER_COLUMNS,
}

const supportsDynamicFilter = (column: string, tab: ProjectTab) => {
  if (column.startsWith('ev:key:')) {
    return ANALYTICS_TABS.has(tab)
  }

  if (column.startsWith('tag:key:')) {
    return ANALYTICS_TABS.has(tab) || tab === PROJECT_TABS.errors
  }

  return false
}

const getSupportedColumns = (tab: ProjectTab) => {
  if (ANALYTICS_TABS.has(tab)) {
    return TRAFFIC_FILTER_COLUMNS
  }

  if (tab === PROJECT_TABS.performance) {
    return PERFORMANCE_FILTER_COLUMNS
  }

  if (tab === PROJECT_TABS.errors) {
    return ERRORS_FILTER_COLUMNS
  }

  if (tab === PROJECT_TABS.captcha) {
    return CAPTCHA_FILTER_COLUMNS
  }

  if (tab === PROJECT_TABS.seo) {
    return SEO_FILTER_COLUMNS
  }

  return []
}

const isProjectTabFilterSupported = (
  filter: Pick<Filter, 'column'>,
  tab: ProjectTab,
) => {
  if (supportsDynamicFilter(filter.column, tab)) {
    return true
  }

  return getSupportedColumns(tab).includes(filter.column)
}

export const splitProjectViewFiltersByTab = (
  filters: Filter[] = [],
  tab: ProjectTab,
) => {
  const supported: Filter[] = []
  const unsupported: Filter[] = []

  filters.forEach((filter) => {
    if (isProjectTabFilterSupported(filter, tab)) {
      supported.push(filter)
    } else {
      unsupported.push(filter)
    }
  })

  return { supported, unsupported }
}

export const getProjectViewFilterOptions = (tab: ProjectTab) => {
  return FILTER_OPTIONS_BY_TAB[tab] || []
}

export const supportsProjectViewSegments = (tab: ProjectTab) => {
  return getSupportedColumns(tab).length > 0
}

export const getProjectViewCreateType = (tab: ProjectTab) => {
  return tab === PROJECT_TABS.performance ? 'performance' : 'traffic'
}

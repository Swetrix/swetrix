import { V2Filter } from '~/api/v2/types'
import { PROJECT_TABS } from '~/lib/constants'
import { VALID_DIMENSIONS_BY_TYPE } from '~/lib/v2Dimensions'
import { legacyFilterToV2 } from '~/utils/analyticsUrl'

import { ProjectView } from '../interfaces/traffic'

type ProjectTab = keyof typeof PROJECT_TABS

// Saved project views keep the legacy filter shape server-side; convert to
// the v2 shape at this boundary (unmappable legacy filters are dropped).
export const projectViewFiltersToV2 = (view?: ProjectView): V2Filter[] =>
  (view?.filters || []).flatMap((filter) => {
    const converted = legacyFilterToV2(filter)
    return converted ? [converted] : []
  })

// Dimensions that carry a key (event_metadata:plan) are never offered in the
// filter editors directly — they're only created from panel clicks — but they
// are supported when applying segments / rendering chips.
const KEYED_FILTER_DIMENSIONS = ['event_metadata', 'page_property']

// referrer_name shares a display label with referrer, so offering both in the
// column dropdown would be confusing.
const HIDDEN_FILTER_OPTIONS = [...KEYED_FILTER_DIMENSIONS, 'referrer_name']

const TRAFFIC_FILTER_OPTIONS = VALID_DIMENSIONS_BY_TYPE.traffic.filter(
  (dimension) => !HIDDEN_FILTER_OPTIONS.includes(dimension),
)

const TRAFFIC_FILTER_COLUMNS = VALID_DIMENSIONS_BY_TYPE.traffic

const PERFORMANCE_FILTER_COLUMNS = VALID_DIMENSIONS_BY_TYPE.performance

const ERRORS_FILTER_OPTIONS = VALID_DIMENSIONS_BY_TYPE.errors.filter(
  (dimension) => !HIDDEN_FILTER_OPTIONS.includes(dimension),
)

const ERRORS_FILTER_COLUMNS = VALID_DIMENSIONS_BY_TYPE.errors

const CAPTCHA_FILTER_COLUMNS = VALID_DIMENSIONS_BY_TYPE.captcha

const SEO_FILTER_COLUMNS = ['page', 'keywords', 'country', 'device']

const ANALYTICS_TABS = new Set<ProjectTab>([
  PROJECT_TABS.traffic,
  PROJECT_TABS.sessions,
  PROJECT_TABS.replays,
  PROJECT_TABS.profiles,
  PROJECT_TABS.funnels,
  PROJECT_TABS.goals,
  PROJECT_TABS.experiments,
])

const FILTER_OPTIONS_BY_TAB: Partial<Record<ProjectTab, string[]>> = {
  [PROJECT_TABS.traffic]: TRAFFIC_FILTER_OPTIONS,
  [PROJECT_TABS.performance]: PERFORMANCE_FILTER_COLUMNS,
  [PROJECT_TABS.seo]: ['page', 'country', 'device'],
  [PROJECT_TABS.sessions]: TRAFFIC_FILTER_OPTIONS,
  [PROJECT_TABS.replays]: TRAFFIC_FILTER_OPTIONS,
  [PROJECT_TABS.profiles]: TRAFFIC_FILTER_OPTIONS,
  [PROJECT_TABS.funnels]: TRAFFIC_FILTER_OPTIONS,
  [PROJECT_TABS.goals]: TRAFFIC_FILTER_OPTIONS,
  [PROJECT_TABS.experiments]: TRAFFIC_FILTER_OPTIONS,
  [PROJECT_TABS.errors]: ERRORS_FILTER_OPTIONS,
  [PROJECT_TABS.captcha]: CAPTCHA_FILTER_COLUMNS,
}

const supportsKeyedFilter = (
  filter: Pick<V2Filter, 'dimension' | 'key'>,
  tab: ProjectTab,
) => {
  if (filter.dimension === 'event_metadata') {
    return ANALYTICS_TABS.has(tab)
  }

  if (filter.dimension === 'page_property') {
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
  filter: Pick<V2Filter, 'dimension' | 'key'>,
  tab: ProjectTab,
) => {
  if (filter.key) {
    return supportsKeyedFilter(filter, tab)
  }

  return getSupportedColumns(tab).includes(filter.dimension)
}

export const splitProjectViewFiltersByTab = (
  filters: V2Filter[] = [],
  tab: ProjectTab,
) => {
  const supported: V2Filter[] = []
  const unsupported: V2Filter[] = []

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

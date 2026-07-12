import { V2DataType } from '~/api/v2/types'

// Frontend mirror of backend/apps/*/src/analytics/v2/registry/dimensions.ts.
// v1 short codes are kept only as URL aliases so old shared links keep working.

export const V1_TO_V2_DIMENSION: Record<string, string> = {
  cc: 'country',
  rg: 'region',
  ct: 'city',
  pg: 'page',
  host: 'host',
  lc: 'locale',
  br: 'browser',
  brv: 'browser_version',
  os: 'os',
  osv: 'os_version',
  dv: 'device',
  ref: 'referrer',
  refn: 'referrer_name',
  so: 'utm_source',
  me: 'utm_medium',
  ca: 'utm_campaign',
  te: 'utm_term',
  co: 'utm_content',
  isp: 'isp',
  og: 'organization',
  ut: 'user_type',
  ctp: 'connection_type',
  entryPage: 'entry_page',
  exitPage: 'exit_page',
  ev: 'event',
}

/** Keyed filter families: URL key `event_metadata:<key>` (legacy `ev:key:<key>`) */
export const KEYED_DIMENSIONS = ['event_metadata', 'page_property'] as const

export const V1_KEYED_PREFIX_TO_V2: Record<string, string> = {
  'ev:key:': 'event_metadata',
  'tag:key:': 'page_property',
}

const TRAFFIC_DIMENSIONS = [
  'country',
  'region',
  'city',
  'page',
  'host',
  'locale',
  'browser',
  'browser_version',
  'os',
  'os_version',
  'device',
  'referrer',
  'referrer_name',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'isp',
  'organization',
  'user_type',
  'connection_type',
  'entry_page',
  'exit_page',
  'event',
  'event_metadata',
  'page_property',
]

const PERFORMANCE_DIMENSIONS = [
  'country',
  'region',
  'city',
  'page',
  'host',
  'browser',
  'browser_version',
  'device',
  'isp',
  'organization',
  'user_type',
  'connection_type',
]

const ERROR_DIMENSIONS = [
  'country',
  'region',
  'city',
  'page',
  'host',
  'locale',
  'browser',
  'browser_version',
  'os',
  'os_version',
  'device',
  'isp',
  'organization',
  'user_type',
  'connection_type',
  'entry_page',
  'exit_page',
  'error_name',
  'error_message',
  'error_filename',
  'page_property',
]

const CAPTCHA_DIMENSIONS = [
  'country',
  'browser',
  'os',
  'device',
  'captcha_event',
  'captcha_difficulty',
  'captcha_reason',
  'solve_time',
]

export const VALID_DIMENSIONS_BY_TYPE: Record<V2DataType, string[]> = {
  traffic: TRAFFIC_DIMENSIONS,
  performance: PERFORMANCE_DIMENSIONS,
  errors: ERROR_DIMENSIONS,
  captcha: CAPTCHA_DIMENSIONS,
}

/** Every dimension name that may appear as a URL filter key */
export const ALL_VALID_DIMENSIONS = Array.from(
  new Set([
    ...TRAFFIC_DIMENSIONS,
    ...PERFORMANCE_DIMENSIONS,
    ...ERROR_DIMENSIONS,
    ...CAPTCHA_DIMENSIONS,
  ]),
)

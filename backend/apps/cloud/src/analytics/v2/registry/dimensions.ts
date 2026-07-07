import {
  CAPTCHA_EVENT_SQL,
  CAPTCHA_DIFFICULTY_SQL,
  CAPTCHA_REASON_SQL,
  CAPTCHA_SOLVE_MS_SQL,
} from '../../analytics.service'
import { V2DimensionDef } from './types'

const GEO_TYPES: V2DimensionDef['types'] = ['traffic', 'performance', 'errors']

export const V2_DIMENSIONS: V2DimensionDef[] = [
  {
    api: 'country',
    column: 'cc',
    types: ['traffic', 'performance', 'captcha', 'errors'],
    description: 'Country (ISO 3166-1 alpha-2 code)',
  },
  {
    api: 'region',
    column: 'rg',
    types: GEO_TYPES,
    excludeNull: true,
    extraFields: [
      { api: 'country', column: 'cc' },
      { api: 'region_code', column: 'rgc' },
    ],
    description: 'Region / subdivision',
  },
  {
    api: 'city',
    column: 'ct',
    types: GEO_TYPES,
    excludeNull: true,
    extraFields: [{ api: 'country', column: 'cc' }],
    description: 'City',
  },
  {
    api: 'page',
    column: 'pg',
    types: GEO_TYPES,
    description: 'Page path',
  },
  {
    api: 'host',
    column: 'host',
    types: GEO_TYPES,
    description: 'Hostname the event was recorded on',
  },
  {
    api: 'locale',
    column: 'lc',
    types: ['traffic', 'errors'],
    description: 'Browser locale (e.g. en-GB)',
  },
  {
    api: 'browser',
    column: 'br',
    types: ['traffic', 'performance', 'captcha', 'errors'],
    description: 'Browser name',
  },
  {
    api: 'browser_version',
    column: 'brv',
    types: GEO_TYPES,
    extraFields: [{ api: 'browser', column: 'br' }],
    description: 'Browser version',
  },
  {
    api: 'os',
    column: 'os',
    types: ['traffic', 'captcha', 'errors'],
    description: 'Operating system name',
  },
  {
    api: 'os_version',
    column: 'osv',
    types: ['traffic', 'errors'],
    extraFields: [{ api: 'os', column: 'os' }],
    description: 'Operating system version',
  },
  {
    api: 'device',
    column: 'dv',
    types: ['traffic', 'performance', 'captcha', 'errors'],
    description: 'Device type (desktop, mobile, tablet, ...)',
  },
  {
    api: 'referrer',
    column: 'ref',
    types: ['traffic'],
    description: 'Full referrer URL',
  },
  {
    api: 'referrer_name',
    column: 'refn',
    types: ['traffic'],
    filterOnly: true,
    description:
      'Canonical referrer (root domain), filter-only; use the referrer dimension for breakdowns',
  },
  {
    api: 'utm_source',
    column: 'so',
    types: ['traffic'],
    excludeNull: true,
    description: 'UTM source',
  },
  {
    api: 'utm_medium',
    column: 'me',
    types: ['traffic'],
    excludeNull: true,
    description: 'UTM medium',
  },
  {
    api: 'utm_campaign',
    column: 'ca',
    types: ['traffic'],
    excludeNull: true,
    description: 'UTM campaign',
  },
  {
    api: 'utm_term',
    column: 'te',
    types: ['traffic'],
    excludeNull: true,
    description: 'UTM term',
  },
  {
    api: 'utm_content',
    column: 'co',
    types: ['traffic'],
    excludeNull: true,
    description: 'UTM content',
  },
  {
    api: 'isp',
    column: 'isp',
    types: GEO_TYPES,
    excludeNull: true,
    description: 'Internet service provider',
  },
  {
    api: 'organization',
    column: 'og',
    types: GEO_TYPES,
    excludeNull: true,
    description: 'Network organization',
  },
  {
    api: 'user_type',
    column: 'ut',
    types: GEO_TYPES,
    excludeNull: true,
    description: 'Connection user type (residential, hosting, ...)',
  },
  {
    api: 'connection_type',
    column: 'ctp',
    types: GEO_TYPES,
    excludeNull: true,
    description: 'Connection type (Cable/DSL, Cellular, ...)',
  },
  {
    api: 'entry_page',
    column: 'entryPage',
    types: ['traffic', 'errors'],
    virtual: 'entry_page',
    description: 'First page of the session',
  },
  {
    api: 'exit_page',
    column: 'exitPage',
    types: ['traffic', 'errors'],
    virtual: 'exit_page',
    description: 'Last page of the session',
  },
  {
    api: 'event',
    column: 'ev',
    types: ['traffic'],
    filterOnly: true,
    description:
      'Custom event name (filter-only; use /traffic/custom-events for a breakdown)',
  },
  // Errors-only, filter-only dimensions. Columns are the v1 public filter
  // names — getFiltersQuery maps them to error_name/error_message/error_filename.
  {
    api: 'error_name',
    column: 'name',
    types: ['errors'],
    filterOnly: true,
    description: 'Error name',
  },
  {
    api: 'error_message',
    column: 'message',
    types: ['errors'],
    filterOnly: true,
    description: 'Error message',
  },
  {
    api: 'error_filename',
    column: 'filename',
    types: ['errors'],
    filterOnly: true,
    description: 'Source file the error originated from',
  },
  // Captcha meta dimensions. Per-dimension WHERE guards mirror v1
  // generateParamsQuery captcha handling.
  {
    api: 'captcha_event',
    column: 'captcha_event',
    types: ['captcha'],
    description: 'Captcha lifecycle event (generate, pass, verify_fail, ...)',
  },
  {
    api: 'captcha_difficulty',
    column: 'captcha_difficulty',
    types: ['captcha'],
    extraWhere: `AND ${CAPTCHA_EVENT_SQL} = 'generate' AND toUInt8OrZero(${CAPTCHA_DIFFICULTY_SQL}) > 0`,
    description: 'Captcha difficulty level',
  },
  {
    api: 'captcha_reason',
    column: 'captcha_reason',
    types: ['captcha'],
    extraWhere: `AND ${CAPTCHA_EVENT_SQL} = 'generate' AND ${CAPTCHA_REASON_SQL} NOT IN ('', 'baseline', 'manual')`,
    description: 'Reason for elevated captcha difficulty',
  },
  {
    api: 'solve_time',
    column: 'solve_time',
    types: ['captcha'],
    extraWhere: `AND ${CAPTCHA_EVENT_SQL} = 'pass' AND ${CAPTCHA_SOLVE_MS_SQL} > 0`,
    description: 'Captcha solve-time bucket',
  },
]

// Captcha country/browser/os/device breakdowns only count passed captchas (v1 parity)
const CAPTCHA_PASS_GUARD = `AND ${CAPTCHA_EVENT_SQL} = 'pass'`

export const captchaExtraWhere = (dim: V2DimensionDef): string | undefined => {
  if (dim.extraWhere) {
    return dim.extraWhere
  }

  if (['cc', 'br', 'os', 'dv'].includes(dim.column)) {
    return CAPTCHA_PASS_GUARD
  }

  return undefined
}

/**
 * Filter-only dimension families that carry a `key` (meta.key) and translate
 * to v1's `ev:key:<key>` / `tag:key:<key>` filter columns.
 */
export const V2_KEYED_FILTER_DIMENSIONS: Record<
  string,
  { v1Prefix: string; v1KeyColumn: string; types: V2DimensionDef['types'] }
> = {
  event_metadata: {
    v1Prefix: 'ev:key:',
    v1KeyColumn: 'ev:key',
    types: ['traffic'],
  },
  page_property: {
    v1Prefix: 'tag:key:',
    v1KeyColumn: 'tag:key',
    types: ['traffic', 'errors'],
  },
}

import { V2MetricDef } from './types'

/**
 * Local copy of the v1 MEASURES_MAP (analytics.service.ts). Duplicated on
 * purpose — the v2 registry is self-contained and these four entries are the
 * public API contract for the `measure` parameter.
 */
const MEASURES_MAP_V2: Record<string, string> = {
  average: 'avg',
  median: 'median',
  p95: 'quantileExact(0.95)',
  p75: 'quantileExact(0.75)',
}

const perfExpr =
  (column: string) =>
  ({ measure }: { measure?: string }): string => {
    const processedMeasure =
      !measure || measure === 'quantiles' ? 'median' : measure
    const fn = MEASURES_MAP_V2[processedMeasure] || 'median'
    return `round(divide(${fn}(${column}), 1000), 2)`
  }

export const V2_METRICS: V2MetricDef[] = [
  // --- traffic ---
  {
    api: 'visitors',
    types: ['traffic'],
    // v1 semantics preserved: with a custom-event filter applied the base
    // event set is custom_event rows and "visitors" degrades to count(*)
    sqlExpr: ({ customEVFilterApplied }) =>
      customEVFilterApplied ? 'count(*)' : 'count(DISTINCT psid)',
    isDefault: true,
    format: 'integer',
    description: 'Unique sessions',
  },
  {
    api: 'pageviews',
    types: ['traffic'],
    sqlExpr: () => 'count(*)',
    isDefault: true,
    format: 'integer',
    description: 'Pageview (or matched custom event) count',
  },
  {
    api: 'users',
    types: ['traffic'],
    sqlExpr: () => 'count(DISTINCT profileId)',
    format: 'integer',
    description: 'Unique users (identified + anonymous profiles)',
  },
  {
    api: 'session_duration',
    types: ['traffic'],
    sqlExpr: () => null,
    requiresSessionsJoin: true,
    format: 'seconds',
    description:
      'Average session duration in seconds (timeseries and summary only)',
  },
  {
    api: 'bounce_rate',
    types: ['traffic'],
    sqlExpr: () => null,
    requiresSessionsJoin: true,
    format: 'percent',
    description:
      'Percentage of single-pageview sessions (timeseries and summary only)',
  },
  {
    api: 'concurrency',
    types: ['traffic'],
    // Reconstructed from session intervals, which carry no dimension columns,
    // so it is a timeseries-only series that cannot respect filters
    sqlExpr: () => null,
    requiresSessionsJoin: true,
    format: 'integer',
    description:
      'Concurrent live visitors over time (timeseries only; ignores filters)',
  },
  // --- performance (values in seconds; `measure` selects the aggregate) ---
  {
    api: 'load_time',
    types: ['performance'],
    sqlExpr: perfExpr('pageLoad'),
    isDefault: true,
    format: 'seconds',
    description: 'Full page load time',
  },
  {
    api: 'ttfb',
    types: ['performance'],
    sqlExpr: perfExpr('ttfb'),
    format: 'seconds',
    description: 'Time to first byte',
  },
  {
    api: 'dns',
    types: ['performance'],
    sqlExpr: perfExpr('dns'),
    format: 'seconds',
    description: 'DNS resolution time',
  },
  {
    api: 'tls',
    types: ['performance'],
    sqlExpr: perfExpr('tls'),
    format: 'seconds',
    description: 'TLS setup time',
  },
  {
    api: 'connection',
    types: ['performance'],
    sqlExpr: perfExpr('conn'),
    format: 'seconds',
    description: 'Connection establishment time',
  },
  {
    api: 'response',
    types: ['performance'],
    sqlExpr: perfExpr('response'),
    format: 'seconds',
    description: 'Response time',
  },
  {
    api: 'render',
    types: ['performance'],
    sqlExpr: perfExpr('render'),
    format: 'seconds',
    description: 'Browser render time',
  },
  {
    api: 'dom_load',
    types: ['performance'],
    sqlExpr: perfExpr('domLoad'),
    format: 'seconds',
    description: 'DOM content load time',
  },
  // --- errors ---
  {
    api: 'occurrences',
    types: ['errors'],
    sqlExpr: () => 'count(*)',
    isDefault: true,
    format: 'integer',
    description: 'Error occurrences',
  },
  {
    api: 'affected_users',
    types: ['errors'],
    sqlExpr: () => 'uniqExact(profileId)',
    format: 'integer',
    description: 'Distinct users affected',
  },
  // --- captcha ---
  {
    api: 'events',
    types: ['captcha'],
    sqlExpr: () => 'count(*)',
    isDefault: true,
    format: 'integer',
    description: 'Captcha events matching the dimension scope',
  },
  // Timeseries/summary-only captcha counters (computed by the captcha
  // aggregation query, not the generic breakdown builder)
  {
    api: 'generated',
    types: ['captcha'],
    sqlExpr: () => null,
    format: 'integer',
    description: 'Captchas generated (timeseries and summary only)',
  },
  {
    api: 'passed',
    types: ['captcha'],
    sqlExpr: () => null,
    format: 'integer',
    description: 'Captchas passed (timeseries and summary only)',
  },
  {
    api: 'failed',
    types: ['captcha'],
    sqlExpr: () => null,
    format: 'integer',
    description: 'Captchas failed verification (timeseries and summary only)',
  },
  {
    api: 'validation_failed',
    types: ['captcha'],
    sqlExpr: () => null,
    format: 'integer',
    description:
      'Captchas that failed validation (timeseries and summary only)',
  },
  {
    api: 'replayed',
    types: ['captcha'],
    sqlExpr: () => null,
    format: 'integer',
    description: 'Replayed captcha attempts (timeseries and summary only)',
  },
]

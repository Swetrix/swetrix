import { z } from 'zod'
import { projectId } from './schemas.js'

const dataType = z
  .enum(['traffic', 'performance', 'errors', 'captcha', 'seo'])
  .optional()
  .describe(
    'Dataset to query. Defaults to traffic. SEO requires a connected Search Console property.',
  )
const name = z.string().regex(/^[a-z][a-z0-9_]*$/)
const date = z.union([
  z.iso.date(),
  z.iso
    .datetime({ offset: true, local: true })
    .regex(/T\d\d:\d\d:\d\d/, 'Include seconds in the datetime.'),
])
const timeBucket = z
  .enum(['minute', 'hour', 'day', 'month', 'year'])
  .optional()
  .describe('Time bucket. Omit to let Swetrix choose a bucket for the range.')
const measure = z.enum(['median', 'average', 'p75', 'p95'])
const metrics = z
  .array(name)
  .min(1)
  .max(25)
  .optional()
  .describe(
    'Metric names from get_stats_schema. Omit to use the dataset defaults.',
  )
const dimension = name.describe(
  'Dimension name from get_stats_schema, such as page or country.',
)
const filterValue = z.string().nullable()
const filter = z
  .object({
    dimension: name,
    operator: z.enum(['is', 'is_not', 'contains', 'contains_not']),
    value: z.union([filterValue, z.array(filterValue).min(1)]),
    key: z
      .string()
      .min(1)
      .optional()
      .describe('Metadata key for event_metadata or page_property filters.'),
  })
  .strict()
const range = {
  period: z
    .enum([
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
    .optional()
    .describe('Reporting period. Defaults to 7d. Omit when using from and to.'),
  from: date
    .optional()
    .describe('Custom ISO date or datetime. Provide both from and to.'),
  to: date
    .optional()
    .describe('Custom ISO date or datetime. Provide both from and to.'),
  timezone: z
    .string()
    .min(1)
    .refine((timeZone) => {
      try {
        new Intl.DateTimeFormat('en', { timeZone })
        return true
      } catch {
        return false
      }
    }, 'Use a valid IANA timezone.')
    .optional()
    .describe('IANA timezone such as Europe/London. Defaults to Etc/GMT.'),
  filters: z
    .array(filter)
    .max(30)
    .optional()
    .describe(
      'Filter dimensions and operators. A value array matches any listed value.',
    ),
}
const pagination = {
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Rows to return. Defaults to 30.'),
  offset: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe('Rows to skip. Defaults to 0.'),
}

function rangeSchema(fields = {}) {
  return z
    .object({ projectId, ...range, ...fields })
    .strict()
    .refine(
      ({ period, from, to }) =>
        Boolean(from) === Boolean(to) && !(period && from),
      'Use either period or both from and to.',
    )
}

function reportSchema(fields) {
  return rangeSchema({ dataType, ...fields }).refine(
    (args) => !args.measure || args.dataType === 'performance',
    'measure is only supported for performance data.',
  )
}

function queryParams(params) {
  const query = { ...params }
  if (query.metrics) query.metrics = query.metrics.join(',')
  for (const key of ['filters', 'events', 'steps']) {
    if (query[key]) query[key] = JSON.stringify(query[key])
  }
  return query
}

export function registerStatsTools(tool, api) {
  function read(id, path, query, signal) {
    return api.request(`/v2/projects/${id}/${path}`, {
      query: queryParams(query),
      signal,
    })
  }

  function report(name, description, schema, path) {
    tool(
      name,
      description,
      schema,
      ({ projectId, dataType = 'traffic', ...query }, { signal }) => {
        const endpoint = typeof path === 'function' ? path(dataType) : path
        return read(projectId, endpoint, query, signal)
      },
    )
  }

  tool(
    'get_stats_schema',
    'Discover the available dimensions and metrics for a dataset. Use this before building a breakdown, filter, or custom metric selection.',
    z.object({ projectId, dataType }).strict(),
    ({ projectId, dataType }, { signal }) =>
      read(projectId, 'dimensions', { type: dataType }, signal),
  )
  tool(
    'get_dimension_values',
    'Sample recorded values for a traffic or error dimension to use in a filter. Supply search to match part of a value. For ranked or paginated results use get_stats_breakdown.',
    z
      .object({
        projectId,
        dimension,
        dataType: z.enum(['traffic', 'errors']).optional(),
        search: z.string().trim().min(1).max(512).optional(),
        limit: pagination.limit,
      })
      .strict(),
    async (
      { projectId, dimension, dataType, search, limit = 30 },
      { signal },
    ) => {
      const { data, meta } = await read(
        projectId,
        `dimensions/${dimension}/values`,
        { type: dataType },
        signal,
      )
      const needle = search?.toLowerCase()
      const values = needle
        ? data.filter((value) => {
            const label =
              typeof value === 'string'
                ? value
                : `${value.name} ${value.version}`
            return label.toLowerCase().includes(needle)
          })
        : data
      return {
        data: values.slice(0, limit),
        meta: { ...meta, matched: values.length, limit },
      }
    },
  )
  report(
    'get_stats_summary',
    'Get headline metrics for a project and the previous period. For errors this returns an overview of occurrences and affected users and sessions.',
    reportSchema({
      measure: measure
        .optional()
        .describe('Performance timing aggregation. Defaults to median.'),
    }),
    (type) => (type === 'errors' ? 'errors/overview' : `${type}/summary`),
  )
  report(
    'get_stats_timeseries',
    'Get timestamped metric rows for trends. Choose a coarser timeBucket for long ranges. Search Console supports hourly or coarser buckets.',
    reportSchema({
      metrics,
      timeBucket,
      mode: z
        .enum(['periodical', 'cumulative'])
        .optional()
        .describe('Traffic, errors and captcha only. Defaults to periodical.'),
      measure: z
        .enum([...measure.options, 'quantiles'])
        .optional()
        .describe(
          'Performance aggregation. quantiles returns p50, p75 and p95 load times.',
        ),
    })
      .refine(
        ({ mode, dataType }) =>
          !mode || !['performance', 'seo'].includes(dataType),
        'mode is only supported for traffic, errors and captcha.',
      )
      .refine(
        ({ metrics, measure }) => !metrics || measure !== 'quantiles',
        'For measure=quantiles omit metrics. The API returns p50, p75 and p95.',
      ),
    (type) => `${type}/timeseries`,
  )
  report(
    'get_stats_breakdown',
    'Rank values of one dimension by metric. For example, use traffic with dimension page and metric pageviews for top pages. SEO always sorts by clicks descending.',
    reportSchema({
      dimension,
      metrics,
      sort: z
        .string()
        .regex(/^[a-z][a-z0-9_]*:(asc|desc)$/)
        .optional()
        .describe('Sort by value or a selected metric, e.g. pageviews:desc.'),
      measure: measure
        .optional()
        .describe('Performance timing aggregation. Defaults to median.'),
      ...pagination,
    }),
    (type) => `${type}/breakdown`,
  )
  tool(
    'get_live_visitors',
    'Get the total number of visitors active in the last five minutes and a sample of their sessions.',
    z
      .object({
        projectId,
        limit: z
          .int()
          .min(0)
          .max(100)
          .optional()
          .describe(
            'Maximum sessions to include. Defaults to 10. Set to 0 for a count only.',
          ),
      })
      .strict(),
    async ({ projectId, limit = 10 }, { signal }) => {
      const { data, meta } = await read(projectId, 'live-visitors', {}, signal)
      return {
        data: { count: data.count, visitors: data.visitors.slice(0, limit) },
        meta: { ...meta, availableVisitors: data.visitors.length, limit },
      }
    },
  )
  report(
    'list_custom_events',
    'List recorded custom event names and occurrence counts, ordered by count. Use the returned names for event trends, metadata and funnels.',
    rangeSchema(pagination),
    'traffic/custom-events',
  )
  report(
    'get_custom_event_timeseries',
    'Chart occurrence counts for one or more named custom events over time.',
    rangeSchema({
      events: z.array(z.string().min(1)).min(1).max(25),
      timeBucket,
    }),
    'traffic/custom-events/timeseries',
  )
  report(
    'get_custom_event_metadata',
    'Get metadata keys, values and occurrence counts for one recorded custom event.',
    rangeSchema({
      event: z
        .string()
        .min(1)
        .describe('Exact event name from list_custom_events.'),
    }),
    'traffic/custom-events/metadata',
  )
  report(
    'get_funnel',
    'Analyze conversion and drop-off for a saved funnel or an ordered list of page paths and custom event names. Supply exactly one of funnelId and steps.',
    rangeSchema({
      funnelId: z.string().min(1).optional(),
      steps: z.array(z.string().min(1)).min(2).max(10).optional(),
    }).refine(
      ({ funnelId, steps }) => Boolean(funnelId) !== Boolean(steps),
      'Provide either funnelId or steps.',
    ),
    'funnel',
  )
  report(
    'list_errors',
    'Find error groups, their occurrence counts, affected users and resolution status. Resolved groups are excluded by default.',
    rangeSchema({
      ...pagination,
      limit: z
        .number()
        .int()
        .min(1)
        .max(150)
        .optional()
        .describe('Rows to return. Defaults to 30.'),
      show_resolved: z
        .boolean()
        .optional()
        .describe('Include resolved errors.'),
    }),
    'errors',
  )
}

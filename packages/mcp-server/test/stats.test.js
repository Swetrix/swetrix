import assert from 'node:assert/strict'
import { test } from 'node:test'
import { registerStatsTools } from '../src/stats.js'

const projectId = 'AbC123xYz789'
const signal = new AbortController().signal

function registry(request) {
  const definitions = new Map()
  registerStatsTools(
    (name, description, schema, handler) =>
      definitions.set(name, { schema, handler }),
    { request },
  )
  return (name, args = {}) => {
    const { schema, handler } = definitions.get(name)
    return handler(schema.parse({ projectId, ...args }), { signal })
  }
}

const call = registry((path, options) => ({ path, ...options }))

test('breakdown preserves filters, range and pagination in the Stats v2 wire format', () => {
  const filters = [
    { dimension: 'page', operator: 'is', value: ['/news?a=1&b=2', null] },
  ]
  assert.deepEqual(
    call('get_stats_breakdown', {
      dimension: 'country',
      metrics: ['visitors', 'pageviews'],
      filters,
      sort: 'pageviews:desc',
      from: '2026-09-01',
      to: '2026-09-03T13:00:00+01:00',
      limit: 10,
      offset: 10,
    }),
    {
      path: `/v2/projects/${projectId}/traffic/breakdown`,
      query: {
        dimension: 'country',
        metrics: 'visitors,pageviews',
        filters: JSON.stringify(filters),
        sort: 'pageviews:desc',
        from: '2026-09-01',
        to: '2026-09-03T13:00:00+01:00',
        limit: 10,
        offset: 10,
      },
      signal,
    },
  )
})

test('discovers error metrics and routes error summaries to the dedicated overview', () => {
  assert.deepEqual(call('get_stats_schema', { dataType: 'errors' }), {
    path: `/v2/projects/${projectId}/dimensions`,
    query: { type: 'errors' },
    signal,
  })
  assert.equal(
    call('get_stats_summary', { dataType: 'errors' }).path,
    `/v2/projects/${projectId}/errors/overview`,
  )
  assert.equal(
    call('get_stats_timeseries', { dataType: 'seo', timeBucket: 'day' }).path,
    `/v2/projects/${projectId}/seo/timeseries`,
  )
})

test('preserves delimiters in custom event names and ad-hoc funnel steps', () => {
  const events = ['sign,up', 'paid & subscribed']
  assert.deepEqual(call('get_custom_event_timeseries', { events }).query, {
    events: JSON.stringify(events),
  })
  assert.deepEqual(call('get_funnel', { steps: events }).query, {
    steps: JSON.stringify(events),
  })
  assert.deepEqual(call('get_funnel', { funnelId: 'saved' }).query, {
    funnelId: 'saved',
  })
})

test('bounds live session and dimension samples without changing the total', async () => {
  const visitors = Array.from({ length: 16 }, (_, i) => ({ psid: String(i) }))
  const discover = registry((path) => {
    if (path.endsWith('/live-visitors')) {
      return { data: { count: 20, visitors }, meta: { windowMinutes: 5 } }
    }
    assert.equal(
      path,
      `/v2/projects/${projectId}/dimensions/browser_version/values`,
    )
    return {
      data: [
        { name: 'Firefox', version: '100' },
        { name: 'Firefox', version: '101' },
        { name: 'Safari', version: '19' },
      ],
      meta: { pid: projectId },
    }
  })
  const live = await discover('get_live_visitors', { limit: 1 })
  assert.deepEqual(live.data, { count: 20, visitors: visitors.slice(0, 1) })
  assert.equal(live.meta.availableVisitors, 16)
  const values = await discover('get_dimension_values', {
    dimension: 'browser_version',
    search: 'FIREFOX',
    limit: 1,
  })
  assert.deepEqual(values.data, [{ name: 'Firefox', version: '100' }])
  assert.equal(values.meta.matched, 2)
})

test('rejects invalid ranges, pagination, path components and incompatible options', () => {
  for (const [tool, args] of [
    ['get_stats_summary', { projectId: '../projects' }],
    ['get_dimension_values', { dimension: '../other-route' }],
    ['get_stats_summary', { from: '2026-09-01' }],
    ['get_stats_summary', { from: 'Sep 1', to: 'Sep 5' }],
    ['get_stats_summary', { timezone: 'Earth/Somewhere' }],
    ['get_stats_summary', { from: '2026-09-01T00:00', to: '2026-09-05' }],
    [
      'get_stats_summary',
      { from: '2026-09-01', to: '2026-09-05', period: '7d' },
    ],
    ['get_stats_timeseries', { measure: 'p95' }],
    ['get_stats_timeseries', { dataType: 'seo', mode: 'cumulative' }],
    ['get_stats_breakdown', { dimension: 'page', limit: 101 }],
    ['get_funnel', {}],
    ['get_funnel', { steps: ['/', 'subscribe'], funnelId: 'also-specified' }],
  ]) {
    assert.throws(() => call(tool, args))
  }
})

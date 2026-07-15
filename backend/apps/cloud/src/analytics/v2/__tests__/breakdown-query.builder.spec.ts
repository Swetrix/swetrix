import { UnprocessableEntityException } from '@nestjs/common'

import {
  buildBreakdownQuery,
  parseSortParam,
} from '../query/breakdown-query.builder'
import {
  getBreakdownDimension,
  getMetric,
  parseMetricsParam,
} from '../registry'

const SUB_QUERY = `FROM events WHERE pid = {pid:FixedString(12)} AND type = 'pageview'  AND created BETWEEN {groupFrom:String} AND {groupTo:String}`

const normalize = (sql: string) => sql.replace(/\s+/g, ' ').trim()

describe('parseSortParam', () => {
  const dimension = getBreakdownDimension('country', 'traffic')
  const metrics = parseMetricsParam('visitors,pageviews', 'traffic')

  it('defaults to first metric desc', () => {
    expect(parseSortParam(undefined, dimension, metrics)).toEqual({
      field: 'visitors',
      direction: 'desc',
    })
  })

  it('parses field:direction and validates both', () => {
    expect(parseSortParam('pageviews:asc', dimension, metrics)).toEqual({
      field: 'pageviews',
      direction: 'asc',
    })
    expect(parseSortParam('value:asc', dimension, metrics)).toEqual({
      field: 'value',
      direction: 'asc',
    })
    expect(() => parseSortParam('visitors:up', dimension, metrics)).toThrow(
      UnprocessableEntityException,
    )
    expect(() => parseSortParam('users:desc', dimension, metrics)).toThrow(
      UnprocessableEntityException,
    )
  })
})

describe('buildBreakdownQuery', () => {
  it('builds a multi-metric traffic query with pagination and total', () => {
    const query = normalize(
      buildBreakdownQuery({
        dataType: 'traffic',
        dimension: getBreakdownDimension('country', 'traffic'),
        metrics: parseMetricsParam('visitors,pageviews', 'traffic'),
        subQuery: SUB_QUERY,
        ctx: { customEVFilterApplied: false },
        sort: { field: 'visitors', direction: 'desc' },
      }),
    )

    expect(query).toContain('cc AS value')
    expect(query).toContain('count(DISTINCT psid) AS visitors')
    expect(query).toContain('count(*) AS pageviews')
    expect(query).toContain('count() OVER () AS __total')
    expect(query).toContain('GROUP BY value')
    expect(query).toContain('ORDER BY visitors desc')
    expect(query).toContain('LIMIT {v2_limit:UInt32} OFFSET {v2_offset:UInt32}')
  })

  it('degrades visitors to count(*) under custom-event filters (v1 parity)', () => {
    const query = buildBreakdownQuery({
      dataType: 'traffic',
      dimension: getBreakdownDimension('country', 'traffic'),
      metrics: [getMetric('visitors', 'traffic')],
      subQuery: SUB_QUERY,
      ctx: { customEVFilterApplied: true },
      sort: { field: 'visitors', direction: 'desc' },
    })

    expect(query).toContain('count(*) AS visitors')
    expect(query).not.toContain('count(DISTINCT psid)')
  })

  it('includes extra fields for region and groups by them', () => {
    const query = normalize(
      buildBreakdownQuery({
        dataType: 'traffic',
        dimension: getBreakdownDimension('region', 'traffic'),
        metrics: [getMetric('visitors', 'traffic')],
        subQuery: SUB_QUERY,
        ctx: { customEVFilterApplied: false },
        sort: { field: 'visitors', direction: 'desc' },
      }),
    )

    expect(query).toContain('rg AS value')
    expect(query).toContain('cc AS country')
    expect(query).toContain('rgc AS region_code')
    expect(query).toContain('GROUP BY value, country, region_code')
    expect(query).toContain('AND rg IS NOT NULL')
  })

  it('applies the measure to performance metrics', () => {
    const query = buildBreakdownQuery({
      dataType: 'performance',
      dimension: getBreakdownDimension('page', 'performance'),
      metrics: [getMetric('load_time', 'performance')],
      subQuery: SUB_QUERY,
      ctx: { customEVFilterApplied: false, measure: 'p95' },
      sort: { field: 'load_time', direction: 'desc' },
    })

    expect(query).toContain(
      'round(divide(quantileExact(0.95)(pageLoad), 1000), 2) AS load_time',
    )
  })

  it('uses captcha meta-column expressions and per-dimension guards', () => {
    const query = normalize(
      buildBreakdownQuery({
        dataType: 'captcha',
        dimension: getBreakdownDimension('solve_time', 'captcha'),
        metrics: [getMetric('events', 'captcha')],
        subQuery: SUB_QUERY,
        ctx: { customEVFilterApplied: false },
        sort: { field: 'events', direction: 'desc' },
      }),
    )

    expect(query).toContain('multiIf(')
    expect(query).toContain("= 'pass'")

    const countryQuery = normalize(
      buildBreakdownQuery({
        dataType: 'captcha',
        dimension: getBreakdownDimension('country', 'captcha'),
        metrics: [getMetric('events', 'captcha')],
        subQuery: SUB_QUERY,
        ctx: { customEVFilterApplied: false },
        sort: { field: 'events', direction: 'desc' },
      }),
    )

    expect(countryQuery).toContain("= 'pass'")
  })

  it('rejects sessions-join metrics with a 422', () => {
    expect(() =>
      buildBreakdownQuery({
        dataType: 'traffic',
        dimension: getBreakdownDimension('country', 'traffic'),
        metrics: [getMetric('bounce_rate', 'traffic')],
        subQuery: SUB_QUERY,
        ctx: { customEVFilterApplied: false },
        sort: { field: 'bounce_rate', direction: 'desc' },
      }),
    ).toThrow(UnprocessableEntityException)
  })
})

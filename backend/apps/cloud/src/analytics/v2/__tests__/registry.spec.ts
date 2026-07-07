import { UnprocessableEntityException } from '@nestjs/common'

import {
  getBreakdownDimension,
  getDefaultMetrics,
  getMetric,
  listDimensions,
  parseMetricsParam,
  V2_DIMENSIONS,
} from '../registry'

// Keep the registry in lockstep with the v1 filter column allowlists
// (common/constants.ts). If a column is added there, the registry must learn
// about it too.
const {
  TRAFFIC_COLUMNS,
  PERFORMANCE_COLUMNS,
  ERROR_COLUMNS,
  CAPTCHA_COLUMNS,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
} = require('../../../common/constants')

describe('registry <-> v1 column allowlist lockstep', () => {
  const columnsFor = (type: 'traffic' | 'performance' | 'captcha' | 'errors') =>
    V2_DIMENSIONS.filter(
      (dimension) => dimension.types.includes(type) && !dimension.virtual,
    ).map((dimension) => dimension.column)

  it('covers every v1 traffic column', () => {
    for (const column of TRAFFIC_COLUMNS) {
      expect(columnsFor('traffic')).toContain(column)
    }
  })

  it('covers every v1 performance column', () => {
    for (const column of PERFORMANCE_COLUMNS) {
      expect(columnsFor('performance')).toContain(column)
    }
  })

  it('covers every v1 error column', () => {
    for (const column of ERROR_COLUMNS) {
      expect(columnsFor('errors')).toContain(column)
    }
  })

  it('covers every v1 captcha column', () => {
    for (const column of CAPTCHA_COLUMNS) {
      expect(columnsFor('captcha')).toContain(column)
    }
  })
})

describe('dimension lookups', () => {
  it('resolves valid breakdown dimensions', () => {
    expect(getBreakdownDimension('country', 'traffic').column).toBe('cc')
    expect(getBreakdownDimension('page', 'performance').column).toBe('pg')
  })

  it('rejects unknown and filter-only dimensions with 422', () => {
    expect(() => getBreakdownDimension('nope', 'traffic')).toThrow(
      UnprocessableEntityException,
    )
    expect(() => getBreakdownDimension('referrer_name', 'traffic')).toThrow(
      UnprocessableEntityException,
    )
    expect(() => getBreakdownDimension('event', 'traffic')).toThrow(
      UnprocessableEntityException,
    )
    // valid dimension, wrong data type
    expect(() => getBreakdownDimension('referrer', 'performance')).toThrow(
      UnprocessableEntityException,
    )
  })

  it('has unique api names per data type', () => {
    for (const type of [
      'traffic',
      'performance',
      'captcha',
      'errors',
    ] as const) {
      const names = listDimensions(type).map((dimension) => dimension.api)
      expect(new Set(names).size).toBe(names.length)
    }
  })
})

describe('metric lookups', () => {
  it('resolves metrics and rejects unknown ones', () => {
    expect(getMetric('visitors', 'traffic').api).toBe('visitors')
    expect(() => getMetric('visitors', 'errors')).toThrow(
      UnprocessableEntityException,
    )
  })

  it('provides sensible defaults per data type', () => {
    expect(getDefaultMetrics('traffic').map((metric) => metric.api)).toEqual([
      'visitors',
      'pageviews',
    ])
    expect(
      getDefaultMetrics('performance').map((metric) => metric.api),
    ).toEqual(['load_time'])
    expect(getDefaultMetrics('errors').map((metric) => metric.api)).toEqual([
      'occurrences',
    ])
  })

  it('parses and dedupes the metrics CSV param', () => {
    expect(
      parseMetricsParam('visitors, pageviews,visitors', 'traffic').map(
        (metric) => metric.api,
      ),
    ).toEqual(['visitors', 'pageviews'])

    expect(parseMetricsParam(undefined, 'traffic').map((m) => m.api)).toEqual([
      'visitors',
      'pageviews',
    ])

    expect(() => parseMetricsParam('bogus', 'traffic')).toThrow(
      UnprocessableEntityException,
    )
  })
})

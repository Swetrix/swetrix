import { UnprocessableEntityException } from '@nestjs/common'

import { V2Filter } from '../query/filters.translator'
import {
  getDefaultSeoMetrics,
  getSeoBreakdownDimension,
  getSeoMetric,
  listSeoDimensions,
  parseSeoMetricsParam,
  toGscFiltersJson,
  validateSeoFilters,
  V2_SEO_DIMENSIONS,
} from '../registry/seo'

const filter = (overrides: Partial<V2Filter> = {}): V2Filter =>
  ({
    dimension: 'country',
    operator: 'is',
    value: 'US',
    ...overrides,
  }) as V2Filter

describe('seo dimension lookups', () => {
  it('resolves every declared dimension to its Search Console name', () => {
    expect(getSeoBreakdownDimension('query').gsc).toBe('query')
    expect(getSeoBreakdownDimension('page').gsc).toBe('page')
    expect(getSeoBreakdownDimension('country').gsc).toBe('country')
    expect(getSeoBreakdownDimension('device').gsc).toBe('device')
  })

  it('rejects unknown dimensions with 422', () => {
    expect(() => getSeoBreakdownDimension('nope')).toThrow(
      UnprocessableEntityException,
    )
    // Valid for traffic, but Search Console reports nothing like it.
    expect(() => getSeoBreakdownDimension('browser')).toThrow(
      UnprocessableEntityException,
    )
  })

  it('has unique api names', () => {
    const names = listSeoDimensions().map((dimension) => dimension.api)
    expect(new Set(names).size).toBe(names.length)
  })

  it('only maps onto dimensions Search Console actually serves', () => {
    for (const dimension of V2_SEO_DIMENSIONS) {
      expect(['query', 'page', 'country', 'device']).toContain(dimension.gsc)
    }
  })
})

describe('seo metric lookups', () => {
  it('resolves metrics and rejects unknown ones', () => {
    expect(getSeoMetric('clicks').api).toBe('clicks')
    expect(() => getSeoMetric('visitors')).toThrow(UnprocessableEntityException)
  })

  it('returns all four metrics by default', () => {
    expect(getDefaultSeoMetrics().map((metric) => metric.api)).toEqual([
      'clicks',
      'impressions',
      'ctr',
      'position',
    ])
  })

  it('parses and dedupes the metrics CSV param', () => {
    expect(
      parseSeoMetricsParam('clicks, impressions,clicks').map(
        (metric) => metric.api,
      ),
    ).toEqual(['clicks', 'impressions'])

    expect(parseSeoMetricsParam(undefined).map((metric) => metric.api)).toEqual(
      ['clicks', 'impressions', 'ctr', 'position'],
    )

    expect(() => parseSeoMetricsParam('bogus')).toThrow(
      UnprocessableEntityException,
    )
  })
})

describe('validateSeoFilters', () => {
  it('accepts scalar filters on known dimensions', () => {
    const filters = [filter(), filter({ dimension: 'query', value: 'swetrix' })]
    expect(validateSeoFilters(filters)).toBe(filters)
  })

  it('rejects filters on dimensions Search Console cannot filter by', () => {
    expect(() =>
      validateSeoFilters([filter({ dimension: 'browser' })]),
    ).toThrow(UnprocessableEntityException)
  })

  it('rejects array values, which have no dimensionFilterGroups equivalent', () => {
    expect(() => validateSeoFilters([filter({ value: ['US', 'DE'] })])).toThrow(
      UnprocessableEntityException,
    )
  })

  it('rejects null values, since Search Console reports no unset values', () => {
    expect(() => validateSeoFilters([filter({ value: null })])).toThrow(
      UnprocessableEntityException,
    )
  })
})

describe('toGscFiltersJson', () => {
  it('renames query -> keywords, the key GSCService.parseFilters expects', () => {
    const json = toGscFiltersJson([
      filter({ dimension: 'query', value: 'swetrix' }),
    ])

    expect(JSON.parse(json)).toEqual([
      { dimension: 'keywords', operator: 'is', value: 'swetrix' },
    ])
  })

  it('leaves dimensions that already share a name alone', () => {
    const json = toGscFiltersJson([
      filter({ dimension: 'page', operator: 'contains', value: '/blog' }),
    ])

    expect(JSON.parse(json)).toEqual([
      { dimension: 'page', operator: 'contains', value: '/blog' },
    ])
  })

  it('returns undefined for no filters so no filter group is sent', () => {
    expect(toGscFiltersJson([])).toBeUndefined()
  })
})

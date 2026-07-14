import { UnprocessableEntityException } from '@nestjs/common'

import {
  normalizeFiltersToV1Json,
  parseV2Filters,
  toV1FiltersJson,
} from '../query/filters.translator'

describe('parseV2Filters', () => {
  it('returns [] for empty input', () => {
    expect(parseV2Filters(undefined)).toEqual([])
    expect(parseV2Filters('')).toEqual([])
    expect(parseV2Filters('""')).toEqual([])
  })

  it('parses valid filters', () => {
    const filters = parseV2Filters(
      JSON.stringify([
        { dimension: 'country', operator: 'is', value: ['US', 'DE'] },
        { dimension: 'page', operator: 'contains', value: '/blog' },
      ]),
    )

    expect(filters).toHaveLength(2)
    expect(filters[0]).toEqual({
      dimension: 'country',
      operator: 'is',
      value: ['US', 'DE'],
    })
  })

  it('rejects invalid JSON, non-arrays, bad operators and values', () => {
    expect(() => parseV2Filters('not json')).toThrow(
      UnprocessableEntityException,
    )
    expect(() => parseV2Filters('{"dimension":"country"}')).toThrow(
      UnprocessableEntityException,
    )
    expect(() =>
      parseV2Filters(
        JSON.stringify([
          { dimension: 'country', operator: 'equals', value: 'US' },
        ]),
      ),
    ).toThrow(UnprocessableEntityException)
    expect(() =>
      parseV2Filters(
        JSON.stringify([{ dimension: 'country', operator: 'is', value: 42 }]),
      ),
    ).toThrow(UnprocessableEntityException)
  })

  it('accepts null values (filter for unknown)', () => {
    const filters = parseV2Filters(
      JSON.stringify([{ dimension: 'region', operator: 'is', value: null }]),
    )

    expect(filters[0].value).toBeNull()
  })
})

describe('toV1FiltersJson', () => {
  it('translates operators to isExclusive/isContains and columns to v1 codes', () => {
    const filters = parseV2Filters(
      JSON.stringify([
        { dimension: 'country', operator: 'is', value: 'US' },
        { dimension: 'page', operator: 'contains', value: '/blog' },
        { dimension: 'browser', operator: 'is_not', value: 'Chrome' },
        { dimension: 'referrer', operator: 'contains_not', value: 'google' },
      ]),
    )

    const v1 = JSON.parse(toV1FiltersJson(filters, 'traffic'))

    expect(v1).toEqual([
      { column: 'cc', filter: 'US', isExclusive: false, isContains: false },
      { column: 'pg', filter: '/blog', isExclusive: false, isContains: true },
      { column: 'br', filter: 'Chrome', isExclusive: true, isContains: false },
      {
        column: 'ref',
        filter: 'google',
        isExclusive: true,
        isContains: true,
      },
    ])
  })

  it('translates keyed metadata filters to ev:key:<k> / tag:key:<k>', () => {
    const filters = parseV2Filters(
      JSON.stringify([
        {
          dimension: 'event_metadata',
          key: 'plan',
          operator: 'is_not',
          value: 'free',
        },
        {
          dimension: 'page_property',
          key: 'author',
          operator: 'is',
          value: 'Andrii',
        },
        { dimension: 'event_metadata', operator: 'is', value: 'plan' },
      ]),
    )

    const v1 = JSON.parse(toV1FiltersJson(filters, 'traffic'))

    expect(v1[0].column).toBe('ev:key:plan')
    expect(v1[0].isExclusive).toBe(true)
    expect(v1[1].column).toBe('tag:key:author')
    expect(v1[2].column).toBe('ev:key')
  })

  it('maps errors-only dimensions through v1 public names', () => {
    const filters = parseV2Filters(
      JSON.stringify([
        { dimension: 'error_name', operator: 'is', value: 'TypeError' },
      ]),
    )

    const v1 = JSON.parse(toV1FiltersJson(filters, 'errors'))

    expect(v1[0].column).toBe('name')
  })

  it('rejects unknown dimensions strictly, drops them in lenient mode', () => {
    const filters = parseV2Filters(
      JSON.stringify([
        { dimension: 'error_name', operator: 'is', value: 'TypeError' },
        { dimension: 'country', operator: 'is', value: 'US' },
      ]),
    )

    expect(() => toV1FiltersJson(filters, 'traffic')).toThrow(
      UnprocessableEntityException,
    )

    const lenient = JSON.parse(
      toV1FiltersJson(filters, 'traffic', { lenient: true }),
    )

    expect(lenient).toHaveLength(1)
    expect(lenient[0].column).toBe('cc')
  })

  it('keeps array values intact (v1 expands them internally)', () => {
    const filters = parseV2Filters(
      JSON.stringify([
        { dimension: 'country', operator: 'is', value: ['US', null] },
      ]),
    )

    const v1 = JSON.parse(toV1FiltersJson(filters, 'traffic'))

    expect(v1[0].filter).toEqual(['US', null])
  })

  it('translates entry_page / exit_page / referrer_name / event filters', () => {
    const filters = parseV2Filters(
      JSON.stringify([
        { dimension: 'entry_page', operator: 'is', value: '/' },
        { dimension: 'exit_page', operator: 'is', value: '/bye' },
        { dimension: 'referrer_name', operator: 'is', value: 'google.com' },
        { dimension: 'event', operator: 'is', value: 'signup' },
      ]),
    )

    const v1 = JSON.parse(toV1FiltersJson(filters, 'traffic'))

    expect(v1.map((filter: { column: string }) => filter.column)).toEqual([
      'entryPage',
      'exitPage',
      'refn',
      'ev',
    ])
  })
})

describe('normalizeFiltersToV1Json', () => {
  it('returns "" for empty input', () => {
    expect(normalizeFiltersToV1Json(undefined, 'traffic')).toBe('')
    expect(normalizeFiltersToV1Json('', 'traffic')).toBe('')
    expect(normalizeFiltersToV1Json('""', 'traffic')).toBe('')
    expect(normalizeFiltersToV1Json('[]', 'traffic')).toBe('')
  })

  it('passes legacy v1 filters through untouched (public API back-compat)', () => {
    const v1 = JSON.stringify([
      { column: 'cc', filter: 'US', isExclusive: false, isContains: false },
    ])

    expect(normalizeFiltersToV1Json(v1, 'traffic')).toBe(v1)
  })

  it('translates v2 filters into the v1 shape', () => {
    const v2 = JSON.stringify([
      { dimension: 'country', operator: 'is_not', value: 'US' },
    ])

    const v1 = JSON.parse(normalizeFiltersToV1Json(v2, 'traffic'))

    expect(v1).toEqual([
      { column: 'cc', filter: 'US', isExclusive: true, isContains: false },
    ])
  })

  it('returns malformed input unchanged for getFiltersQuery to handle', () => {
    expect(normalizeFiltersToV1Json('not json', 'traffic')).toBe('not json')
  })
})

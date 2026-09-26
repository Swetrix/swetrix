import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'

import { AnalyticsService, DataType } from '../../analytics.service'
import { PageviewsDto } from '../../dto/pageviews.dto'
import { eventTransformer } from '../../utils/transformers'
import { buildBreakdownQuery } from '../query/breakdown-query.builder'
import { parseV2Filters, toV1FiltersJson } from '../query/filters.translator'
import { getBreakdownDimension, parseMetricsParam } from '../registry'
import { V2_VIEW_FILTER_DIMENSIONS } from '../../../common/constants'

const pid = 'testproject1'

describe('Page titles', () => {
  it.each([undefined, null, '', 'Pricing — 日本語', 'a'.repeat(2048)])(
    'accepts an optional title and preserves it for storage (case %#)',
    async (title) => {
      const dto = plainToInstance(PageviewsDto, { pid, pg: '/pricing', title })
      expect(await validate(dto, { whitelist: true })).toEqual([])
      expect(
        eventTransformer({
          type: 'pageview',
          pid: dto.pid,
          pg: dto.pg,
          title: dto.title,
        }),
      ).toMatchObject({
        pg: '/pricing',
        title: title || null,
      })
    },
  )

  it.each([42, {}, ['Pricing'], 'a'.repeat(2049)])(
    'rejects invalid titles (case %#)',
    async (title) => {
      const errors = await validate(
        plainToInstance(PageviewsDto, { pid, title }),
      )
      expect(errors.some((error) => error.property === 'title')).toBe(true)
    },
  )

  it('groups traffic by title while excluding historical rows without titles', () => {
    const query = buildBreakdownQuery({
      dataType: 'traffic',
      dimension: getBreakdownDimension('title', 'traffic'),
      metrics: parseMetricsParam('visitors,pageviews', 'traffic'),
      subQuery:
        "FROM events WHERE pid = {pid:FixedString(12)} AND type = 'pageview'",
      ctx: { customEVFilterApplied: false },
      sort: { field: 'visitors', direction: 'desc' },
    })
    expect(query).toContain('title AS value')
    expect(query).toContain('AND title IS NOT NULL')
    expect(query).toContain('GROUP BY value')
    expect(query).toContain('count(DISTINCT psid) AS visitors')
    expect(query).toContain('count(*) AS pageviews')
  })

  it.each([
    ['is', 'title ='],
    ['is_not', 'NOT title ='],
    ['contains', 'title ILIKE'],
    ['contains_not', 'NOT title ILIKE'],
  ])('compiles the %s title filter with a bound value', (operator, sql) => {
    const value = "Pricing's <Plans> — 日本語"
    const filters = parseV2Filters(
      JSON.stringify([{ dimension: 'title', operator, value }]),
    )
    const service = Object.create(
      AnalyticsService.prototype,
    ) as AnalyticsService
    const [query, params] = service.getFiltersQuery(
      toV1FiltersJson(filters, 'traffic'),
      DataType.ANALYTICS,
    )
    expect(query).toContain(sql)
    expect(query).not.toContain(value)
    expect(Object.values(params)).toContain(value)
  })

  it('allows title filters in saved views', () => {
    expect(V2_VIEW_FILTER_DIMENSIONS).toContain('title')
  })
})

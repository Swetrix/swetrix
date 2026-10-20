import { UnprocessableEntityException } from '@nestjs/common'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { AnalyticsService } from '../../analytics.service'
import { AnalyticsV2Service } from '../analytics-v2.service'
import { OutboundDto } from '../../dto/outbound.dto'
import { eventTransformer } from '../../utils/transformers'
import { toV1FiltersJson } from '../query/filters.translator'
import { clickhouse } from '../../../common/integrations/clickhouse'

jest.mock('../../../common/integrations/clickhouse', () => ({
  clickhouse: { query: jest.fn() },
}))

const pid = 'testproject1'

describe('Outbound links', () => {
  it('validates and stores a native outbound event with its source context', async () => {
    const dto = plainToInstance(OutboundDto, {
      pid,
      url: 'https://tickets.example.org/event?id=4',
      pg: '/article',
    })
    expect(await validate(dto)).toEqual([])
    expect(
      eventTransformer({ type: 'outbound', ...dto, psid: '123' }),
    ).toMatchObject({
      type: 'outbound',
      outbound_url: dto.url,
      pg: '/article',
      psid: '123',
    })
    expect(eventTransformer({ type: 'outbound', ...dto })).not.toHaveProperty(
      'event_name',
    )
  })

  it.each([
    undefined,
    null,
    123,
    '',
    '/relative',
    'javascript:alert(1)',
    'ftp://example.org',
    'https://user:secret@example.org',
    `https://example.org/${'a'.repeat(2048)}`,
  ])('rejects invalid destinations (%#)', async (url) => {
    const errors = await validate(plainToInstance(OutboundDto, { pid, url }))
    expect(errors.some((error) => error.property === 'url')).toBe(true)
  })

  it('groups clicks and unique visitors with bound filters and pagination', async () => {
    const analytics = Object.create(AnalyticsService.prototype)
    const service = new AnalyticsV2Service(analytics, {} as never)
    jest.spyOn(service, 'resolveTimeframe').mockResolvedValue({
      period: 'all',
      timeBucket: null,
      allowedTimeBuckets: null,
      safeTimezone: 'UTC',
      groupFrom: '2026-01-01 00:00:00',
      groupTo: '2026-10-13 23:59:59',
      groupFromUTC: '2026-01-01 00:00:00',
      groupToUTC: '2026-10-13 23:59:59',
    })
    jest.mocked(clickhouse.query).mockResolvedValue({
      json: async () => ({
        data: [
          {
            value: 'https://example.org',
            clicks: '8',
            visitors: '3',
            __total: '2',
          },
          { value: null, clicks: '2', visitors: '1', __total: '2' },
        ],
      }),
    } as never)
    const result = await service.getBreakdown(
      pid,
      {
        dimension: 'outbound_link',
        period: 'all',
        limit: 20,
        offset: 5,
        filters: JSON.stringify([
          { dimension: 'page', operator: 'is', value: '/article' },
        ]),
      },
      'traffic',
    )
    const call = jest.mocked(clickhouse.query).mock.calls.at(-1)![0]
    expect(call.query).toContain("type = 'outbound'")
    expect(call.query).not.toContain("type = 'pageview'")
    expect(call.query).toContain('outbound_url AS value')
    expect(call.query).toContain('ORDER BY clicks desc, value ASC')
    expect(call.query).toContain('count(DISTINCT psid) AS visitors')
    expect(call.query).toContain("countIf(type = 'outbound') AS clicks")
    expect(call.query).not.toContain('/article')
    expect(call.query_params).toMatchObject({
      pid,
      v2_limit: 20,
      v2_offset: 5,
      qf_0_0: '/article',
    })
    expect(result.data).toEqual([
      { value: 'https://example.org', clicks: 8, visitors: 3 },
      { value: null, clicks: 2, visitors: 1 },
    ])
    expect(service.resolveTimeframe).toHaveBeenCalledWith(
      expect.objectContaining({ allTimeEventTypes: ['outbound'] }),
    )
    await expect(
      service.getBreakdown(
        pid,
        { dimension: 'outbound_link', metrics: 'pageviews' },
        'traffic',
      ),
    ).rejects.toThrow('clicks and visitors')
  })

  it.each(['page', 'entry_page', 'exit_page'])(
    'rejects clicks for the %s dimension',
    async (dimension) => {
      const analytics = Object.create(AnalyticsService.prototype)
      const service = new AnalyticsV2Service(analytics, {} as never)
      for (const metrics of ['clicks', 'visitors,clicks']) {
        await expect(
          service.getBreakdown(pid, { dimension, metrics }, 'traffic'),
        ).rejects.toThrow(UnprocessableEntityException)
      }
    },
  )

  it('keeps normal traffic queries on pageviews', async () => {
    const analytics = Object.create(AnalyticsService.prototype)
    const service = new AnalyticsV2Service(analytics, {} as never)
    expect(service.buildSubQuery('traffic', '', false)).toContain(
      "type = 'pageview'",
    )
    expect(service.buildSubQuery('traffic', '', true)).toContain(
      "type = 'custom_event'",
    )
  })

  it('does not expose the outbound report as a pageview filter', () => {
    expect(() =>
      toV1FiltersJson(
        [
          {
            dimension: 'outbound_link',
            operator: 'is',
            value: 'https://example.org',
          },
        ],
        'traffic',
      ),
    ).toThrow()
  })
})

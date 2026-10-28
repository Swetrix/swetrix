import { access, readFile } from 'fs/promises'

import { clickhouse } from '../common/integrations/clickhouse'
import { WarehouseSourceService } from './warehouse-source.service'

jest.mock('../common/integrations/clickhouse', () => ({
  clickhouse: { query: jest.fn() },
}))

describe('WarehouseSourceService', () => {
  const query = clickhouse.query as jest.Mock
  const service = new WarehouseSourceService()
  const projectId = 'abcdefghij-k'
  const day = '2026-10-26'

  beforeEach(() => jest.resetAllMocks())

  const result = (values: Record<string, unknown>[] = []) => {
    const close = jest.fn()
    return {
      close,
      stream: async function* () {
        yield values.map((value) => ({ json: () => value }))
      },
    }
  }

  it('queries native events within one UTC day without truncating UInt64 identities', async () => {
    const response = result([
      {
        visitor_id: '18446744073709551615',
        session_id: '18446744073709551614',
        event_date: day,
        metadata_keys: ['plan', 'plan'],
        metadata_values: ['team', 'enterprise'],
      },
    ])
    query.mockResolvedValue(response)
    const records = []
    for await (const row of service.rows(projectId, day, 'custom_events'))
      records.push(row)
    expect(records[0]).toEqual({
      visitor_id: '18446744073709551615',
      session_id: '18446744073709551614',
      event_date: day,
      metadata: [
        { key: 'plan', value: 'team' },
        { key: 'plan', value: 'enterprise' },
      ],
    })
    const options = query.mock.calls[0][0]
    expect(options.query).toContain('toString(psid) AS visitor_id')
    expect(options.query).toContain('toString(sid) AS session_id')
    expect(options.query).toContain('importID IS NULL')
    expect(options.query).toContain(
      "created < toDateTime({day:Date}, 'UTC') + INTERVAL 1 DAY",
    )
    expect(options.query_params).toEqual({
      projectId,
      day,
      types: ['custom_event', 'outbound'],
    })
    expect(response.close).toHaveBeenCalledTimes(1)
  })

  it('closes ClickHouse when the consumer stops early', async () => {
    const response = result([{ metadata_keys: [], metadata_values: [] }, {}])
    query.mockResolvedValue(response)
    const iterator = service.rows(projectId, day, 'pageviews')
    await iterator.next()
    await iterator.return(undefined)
    expect(response.close).toHaveBeenCalledTimes(1)
  })

  it('writes both streams as NDJSON and removes private files after use', async () => {
    query
      .mockResolvedValueOnce(
        result([
          { page_path: '/a\nb', metadata_keys: ['x'], metadata_values: ['"'] },
        ]),
      )
      .mockResolvedValueOnce(result())
    const exported = await service.exportDay(projectId, day)
    expect(exported.files.map((file) => [file.kind, file.rows])).toEqual([
      ['pageviews', 1],
      ['custom_events', 0],
    ])
    const content = await readFile(exported.files[0].path, 'utf8')
    expect(content.split('\n')).toHaveLength(2)
    expect(JSON.parse(content)).toEqual({
      page_path: '/a\nb',
      metadata: [{ key: 'x', value: '"' }],
    })
    await exported.cleanup()
    await expect(access(exported.files[0].path)).rejects.toThrow()
  })

  it.each(['2026-02-30', '2026-1-01', "2026-10-26' OR 1=1"])(
    'rejects invalid day %s before querying',
    async (invalid) => {
      await expect(
        service.rows(projectId, invalid, 'pageviews').next(),
      ).rejects.toThrow('valid date')
      expect(query).not.toHaveBeenCalled()
    },
  )
})

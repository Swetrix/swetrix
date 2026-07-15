import {
  computeBounceRateSeries,
  toIsoTimestamp,
  zipTimeseries,
} from '../mappers/timeseries.mapper'

describe('toIsoTimestamp', () => {
  it('applies the timezone offset for day labels', () => {
    expect(toIsoTimestamp('2026-07-01', 'Europe/Kyiv')).toBe(
      '2026-07-01T00:00:00+03:00',
    )
  })

  it('handles hour labels and UTC', () => {
    expect(toIsoTimestamp('2026-07-01 13:00:00', 'Etc/GMT')).toBe(
      '2026-07-01T13:00:00Z',
    )
  })

  it('handles month and year labels', () => {
    expect(toIsoTimestamp('2026-07', 'Etc/GMT')).toBe('2026-07-01T00:00:00Z')
    expect(toIsoTimestamp('2026', 'Etc/GMT')).toBe('2026-01-01T00:00:00Z')
  })
})

describe('zipTimeseries', () => {
  it('zips columnar series into self-describing rows', () => {
    const rows = zipTimeseries(
      ['2026-07-01', '2026-07-02'],
      {
        visitors: [10, 20],
        pageviews: [30, 40],
        skipped: undefined,
      },
      'Etc/GMT',
    )

    expect(rows).toEqual([
      {
        timestamp: '2026-07-01T00:00:00Z',
        visitors: 10,
        pageviews: 30,
      },
      {
        timestamp: '2026-07-02T00:00:00Z',
        visitors: 20,
        pageviews: 40,
      },
    ])
  })

  it('fills missing values with null', () => {
    const rows = zipTimeseries(
      ['2026-07-01', '2026-07-02'],
      { visitors: [10] },
      'Etc/GMT',
    )

    expect(rows[1].visitors).toBeNull()
  })
})

describe('computeBounceRateSeries', () => {
  it('computes per-bucket bounce rate as bounces / uniques * 100', () => {
    expect(computeBounceRateSeries([1, 0, 3], [4, 0, 6])).toEqual([25, 0, 50])
  })

  it('returns undefined when either input is missing', () => {
    expect(computeBounceRateSeries(undefined, [1])).toBeUndefined()
    expect(computeBounceRateSeries([1], undefined)).toBeUndefined()
  })
})

import { TimeBucketType } from '../../dto/getData.dto'
import {
  bucketSeoDateSeries,
  gscCountryToAlpha2,
  mapSeoBreakdownRows,
  mapSeoSummary,
  mapSeoTimeseries,
  SeoDateSeriesEntry,
} from '../mappers/seo.mapper'

const day = (
  date: string,
  clicks: number,
  impressions: number,
  position: number,
): SeoDateSeriesEntry => ({
  date,
  clicks,
  impressions,
  position,
  ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
})

describe('gscCountryToAlpha2', () => {
  it('converts Search Console alpha-3 to the alpha-2 the rest of v2 uses', () => {
    expect(gscCountryToAlpha2('usa')).toBe('US')
    expect(gscCountryToAlpha2('deu')).toBe('DE')
    expect(gscCountryToAlpha2('ukr')).toBe('UA')
  })

  it('passes through anything it cannot map rather than dropping the row', () => {
    expect(gscCountryToAlpha2('zzz')).toBe('ZZZ')
    expect(gscCountryToAlpha2('')).toBe('')
  })
})

describe('mapSeoBreakdownRows', () => {
  it("reads getKeywords' `count` as clicks", () => {
    expect(
      mapSeoBreakdownRows(
        'query',
        [
          {
            name: 'swetrix',
            count: 12,
            impressions: 400,
            ctr: 3,
            position: 4.2,
          },
        ],
        ['clicks', 'impressions', 'ctr', 'position'],
      ),
    ).toEqual([
      { value: 'swetrix', clicks: 12, impressions: 400, ctr: 3, position: 4.2 },
    ])
  })

  it('reads the label field each per-dimension getter returns', () => {
    expect(
      mapSeoBreakdownRows('page', [{ page: '/blog', clicks: 5 }], ['clicks']),
    ).toEqual([{ value: '/blog', clicks: 5 }])

    expect(
      mapSeoBreakdownRows(
        'device',
        [{ device: 'mobile', clicks: 3 }],
        ['clicks'],
      ),
    ).toEqual([{ value: 'mobile', clicks: 3 }])
  })

  it('normalises country rows to alpha-2', () => {
    expect(
      mapSeoBreakdownRows(
        'country',
        [{ country: 'usa', clicks: 9 }],
        ['clicks'],
      ),
    ).toEqual([{ value: 'US', clicks: 9 }])
  })

  it('only emits the requested metrics', () => {
    expect(
      mapSeoBreakdownRows(
        'query',
        [{ name: 'a', count: 1, impressions: 2, ctr: 50, position: 1 }],
        ['clicks'],
      ),
    ).toEqual([{ value: 'a', clicks: 1 }])
  })

  it('defaults missing values to zero rather than emitting NaN', () => {
    expect(
      mapSeoBreakdownRows('query', [{ name: 'a' }], ['clicks', 'position']),
    ).toEqual([{ value: 'a', clicks: 0, position: 0 }])
  })
})

describe('mapSeoSummary', () => {
  it('reports the absolute change between periods, matching the other v2 summaries', () => {
    expect(
      mapSeoSummary(
        { clicks: 120, impressions: 3000, ctr: 4, position: 8.1 },
        { clicks: 100, impressions: 2500, ctr: 4.5, position: 9.4 },
      ),
    ).toEqual({
      current: { clicks: 120, impressions: 3000, ctr: 4, position: 8.1 },
      previous: { clicks: 100, impressions: 2500, ctr: 4.5, position: 9.4 },
      change: { clicks: 20, impressions: 500, ctr: -0.5, position: -1.3 },
    })
  })

  it('treats a missing previous period as zeroes', () => {
    const summary = mapSeoSummary(
      { clicks: 10, impressions: 100, ctr: 10, position: 2 },
      null,
    )

    expect(summary.previous).toEqual({
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
    })
    expect(summary.change.clicks).toBe(10)
  })
})

describe('bucketSeoDateSeries', () => {
  const series = [
    day('2026-01-05', 10, 100, 10),
    day('2026-01-20', 30, 300, 2),
    day('2026-02-10', 5, 50, 4),
  ]

  it('leaves the native hour and day granularity untouched', () => {
    expect(bucketSeoDateSeries(series, TimeBucketType.DAY)).toBe(series)
    expect(bucketSeoDateSeries(series, TimeBucketType.HOUR)).toBe(series)
  })

  it('sums clicks and impressions into month buckets', () => {
    const [january, february] = bucketSeoDateSeries(
      series,
      TimeBucketType.MONTH,
    )

    expect(january.date).toBe('2026-01-01')
    expect(january.clicks).toBe(40)
    expect(january.impressions).toBe(400)
    expect(february.date).toBe('2026-02-01')
    expect(february.clicks).toBe(5)
  })

  it('recomputes ctr from the bucket totals rather than averaging it', () => {
    const [january] = bucketSeoDateSeries(series, TimeBucketType.MONTH)
    // 40 clicks / 400 impressions, not the mean of the two daily CTRs.
    expect(january.ctr).toBe(10)
  })

  it('averages position weighted by impressions', () => {
    const [january] = bucketSeoDateSeries(series, TimeBucketType.MONTH)
    // (10*100 + 2*300) / 400 = 4, whereas a plain mean would give 6.
    expect(january.position).toBe(4)
  })

  it('rolls a whole year up into one bucket', () => {
    const yearly = bucketSeoDateSeries(series, TimeBucketType.YEAR)

    expect(yearly).toHaveLength(1)
    expect(yearly[0].date).toBe('2026-01-01')
    expect(yearly[0].clicks).toBe(45)
  })

  it('reports zeroed rates for a bucket with no impressions', () => {
    const [bucket] = bucketSeoDateSeries(
      [day('2026-01-05', 0, 0, 0)],
      TimeBucketType.MONTH,
    )

    expect(bucket.ctr).toBe(0)
    expect(bucket.position).toBe(0)
  })
})

describe('mapSeoTimeseries', () => {
  it('emits ISO timestamps in the requested timezone', () => {
    const [row] = mapSeoTimeseries(
      [day('2026-01-05', 10, 100, 3)],
      ['clicks'],
      'Europe/Kyiv',
    )

    expect(row.timestamp).toBe('2026-01-05T00:00:00+02:00')
    expect(row.clicks).toBe(10)
  })

  it('only emits the requested metrics', () => {
    const [row] = mapSeoTimeseries(
      [day('2026-01-05', 10, 100, 3)],
      ['clicks', 'position'],
      'UTC',
    )

    expect(Object.keys(row).sort()).toEqual(['clicks', 'position', 'timestamp'])
  })

  it('drops rows Search Console returned without a date', () => {
    expect(mapSeoTimeseries([day('', 1, 1, 1)], ['clicks'], 'UTC')).toEqual([])
  })
})

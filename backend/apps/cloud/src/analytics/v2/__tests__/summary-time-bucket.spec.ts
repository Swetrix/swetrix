import {
  AnalyticsService,
  getLowestPossibleTimeBucket,
  getSummaryTimeBucket,
} from '../../analytics.service'
import { TimeBucketType } from '../../dto/getData.dto'

// getGroupFromTo does not touch `this`, so it can be exercised without
// instantiating the service and its DI graph
const getGroupFromTo = AnalyticsService.prototype.getGroupFromTo.bind(
  null as unknown as AnalyticsService,
)

// Mirrors how getAnalyticsSummary computes the summary window: the resolved
// bucket is fed to getGroupFromTo with no from/to, no diff and no timebucket
// validation
const getSummaryWindow = (period: string, timezone: string) => {
  const bucket = getSummaryTimeBucket(undefined, period, undefined, undefined)

  return {
    bucket,
    ...getGroupFromTo(
      undefined as unknown as string,
      undefined as unknown as string,
      bucket,
      period,
      timezone,
      undefined,
      false,
    ),
  }
}

describe('traffic summary window (no explicit timeBucket)', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-08-23T14:37:42Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('period=1h starts one hour ago on a minute boundary, not at midnight', () => {
    const { bucket, groupFrom, groupFromUTC, groupTo } = getSummaryWindow(
      '1h',
      'Etc/GMT',
    )

    expect(bucket).toBe(TimeBucketType.MINUTE)
    expect(groupFrom).toBe('2026-08-23 13:37:00')
    expect(groupFromUTC).toBe('2026-08-23 13:37:00')
    expect(groupTo).toBe('2026-08-23 14:37:42')
  })

  it('period=1d starts one day ago on an hour boundary, not at midnight', () => {
    const { bucket, groupFrom, groupFromUTC } = getSummaryWindow(
      '1d',
      'Etc/GMT',
    )

    expect(bucket).toBe(TimeBucketType.HOUR)
    expect(groupFrom).toBe('2026-08-22 14:00:00')
    expect(groupFromUTC).toBe('2026-08-22 14:00:00')
  })

  it('period=1d keeps the local hour boundary when converted to UTC for non-whole-hour offsets', () => {
    // Asia/Kathmandu is UTC+05:45: the local 20:00 boundary is 14:15 UTC and
    // must not be rounded again to 14:00 after the conversion
    const { bucket, groupFrom, groupFromUTC, groupToUTC } = getSummaryWindow(
      '1d',
      'Asia/Kathmandu',
    )

    expect(bucket).toBe(TimeBucketType.HOUR)
    expect(groupFrom).toBe('2026-08-22 20:00:00')
    expect(groupFromUTC).toBe('2026-08-22 14:15:00')
    expect(groupToUTC).toBe('2026-08-23 14:37:42')
  })

  it('period=7d starts seven days ago on an hour boundary', () => {
    const { bucket, groupFrom, groupFromUTC } = getSummaryWindow(
      '7d',
      'Etc/GMT',
    )

    expect(bucket).toBe(TimeBucketType.HOUR)
    expect(groupFrom).toBe('2026-08-16 14:00:00')
    expect(groupFromUTC).toBe('2026-08-16 14:00:00')
  })

  it('period=4w starts four weeks ago on a day boundary', () => {
    const { bucket, groupFrom, groupFromUTC } = getSummaryWindow(
      '4w',
      'Etc/GMT',
    )

    expect(bucket).toBe(TimeBucketType.DAY)
    expect(groupFrom).toBe('2026-07-26 00:00:00')
    expect(groupFromUTC).toBe('2026-07-26 00:00:00')
  })

  it('period=3M starts three months ago on a day boundary, not a month boundary', () => {
    const { bucket, groupFrom, groupFromUTC } = getSummaryWindow(
      '3M',
      'Etc/GMT',
    )

    expect(bucket).toBe(TimeBucketType.DAY)
    expect(groupFrom).toBe('2026-05-23 00:00:00')
    expect(groupFromUTC).toBe('2026-05-23 00:00:00')
  })

  it('period=12M starts twelve months ago on a day boundary', () => {
    const { bucket, groupFrom, groupFromUTC } = getSummaryWindow(
      '12M',
      'Etc/GMT',
    )

    expect(bucket).toBe(TimeBucketType.DAY)
    expect(groupFrom).toBe('2025-08-23 00:00:00')
    expect(groupFromUTC).toBe('2025-08-23 00:00:00')
  })

  it('period=24M starts on the month boundary twenty-four months back', () => {
    const { bucket, groupFrom, groupFromUTC } = getSummaryWindow(
      '24M',
      'Etc/GMT',
    )

    expect(bucket).toBe(TimeBucketType.MONTH)
    expect(groupFrom).toBe('2024-08-01 00:00:00')
    expect(groupFromUTC).toBe('2024-08-01 00:00:00')
  })

  it('period=today still starts at midnight', () => {
    const { bucket, groupFrom, groupFromUTC } = getSummaryWindow(
      'today',
      'Etc/GMT',
    )

    expect(bucket).toBe(TimeBucketType.HOUR)
    expect(groupFrom).toBe('2026-08-23 00:00:00')
    expect(groupFromUTC).toBe('2026-08-23 00:00:00')
  })

  it('an explicitly requested timeBucket takes precedence', () => {
    expect(getSummaryTimeBucket('day', '1h', undefined, undefined)).toBe(
      TimeBucketType.DAY,
    )
  })

  it('3M and 12M resolve to a day bucket in both resolvers, keeping cards and chart aligned', () => {
    for (const period of ['3M', '12M']) {
      expect(getLowestPossibleTimeBucket(period)).toBe(TimeBucketType.DAY)
      expect(
        getSummaryTimeBucket(undefined, period, undefined, undefined),
      ).toBe(TimeBucketType.DAY)
    }
  })

  it('partial and invalid custom ranges keep the legacy fallback and are left to getGroupFromTo to validate', () => {
    // Ranges must not be interpreted by getLowestPossibleTimeBucket: its NaN
    // diff would throw a misleading range-length error before getGroupFromTo
    // returns the correct validation error
    expect(
      getSummaryTimeBucket(undefined, undefined, '2026-08-20', undefined),
    ).toBe(TimeBucketType.DAY)
    expect(
      getSummaryTimeBucket(undefined, 'custom', 'not-a-date', '2026-08-23'),
    ).toBe(TimeBucketType.HOUR)

    expect(() =>
      getGroupFromTo(
        'not-a-date',
        '2026-08-23',
        getSummaryTimeBucket(undefined, 'custom', 'not-a-date', '2026-08-23'),
        'custom',
        'Etc/GMT',
        undefined,
        false,
      ),
    ).toThrow("The timeframe 'from' parameter is invalid")
  })
})

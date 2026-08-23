import { AnalyticsService, getSummaryTimeBucket } from '../../analytics.service'
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
})

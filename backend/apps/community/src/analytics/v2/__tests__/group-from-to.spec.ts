import { AnalyticsService } from '../../analytics.service'
import { TimeBucketType } from '../../dto/getData.dto'

// getGroupFromTo does not touch `this`, so it can be exercised without
// instantiating the service and its DI graph
const getGroupFromTo = AnalyticsService.prototype.getGroupFromTo.bind(
  null as unknown as AnalyticsService,
)

describe('getGroupFromTo (custom from/to ranges)', () => {
  it('keeps exact bounds for full timestamps — a single local day picked in a non-UTC timezone must not widen to whole UTC days', () => {
    // Europe/Rome user picks July 15 as a single day; the dashboard sends
    // the local day boundaries as UTC ISO timestamps
    const result = getGroupFromTo(
      '2026-07-14T22:00:00.000Z',
      '2026-07-15T21:59:59.999Z',
      TimeBucketType.DAY,
      undefined as unknown as string,
      'Europe/Rome',
      undefined,
      false,
    )

    expect(result.groupFromUTC).toBe('2026-07-14 22:00:00')
    expect(result.groupToUTC).toBe('2026-07-15 21:59:59')
  })

  it('keeps exact bounds for full timestamps with an hour bucket', () => {
    const result = getGroupFromTo(
      '2026-07-14T22:00:00.000Z',
      '2026-07-15T21:59:59.999Z',
      TimeBucketType.HOUR,
      undefined as unknown as string,
      'Europe/Rome',
      undefined,
      false,
    )

    expect(result.groupFromUTC).toBe('2026-07-14 22:00:00')
    expect(result.groupToUTC).toBe('2026-07-15 21:59:59')
  })

  it('expands date-only ranges to whole buckets', () => {
    const result = getGroupFromTo(
      '2026-07-10',
      '2026-07-12',
      TimeBucketType.DAY,
      undefined as unknown as string,
      'Europe/Rome',
      undefined,
      false,
    )

    expect(result.groupFromUTC).toBe('2026-07-10 00:00:00')
    expect(result.groupToUTC).toBe('2026-07-12 23:59:59')
  })

  it('expands an identical date-only from/to pair to a full day in the given timezone', () => {
    const result = getGroupFromTo(
      '2026-07-12',
      '2026-07-12',
      TimeBucketType.HOUR,
      undefined as unknown as string,
      'Europe/Rome',
      undefined,
      false,
    )

    // Rome is UTC+2 in July
    expect(result.groupFromUTC).toBe('2026-07-11 22:00:00')
    expect(result.groupToUTC).toBe('2026-07-12 21:59:59')
  })
})

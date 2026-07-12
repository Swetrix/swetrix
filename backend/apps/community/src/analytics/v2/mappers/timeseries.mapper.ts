import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import dayjsTimezone from 'dayjs/plugin/timezone'

import { DEFAULT_TIMEZONE } from '../../../user/entities/user.entity'

dayjs.extend(utc)
dayjs.extend(dayjsTimezone)

export type TimeseriesRow = { timestamp: string } & Record<
  string,
  string | number | null
>

/**
 * Convert a v1 timezone-shifted x-axis label (e.g. '2026-07-01',
 * '2026-07-01 13:00:00', '2026-07') into an ISO-8601 timestamp carrying the
 * requested timezone's UTC offset.
 */
export const toIsoTimestamp = (value: string, timezone: string): string => {
  const zone = timezone || DEFAULT_TIMEZONE

  return dayjs.tz(value, zone).format()
}

/**
 * Zip v1's columnar chart output ({ x: [...], seriesA: [...], seriesB: [...] })
 * into self-describing rows of objects — the v2 timeseries format.
 *
 * `series` maps v2 metric names to v1 arrays; missing/undefined series are
 * skipped. Array values falling outside the x range are ignored.
 */
export const zipTimeseries = (
  x: string[],
  series: Record<string, (number | null)[] | undefined>,
  timezone: string,
): TimeseriesRow[] => {
  const names = Object.keys(series).filter((name) =>
    Array.isArray(series[name]),
  )

  return x.map((label, index) => {
    const row: TimeseriesRow = { timestamp: toIsoTimestamp(label, timezone) }

    for (const name of names) {
      const value = series[name][index]
      row[name] = typeof value === 'undefined' ? null : value
    }

    return row
  })
}

/**
 * Per-bucket bounce rate (%) from v1's raw bounces + uniques arrays,
 * mirroring v1's calculateBounceRate (bounces / uniques * 100).
 */
export const computeBounceRateSeries = (
  bounces: number[] | undefined,
  uniques: number[] | undefined,
): number[] | undefined => {
  if (!Array.isArray(bounces) || !Array.isArray(uniques)) {
    return undefined
  }

  return bounces.map((bounceCount, index) => {
    const uniqueCount = Number(uniques[index]) || 0

    if (uniqueCount <= 0) {
      return 0
    }

    return Math.round((Number(bounceCount) / uniqueCount) * 100 * 100) / 100
  })
}

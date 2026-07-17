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

export const toIsoTimestamp = (value: string, timezone: string): string => {
  const zone = timezone || DEFAULT_TIMEZONE

  return dayjs.tz(value, zone).format()
}

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

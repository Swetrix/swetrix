import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import quarterOfYear from 'dayjs/plugin/quarterOfYear'
import type { Filter } from '~/pages/Project/View/interfaces/traffic'

dayjs.extend(isoWeek)
dayjs.extend(quarterOfYear)

export const SEO_METRICS = {
  clicks: 'clicks',
  impressions: 'impressions',
  position: 'position',
  ctr: 'ctr',
} as const

export type SEOMetricKey = keyof typeof SEO_METRICS

export interface DateSeriesEntry {
  date: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

const getBucketKey = (date: string, bucket: string): string => {
  const d = dayjs(date)
  switch (bucket) {
    case 'hour':
    case 'day':
      return date
    case 'week':
      return d.startOf('isoWeek').format('YYYY-MM-DD')
    case 'month':
      return d.startOf('month').format('YYYY-MM-DD')
    case 'quarter':
      return d.startOf('quarter').format('YYYY-MM-DD')
    case 'year':
      return d.startOf('year').format('YYYY-MM-DD')
    default:
      return date
  }
}

export const aggregateDateSeries = (
  series: DateSeriesEntry[],
  bucket: string,
): DateSeriesEntry[] => {
  if (!series.length || bucket === 'day' || bucket === 'hour') return series

  const buckets = new Map<
    string,
    {
      clicks: number
      impressions: number
      weightedPosition: number
    }
  >()
  const orderedKeys: string[] = []

  for (const entry of series) {
    const key = getBucketKey(entry.date, bucket)
    const existing = buckets.get(key)
    if (existing) {
      existing.clicks += entry.clicks
      existing.impressions += entry.impressions
      existing.weightedPosition += entry.position * entry.impressions
    } else {
      orderedKeys.push(key)
      buckets.set(key, {
        clicks: entry.clicks,
        impressions: entry.impressions,
        weightedPosition: entry.position * entry.impressions,
      })
    }
  }

  return orderedKeys.map((key) => {
    const b = buckets.get(key)!
    return {
      date: key,
      clicks: b.clicks,
      impressions: b.impressions,
      ctr:
        b.impressions > 0
          ? Number(((b.clicks / b.impressions) * 100).toFixed(2))
          : 0,
      position:
        b.impressions > 0
          ? Number((b.weightedPosition / b.impressions).toFixed(1))
          : 0,
    }
  })
}

export const getGSCCompatibleFilters = (filters: Filter[]): Filter[] => {
  return filters.flatMap((filter) => {
    if (
      filter.column === 'pg' ||
      filter.column === 'keywords' ||
      filter.column === 'cc' ||
      filter.column === 'country' ||
      filter.column === 'dv' ||
      filter.column === 'device'
    ) {
      return [filter]
    }

    return []
  })
}

import { TimeseriesRow } from '~/api/v2/types'

export const SEO_METRICS = {
  clicks: 'clicks',
  impressions: 'impressions',
  position: 'position',
  ctr: 'ctr',
} as const

export type SEOMetricKey = keyof typeof SEO_METRICS

export const SEO_IMPRESSION_POSITION_BUCKETS = [
  { key: 'pos1To3', label: '1-3', color: '#134e4a' },
  { key: 'pos4To10', label: '4-10', color: '#0f766e' },
  { key: 'pos11To20', label: '11-20', color: '#14b8a6' },
  { key: 'pos21Plus', label: '21+', color: '#99d9d4' },
] as const

export const SEO_ORGANIC_POSITION_BUCKETS = [
  { key: 'pos1To3', label: '1-3', color: '#b45309' },
  { key: 'pos4To10', label: '4-10', color: '#f97316' },
  { key: 'pos11To20', label: '11-20', color: '#fb923c' },
  { key: 'pos21To50', label: '21-50', color: '#cbd5e1' },
  { key: 'pos51Plus', label: '51+', color: '#e2e8f0' },
] as const

type SEOImpressionPositionBucketKey =
  (typeof SEO_IMPRESSION_POSITION_BUCKETS)[number]['key']
type SEOOrganicPositionBucketKey =
  (typeof SEO_ORGANIC_POSITION_BUCKETS)[number]['key']

export interface ImpressionsByPositionEntry {
  key: SEOImpressionPositionBucketKey
  label: string
  impressions: number
  percentage: number
}

export type OrganicPositionEntry = { date: string } & Record<
  SEOOrganicPositionBucketKey,
  number
>

export interface DateSeriesEntry {
  date: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

/**
 * The v2 SEO timeseries is already bucketed server-side; this only reshapes its
 * ISO timestamps into the plain date strings the chart builders plot on the x
 * axis.
 */
export const seoTimeseriesToDateSeries = (
  rows: TimeseriesRow[] | undefined,
  timeBucket: string,
): DateSeriesEntry[] =>
  (rows ?? []).map((row) => ({
    date:
      timeBucket === 'hour'
        ? row.timestamp.slice(0, 19).replace('T', ' ')
        : row.timestamp.slice(0, 10),
    clicks: Number(row.clicks ?? 0),
    impressions: Number(row.impressions ?? 0),
    ctr: Number(row.ctr ?? 0),
    position: Number(row.position ?? 0),
  }))

export const hasOrganicPositionData = (
  series: OrganicPositionEntry[],
): boolean =>
  series.some((entry) =>
    SEO_ORGANIC_POSITION_BUCKETS.some(({ key }) => (entry[key] ?? 0) > 0),
  )

import countries from 'i18n-iso-countries'
import dayjs from 'dayjs'

import { TimeBucketType } from '../../dto/getData.dto'
import { V2SeoGscDimension } from '../registry/seo'
import { toIsoTimestamp, TimeseriesRow } from './timeseries.mapper'

export interface SeoMetricValues {
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export type SeoDateSeriesEntry = { date: string } & SeoMetricValues

export interface SeoSummaryData {
  current: SeoMetricValues
  previous: SeoMetricValues
  change: SeoMetricValues
}

const round = (value: unknown, precision: number): number => {
  const number = Number(value)

  if (!Number.isFinite(number)) {
    return 0
  }

  const factor = 10 ** precision

  return Math.round(number * factor) / factor
}

const toInteger = (value: unknown): number => Math.round(Number(value) || 0)

/**
 * Search Console reports countries as lowercase ISO 3166-1 alpha-3, while the
 * rest of the v2 surface (and the `cc` column behind the traffic `country`
 * dimension) uses uppercase alpha-2. Normalise so a `country` value means the
 * same thing whichever data type produced it.
 */
export const gscCountryToAlpha2 = (country: string): string => {
  const alpha2 = countries.alpha3ToAlpha2(String(country || '').toUpperCase())

  return alpha2 || String(country || '').toUpperCase()
}

const EMPTY_METRICS: SeoMetricValues = {
  clicks: 0,
  impressions: 0,
  ctr: 0,
  position: 0,
}

const mapSeoMetricValues = (
  values: Partial<SeoMetricValues> | null | undefined,
): SeoMetricValues => ({
  clicks: toInteger(values?.clicks),
  impressions: toInteger(values?.impressions),
  ctr: round(values?.ctr, 2),
  position: round(values?.position, 2),
})

export const mapSeoSummary = (
  current: Partial<SeoMetricValues> | null | undefined,
  previous: Partial<SeoMetricValues> | null | undefined,
): SeoSummaryData => {
  const mappedCurrent = mapSeoMetricValues(current)
  const mappedPrevious = previous ? mapSeoMetricValues(previous) : EMPTY_METRICS

  return {
    current: mappedCurrent,
    previous: mappedPrevious,
    change: {
      clicks: mappedCurrent.clicks - mappedPrevious.clicks,
      impressions: mappedCurrent.impressions - mappedPrevious.impressions,
      ctr: round(mappedCurrent.ctr - mappedPrevious.ctr, 2),
      position: round(mappedCurrent.position - mappedPrevious.position, 2),
    },
  }
}

/**
 * A raw row as returned by one of the GSCService per-dimension getters. They
 * disagree on the label field, and getKeywords calls its click count `count`.
 */
export interface GscBreakdownRow extends Partial<SeoMetricValues> {
  name?: string
  page?: string
  country?: string
  device?: string
  count?: number
}

const readRowValue = (
  dimension: V2SeoGscDimension,
  row: GscBreakdownRow,
): string => {
  if (dimension === 'query') return row.name ?? ''
  if (dimension === 'page') return row.page ?? ''
  if (dimension === 'country') return gscCountryToAlpha2(row.country ?? '')

  return row.device ?? ''
}

export const mapSeoBreakdownRows = (
  dimension: V2SeoGscDimension,
  rows: GscBreakdownRow[],
  metrics: string[],
): Record<string, unknown>[] =>
  rows.map((row) => {
    const values = mapSeoMetricValues({
      clicks: row.clicks ?? row.count,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    })

    const mapped: Record<string, unknown> = {
      value: readRowValue(dimension, row),
    }

    for (const metric of metrics) {
      mapped[metric] = values[metric as keyof SeoMetricValues]
    }

    return mapped
  })

const startOfBucket = (date: string, bucket: TimeBucketType): string => {
  const parsed = dayjs(date)

  if (bucket === TimeBucketType.MONTH) {
    return parsed.startOf('month').format('YYYY-MM-DD')
  }

  if (bucket === TimeBucketType.YEAR) {
    return parsed.startOf('year').format('YYYY-MM-DD')
  }

  return date
}

/**
 * Search Console only serves hourly and daily rows, so wider buckets are rolled
 * up here. Clicks and impressions sum; ctr is recomputed from the totals and
 * position is averaged weighted by impressions, since neither is additive.
 */
export const bucketSeoDateSeries = (
  series: SeoDateSeriesEntry[],
  bucket: TimeBucketType,
): SeoDateSeriesEntry[] => {
  if (bucket !== TimeBucketType.MONTH && bucket !== TimeBucketType.YEAR) {
    return series
  }

  const buckets = new Map<
    string,
    { clicks: number; impressions: number; weightedPosition: number }
  >()
  const orderedKeys: string[] = []

  for (const entry of series) {
    if (!entry.date) continue

    const key = startOfBucket(entry.date, bucket)
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
    const entry = buckets.get(key)

    return {
      date: key,
      clicks: Math.round(entry.clicks),
      impressions: Math.round(entry.impressions),
      ctr:
        entry.impressions > 0
          ? round((entry.clicks / entry.impressions) * 100, 2)
          : 0,
      position:
        entry.impressions > 0
          ? round(entry.weightedPosition / entry.impressions, 2)
          : 0,
    }
  })
}

export const mapSeoTimeseries = (
  series: SeoDateSeriesEntry[],
  metrics: string[],
  timezone: string,
): TimeseriesRow[] =>
  series
    .filter((entry) => Boolean(entry.date))
    .map((entry) => {
      const values = mapSeoMetricValues(entry)
      const row: TimeseriesRow = {
        timestamp: toIsoTimestamp(entry.date, timezone),
      }

      for (const metric of metrics) {
        row[metric] = values[metric as keyof SeoMetricValues]
      }

      return row
    })

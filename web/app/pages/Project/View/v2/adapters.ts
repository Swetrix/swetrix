import {
  BreakdownRow,
  MetadataRow,
  TimeseriesRow,
  TrafficSummaryData,
  V2Filter,
} from '~/api/v2/types'
import { Entry } from '~/lib/models/Entry'
import { OverallObject } from '~/lib/models/Project'

export const mapBreakdownRows = (
  rows: BreakdownRow[] | undefined,
  primaryMetric = 'visitors',
  // Metrics beyond the primary one are copied onto the entry so panels can show
  // them in extra columns or row tooltips (the SEO panels lean on this).
  extraMetrics?: string[],
): Entry[] => {
  if (!rows) return []

  return rows.map((row) => ({
    name: row.value,
    count: Number(row[primaryMetric] ?? 0),
    ...(typeof row.country === 'string' ? { cc: row.country } : {}),
    ...(typeof row.region_code === 'string' ? { rgc: row.region_code } : {}),
    ...Object.fromEntries(
      (extraMetrics ?? [])
        .filter((metric) => metric !== primaryMetric)
        .map((metric) => [metric, Number(row[metric] ?? 0)]),
    ),
  }))
}

export const groupVersionRows = (
  rows: BreakdownRow[] | undefined,
  parentField: 'browser' | 'os',
  primaryMetric = 'visitors',
): Record<string, Entry[]> => {
  const grouped: Record<string, Entry[]> = {}

  for (const row of rows || []) {
    const parent = row[parentField]
    if (typeof parent !== 'string' || !parent) continue

    if (!grouped[parent]) {
      grouped[parent] = []
    }

    grouped[parent].push({
      name: row.value,
      count: Number(row[primaryMetric] ?? 0),
    })
  }

  return grouped
}

export const metadataToResult = (rows: MetadataRow[] | undefined) => ({
  result: rows || [],
})

export const hasCustomEventFilter = (filters: V2Filter[]): boolean =>
  filters.some(
    (filter) =>
      filter.dimension === 'event' || filter.dimension === 'event_metadata',
  )

export const summaryToOverall = (
  summary: TrafficSummaryData | undefined,
  customEVFilterApplied = false,
): Partial<OverallObject> => {
  if (!summary) return {}

  const mapPeriod = (period: TrafficSummaryData['current']) => ({
    unique: period.visitors,
    all: period.pageviews,
    users: period.users,
    bounceRate: period.bounce_rate,
    sdur: period.session_duration,
  })

  return {
    current: mapPeriod(summary.current),
    previous: mapPeriod(summary.previous),
    change: summary.change.pageviews,
    uniqueChange: summary.change.visitors,
    usersChange: summary.change.users,
    bounceRateChange: summary.change.bounce_rate,
    sdurChange: summary.change.session_duration,
    customEVFilterApplied,
  }
}

const toChartX = (timestamp: string): string =>
  timestamp.slice(0, 19).replace('T', ' ')

export interface TrafficChartData {
  x: string[]
  visits: number[]
  uniques: number[]
  sdur: number[]
  bounces: number[]
  concurrency: number[]
  [key: string]: number[] | string[]
}

export const pivotTrafficTimeseries = (
  rows: TimeseriesRow[] | undefined,
): TrafficChartData => {
  const x: string[] = []
  const visits: number[] = []
  const uniques: number[] = []
  const sdur: number[] = []
  const bounces: number[] = []
  const concurrency: number[] = []

  for (const row of rows || []) {
    const rowUniques = Number(row.visitors ?? 0)
    x.push(toChartX(row.timestamp))
    uniques.push(rowUniques)
    visits.push(Number(row.pageviews ?? 0))
    sdur.push(Number(row.session_duration ?? 0))
    bounces.push((Number(row.bounce_rate ?? 0) * rowUniques) / 100)
    concurrency.push(Number(row.concurrency ?? 0))
  }

  return { x, visits, uniques, sdur, bounces, concurrency }
}

export const pivotCustomEventsTimeseries = (
  rows: TimeseriesRow[] | undefined,
  events: string[],
): { x: string[]; events: Record<string, number[]> } => {
  const x: string[] = []
  const series: Record<string, number[]> = Object.fromEntries(
    events.map((event) => [event, []]),
  )

  for (const row of rows || []) {
    x.push(toChartX(row.timestamp))
    for (const event of events) {
      series[event].push(Number(row[event] ?? 0))
    }
  }

  return { x, events: series }
}

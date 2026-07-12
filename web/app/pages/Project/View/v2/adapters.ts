import {
  BreakdownRow,
  MetadataRow,
  TimeseriesRow,
  TrafficSummaryData,
  V2Filter,
} from '~/api/v2/types'
import { Entry } from '~/lib/models/Entry'
import { OverallObject } from '~/lib/models/Project'

// Adapters that pivot v2 API responses into the shapes the existing UI
// components (Panel, DetailsTable, InteractiveMap, billboard chart pipeline)
// already consume, so those components stay untouched.

/** Breakdown rows -> Panel entries ({ value, <metric> } -> { name, count }) */
export const mapBreakdownRows = (
  rows: BreakdownRow[] | undefined,
  primaryMetric = 'visitors',
): Entry[] => {
  if (!rows) return []

  return rows.map((row) => ({
    name: row.value,
    count: Number(row[primaryMetric] ?? 0),
    ...(typeof row.country === 'string' ? { cc: row.country } : {}),
    ...(typeof row.region_code === 'string' ? { rgc: row.region_code } : {}),
  }))
}

/**
 * Version breakdown rows (browser_version / os_version, which carry their
 * parent as an extra field) -> { parent: Entry[] } map for Panel drill-down.
 */
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

/** Metadata rows -> the { result } shape KVTableContainer consumes */
export const metadataToResult = (rows: MetadataRow[] | undefined) => ({
  result: rows || [],
})

/** True when a custom-event filter is applied (metric cards collapse to Events) */
export const hasCustomEventFilter = (filters: V2Filter[]): boolean =>
  filters.some(
    (filter) =>
      filter.dimension === 'event' || filter.dimension === 'event_metadata',
  )

/** v2 traffic summary -> the OverallObject shape MetricCards consumes */
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

/**
 * v2 ISO timestamp -> the 'YYYY-MM-DD HH:mm:ss' wall-time string the chart
 * pipeline expects. The timestamp is already in the requested timezone, so we
 * take its literal date-time part instead of letting Date/dayjs re-shift it
 * into the browser timezone.
 */
const toChartX = (timestamp: string): string =>
  timestamp.slice(0, 19).replace('T', ' ')

export interface TrafficChartData {
  x: string[]
  visits: number[]
  uniques: number[]
  sdur: number[]
  bounces: number[]
  [key: string]: number[] | string[]
}

/**
 * Traffic timeseries rows -> the columnar chart shape getColumns()/getSettings()
 * consume. `bounces` is reconstructed as a count because getColumns computes
 * the percentage from bounces/uniques.
 */
export const pivotTrafficTimeseries = (
  rows: TimeseriesRow[] | undefined,
): TrafficChartData => {
  const x: string[] = []
  const visits: number[] = []
  const uniques: number[] = []
  const sdur: number[] = []
  const bounces: number[] = []

  for (const row of rows || []) {
    const rowUniques = Number(row.visitors ?? 0)
    x.push(toChartX(row.timestamp))
    uniques.push(rowUniques)
    visits.push(Number(row.pageviews ?? 0))
    sdur.push(Number(row.session_duration ?? 0))
    bounces.push((Number(row.bounce_rate ?? 0) * rowUniques) / 100)
  }

  return { x, visits, uniques, sdur, bounces }
}

/** Custom events timeseries rows -> { x, events } for the stacked chart */
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

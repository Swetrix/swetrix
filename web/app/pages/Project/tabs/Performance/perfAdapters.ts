import { PerformanceSummaryData, TimeseriesRow } from '~/api/v2/types'
import { OverallPerformanceObject } from '~/lib/models/Project'

// Adapters that pivot v2 performance API responses into the shapes the
// existing UI components (PerformanceMetricCards, getColumnsPerf chart
// pipeline) already consume, so those components stay untouched.

/** v2 performance summary -> the shape PerformanceMetricCards consumes */
export const perfSummaryToOverall = (
  summary: PerformanceSummaryData | undefined,
): Partial<OverallPerformanceObject> => {
  if (!summary) return {}

  return {
    current: summary.current,
    previous: summary.previous,
    frontendChange: summary.change.frontend,
    backendChange: summary.change.backend,
    networkChange: summary.change.network,
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

/**
 * Performance timeseries rows -> the columnar shape getColumnsPerf() consumes:
 * { x, dns, tls, conn, response, render, domLoad, ttfb } (note the key renames
 * connection -> conn, dom_load -> domLoad), or { x, p50, p75, p95 } when
 * measure === 'quantiles'. The chart pipeline is typed Record<string, string[]>
 * but has always carried numbers at runtime (v1 did the same), hence the cast.
 */
export const pivotPerformanceTimeseries = (
  rows: TimeseriesRow[] | undefined,
  measure: string,
): Record<string, string[]> => {
  const x: string[] = []

  if (measure === 'quantiles') {
    const p50: number[] = []
    const p75: number[] = []
    const p95: number[] = []

    for (const row of rows || []) {
      x.push(toChartX(row.timestamp))
      p50.push(Number(row.p50 ?? 0))
      p75.push(Number(row.p75 ?? 0))
      p95.push(Number(row.p95 ?? 0))
    }

    return { x, p50, p75, p95 } as unknown as Record<string, string[]>
  }

  const dns: number[] = []
  const tls: number[] = []
  const conn: number[] = []
  const response: number[] = []
  const render: number[] = []
  const domLoad: number[] = []
  const ttfb: number[] = []

  for (const row of rows || []) {
    x.push(toChartX(row.timestamp))
    dns.push(Number(row.dns ?? 0))
    tls.push(Number(row.tls ?? 0))
    conn.push(Number(row.connection ?? 0))
    response.push(Number(row.response ?? 0))
    render.push(Number(row.render ?? 0))
    domLoad.push(Number(row.dom_load ?? 0))
    ttfb.push(Number(row.ttfb ?? 0))
  }

  return {
    x,
    dns,
    tls,
    conn,
    response,
    render,
    domLoad,
    ttfb,
  } as unknown as Record<string, string[]>
}

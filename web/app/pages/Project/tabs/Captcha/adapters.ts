import { TimeseriesRow } from '~/api/v2/types'

/**
 * v2 ISO timestamp -> the 'YYYY-MM-DD HH:mm:ss' wall-time string the chart
 * pipeline expects. The timestamp is already in the requested timezone, so we
 * take its literal date-time part instead of letting Date/dayjs re-shift it
 * into the browser timezone.
 */
const toChartX = (timestamp: string): string =>
  timestamp.slice(0, 19).replace('T', ' ')

export interface CaptchaChartData {
  x: string[]
  generated: number[]
  passed: number[]
  failed: number[]
  validationFailed: number[]
  replayed: number[]
}

/** Captcha timeseries rows -> the columnar shape getSettingsCaptcha consumes */
export const pivotCaptchaTimeseries = (
  rows: TimeseriesRow[] | undefined,
): CaptchaChartData => {
  const x: string[] = []
  const generated: number[] = []
  const passed: number[] = []
  const failed: number[] = []
  const validationFailed: number[] = []
  const replayed: number[] = []

  for (const row of rows || []) {
    x.push(toChartX(row.timestamp))
    generated.push(Number(row.generated ?? 0))
    passed.push(Number(row.passed ?? 0))
    failed.push(Number(row.failed ?? 0))
    validationFailed.push(Number(row.validation_failed ?? 0))
    replayed.push(Number(row.replayed ?? 0))
  }

  return { x, generated, passed, failed, validationFailed, replayed }
}

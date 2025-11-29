import { ChartOptions } from 'billboard.js'
import React, { useMemo } from 'react'

import { Annotation } from '~/lib/models/Project'

import { getSettingsPerf } from '../ViewProject.helpers'

import { MainChart } from './MainChart'

interface PerformanceChartProps {
  chart: Record<string, string[]>
  timeBucket: string
  activeChartMetrics: string
  rotateXAxis: boolean
  chartType: string
  timeFormat: string
  compareChart?: Record<string, string[]>
  onZoom?: (domain: [Date, Date] | null) => void
  enableZoom?: boolean
  dataNames: Record<string, string>
  className?: string
  annotations?: Annotation[]
}

export const PerformanceChart = ({
  chart,
  timeBucket,
  activeChartMetrics,
  rotateXAxis,
  chartType,
  timeFormat,
  compareChart,
  onZoom,
  enableZoom,
  dataNames,
  className,
  annotations,
}: PerformanceChartProps) => {
  const options: ChartOptions = useMemo(() => {
    return getSettingsPerf(
      chart,
      timeBucket,
      activeChartMetrics,
      rotateXAxis,
      chartType,
      timeFormat,
      compareChart,
      onZoom,
      enableZoom,
      annotations,
    )
  }, [
    chart,
    timeBucket,
    activeChartMetrics,
    rotateXAxis,
    chartType,
    timeFormat,
    compareChart,
    onZoom,
    enableZoom,
    annotations,
  ])

  const deps = useMemo(
    () => [
      chart,
      timeBucket,
      activeChartMetrics,
      rotateXAxis,
      chartType,
      timeFormat,
      compareChart,
      onZoom,
      enableZoom,
      annotations,
    ],
    [
      chart,
      timeBucket,
      activeChartMetrics,
      rotateXAxis,
      chartType,
      timeFormat,
      compareChart,
      onZoom,
      enableZoom,
      annotations,
    ],
  )

  return (
    <MainChart chartId='performance-chart' options={options} dataNames={dataNames} className={className} deps={deps} />
  )
}

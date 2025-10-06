import { ChartOptions } from 'billboard.js'
import React, { useMemo } from 'react'

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
    )
  }, [chart, timeBucket, activeChartMetrics, rotateXAxis, chartType, timeFormat, compareChart, onZoom, enableZoom])

  const deps = useMemo(
    () => [chart, timeBucket, activeChartMetrics, rotateXAxis, chartType, timeFormat, compareChart, onZoom, enableZoom],
    [chart, timeBucket, activeChartMetrics, rotateXAxis, chartType, timeFormat, compareChart, onZoom, enableZoom],
  )

  return (
    <MainChart chartId='performance-chart' options={options} dataNames={dataNames} className={className} deps={deps} />
  )
}

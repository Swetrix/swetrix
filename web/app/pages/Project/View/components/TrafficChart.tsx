import { ChartOptions } from 'billboard.js'
import React, { useMemo } from 'react'

import { getSettings } from '../ViewProject.helpers'

import { MainChart } from './MainChart'

interface TrafficChartProps {
  chartData: any
  timeBucket: string
  activeChartMetrics: Record<string, boolean>
  applyRegions: boolean
  timeFormat: string
  rotateXAxis: boolean
  chartType: string
  customEventsChartData?: Record<string, string[]>
  dataChartCompare?: any
  onZoom?: (domain: [Date, Date] | null) => void
  enableZoom?: boolean
  dataNames: Record<string, string>
  className?: string
}

export const TrafficChart = ({
  chartData,
  timeBucket,
  activeChartMetrics,
  applyRegions,
  timeFormat,
  rotateXAxis,
  chartType,
  customEventsChartData,
  dataChartCompare,
  onZoom,
  enableZoom,
  dataNames,
  className,
}: TrafficChartProps) => {
  const options: ChartOptions = useMemo(() => {
    return getSettings(
      chartData,
      timeBucket,
      activeChartMetrics,
      applyRegions,
      timeFormat,
      rotateXAxis,
      chartType,
      customEventsChartData,
      dataChartCompare,
      onZoom,
      enableZoom,
    )
  }, [
    chartData,
    timeBucket,
    activeChartMetrics,
    applyRegions,
    timeFormat,
    rotateXAxis,
    chartType,
    customEventsChartData,
    dataChartCompare,
    onZoom,
    enableZoom,
  ])

  const deps = useMemo(
    () => [
      chartData,
      timeBucket,
      activeChartMetrics,
      applyRegions,
      timeFormat,
      rotateXAxis,
      chartType,
      customEventsChartData,
      dataChartCompare,
      onZoom,
      enableZoom,
    ],
    [
      chartData,
      timeBucket,
      activeChartMetrics,
      applyRegions,
      timeFormat,
      rotateXAxis,
      chartType,
      customEventsChartData,
      dataChartCompare,
      onZoom,
      enableZoom,
    ],
  )

  return <MainChart chartId='traffic-chart' options={options} dataNames={dataNames} className={className} deps={deps} />
}

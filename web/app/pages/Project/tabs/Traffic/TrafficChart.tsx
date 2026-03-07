import { ChartOptions } from 'billboard.js'
import React, { useMemo } from 'react'

import { Annotation } from '~/lib/models/Project'

import { MainChart } from '../../View/components/MainChart'
import { getSettings } from '../../View/ViewProject.helpers'

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
  annotations?: Annotation[]
  period?: string
  timezone?: string
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
  annotations,
  period,
  timezone,
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
      annotations,
      period,
      timezone,
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
    annotations,
    period,
    timezone,
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
      annotations,
      period,
      timezone,
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
      annotations,
      period,
      timezone,
    ],
  )

  return (
    <MainChart
      chartId='traffic-chart'
      options={options}
      dataNames={dataNames}
      className={className}
      deps={deps}
    />
  )
}

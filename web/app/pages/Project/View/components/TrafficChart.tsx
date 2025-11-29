import { ChartOptions } from 'billboard.js'
import React, { useMemo } from 'react'

import { Annotation } from '~/lib/models/Project'

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
  annotations?: Annotation[]
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
    ],
  )

  return <MainChart chartId='traffic-chart' options={options} dataNames={dataNames} className={className} deps={deps} />
}

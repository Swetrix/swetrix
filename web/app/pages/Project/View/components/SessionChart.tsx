import { ChartOptions } from 'billboard.js'
import React, { useMemo } from 'react'

import { getSettingsSession } from '../ViewProject.helpers'

import { MainChart } from './MainChart'

interface SessionChartProps {
  chart?: {
    x: string[]
    pageviews?: number[]
    customEvents?: number[]
    errors?: number[]
  }
  timeBucket?: string
  timeFormat: string
  rotateXAxis: boolean
  chartType: string
  dataNames: any
  onZoom?: (domain: [Date, Date] | null) => void
  className?: string
}

export const SessionChart = ({
  chart,
  timeBucket,
  timeFormat,
  rotateXAxis,
  chartType,
  dataNames,
  onZoom,
  className,
}: SessionChartProps) => {
  const options: ChartOptions = useMemo(() => {
    return getSettingsSession(chart, timeBucket as string, timeFormat, rotateXAxis, chartType, onZoom)
  }, [chart, timeBucket, timeFormat, rotateXAxis, chartType, onZoom])

  const deps = useMemo(
    () => [chart, timeBucket, timeFormat, rotateXAxis, chartType, dataNames, onZoom],
    [chart, timeBucket, timeFormat, rotateXAxis, chartType, dataNames, onZoom],
  )

  return (
    <MainChart
      chartId='session-chart'
      options={options}
      dataNames={dataNames}
      className={className || 'mt-5 h-80 md:mt-0 [&_svg]:!overflow-visible'}
      deps={deps}
    />
  )
}

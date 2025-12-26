import { ChartOptions } from 'billboard.js'
import React, { useMemo } from 'react'

import { chartTypes } from '~/lib/constants'

import { MainChart } from '../../View/components/MainChart'
import { getSettingsSession } from '../../View/ViewProject.helpers'

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
  dataNames: any
  onZoom?: (domain: [Date, Date] | null) => void
  className?: string
}

export const SessionChart = ({
  chart,
  timeBucket,
  timeFormat,
  rotateXAxis,
  dataNames,
  onZoom,
  className,
}: SessionChartProps) => {
  const options: ChartOptions = useMemo(() => {
    // Session inspector chart is always rendered as a line/area chart,
    // regardless of the user's global chart type preference.
    return getSettingsSession(chart, timeBucket as string, timeFormat, rotateXAxis, chartTypes.line, onZoom)
  }, [chart, timeBucket, timeFormat, rotateXAxis, onZoom])

  const deps = useMemo(
    () => [chart, timeBucket, timeFormat, rotateXAxis, dataNames, onZoom],
    [chart, timeBucket, timeFormat, rotateXAxis, dataNames, onZoom],
  )

  return (
    <MainChart
      chartId='session-chart'
      options={options}
      dataNames={dataNames}
      className={className || 'mt-5 h-80 md:mt-0 [&_svg]:overflow-visible!'}
      deps={deps}
    />
  )
}

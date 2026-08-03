import { Chart, ChartOptions, GridLineOptions } from 'billboard.js'
import React, { useEffect, useRef, useMemo } from 'react'

import BillboardChart from '~/ui/BillboardChart'

import { useChartManager } from './ChartManager'

interface MainChartProps {
  chartId: string
  options: ChartOptions
  dataNames?: Record<string, string>
  className?: string
  deps?: any[]
  xGridLines?: GridLineOptions[]
}

export const MainChart = ({
  chartId,
  options,
  dataNames,
  className,
  deps,
  xGridLines,
}: MainChartProps) => {
  const { registerChart, unregisterChart } = useChartManager()
  const chartRef = useRef<Chart | null>(null)

  const mergedDeps = useMemo(
    () => deps || [options, dataNames],
    [deps, options, dataNames],
  )

  const handleChartReady = (chart: Chart | null) => {
    chartRef.current = chart
    registerChart(chartId, chart)

    if (chart && xGridLines) {
      chart.xgrids(xGridLines)
    }
  }

  useEffect(() => {
    if (!chartRef.current || !xGridLines) {
      return
    }

    chartRef.current.xgrids(xGridLines)
  }, [xGridLines])

  useEffect(() => {
    return () => {
      unregisterChart(chartId)
    }
  }, [chartId, unregisterChart])

  return (
    <BillboardChart
      options={options}
      dataNames={dataNames}
      className={className}
      onReady={handleChartReady}
      deps={mergedDeps}
    />
  )
}

import { Chart, ChartOptions, GridLineOptions } from 'billboard.js'
import React, { useEffect, useMemo } from 'react'

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

  const mergedDeps = useMemo(
    () => deps || [options, dataNames],
    [deps, options, dataNames],
  )

  const handleChartReady = (chart: Chart | null) => {
    registerChart(chartId, chart)
  }

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
      xGridLines={xGridLines}
    />
  )
}

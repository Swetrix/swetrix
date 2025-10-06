import { ChartOptions } from 'billboard.js'
import React, { useEffect, useRef, useMemo } from 'react'

import BillboardChart from '~/ui/BillboardChart'

import { useChartManager } from './ChartManager'

interface MainChartProps {
  chartId: string
  options: ChartOptions
  dataNames?: Record<string, string>
  className?: string
  deps?: any[]
}

export const MainChart = ({ chartId, options, dataNames, className, deps }: MainChartProps) => {
  const { registerChart, unregisterChart } = useChartManager()
  const chartRef = useRef<any>(null)

  const mergedDeps = useMemo(() => deps || [options, dataNames], [deps, options, dataNames])

  const handleChartReady = (chart: any) => {
    chartRef.current = chart
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
    />
  )
}

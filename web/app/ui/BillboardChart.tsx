import billboard, { type Chart, type ChartOptions } from 'billboard.js'
import React, { useEffect, useMemo, useRef } from 'react'

interface BillboardChartProps {
  options: ChartOptions
  dataNames?: Record<string, string>
  className?: string
  onReady?: (chart: Chart | null) => void
  deps?: any[]
}

const BillboardChart = ({
  options,
  dataNames,
  className,
  onReady,
  deps,
}: BillboardChartProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<Chart | null>(null)

  const mergedDeps = useMemo(
    () => deps || [options, dataNames],
    [deps, options, dataNames],
  )

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    if (chartRef.current) {
      try {
        chartRef.current.destroy()
      } catch {
        // ignore
      }
      chartRef.current = null
      if (onReady) onReady(null)
    }

    const opts: ChartOptions = {
      ...options,
      bindto: containerRef.current as unknown as HTMLElement,
    }
    const chart = billboard.generate(opts)
    chartRef.current = chart

    if (dataNames) {
      try {
        chart.data.names(dataNames)
      } catch {
        // ignore
      }
    }

    if (onReady) onReady(chart)

    return () => {
      if (!chartRef.current) return
      try {
        chartRef.current.destroy()
      } catch {
        // ignore
      }
      chartRef.current = null
      if (onReady) onReady(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, mergedDeps)

  return <div ref={containerRef} className={className} />
}

export default BillboardChart

import billboard, { type ChartOptions, type Chart } from 'billboard.js'
import { useEffect, useRef, useCallback, useMemo } from 'react'

import { getSettingsSession } from '../ViewProject.helpers'

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
  onChartReady?: (chart: Chart | null) => void
  zoomedTimeRange?: [Date, Date] | null
}

export const SessionChart = ({
  chart,
  timeBucket,
  timeFormat,
  rotateXAxis,
  chartType,
  dataNames,
  onZoom,
  onChartReady,
  zoomedTimeRange,
}: SessionChartProps) => {
  const chartRef = useRef<Chart | null>(null)

  const [from, to] = useMemo(() => {
    if (!zoomedTimeRange?.[0] || !zoomedTimeRange?.[1]) {
      return [null, null]
    }

    return [zoomedTimeRange[0], zoomedTimeRange[1]]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // eslint-disable-next-line react-hooks/exhaustive-deps
    zoomedTimeRange?.[0]?.getTime(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    zoomedTimeRange?.[1]?.getTime(),
  ])

  const handleChartResized = useCallback(() => {
    if (!chartRef.current || !from || !to) {
      return
    }

    chartRef.current.zoom([from, to])
  }, [from, to])

  useEffect(() => {
    const bbSettings: ChartOptions = getSettingsSession(
      chart,
      timeBucket as string,
      timeFormat,
      rotateXAxis,
      chartType,
      onZoom,
      handleChartResized,
    )

    if (chartRef.current) {
      chartRef.current.destroy()
      chartRef.current = null
    }

    const generate = billboard.generate(bbSettings)
    chartRef.current = generate
    generate.data.names(dataNames)

    if (onChartReady) {
      onChartReady(generate)
    }

    if (from && to && generate) {
      generate.zoom([from, to])
    }

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
        if (onChartReady) {
          onChartReady(null)
        }
      }
    }
  }, [
    chart,
    timeBucket,
    timeFormat,
    rotateXAxis,
    chartType,
    dataNames,
    onZoom,
    onChartReady,
    handleChartResized,
    from,
    to,
  ])

  return <div className='mt-5 h-80 md:mt-0 [&_svg]:!overflow-visible' id='sessionChart' />
}

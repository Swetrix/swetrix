import billboard, { type ChartOptions, type Chart } from 'billboard.js'
import { useEffect, useRef } from 'react'

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
}: SessionChartProps) => {
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    const bbSettings: ChartOptions = getSettingsSession(
      chart,
      timeBucket as string,
      timeFormat,
      rotateXAxis,
      chartType,
      onZoom,
    )

    if (chartRef.current) {
      chartRef.current.destroy()
    }

    const generate = billboard.generate(bbSettings)
    chartRef.current = generate
    generate.data.names(dataNames)

    if (onChartReady) {
      onChartReady(generate)
    }

    return () => {
      if (!generate) {
        return
      }

      generate.destroy()
      chartRef.current = null
      if (onChartReady) {
        onChartReady(null)
      }
    }
  }, [chart, timeBucket, timeFormat, rotateXAxis, chartType, dataNames, onZoom, onChartReady])

  return <div className='mt-5 h-80 md:mt-0 [&_svg]:!overflow-visible' id='sessionChart' />
}

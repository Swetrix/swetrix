import billboard, { type ChartOptions, type Chart } from 'billboard.js'
import { useEffect, useRef } from 'react'

import { getSettingsSession } from '../ViewProject.helpers'

interface SessionChartProps {
  chart?: {
    x: string[]
    visits: number[]
  }
  timeBucket?: string
  timeFormat: string
  rotateXAxis: boolean
  chartType: string
  dataNames: any
  onZoom?: (domain: [Date, Date] | null) => void
  onChartReady?: (chart: Chart) => void
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
      if (generate) {
        generate.destroy()
        chartRef.current = null
        if (onChartReady) {
          onChartReady(null as any)
        }
      }
    }
  }, [chart, timeBucket, timeFormat, rotateXAxis, chartType, dataNames, onChartReady, onZoom])

  return <div className='mt-5 h-80 md:mt-0 [&_svg]:!overflow-visible' id='sessionChart' />
}

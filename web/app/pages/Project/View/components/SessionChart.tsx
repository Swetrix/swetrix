import billboard, { type ChartOptions } from 'billboard.js'
import { useEffect } from 'react'

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
}

export const SessionChart = ({
  chart,
  timeBucket,
  timeFormat,
  rotateXAxis,
  chartType,
  dataNames,
}: SessionChartProps) => {
  useEffect(() => {
    const bbSettings: ChartOptions = getSettingsSession(chart, timeBucket as string, timeFormat, rotateXAxis, chartType)

    const generate = billboard.generate(bbSettings)
    generate.data.names(dataNames)
  }, [chart, timeBucket, timeFormat, rotateXAxis, chartType, dataNames])

  return <div className='mt-5 h-80 md:mt-0 [&_svg]:!overflow-visible' id='sessionChart' />
}

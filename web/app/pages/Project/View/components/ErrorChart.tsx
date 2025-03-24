import billboard, { type ChartOptions } from 'billboard.js'
import { useEffect } from 'react'

import { getSettingsError } from '../ViewProject.helpers'

interface ErrorChartProps {
  chart?: {
    x: string[]
    occurrences: number[]
  }
  timeBucket?: string
  timeFormat: string
  rotateXAxis: boolean
  chartType: string
  dataNames: any
}

export const ErrorChart = ({ chart, timeBucket, timeFormat, rotateXAxis, chartType, dataNames }: ErrorChartProps) => {
  useEffect(() => {
    const bbSettings: ChartOptions = getSettingsError(chart, timeBucket as string, timeFormat, rotateXAxis, chartType)

    const generate = billboard.generate(bbSettings)
    generate.data.names(dataNames)
  }, [chart, timeBucket, timeFormat, rotateXAxis, chartType, dataNames])

  return <div className='mt-5 h-80 md:mt-0 [&_svg]:!overflow-visible' id='errorChart' />
}

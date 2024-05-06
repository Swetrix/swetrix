import { useEffect } from 'react'
import bb from 'billboard.js'
import { getSettingsError } from '../ViewProject.helpers'

interface IErrorChart {
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

export const ErrorChart = ({ chart, timeBucket, timeFormat, rotateXAxis, chartType, dataNames }: IErrorChart) => {
  useEffect(() => {
    // @ts-ignore
    const bbSettings: bb.ChartOptions = getSettingsError(
      chart,
      timeBucket as string,
      timeFormat,
      rotateXAxis,
      chartType,
    )

    const generate = bb.generate(bbSettings)
    generate.data.names(dataNames)
  }, [chart, timeBucket, timeFormat, rotateXAxis, chartType, dataNames])

  return <div className='h-80 mt-5 md:mt-0 [&_svg]:!overflow-visible' id='errorChart' />
}

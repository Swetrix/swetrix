import React, { useEffect } from 'react'
import bb from 'billboard.js'
import { getSettingsSession } from '../ViewProject.helpers'

interface ISessionChart {
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

export const SessionChart = ({ chart, timeBucket, timeFormat, rotateXAxis, chartType, dataNames }: ISessionChart) => {
  // const [bbChart, setBBChart] = useState<bb.Chart | null>(null)

  useEffect(() => {
    // @ts-ignore
    const bbSettings: bb.ChartOptions = getSettingsSession(
      chart,
      timeBucket as string,
      timeFormat,
      rotateXAxis,
      chartType,
    )

    const generate = bb.generate(bbSettings)
    generate.data.names(dataNames)

    // setBBChart(() => {
    //   const generate = bb.generate(bbSettings)
    //   generate.data.names(dataNames)
    //   return generate
    // })
  }, [chart, timeBucket, timeFormat, rotateXAxis, chartType, dataNames])

  return <div className='mt-5 h-80 md:mt-0 [&_svg]:!overflow-visible' id='sessionChart' />
}

import { ChartOptions } from 'billboard.js'
import React, { useMemo } from 'react'

import { MainChart } from '../../View/components/MainChart'
import { getSettingsCaptcha } from '../../View/ViewProject.helpers'

interface CaptchaChartProps {
  chart?: {
    x: string[]
    results: number[]
  }
  timeBucket: string
  timeFormat: string
  rotateXAxis: boolean
  chartType: string
  dataNames: Record<string, string>
  className?: string
}

export const CaptchaChart = ({
  chart,
  timeBucket,
  timeFormat,
  rotateXAxis,
  chartType,
  dataNames,
  className,
}: CaptchaChartProps) => {
  const options: ChartOptions = useMemo(() => {
    if (!chart) {
      return {} as ChartOptions
    }
    return getSettingsCaptcha(chart, timeBucket, timeFormat, rotateXAxis, chartType)
  }, [chart, timeBucket, timeFormat, rotateXAxis, chartType])

  const deps = useMemo(
    () => [chart, timeBucket, timeFormat, rotateXAxis, chartType, dataNames],
    [chart, timeBucket, timeFormat, rotateXAxis, chartType, dataNames],
  )

  if (!chart) {
    return null
  }

  return (
    <div className='overflow-hidden rounded-lg border border-gray-300 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-800/25'>
      <MainChart
        chartId='captcha-chart'
        options={options}
        dataNames={dataNames}
        className={className || 'mt-5 h-80 md:mt-0 [&_svg]:!overflow-visible'}
        deps={deps}
      />
    </div>
  )
}

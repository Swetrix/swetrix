import { ChartOptions } from 'billboard.js'
import React, { useMemo } from 'react'

import { Annotation } from '~/lib/models/Project'

import { getSettingsError } from '../ViewProject.helpers'

import { MainChart } from './MainChart'

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
  className?: string
  annotations?: Annotation[]
}

export const ErrorChart = ({
  chart,
  timeBucket,
  timeFormat,
  rotateXAxis,
  chartType,
  dataNames,
  className,
  annotations,
}: ErrorChartProps) => {
  const options: ChartOptions = useMemo(() => {
    return getSettingsError(chart, timeBucket as string, timeFormat, rotateXAxis, chartType, annotations)
  }, [chart, timeBucket, timeFormat, rotateXAxis, chartType, annotations])

  const deps = useMemo(
    () => [chart, timeBucket, timeFormat, rotateXAxis, chartType, dataNames, annotations],
    [chart, timeBucket, timeFormat, rotateXAxis, chartType, dataNames, annotations],
  )

  return (
    <div className='overflow-hidden rounded-lg border border-gray-300 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-800/25'>
      <MainChart
        chartId='error-chart'
        options={options}
        dataNames={dataNames}
        className={className || 'mt-5 h-80 md:mt-0 [&_svg]:!overflow-visible'}
        deps={deps}
      />
    </div>
  )
}

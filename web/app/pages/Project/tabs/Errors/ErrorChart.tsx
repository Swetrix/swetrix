import { ChartOptions } from 'billboard.js'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Annotation } from '~/lib/models/Project'

import { MainChart } from '../../View/components/MainChart'
import { getSettingsError } from '../../View/ViewProject.helpers'

interface ErrorChartProps {
  chart?: {
    x: string[]
    occurrences: number[]
    affectedUsers?: number[]
  }
  timeBucket?: string
  timeFormat: string
  rotateXAxis: boolean
  chartType: string
  dataNames?: Record<string, string>
  className?: string
  annotations?: Annotation[]
}

export const ErrorChart = ({
  chart,
  timeBucket,
  timeFormat,
  rotateXAxis,
  chartType,
  dataNames: customDataNames,
  className,
  annotations,
}: ErrorChartProps) => {
  const { t } = useTranslation('common')

  const dataNames = useMemo(() => {
    return (
      customDataNames || {
        occurrences: t('project.totalErrors'),
        affectedUsers: t('project.affectedUsers'),
      }
    )
  }, [customDataNames, t])

  const options: ChartOptions = useMemo(() => {
    return getSettingsError(
      chart,
      timeBucket as string,
      timeFormat,
      rotateXAxis,
      chartType,
      annotations,
      dataNames,
    )
  }, [
    chart,
    timeBucket,
    timeFormat,
    rotateXAxis,
    chartType,
    annotations,
    dataNames,
  ])

  const deps = useMemo(
    () => [
      chart,
      timeBucket,
      timeFormat,
      rotateXAxis,
      chartType,
      dataNames,
      annotations,
    ],
    [
      chart,
      timeBucket,
      timeFormat,
      rotateXAxis,
      chartType,
      dataNames,
      annotations,
    ],
  )

  return (
    <div className='overflow-hidden rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-800/25'>
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

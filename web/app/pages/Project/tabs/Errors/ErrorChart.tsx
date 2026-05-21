import { ChartOptions } from 'billboard.js'
import _isEmpty from 'lodash/isEmpty'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Annotation } from '~/lib/models/Project'
import type { ChartDataPointClick } from '~/pages/Project/View/utils/chartPoint'
import { MetricCard } from '~/pages/Project/tabs/Traffic/MetricCards'

import { MainChart } from '../../View/components/MainChart'
import { getSettingsError } from '../../View/ViewProject.helpers'

interface ErrorChartStat {
  key: string
  label: string
  value: React.ReactNode
  valueClassName?: string
}

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
  stats?: ErrorChartStat[]
  onDataPointClick?: ChartDataPointClick
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
  stats,
  onDataPointClick,
}: ErrorChartProps) => {
  const { t } = useTranslation('common')

  const dataPointClickLabel = useMemo(
    () => (onDataPointClick ? t('project.exploreSessions') : undefined),
    [onDataPointClick, t],
  )

  const dataNames = useMemo(() => {
    return (
      customDataNames || {
        occurrences: t('project.totalErrors'),
        affectedUsers: t('project.affectedUsers'),
      }
    )
  }, [customDataNames, t])

  const options: ChartOptions | null = useMemo(() => {
    if (!chart) return null
    return getSettingsError(
      chart,
      timeBucket as string,
      timeFormat,
      rotateXAxis,
      chartType,
      annotations,
      dataNames,
      onDataPointClick,
      dataPointClickLabel,
    )
  }, [
    chart,
    timeBucket,
    timeFormat,
    rotateXAxis,
    chartType,
    annotations,
    dataNames,
    onDataPointClick,
    dataPointClickLabel,
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
      onDataPointClick,
      dataPointClickLabel,
    ],
    [
      chart,
      timeBucket,
      timeFormat,
      rotateXAxis,
      chartType,
      dataNames,
      annotations,
      onDataPointClick,
      dataPointClickLabel,
    ],
  )

  const hasStats = !_isEmpty(stats)

  if (!options && !hasStats) return null

  return (
    <div className='overflow-hidden rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-900/25'>
      {hasStats ? (
        <div className='mb-5 flex flex-wrap justify-center gap-5 lg:justify-start'>
          {stats!.map((stat) => (
            <MetricCard
              key={stat.key}
              label={stat.label}
              value={stat.value}
              classes={
                stat.valueClassName ? { value: stat.valueClassName } : undefined
              }
            />
          ))}
        </div>
      ) : null}
      {options ? (
        <MainChart
          chartId='error-chart'
          options={options}
          dataNames={dataNames}
          className={className || 'mt-5 h-80 md:mt-0 [&_svg]:overflow-visible!'}
          deps={deps}
        />
      ) : null}
    </div>
  )
}

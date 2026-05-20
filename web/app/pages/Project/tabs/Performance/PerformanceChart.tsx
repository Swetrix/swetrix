import { ChartOptions } from 'billboard.js'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Annotation } from '~/lib/models/Project'
import type { ChartDataPointClick } from '~/pages/Project/View/utils/chartPoint'

import { MainChart } from '../../View/components/MainChart'
import { getSettingsPerf } from '../../View/ViewProject.helpers'

interface PerformanceChartProps {
  chart: Record<string, string[]>
  timeBucket: string
  activeChartMetrics: string
  rotateXAxis: boolean
  chartType: string
  timeFormat: string
  compareChart?: Record<string, string[]>
  onZoom?: (domain: [Date, Date] | null) => void
  enableZoom?: boolean
  dataNames: Record<string, string>
  className?: string
  annotations?: Annotation[]
  onDataPointClick?: ChartDataPointClick
}

export const PerformanceChart = ({
  chart,
  timeBucket,
  activeChartMetrics,
  rotateXAxis,
  chartType,
  timeFormat,
  compareChart,
  onZoom,
  enableZoom,
  dataNames,
  className,
  annotations,
  onDataPointClick,
}: PerformanceChartProps) => {
  const { t } = useTranslation('common')

  const dataPointClickLabel = useMemo(
    () => (onDataPointClick ? t('project.exploreSessions') : undefined),
    [onDataPointClick, t],
  )

  const options: ChartOptions = useMemo(() => {
    return getSettingsPerf(
      chart,
      timeBucket,
      activeChartMetrics,
      rotateXAxis,
      chartType,
      timeFormat,
      compareChart,
      onZoom,
      enableZoom,
      annotations,
      onDataPointClick,
      dataPointClickLabel,
    )
  }, [
    chart,
    timeBucket,
    activeChartMetrics,
    rotateXAxis,
    chartType,
    timeFormat,
    compareChart,
    onZoom,
    enableZoom,
    annotations,
    onDataPointClick,
    dataPointClickLabel,
  ])

  const deps = useMemo(
    () => [
      chart,
      timeBucket,
      activeChartMetrics,
      rotateXAxis,
      chartType,
      timeFormat,
      compareChart,
      onZoom,
      enableZoom,
      annotations,
      onDataPointClick,
      dataPointClickLabel,
    ],
    [
      chart,
      timeBucket,
      activeChartMetrics,
      rotateXAxis,
      chartType,
      timeFormat,
      compareChart,
      onZoom,
      enableZoom,
      annotations,
      onDataPointClick,
      dataPointClickLabel,
    ],
  )

  return (
    <MainChart
      chartId='performance-chart'
      options={options}
      dataNames={dataNames}
      className={className}
      deps={deps}
    />
  )
}

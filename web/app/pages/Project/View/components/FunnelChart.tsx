import { ChartOptions } from 'billboard.js'
import React, { useMemo } from 'react'

import { AnalyticsFunnel } from '~/lib/models/Project'

import { getSettingsFunnels } from '../ViewProject.helpers'

import { MainChart } from './MainChart'

interface FunnelChartProps {
  funnel: AnalyticsFunnel[]
  totalPageviews: number
  t: any
  className?: string
}

export const FunnelChart = ({ funnel, totalPageviews, t, className }: FunnelChartProps) => {
  const options: ChartOptions = useMemo(() => {
    return getSettingsFunnels(funnel, totalPageviews, t)
  }, [funnel, totalPageviews, t])

  const dataNames = useMemo(
    () => ({
      dropoff: t('project.dropoff'),
      events: t('project.visitors'),
    }),
    [t],
  )

  const deps = useMemo(() => [funnel, totalPageviews, t], [funnel, totalPageviews, t])

  return <MainChart chartId='funnel-chart' options={options} dataNames={dataNames} className={className} deps={deps} />
}

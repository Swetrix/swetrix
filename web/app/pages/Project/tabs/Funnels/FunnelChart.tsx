import { ChartOptions } from 'billboard.js'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { AnalyticsFunnel } from '~/lib/models/Project'

import { MainChart } from '../../View/components/MainChart'
import { getSettingsFunnels } from '../../View/ViewProject.helpers'
import { cn } from '~/utils/generic'

interface FunnelChartProps {
  funnel: AnalyticsFunnel[]
  totalPageviews: number
  t: any
  className?: string
  onBarClick?: (stepIndex: number) => void
}

export const FunnelChart = ({
  funnel,
  totalPageviews,
  t,
  className,
  onBarClick,
}: FunnelChartProps) => {
  const { i18n } = useTranslation()

  const options: ChartOptions = useMemo(() => {
    return getSettingsFunnels(
      funnel,
      totalPageviews,
      t,
      i18n.language,
      onBarClick,
    )
  }, [funnel, totalPageviews, t, i18n.language, onBarClick])

  const dataNames = useMemo(
    () => ({
      dropoff: t('project.dropoff'),
      events: t('project.visitors'),
    }),
    [t],
  )

  const deps = useMemo(
    () => [funnel, totalPageviews, t, i18n.language, onBarClick],
    [funnel, totalPageviews, t, i18n.language, onBarClick],
  )

  return (
    <MainChart
      chartId='funnel-chart'
      options={options}
      dataNames={dataNames}
      className={cn('funnel-chart', className)}
      deps={deps}
    />
  )
}

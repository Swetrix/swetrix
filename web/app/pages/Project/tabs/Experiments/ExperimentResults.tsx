import type { ChartOptions } from 'billboard.js'
import { area } from 'billboard.js'
import cx from 'clsx'
import * as d3 from 'd3'
import dayjs from 'dayjs'
import timezonePlugin from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import _size from 'lodash/size'
import {
  TrophyIcon,
  UsersIcon,
  TargetIcon,
  PencilIcon,
  TrendUpIcon,
  TrendDownIcon,
  FlaskIcon,
  PercentIcon,
  CaretDownIcon,
  CaretUpIcon,
  WarningCircleIcon,
  CheckCircleIcon,
} from '@phosphor-icons/react'
import { useState, useEffect, useRef, useMemo, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useFetcher } from 'react-router'
import { toast } from 'sonner'

import type {
  Experiment,
  ExperimentResults as ExperimentResultsType,
  ExperimentChartData,
  ExperimentVariantResult,
  Goal,
} from '~/api/api.server'
import {
  useExperimentProxy,
  useExperimentResultsProxy,
  useGoalProxy,
} from '~/hooks/useAnalyticsProxy'
import {
  TimeFormat,
  tbsFormatMapper,
  tbsFormatMapper24h,
  tbsFormatMapperTooltip,
  tbsFormatMapperTooltip24h,
} from '~/lib/constants'
import DashboardHeader from '~/pages/Project/View/components/DashboardHeader'
import Filters from '~/pages/Project/View/components/Filters'
import { useViewProjectContext } from '~/pages/Project/View/ViewProject'
import { typeNameMapping } from '~/pages/Project/View/ViewProject.helpers'
import type { ProjectViewActionData } from '~/routes/projects.$id'
import Alert from '~/ui/Alert'
import BillboardChart from '~/ui/BillboardChart'
import Button from '~/ui/Button'
import Loader from '~/ui/Loader'
import { Badge } from '~/ui/Badge'
import Modal from '~/ui/Modal'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'
import { nFormatter } from '~/utils/generic'

import ExperimentSettingsModal from './ExperimentSettingsModal'

dayjs.extend(utc)
dayjs.extend(timezonePlugin)

const VARIANT_COLORS = [
  '#6366f1', // indigo-500
  '#22c55e', // green-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
]

interface ExperimentResultsProps {
  experimentId: string
  period: string
  timeBucket: string
  from: string
  to: string
  timezone?: string
  onBack: () => void
  refreshTrigger?: number
}

interface StatCardProps {
  icon: React.ReactNode
  value: string | number
  label: string
  subValue?: string
}

const StatCard = memo(({ icon, value, label, subValue }: StatCardProps) => (
  <div className='relative overflow-hidden rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-900/25'>
    <div className='pointer-events-none absolute -bottom-5 -left-5 opacity-10 [&>svg]:size-24'>
      {icon}
    </div>
    <div className='relative'>
      <div className='flex items-baseline gap-1.5'>
        <Text
          as='p'
          size='3xl'
          weight='bold'
          className='leading-tight tabular-nums'
        >
          {value}
        </Text>
        {subValue ? (
          <Text size='sm' colour='muted'>
            {subValue}
          </Text>
        ) : null}
      </div>
      <Text as='p' size='sm' colour='secondary' className='leading-tight'>
        {label}
      </Text>
    </div>
  </div>
))

StatCard.displayName = 'StatCard'

const getWinProbabilityChartSettings = (
  chartData: ExperimentChartData,
  variants: ExperimentVariantResult[],
  timeBucket: string,
  timeFormat: string,
): ChartOptions => {
  const xAxisSize = _size(chartData.x)

  const columns: any[] = [
    ['x', ..._map(chartData.x, (el) => dayjs(el).toDate())],
  ]

  const types: Record<string, any> = {}
  const colors: Record<string, string> = {}
  const names: Record<string, string> = {}

  variants.forEach((variant, idx) => {
    const key = variant.key
    const data = chartData.winProbability[key] || []
    columns.push([key, ...data])
    types[key] = area()
    colors[key] = VARIANT_COLORS[idx % VARIANT_COLORS.length]
    names[key] = variant.name
  })

  return {
    data: {
      x: 'x',
      columns,
      types,
      colors,
      names,
    },
    grid: {
      y: {
        show: true,
        lines: [{ value: 95, class: 'grid-line-95', text: '95%' }],
      },
    },
    transition: {
      duration: 200,
    },
    resize: {
      auto: true,
      timer: true,
    },
    axis: {
      x: {
        clipPath: false,
        tick: {
          fit: true,
          rotate: 0,
          format:
            // @ts-expect-error
            timeFormat === TimeFormat['24-hour']
              ? (x: string) =>
                  d3.timeFormat(tbsFormatMapper24h[timeBucket])(
                    x as unknown as Date,
                  )
              : (x: string) =>
                  d3.timeFormat(tbsFormatMapper[timeBucket])(
                    x as unknown as Date,
                  ),
        },
        localtime: timeFormat === TimeFormat['24-hour'],
        type: 'timeseries',
      },
      y: {
        tick: {
          format: (d: number) => `${d}%`,
          values: [0, 25, 50, 75, 100],
        },
        max: 100,
        min: 0,
        show: true,
        inner: true,
      },
    },
    tooltip: {
      contents: (items: any, _: any, __: any, color: any) => {
        if (!items || _isEmpty(items) || !items[0]) return ''
        return `<ul class='bg-gray-50 dark:text-gray-50 dark:bg-slate-900 rounded-md ring-1 ring-black/10 px-2 py-1 text-xs md:text-sm max-h-[250px] md:max-h-[350px] overflow-y-auto shadow-md z-50'>
          <li class='font-semibold pb-1 mb-1 border-b border-gray-200 dark:border-slate-800 sticky top-0 bg-gray-50 dark:bg-slate-900'>${
            timeFormat === TimeFormat['24-hour']
              ? d3.timeFormat(tbsFormatMapperTooltip24h[timeBucket])(items[0].x)
              : d3.timeFormat(tbsFormatMapperTooltip[timeBucket])(items[0].x)
          }</li>
          ${_map(items, (el: { id: string; name: string; value: number }) => {
            return `
            <li class='flex justify-between items-center py-px leading-snug'>
              <div class='flex items-center min-w-0 mr-4'>
                <div class='w-2.5 h-2.5 rounded-xs mr-1.5 shrink-0' style=background-color:${color(el.id)}></div>
                <span class="truncate">${el.name}</span>
              </div>
              <span class='font-mono whitespace-nowrap'>${el.value}%</span>
            </li>
            `
          }).join('')}</ul>`
      },
    },
    point: {
      focus: {
        only: xAxisSize > 1,
      },
      pattern: ['circle'],
      r: 2,
    },
    legend: {
      item: {
        tile: {
          type: 'circle',
          width: 10,
          r: 3,
        },
      },
    },
    area: {
      linearGradient: true,
    },
  }
}

const WinProbabilityChart = memo(
  ({
    chartData,
    variants,
    timeBucket,
  }: {
    chartData: ExperimentChartData | undefined
    variants: ExperimentVariantResult[]
    timeBucket: string
  }) => {
    const { t } = useTranslation()
    const { timeFormat } = useViewProjectContext()

    const chartOptions = useMemo(() => {
      if (
        !chartData ||
        !chartData.x ||
        chartData.x.length === 0 ||
        variants.length === 0
      )
        return null
      return getWinProbabilityChartSettings(
        chartData,
        variants,
        timeBucket,
        timeFormat,
      )
    }, [chartData, variants, timeBucket, timeFormat])

    if (!chartOptions) {
      return (
        <div className='flex h-[220px] items-center justify-center rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-900/25'>
          <Text colour='muted' size='sm'>
            {t('experiments.noDataYet')}
          </Text>
        </div>
      )
    }

    return (
      <div className='rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-900/25'>
        <Text as='h3' weight='semibold' size='sm' className='mb-2'>
          {t('experiments.probabilityOfWinning')}
        </Text>
        <BillboardChart options={chartOptions} className='h-[180px]' />
      </div>
    )
  },
)

WinProbabilityChart.displayName = 'WinProbabilityChart'

const ConfidenceBar = memo(
  ({
    improvement,
    probabilityOfWinning,
    isControl,
  }: {
    improvement: number
    probabilityOfWinning: number
    isControl: boolean
  }) => {
    const maxRange = 30
    const clampedImprovement = Math.max(
      -maxRange,
      Math.min(maxRange, improvement),
    )
    const position = ((clampedImprovement + maxRange) / (maxRange * 2)) * 100

    const isPositive = improvement > 0
    const isSignificant = probabilityOfWinning >= 95

    const getColor = () => {
      if (isControl) return 'bg-gray-400 dark:bg-gray-500'
      if (isSignificant) {
        return isPositive ? 'bg-green-500' : 'bg-red-500'
      }
      return isPositive ? 'bg-green-400/70' : 'bg-red-400/70'
    }

    if (isControl) {
      return (
        <div className='flex items-center justify-center'>
          <div className='h-4 w-0.5 bg-gray-300 dark:bg-gray-600' />
        </div>
      )
    }

    return (
      <div className='relative h-6 w-full'>
        <div className='absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-gray-100 dark:bg-slate-700' />

        <div className='absolute top-1/2 left-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-gray-300 dark:bg-gray-600' />

        <div
          className='absolute top-1/2 -translate-x-1/2 -translate-y-1/2'
          style={{ left: `${position}%` }}
        >
          <div
            className={cx(
              'size-3.5 rotate-45 rounded-sm shadow-sm',
              getColor(),
            )}
          />
        </div>
      </div>
    )
  },
)

ConfidenceBar.displayName = 'ConfidenceBar'

const TableHeader = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => (
  <th
    className={cx(
      'px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300',
      className,
    )}
  >
    {children}
  </th>
)

const TableCell = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => (
  <td
    className={cx(
      'px-4 py-3 text-sm whitespace-nowrap text-gray-900 dark:text-gray-100',
      className,
    )}
  >
    {children}
  </td>
)

const MetricsTable = memo(
  ({
    variants,
    winnerKey,
    hasWinner,
  }: {
    variants: ExperimentVariantResult[]
    winnerKey: string | null
    hasWinner: boolean
  }) => {
    const { t } = useTranslation()

    const controlVariant = variants.find((v) => v.isControl)
    const testVariants = variants.filter((v) => !v.isControl)

    return (
      <div className='overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-slate-800/60 dark:bg-slate-950'>
        <div className='border-b border-gray-200 px-4 py-3 dark:border-slate-800'>
          <div className='flex items-center gap-2'>
            <Text weight='semibold' size='sm'>
              {t('experiments.conversionRate')}
            </Text>
            <Tooltip text={t('experiments.statisticalNote')} />
          </div>
        </div>
        <div className='overflow-x-auto'>
          <table className='min-w-full divide-y divide-gray-200 dark:divide-slate-800'>
            <thead className='bg-gray-50 dark:bg-slate-900/60'>
              <tr>
                <TableHeader>{t('experiments.variants')}</TableHeader>
                <TableHeader>{t('experiments.value')}</TableHeader>
                <TableHeader>{t('experiments.improvement')}</TableHeader>
                <TableHeader>
                  {t('experiments.probabilityOfWinning')}
                </TableHeader>
                <TableHeader className='w-48'>
                  <div className='flex items-center justify-between text-[10px]'>
                    <Text as='span' size='xxs' colour='muted'>
                      -30%
                    </Text>
                    <Text as='span' size='xxs' colour='muted'>
                      0%
                    </Text>
                    <Text as='span' size='xxs' colour='muted'>
                      +30%
                    </Text>
                  </div>
                </TableHeader>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-200 dark:divide-slate-800'>
              {controlVariant ? (
                <tr className='bg-white hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-900/50'>
                  <TableCell>
                    <div className='flex items-center gap-2'>
                      <Text weight='medium' size='sm'>
                        {controlVariant.name}
                      </Text>
                      <Badge label={t('experiments.control')} colour='indigo' />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className='flex flex-col'>
                      <Text
                        as='p'
                        weight='semibold'
                        size='sm'
                        className='tabular-nums'
                      >
                        {controlVariant.conversionRate}%
                      </Text>
                      <Text
                        as='p'
                        size='xs'
                        colour='muted'
                        className='mt-0.5 tabular-nums'
                      >
                        {nFormatter(controlVariant.conversions, 1)} /{' '}
                        {nFormatter(controlVariant.exposures, 1)}
                      </Text>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Text size='sm' colour='muted'>
                      —
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text size='sm' className='tabular-nums'>
                      {controlVariant.probabilityOfBeingBest}%
                    </Text>
                  </TableCell>
                  <TableCell>
                    <ConfidenceBar
                      improvement={0}
                      probabilityOfWinning={
                        controlVariant.probabilityOfBeingBest
                      }
                      isControl
                    />
                  </TableCell>
                </tr>
              ) : null}

              {_map(testVariants, (variant) => {
                const isWinner = hasWinner && variant.key === winnerKey
                const isPositive = variant.improvement > 0

                return (
                  <tr
                    key={variant.key}
                    className={cx(
                      'bg-white hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-900/50',
                      {
                        'bg-green-50/50 dark:bg-green-900/10': isWinner,
                      },
                    )}
                  >
                    <TableCell>
                      <div className='flex items-center gap-2'>
                        <Text weight='medium' size='sm'>
                          {variant.name}
                        </Text>
                        {isWinner ? (
                          <Badge
                            colour='green'
                            label={
                              <Text
                                as='span'
                                size='xs'
                                colour='inherit'
                                className='flex items-center gap-1'
                              >
                                <TrophyIcon className='size-3' />
                                {t('experiments.winner')}
                              </Text>
                            }
                          />
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className='flex flex-col'>
                        <Text
                          as='p'
                          weight='semibold'
                          size='sm'
                          className='tabular-nums'
                        >
                          {variant.conversionRate}%
                        </Text>
                        <Text
                          as='p'
                          size='xs'
                          colour='muted'
                          className='mt-0.5 tabular-nums'
                        >
                          {nFormatter(variant.conversions, 1)} /{' '}
                          {nFormatter(variant.exposures, 1)}
                        </Text>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div
                        className={cx(
                          'flex items-center gap-1 text-sm font-medium',
                          {
                            'text-green-600 dark:text-green-400': isPositive,
                            'text-red-600 dark:text-red-400':
                              !isPositive && variant.improvement !== 0,
                            'text-gray-500 dark:text-gray-400':
                              variant.improvement === 0,
                          },
                        )}
                      >
                        {variant.improvement !== 0 ? (
                          <>
                            {isPositive ? (
                              <TrendUpIcon className='size-4' />
                            ) : (
                              <TrendDownIcon className='size-4' />
                            )}
                            {isPositive ? '+' : ''}
                            {variant.improvement.toFixed(2)}%
                          </>
                        ) : (
                          '—'
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-2'>
                        <Text
                          size='sm'
                          weight={
                            variant.probabilityOfBeingBest >= 95
                              ? 'semibold'
                              : 'normal'
                          }
                          className={cx('tabular-nums', {
                            'text-green-600 dark:text-green-400':
                              variant.probabilityOfBeingBest >= 95,
                          })}
                        >
                          {variant.probabilityOfBeingBest}%
                        </Text>
                        {variant.probabilityOfBeingBest >= 95 ? (
                          <Badge
                            label={
                              <Text as='span' size='xs' colour='inherit'>
                                {t('experiments.significant')}
                              </Text>
                            }
                            colour='green'
                          />
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <ConfidenceBar
                        improvement={variant.improvement}
                        probabilityOfWinning={variant.probabilityOfBeingBest}
                        isControl={false}
                      />
                    </TableCell>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  },
)

MetricsTable.displayName = 'MetricsTable'

const CollapsibleSection = memo(
  ({
    title,
    children,
    defaultOpen = true,
  }: {
    title: string
    children: React.ReactNode
    defaultOpen?: boolean
  }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen)

    return (
      <div className='overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-900/50'>
        <button
          type='button'
          onClick={() => setIsOpen(!isOpen)}
          className='flex w-full items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/30'
        >
          <Text weight='semibold' size='sm'>
            {title}
          </Text>
          {isOpen ? (
            <CaretUpIcon className='size-4 text-gray-500' />
          ) : (
            <CaretDownIcon className='size-4 text-gray-500' />
          )}
        </button>
        {isOpen ? (
          <div className='border-t border-gray-200 px-4 py-4 dark:border-slate-700'>
            {children}
          </div>
        ) : null}
      </div>
    )
  },
)

CollapsibleSection.displayName = 'CollapsibleSection'

type HealthWarning = {
  code:
    | 'EXTREME_IMBALANCE'
    | 'VARIANT_NO_TRAFFIC'
    | 'LOW_CONVERSION'
    | 'STALE_RUNNING'
    | 'GOAL_MISSING'
  severity: 'warning' | 'danger'
  titleKey: string
  messageKey: string
  messageValues?: Record<string, string | number>
}

const formatWindowDate = (value?: string | null, timezone?: string) => {
  if (!value) return null
  return (timezone ? dayjs.utc(value).tz(timezone) : dayjs(value)).format(
    'MMM D, YYYY HH:mm',
  )
}

const windowsOverlap = (
  window: NonNullable<ExperimentResultsType['resultWindow']>,
) => {
  if (!window.activeFrom || !window.activeTo) return false

  return (
    dayjs(window.selectedTo).valueOf() >= dayjs(window.activeFrom).valueOf() &&
    dayjs(window.selectedFrom).valueOf() <= dayjs(window.activeTo).valueOf()
  )
}

const getConfiguredAllocation = (experiment: Experiment | null, key: string) =>
  experiment?.variants.find((variant) => variant.key === key)
    ?.rolloutPercentage ?? 0

const ExperimentResults = ({
  experimentId,
  period,
  timeBucket,
  from,
  to,
  timezone,
  onBack,
  refreshTrigger,
}: ExperimentResultsProps) => {
  const { t } = useTranslation()
  const isMountedRef = useRef(true)
  const experimentProxy = useExperimentProxy()
  const resultsProxy = useExperimentResultsProxy()
  const goalProxy = useGoalProxy()
  const completeFetcher = useFetcher<ProjectViewActionData>()
  const processedCompleteRef = useRef<string | null>(null)
  const { filters } = useViewProjectContext()

  const [experiment, setExperiment] = useState<Experiment | null>(null)
  const [results, setResults] = useState<ExperimentResultsType | null>(null)
  const [goal, setGoal] = useState<Goal | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const statusBadgeColour = useMemo<
    'slate' | 'green' | 'yellow' | 'sky'
  >(() => {
    if (!results) return 'slate'
    if (results.status === 'running') return 'green'
    if (results.status === 'paused') return 'yellow'
    if (results.status === 'completed') return 'sky'
    return 'slate'
  }, [results])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      const hasData = !!experiment && !!results
      if (!hasData) {
        setIsLoading(true)
      }
      setError(null)

      try {
        const [experimentData, resultsData] = await Promise.all([
          experimentProxy.fetchExperiment(experimentId),
          resultsProxy.fetchResults(experimentId, {
            period,
            timeBucket,
            from,
            to,
            timezone,
            filters,
          }),
        ])

        let goalData: Goal | null = null
        if (experimentData?.goalId) {
          try {
            goalData = await goalProxy.fetchGoal(experimentData.goalId)
          } catch {
            goalData = null
          }
        }

        if (isMountedRef.current) {
          setExperiment(experimentData)
          setResults(resultsData)
          setGoal(goalData)
        }
      } catch (err: any) {
        if (isMountedRef.current) {
          setError(err?.message || 'Failed to load results')
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false)
        }
      }
    }

    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    experimentId,
    period,
    timeBucket,
    from,
    to,
    timezone,
    filters,
    reloadToken,
    refreshTrigger,
  ])

  useEffect(() => {
    if (!completeFetcher.data || completeFetcher.state !== 'idle') return

    const key = `${completeFetcher.data.intent}-${completeFetcher.data.success}-${completeFetcher.data.error || ''}`
    if (processedCompleteRef.current === key) return
    processedCompleteRef.current = key

    if (completeFetcher.data.intent !== 'complete-experiment') return

    if (completeFetcher.data.success) {
      toast.success(t('experiments.completed'))
      setIsCompleteModalOpen(false)
      setReloadToken((value) => value + 1)
    } else if (completeFetcher.data.error) {
      toast.error(completeFetcher.data.error)
    }
  }, [completeFetcher.data, completeFetcher.state, t])

  const overallConversionRate = useMemo(() => {
    if (!results || results.totalExposures === 0) return 0
    return ((results.totalConversions / results.totalExposures) * 100).toFixed(
      2,
    )
  }, [results])

  const sortedVariants = useMemo(() => {
    if (!results) return []
    return [...results.variants].sort((a, b) => {
      if (a.isControl) return -1
      if (b.isControl) return 1
      return b.probabilityOfBeingBest - a.probabilityOfBeingBest
    })
  }, [results])

  const healthWarnings = useMemo<HealthWarning[]>(() => {
    if (!experiment || !results) return []

    const warnings: HealthWarning[] = []
    const runningForDays = experiment.startedAt
      ? dayjs().diff(dayjs(experiment.startedAt), 'day')
      : 0

    if (results.totalExposures >= 100) {
      const imbalancedVariant = results.variants.find((variant) => {
        const configured = getConfiguredAllocation(experiment, variant.key)
        const observed = (variant.exposures / results.totalExposures) * 100
        return configured > 0 && Math.abs(observed - configured) >= 25
      })

      if (imbalancedVariant) {
        warnings.push({
          code: 'EXTREME_IMBALANCE',
          severity: 'danger',
          titleKey: 'experiments.resultDetails.warnings.extremeImbalance.title',
          messageKey:
            'experiments.resultDetails.warnings.extremeImbalance.message',
        })
      }
    }

    const missingTrafficVariant = results.variants.find(
      (variant) => variant.exposures === 0 && results.totalExposures > 0,
    )

    if (missingTrafficVariant) {
      warnings.push({
        code: 'VARIANT_NO_TRAFFIC',
        severity: 'danger',
        titleKey: 'experiments.resultDetails.warnings.variantNoTraffic.title',
        messageKey:
          'experiments.resultDetails.warnings.variantNoTraffic.message',
        messageValues: { variant: missingTrafficVariant.name },
      })
    }

    if (results.totalExposures >= 100 && results.totalConversions < 30) {
      warnings.push({
        code: 'LOW_CONVERSION',
        severity: 'warning',
        titleKey: 'experiments.resultDetails.warnings.lowConversion.title',
        messageKey: 'experiments.resultDetails.warnings.lowConversion.message',
      })
    }

    if (results.status === 'running' && runningForDays >= 45) {
      warnings.push({
        code: 'STALE_RUNNING',
        severity: 'warning',
        titleKey: 'experiments.resultDetails.warnings.staleRunning.title',
        messageKey: 'experiments.resultDetails.warnings.staleRunning.message',
        messageValues: { count: runningForDays },
      })
    }

    if (results.status !== 'draft' && (!experiment.goalId || !goal)) {
      warnings.push({
        code: 'GOAL_MISSING',
        severity: 'danger',
        titleKey: 'experiments.resultDetails.warnings.goalMissing.title',
        messageKey: 'experiments.resultDetails.warnings.goalMissing.message',
      })
    }

    return warnings
  }, [experiment, goal, results])

  const stopRecommendation = useMemo(() => {
    if (!experiment || !results) return null
    if (results.variants.length === 0) return null
    if (results.status !== 'running' && results.status !== 'paused') return null
    if (results.totalExposures < 500 || results.totalConversions < 50) {
      return null
    }
    if (
      experiment.startedAt &&
      dayjs().diff(dayjs(experiment.startedAt), 'day') < 7
    ) {
      return null
    }
    if (
      healthWarnings.some((warning) =>
        ['EXTREME_IMBALANCE', 'VARIANT_NO_TRAFFIC', 'GOAL_MISSING'].includes(
          warning.code,
        ),
      )
    ) {
      return null
    }

    const control = results.variants.find((variant) => variant.isControl)
    const best = results.variants.reduce((current, variant) =>
      variant.probabilityOfBeingBest > current.probabilityOfBeingBest
        ? variant
        : current,
    )

    if (
      best &&
      !best.isControl &&
      best.probabilityOfBeingBest >= 98 &&
      best.improvement > 0
    ) {
      return {
        titleKey: 'experiments.resultDetails.stopRecommendation.winner.title',
        messageKey:
          'experiments.resultDetails.stopRecommendation.winner.message',
        messageValues: { variant: best.name },
      }
    }

    const harmedVariant = results.variants.find(
      (variant) =>
        !variant.isControl &&
        variant.improvement <= -10 &&
        variant.probabilityOfBeingBest <= 5,
    )

    if (control && harmedVariant && control.probabilityOfBeingBest >= 95) {
      return {
        titleKey: 'experiments.resultDetails.stopRecommendation.harm.title',
        messageKey: 'experiments.resultDetails.stopRecommendation.harm.message',
        messageValues: { variant: harmedVariant.name },
      }
    }

    return null
  }, [experiment, healthWarnings, results])

  const resultWindowNotice = useMemo(() => {
    const window = results?.resultWindow
    if (!window || window.mode === 'selected') return null

    const fromLabel = formatWindowDate(window.from, timezone)
    const toLabel = formatWindowDate(window.to, timezone)

    if (window.mode === 'final') {
      const suffix = windowsOverlap(window)
        ? t('experiments.resultDetails.window.finalSuffixActive')
        : t('experiments.resultDetails.window.finalSuffixNoOverlap')
      return t('experiments.resultDetails.window.final', {
        from: fromLabel ?? '',
        to: toLabel ?? '',
        suffix,
      })
    }

    return t('experiments.resultDetails.window.clipped', {
      from: fromLabel ?? '',
      to: toLabel ?? '',
    })
  }, [results, timezone, t])

  const handleCompleteExperiment = () => {
    if (!experiment) return
    processedCompleteRef.current = null
    completeFetcher.submit(
      { intent: 'complete-experiment', experimentId: experiment.id },
      { method: 'POST' },
    )
  }

  const tnMapping = useMemo(() => typeNameMapping(t), [t])
  const completeExperimentButton = (
    <Button
      type='button'
      size='sm'
      onClick={() => setIsCompleteModalOpen(true)}
    >
      {t('experiments.complete')}
    </Button>
  )
  const canCompleteExperiment =
    results?.status === 'running' || results?.status === 'paused'
  const isCompleted = results?.status === 'completed'

  if (!experiment || !results) {
    if (isLoading) {
      return (
        <div className='mt-4'>
          <Loader />
        </div>
      )
    }

    return (
      <>
        <DashboardHeader onBack={onBack} showLiveVisitors={false} />
        <div className='rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20'>
          <Text colour='muted'>{error || t('experiments.loadError')}</Text>
        </div>
      </>
    )
  }

  return (
    <>
      <DashboardHeader
        onBack={onBack}
        showLiveVisitors={false}
        showRefreshButton={!isCompleted}
        showPeriodSelector={!isCompleted}
        rightContent={
          !isCompleted ? (
            <Tooltip
              text={
                results.status === 'running'
                  ? t('experiments.editDisabledRunning')
                  : t('common.edit')
              }
              tooltipNode={
                <Button
                  variant='ghost'
                  size='xs'
                  type='button'
                  onClick={() => setIsSettingsOpen(true)}
                  disabled={results.status === 'running'}
                >
                  <PencilIcon className='mr-1 size-4' />
                  {t('common.edit')}
                </Button>
              }
            />
          ) : undefined
        }
      />
      <ExperimentSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSuccess={() => setReloadToken((v) => v + 1)}
        projectId={experiment.pid}
        experimentId={experiment.id}
      />
      <Modal
        onClose={() => setIsCompleteModalOpen(false)}
        onSubmit={handleCompleteExperiment}
        submitText={t('experiments.complete')}
        closeText={t('common.cancel')}
        title={t('experiments.completeConfirmTitle')}
        message={
          stopRecommendation
            ? t(
                'experiments.resultDetails.stopRecommendation.completeConfirmMessage',
                {
                  message: t(
                    stopRecommendation.messageKey,
                    stopRecommendation.messageValues,
                  ),
                },
              )
            : t('experiments.completeConfirmMessage')
        }
        submitType='regular'
        type='info'
        isOpened={isCompleteModalOpen}
        isLoading={completeFetcher.state !== 'idle'}
      />
      <div className='space-y-3'>
        {filters.length > 0 ? (
          <Filters className='mb-1' tnMapping={tnMapping} />
        ) : null}
        <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
          <div className='min-w-0'>
            <div className='flex min-w-0 items-center gap-2'>
              <Text as='h2' size='xl' weight='bold' truncate>
                {experiment.name}
              </Text>
              <Badge
                label={t(`experiments.status.${results.status}`)}
                colour={statusBadgeColour}
              />
            </div>
            {experiment.description ? (
              <Text as='p' size='sm' colour='muted' className='mt-1' truncate>
                {experiment.description}
              </Text>
            ) : null}
          </div>
          {!stopRecommendation && canCompleteExperiment ? (
            <div className='shrink-0'>{completeExperimentButton}</div>
          ) : null}
        </div>
        {resultWindowNotice || results.isSegmented ? (
          <Alert variant='info'>
            {resultWindowNotice ? (
              <Text as='p' size='sm' colour='inherit'>
                {resultWindowNotice}
              </Text>
            ) : null}
            {results.isSegmented ? (
              <Text
                as='p'
                size='sm'
                colour='inherit'
                className={cx({
                  'mt-1': Boolean(resultWindowNotice),
                })}
              >
                {t('experiments.resultDetails.segmentedNotice')}
              </Text>
            ) : null}
          </Alert>
        ) : null}
        {healthWarnings.length > 0 ? (
          <div className='grid w-full gap-2'>
            {healthWarnings.map((warning) => (
              <div
                key={warning.code}
                className={cx(
                  'w-full rounded-md px-3 py-2 ring-1',
                  warning.severity === 'danger'
                    ? 'bg-red-50 ring-red-200 dark:bg-red-900/20 dark:ring-red-800/70'
                    : 'bg-yellow-50 ring-yellow-200 dark:bg-yellow-900/20 dark:ring-yellow-800/70',
                )}
              >
                <div className='flex items-start gap-2'>
                  <WarningCircleIcon
                    className={cx(
                      'mt-0.5 size-4 shrink-0',
                      warning.severity === 'danger'
                        ? 'text-red-600 dark:text-red-300'
                        : 'text-yellow-700 dark:text-yellow-300',
                    )}
                  />
                  <div>
                    <Text
                      as='p'
                      size='xs'
                      weight='semibold'
                      className={
                        warning.severity === 'danger'
                          ? 'text-red-900 dark:text-red-100'
                          : 'text-yellow-900 dark:text-yellow-100'
                      }
                    >
                      {t(warning.titleKey)}
                    </Text>
                    <Text
                      as='p'
                      size='xs'
                      className={
                        warning.severity === 'danger'
                          ? 'text-red-800 dark:text-red-200'
                          : 'text-yellow-800 dark:text-yellow-100'
                      }
                    >
                      {t(warning.messageKey, warning.messageValues)}
                    </Text>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {stopRecommendation ? (
          <div className='flex w-full flex-col gap-3 rounded-md bg-green-50 px-3 py-2 ring-1 ring-green-200 sm:flex-row sm:items-center sm:justify-between dark:bg-green-900/20 dark:ring-green-800/70'>
            <div className='flex items-start gap-2'>
              <CheckCircleIcon
                className='mt-0.5 size-4 shrink-0 text-green-600 dark:text-green-300'
                weight='duotone'
              />
              <div>
                <Text
                  as='p'
                  size='xs'
                  weight='semibold'
                  className='text-green-900 dark:text-green-100'
                >
                  {t(stopRecommendation.titleKey)}
                </Text>
                <Text
                  as='p'
                  size='xs'
                  className='text-green-800 dark:text-green-100'
                >
                  {t(
                    stopRecommendation.messageKey,
                    stopRecommendation.messageValues,
                  )}{' '}
                  {t(
                    'experiments.resultDetails.stopRecommendation.confirmBeforeCompleting',
                  )}
                </Text>
              </div>
            </div>
            {completeExperimentButton}
          </div>
        ) : null}
        {results.hasWinner && results.winnerKey ? (
          <div className='flex w-full items-center gap-3 rounded-md border border-green-300 bg-green-50 px-3 py-2 dark:border-green-700 dark:bg-green-900/20'>
            <TrophyIcon
              className='size-5 text-green-600 dark:text-green-400'
              weight='duotone'
            />
            <div>
              <Text
                as='p'
                weight='semibold'
                size='sm'
                className='text-green-800 dark:text-green-200'
              >
                {t('experiments.winnerFound')}
              </Text>
              <Text
                as='p'
                size='xs'
                className='text-green-700 dark:text-green-200'
              >
                {t('experiments.winnerDescription', {
                  variant:
                    results.variants.find((v) => v.key === results.winnerKey)
                      ?.name || results.winnerKey,
                })}
              </Text>
            </div>
          </div>
        ) : null}

        <div className='flex flex-col gap-3 lg:flex-row'>
          <div className='w-full lg:w-[65%]'>
            <WinProbabilityChart
              chartData={results.chart}
              variants={sortedVariants}
              timeBucket={results.resolvedTimeBucket || timeBucket}
            />
          </div>

          <div className='grid w-full grid-cols-2 gap-3 lg:w-[35%]'>
            <StatCard
              icon={<UsersIcon className='text-blue-600' />}
              value={nFormatter(results.totalExposures, 1)}
              label={t('experiments.totalExposures')}
            />
            <StatCard
              icon={<TargetIcon className='text-green-600' />}
              value={nFormatter(results.totalConversions, 1)}
              subValue={`(${overallConversionRate}%)`}
              label={t('experiments.totalConversions')}
            />
            <StatCard
              icon={<FlaskIcon className='text-purple-600' />}
              value={results.variants.length}
              label={t('experiments.variantsCount')}
            />
            <StatCard
              icon={<PercentIcon className='text-amber-600' />}
              value={`${results.confidenceLevel}%`}
              label={t('experiments.confidenceLevel')}
            />
          </div>
        </div>

        <MetricsTable
          variants={sortedVariants}
          winnerKey={results.winnerKey}
          hasWinner={results.hasWinner}
        />

        {experiment.hypothesis ? (
          <CollapsibleSection title={t('experiments.hypothesisLabel')}>
            <Text className='italic' colour='muted'>
              "{experiment.hypothesis}"
            </Text>
          </CollapsibleSection>
        ) : null}
      </div>
    </>
  )
}

export default memo(ExperimentResults)

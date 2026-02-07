import type { ChartOptions } from 'billboard.js'
import { area } from 'billboard.js'
import cx from 'clsx'
import * as d3 from 'd3'
import dayjs from 'dayjs'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import _size from 'lodash/size'
import {
  TrophyIcon,
  UsersIcon,
  TargetIcon,
  InfoIcon,
  PencilIcon,
  TrendUpIcon,
  TrendDownIcon,
  FlaskIcon,
  PercentIcon,
  CaretDownIcon,
  CaretUpIcon,
} from '@phosphor-icons/react'
import { useState, useEffect, useRef, useMemo, memo } from 'react'
import { useTranslation } from 'react-i18next'

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
import { useViewProjectContext } from '~/pages/Project/View/ViewProject'
import BillboardChart from '~/ui/BillboardChart'
import Button from '~/ui/Button'
import Loader from '~/ui/Loader'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'
import { nFormatter } from '~/utils/generic'

import ExperimentSettingsModal from './ExperimentSettingsModal'

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
  <div className='relative overflow-hidden rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900'>
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
      timer: false,
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
        return `<ul class='bg-gray-50 dark:text-gray-50 dark:bg-slate-900 rounded-md ring-1 ring-black/10 px-3 py-1'>
          <li class='font-semibold'>${
            timeFormat === TimeFormat['24-hour']
              ? d3.timeFormat(tbsFormatMapperTooltip24h[timeBucket])(items[0].x)
              : d3.timeFormat(tbsFormatMapperTooltip[timeBucket])(items[0].x)
          }</li>
          <hr class='border-gray-200 dark:border-slate-800' />
          ${_map(items, (el: { id: string; name: string; value: number }) => {
            return `
            <li class='flex justify-between'>
              <div class='flex justify-items-start'>
                <div class='w-3 h-3 rounded-xs mt-1.5 mr-2' style=background-color:${color(el.id)}></div>
                <span>${el.name}</span>
              </div>
              <span class='pl-4 font-medium'>${el.value}%</span>
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
        <div className='flex h-[220px] items-center justify-center rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900'>
          <Text colour='muted' size='sm'>
            {t('experiments.noDataYet')}
          </Text>
        </div>
      )
    }

    return (
      <div className='rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900'>
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
      'px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400',
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
}) => <td className={cx('px-4 py-4', className)}>{children}</td>

const ExposuresTable = memo(
  ({
    variants,
    totalExposures,
  }: {
    variants: ExperimentVariantResult[]
    totalExposures: number
  }) => {
    const { t } = useTranslation()

    return (
      <div className='overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-900/50'>
        <div className='border-b border-gray-200 px-4 py-3 dark:border-slate-800'>
          <Text weight='semibold' size='sm'>
            {t('experiments.totalExposures')}
          </Text>
        </div>
        <div className='overflow-x-auto'>
          <table className='min-w-full divide-y divide-gray-200 dark:divide-slate-800'>
            <thead className='bg-gray-50 dark:bg-slate-900'>
              <tr>
                <TableHeader>{t('experiments.variants')}</TableHeader>
                <TableHeader>{t('experiments.exposures')}</TableHeader>
                <TableHeader className='text-right'>%</TableHeader>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-200 dark:divide-slate-800'>
              {_map(variants, (variant) => {
                const percentage =
                  totalExposures > 0
                    ? ((variant.exposures / totalExposures) * 100).toFixed(1)
                    : '0.0'
                return (
                  <tr
                    key={variant.key}
                    className='hover:bg-gray-50 dark:hover:bg-slate-900/50'
                  >
                    <TableCell>
                      <div className='flex items-center gap-2'>
                        <Text weight='medium' size='sm'>
                          {variant.name}
                        </Text>
                        {variant.isControl ? (
                          <span className='rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'>
                            {t('experiments.control')}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Text size='sm' className='tabular-nums'>
                        {nFormatter(variant.exposures, 1)}
                      </Text>
                    </TableCell>
                    <TableCell className='text-right'>
                      <Text size='sm' colour='muted' className='tabular-nums'>
                        {percentage}%
                      </Text>
                    </TableCell>
                  </tr>
                )
              })}
              <tr className='bg-gray-50 dark:bg-slate-900'>
                <TableCell>
                  <Text weight='semibold' size='sm'>
                    Total
                  </Text>
                </TableCell>
                <TableCell>
                  <Text weight='semibold' size='sm' className='tabular-nums'>
                    {nFormatter(totalExposures, 1)}
                  </Text>
                </TableCell>
                <TableCell className='text-right'>
                  <Text weight='semibold' size='sm' className='tabular-nums'>
                    100.0%
                  </Text>
                </TableCell>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  },
)

ExposuresTable.displayName = 'ExposuresTable'

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
      <div className='overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-900/50'>
        <div className='border-b border-gray-200 px-4 py-3 dark:border-slate-700'>
          <div className='flex items-center gap-2'>
            <Text weight='semibold' size='sm'>
              {t('experiments.conversionRate')}
            </Text>
            <Tooltip text={t('experiments.statisticalNote')} />
          </div>
        </div>
        <div className='overflow-x-auto'>
          <table className='min-w-full divide-y divide-gray-200 dark:divide-slate-800'>
            <thead className='bg-gray-50 dark:bg-slate-900'>
              <tr>
                <TableHeader>{t('experiments.variants')}</TableHeader>
                <TableHeader>Value</TableHeader>
                <TableHeader>{t('experiments.improvement')}</TableHeader>
                <TableHeader>
                  {t('experiments.probabilityOfWinning')}
                </TableHeader>
                <TableHeader className='w-48'>
                  <div className='flex items-center justify-between text-[10px]'>
                    <span>-30%</span>
                    <span>0%</span>
                    <span>+30%</span>
                  </div>
                </TableHeader>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-200 dark:divide-slate-800'>
              {controlVariant ? (
                <tr className='hover:bg-gray-50 dark:hover:bg-slate-900/50'>
                  <TableCell>
                    <div className='flex items-center gap-2'>
                      <Text weight='medium' size='sm'>
                        {controlVariant.name}
                      </Text>
                      <span className='rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'>
                        {t('experiments.control')}
                      </span>
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
                      'hover:bg-gray-50 dark:hover:bg-slate-900/50',
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
                          <span className='flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/50 dark:text-green-300'>
                            <TrophyIcon className='size-3' />
                            {t('experiments.winner')}
                          </span>
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
                          <span className='rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/50 dark:text-green-300'>
                            Significant
                          </span>
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

  const [experiment, setExperiment] = useState<Experiment | null>(null)
  const [results, setResults] = useState<ExperimentResultsType | null>(null)
  const [goal, setGoal] = useState<Goal | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

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
    reloadToken,
    refreshTrigger,
  ])

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
        rightContent={
          <Tooltip
            text={
              results.status === 'running'
                ? t('experiments.editDisabledRunning')
                : results.status === 'completed'
                  ? t('experiments.editDisabledCompleted')
                  : t('common.edit')
            }
            tooltipNode={
              <Button
                type='button'
                onClick={() => setIsSettingsOpen(true)}
                disabled={
                  results.status === 'running' || results.status === 'completed'
                }
                ghost
                small
              >
                <PencilIcon className='mr-1 size-4' />
                {t('common.edit')}
              </Button>
            }
          />
        }
        leftContent={
          <div className='flex items-center gap-2'>
            <FlaskIcon className='size-5 text-purple-500' />
            <Text as='h2' size='xl' weight='bold' truncate>
              {experiment.name}
            </Text>
            <div
              className={cx(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                {
                  'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400':
                    results.status === 'draft',
                  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400':
                    results.status === 'running',
                  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400':
                    results.status === 'paused',
                  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400':
                    results.status === 'completed',
                },
              )}
            >
              {t(`experiments.status.${results.status}`)}
            </div>
            {goal?.name ? (
              <div className='inline-flex max-w-[240px] items-center gap-1.5 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300'>
                <TargetIcon className='size-3.5' />
                <Text
                  as='span'
                  size='xs'
                  weight='medium'
                  colour='inherit'
                  truncate
                >
                  {goal.name}
                </Text>
              </div>
            ) : null}
          </div>
        }
      />
      <ExperimentSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSuccess={() => setReloadToken((v) => v + 1)}
        projectId={experiment.pid}
        experimentId={experiment.id}
      />
      <div className='space-y-3'>
        {results.hasWinner && results.winnerKey ? (
          <div className='flex items-center gap-4 rounded-lg border border-green-300 bg-linear-to-r from-green-50 to-emerald-50 p-4 dark:border-green-700 dark:bg-green-900/20'>
            <div className='flex size-12 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50'>
              <TrophyIcon className='size-6 text-green-600 dark:text-green-400' />
            </div>
            <div>
              <Text
                weight='bold'
                size='lg'
                className='text-green-800 dark:text-green-200'
              >
                {t('experiments.winnerFound')}
              </Text>
              <Text size='sm' className='text-green-700 dark:text-green-300'>
                {t('experiments.winnerDescription', {
                  variant:
                    results.variants.find((v) => v.key === results.winnerKey)
                      ?.name || results.winnerKey,
                })}
              </Text>
            </div>
          </div>
        ) : null}

        {results.totalExposures === 0 ? (
          <div className='flex items-start gap-4 rounded-lg border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20'>
            <div className='flex size-12 shrink-0 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/40'>
              <InfoIcon className='size-6 text-yellow-700 dark:text-yellow-300' />
            </div>
            <div className='min-w-0 flex-1'>
              <Text
                as='p'
                weight='bold'
                size='lg'
                className='text-yellow-900 dark:text-yellow-100'
              >
                {t('experiments.noDataYet')}
              </Text>
              <Text as='p' colour='muted' size='sm' className='mt-1'>
                {t('experiments.noDataDescription')}
              </Text>
              {goal?.name ? (
                <div className='mt-2 flex items-center gap-2 text-yellow-900/80 dark:text-yellow-100/80'>
                  <TargetIcon className='size-4' />
                  <Text as='p' size='sm'>
                    {t('experiments.goal')}:{' '}
                    <Text as='span' size='sm' weight='medium'>
                      {goal.name}
                    </Text>
                  </Text>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className='flex flex-col gap-3 lg:flex-row'>
          <div className='w-full lg:w-[65%]'>
            <WinProbabilityChart
              chartData={results.chart}
              variants={sortedVariants}
              timeBucket={timeBucket}
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

        <ExposuresTable
          variants={sortedVariants}
          totalExposures={results.totalExposures}
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

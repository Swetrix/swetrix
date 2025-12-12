import cx from 'clsx'
import _map from 'lodash/map'
import {
  ArrowLeftIcon,
  TrophyIcon,
  UsersIcon,
  TargetIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  FlaskConicalIcon,
  PercentIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from 'lucide-react'
import { useState, useEffect, useRef, useMemo, memo } from 'react'
import { useTranslation } from 'react-i18next'

import {
  getExperiment,
  getExperimentResults,
  type Experiment,
  type ExperimentResults as ExperimentResultsType,
  type ExperimentVariantResult,
} from '~/api'
import Button from '~/ui/Button'
import Loader from '~/ui/Loader'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'
import { nFormatter } from '~/utils/generic'

interface ExperimentResultsProps {
  experimentId: string
  period: string
  from: string
  to: string
  timezone?: string
  onBack: () => void
}

// Stats card component for the 2x2 grid
const StatCard = memo(
  ({
    icon: Icon,
    label,
    value,
    subValue,
    iconClassName,
  }: {
    icon: React.ElementType
    label: string
    value: string | number
    subValue?: string
    iconClassName?: string
  }) => (
    <div className='flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800/50'>
      <div
        className={cx(
          'flex size-10 shrink-0 items-center justify-center rounded-lg',
          iconClassName || 'bg-indigo-100 dark:bg-indigo-900/30',
        )}
      >
        <Icon
          className={cx(
            'size-5',
            iconClassName
              ? iconClassName.replace('bg-', 'text-').replace('/30', '')
              : 'text-indigo-600 dark:text-indigo-400',
          )}
          strokeWidth={1.5}
        />
      </div>
      <div className='min-w-0 flex-1'>
        <Text size='xs' colour='muted' className='truncate'>
          {label}
        </Text>
        <div className='flex items-baseline gap-1.5'>
          <Text as='p' weight='bold' size='xl' className='tabular-nums'>
            {value}
          </Text>
          {subValue && (
            <Text size='xs' colour='muted'>
              {subValue}
            </Text>
          )}
        </div>
      </div>
    </div>
  ),
)

StatCard.displayName = 'StatCard'

// Confidence interval visualization (diamond chart like PostHog)
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
    // Calculate position on the bar (-30% to +30% range)
    const maxRange = 30
    const clampedImprovement = Math.max(-maxRange, Math.min(maxRange, improvement))
    const position = ((clampedImprovement + maxRange) / (maxRange * 2)) * 100

    // Determine color based on improvement and confidence
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
        {/* Background bar */}
        <div className='absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-gray-100 dark:bg-slate-700' />

        {/* Center line (0%) */}
        <div className='absolute top-1/2 left-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-gray-300 dark:bg-gray-600' />

        {/* Diamond marker */}
        <div className='absolute top-1/2 -translate-x-1/2 -translate-y-1/2' style={{ left: `${position}%` }}>
          <div className={cx('size-3.5 rotate-45 rounded-sm shadow-sm', getColor())} />
        </div>
      </div>
    )
  },
)

ConfidenceBar.displayName = 'ConfidenceBar'

// Table header cell
const TableHeader = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <th
    className={cx(
      'px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400',
      className,
    )}
  >
    {children}
  </th>
)

// Table data cell
const TableCell = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <td className={cx('px-4 py-4', className)}>{children}</td>
)

// Exposures table component (like PostHog)
const ExposuresTable = memo(
  ({ variants, totalExposures }: { variants: ExperimentVariantResult[]; totalExposures: number }) => {
    const { t } = useTranslation()

    return (
      <div className='overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/50'>
        <div className='border-b border-gray-200 px-4 py-3 dark:border-slate-700'>
          <Text weight='semibold' size='sm'>
            {t('experiments.totalExposures')}
          </Text>
        </div>
        <div className='overflow-x-auto'>
          <table className='min-w-full divide-y divide-gray-200 dark:divide-slate-700'>
            <thead className='bg-gray-50 dark:bg-slate-800'>
              <tr>
                <TableHeader>{t('experiments.variants')}</TableHeader>
                <TableHeader>{t('experiments.exposures')}</TableHeader>
                <TableHeader className='text-right'>%</TableHeader>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-200 dark:divide-slate-700'>
              {_map(variants, (variant) => {
                const percentage = totalExposures > 0 ? ((variant.exposures / totalExposures) * 100).toFixed(1) : '0.0'
                return (
                  <tr key={variant.key} className='hover:bg-gray-50 dark:hover:bg-slate-700/30'>
                    <TableCell>
                      <div className='flex items-center gap-2'>
                        <Text weight='medium' size='sm'>
                          {variant.name}
                        </Text>
                        {variant.isControl && (
                          <span className='rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'>
                            {t('experiments.control')}
                          </span>
                        )}
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
              <tr className='bg-gray-50 dark:bg-slate-800'>
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

// Metrics results table component (like PostHog)
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
      <div className='overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/50'>
        <div className='border-b border-gray-200 px-4 py-3 dark:border-slate-700'>
          <div className='flex items-center gap-2'>
            <Text weight='semibold' size='sm'>
              {t('experiments.conversionRate')}
            </Text>
            <Tooltip text={t('experiments.statisticalNote')} />
          </div>
        </div>
        <div className='overflow-x-auto'>
          <table className='min-w-full divide-y divide-gray-200 dark:divide-slate-700'>
            <thead className='bg-gray-50 dark:bg-slate-800'>
              <tr>
                <TableHeader>{t('experiments.variants')}</TableHeader>
                <TableHeader>Value</TableHeader>
                <TableHeader>{t('experiments.improvement')}</TableHeader>
                <TableHeader>{t('experiments.probabilityOfWinning')}</TableHeader>
                <TableHeader className='w-48'>
                  <div className='flex items-center justify-between text-[10px]'>
                    <span>-30%</span>
                    <span>0%</span>
                    <span>+30%</span>
                  </div>
                </TableHeader>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-200 dark:divide-slate-700'>
              {/* Control variant */}
              {controlVariant && (
                <tr className='hover:bg-gray-50 dark:hover:bg-slate-700/30'>
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
                    <div>
                      <Text weight='semibold' size='sm' className='tabular-nums'>
                        {controlVariant.conversionRate}%
                      </Text>
                      <Text size='xs' colour='muted' className='tabular-nums'>
                        {nFormatter(controlVariant.conversions, 1)} / {nFormatter(controlVariant.exposures, 1)}
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
                      probabilityOfWinning={controlVariant.probabilityOfBeingBest}
                      isControl
                    />
                  </TableCell>
                </tr>
              )}

              {/* Test variants */}
              {_map(testVariants, (variant) => {
                const isWinner = hasWinner && variant.key === winnerKey
                const isPositive = variant.improvement > 0

                return (
                  <tr
                    key={variant.key}
                    className={cx('hover:bg-gray-50 dark:hover:bg-slate-700/30', {
                      'bg-green-50/50 dark:bg-green-900/10': isWinner,
                    })}
                  >
                    <TableCell>
                      <div className='flex items-center gap-2'>
                        <Text weight='medium' size='sm'>
                          {variant.name}
                        </Text>
                        {isWinner && (
                          <span className='flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/50 dark:text-green-300'>
                            <TrophyIcon className='size-3' />
                            {t('experiments.winner')}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <Text weight='semibold' size='sm' className='tabular-nums'>
                          {variant.conversionRate}%
                        </Text>
                        <Text size='xs' colour='muted' className='tabular-nums'>
                          {nFormatter(variant.conversions, 1)} / {nFormatter(variant.exposures, 1)}
                        </Text>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div
                        className={cx('flex items-center gap-1 text-sm font-medium', {
                          'text-green-600 dark:text-green-400': isPositive,
                          'text-red-600 dark:text-red-400': !isPositive && variant.improvement !== 0,
                          'text-gray-500 dark:text-gray-400': variant.improvement === 0,
                        })}
                      >
                        {variant.improvement !== 0 ? (
                          <>
                            {isPositive ? (
                              <TrendingUpIcon className='size-4' />
                            ) : (
                              <TrendingDownIcon className='size-4' />
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
                          weight={variant.probabilityOfBeingBest >= 95 ? 'semibold' : 'normal'}
                          className={cx('tabular-nums', {
                            'text-green-600 dark:text-green-400': variant.probabilityOfBeingBest >= 95,
                          })}
                        >
                          {variant.probabilityOfBeingBest}%
                        </Text>
                        {variant.probabilityOfBeingBest >= 95 && (
                          <span className='rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/50 dark:text-green-300'>
                            Significant
                          </span>
                        )}
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

// Collapsible section component
const CollapsibleSection = memo(
  ({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen)

    return (
      <div className='overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/50'>
        <button
          type='button'
          onClick={() => setIsOpen(!isOpen)}
          className='flex w-full items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/30'
        >
          <Text weight='semibold' size='sm'>
            {title}
          </Text>
          {isOpen ? (
            <ChevronUpIcon className='size-4 text-gray-500' />
          ) : (
            <ChevronDownIcon className='size-4 text-gray-500' />
          )}
        </button>
        {isOpen && <div className='border-t border-gray-200 px-4 py-4 dark:border-slate-700'>{children}</div>}
      </div>
    )
  },
)

CollapsibleSection.displayName = 'CollapsibleSection'

const ExperimentResults = ({ experimentId, period, from, to, timezone, onBack }: ExperimentResultsProps) => {
  const { t } = useTranslation()
  const isMountedRef = useRef(true)

  const [experiment, setExperiment] = useState<Experiment | null>(null)
  const [results, setResults] = useState<ExperimentResultsType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const [experimentData, resultsData] = await Promise.all([
          getExperiment(experimentId),
          getExperimentResults(experimentId, period, from, to, timezone),
        ])

        if (isMountedRef.current) {
          setExperiment(experimentData)
          setResults(resultsData)
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
  }, [experimentId, period, from, to, timezone])

  // Calculate overall conversion rate
  const overallConversionRate = useMemo(() => {
    if (!results || results.totalExposures === 0) return 0
    return ((results.totalConversions / results.totalExposures) * 100).toFixed(2)
  }, [results])

  // Sort variants: control first, then by probability
  const sortedVariants = useMemo(() => {
    if (!results) return []
    return [...results.variants].sort((a, b) => {
      if (a.isControl) return -1
      if (b.isControl) return 1
      return b.probabilityOfBeingBest - a.probabilityOfBeingBest
    })
  }, [results])

  if (isLoading) {
    return (
      <div className='mt-4'>
        <Loader />
      </div>
    )
  }

  if (error || !experiment || !results) {
    return (
      <div className='mt-4'>
        <Button onClick={onBack} secondary small className='mb-4'>
          <ArrowLeftIcon className='mr-1 size-4' />
          {t('common.back')}
        </Button>
        <div className='rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20'>
          <Text colour='muted'>{error || t('experiments.loadError')}</Text>
        </div>
      </div>
    )
  }

  return (
    <div className='mt-4 space-y-6'>
      {/* Header */}
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex items-center gap-4'>
          <Button onClick={onBack} secondary small>
            <ArrowLeftIcon className='mr-1 size-4' />
            {t('common.back')}
          </Button>
          <div className='min-w-0'>
            <div className='flex items-center gap-2'>
              <FlaskConicalIcon className='size-5 text-purple-500' strokeWidth={1.5} />
              <Text as='h2' size='xl' weight='bold' truncate>
                {experiment.name}
              </Text>
            </div>
            {experiment.description && (
              <Text size='sm' colour='muted' className='mt-0.5'>
                {experiment.description}
              </Text>
            )}
          </div>
        </div>
        <div
          className={cx('inline-flex items-center self-start rounded-full px-3 py-1 text-sm font-medium', {
            'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400': results.status === 'draft',
            'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400': results.status === 'running',
            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400': results.status === 'paused',
            'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400': results.status === 'completed',
          })}
        >
          {t(`experiments.status.${results.status}`)}
        </div>
      </div>

      {/* Winner announcement */}
      {results.hasWinner && results.winnerKey && (
        <div className='flex items-center gap-4 rounded-xl border border-green-300 bg-linear-to-r from-green-50 to-emerald-50 p-4 dark:border-green-700 dark:bg-green-900/20'>
          <div className='flex size-12 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50'>
            <TrophyIcon className='size-6 text-green-600 dark:text-green-400' />
          </div>
          <div>
            <Text weight='bold' size='lg' className='text-green-800 dark:text-green-200'>
              {t('experiments.winnerFound')}
            </Text>
            <Text size='sm' className='text-green-700 dark:text-green-300'>
              {t('experiments.winnerDescription', {
                variant: results.variants.find((v) => v.key === results.winnerKey)?.name || results.winnerKey,
              })}
            </Text>
          </div>
        </div>
      )}

      {/* No data message */}
      {results.totalExposures === 0 && (
        <div className='rounded-xl border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20'>
          <Text weight='semibold'>{t('experiments.noDataYet')}</Text>
          <Text colour='muted' size='sm' className='mt-1'>
            {t('experiments.noDataDescription')}
          </Text>
        </div>
      )}

      {/* Stats Grid - 2x2 layout */}
      <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
        <StatCard
          icon={UsersIcon}
          label={t('experiments.totalExposures')}
          value={nFormatter(results.totalExposures, 1)}
          iconClassName='bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
        />
        <StatCard
          icon={TargetIcon}
          label={t('experiments.totalConversions')}
          value={nFormatter(results.totalConversions, 1)}
          subValue={`${overallConversionRate}%`}
          iconClassName='bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
        />
        <StatCard
          icon={FlaskConicalIcon}
          label={t('experiments.variantsCount')}
          value={results.variants.length}
          iconClassName='bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
        />
        <StatCard
          icon={PercentIcon}
          label={t('experiments.confidenceLevel')}
          value={`${results.confidenceLevel}%`}
          iconClassName='bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
        />
      </div>

      {/* Metrics Table */}
      <MetricsTable variants={sortedVariants} winnerKey={results.winnerKey} hasWinner={results.hasWinner} />

      {/* Exposures Table */}
      <ExposuresTable variants={sortedVariants} totalExposures={results.totalExposures} />

      {/* Hypothesis */}
      {experiment.hypothesis && (
        <CollapsibleSection title={t('experiments.hypothesisLabel')}>
          <Text className='italic' colour='muted'>
            "{experiment.hypothesis}"
          </Text>
        </CollapsibleSection>
      )}

      {/* Statistical note */}
      <div className='rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50'>
        <Text size='xs' colour='muted'>
          {t('experiments.statisticalNote')}
        </Text>
      </div>
    </div>
  )
}

export default memo(ExperimentResults)

import cx from 'clsx'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import _maxBy from 'lodash/maxBy'
import { ArrowLeftIcon, TrophyIcon, UsersIcon, TargetIcon, TrendingUpIcon, TrendingDownIcon } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import {
  getExperiment,
  getExperimentResults,
  type Experiment,
  type ExperimentResults as ExperimentResultsType,
  type ExperimentVariantResult,
} from '~/api'
import Button from '~/ui/Button'
import Spin from '~/ui/icons/Spin'
import Loader from '~/ui/Loader'
import { Text } from '~/ui/Text'
import { nFormatter } from '~/utils/generic'

interface ExperimentResultsProps {
  experimentId: string
  period: string
  from: string
  to: string
  timezone?: string
  onBack: () => void
}

const VariantCard = ({
  variant,
  isWinner,
  controlRate,
}: {
  variant: ExperimentVariantResult
  isWinner: boolean
  controlRate: number
}) => {
  const { t } = useTranslation()

  const hasImprovement = !variant.isControl && variant.improvement !== 0
  const isPositiveImprovement = variant.improvement > 0

  return (
    <div
      className={cx(
        'relative overflow-hidden rounded-xl border p-4',
        isWinner
          ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
          : variant.isControl
            ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-900/20'
            : 'border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800',
      )}
    >
      {isWinner && (
        <div className='absolute top-2 right-2'>
          <TrophyIcon className='size-6 text-green-500' />
        </div>
      )}

      <div className='flex items-center gap-2'>
        <Text as='h3' weight='semibold' size='lg'>
          {variant.name}
        </Text>
        {variant.isControl && (
          <span className='rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'>
            {t('experiments.control')}
          </span>
        )}
        {isWinner && (
          <span className='rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/50 dark:text-green-300'>
            {t('experiments.winner')}
          </span>
        )}
      </div>

      <Text as='p' size='xs' colour='muted' className='font-mono'>
        {variant.key}
      </Text>

      <div className='mt-4 grid grid-cols-2 gap-4'>
        {/* Exposures */}
        <div>
          <div className='flex items-center gap-1 text-gray-500 dark:text-gray-400'>
            <UsersIcon className='size-4' />
            <Text size='xs'>{t('experiments.exposures')}</Text>
          </div>
          <Text as='p' weight='semibold' size='xl'>
            {nFormatter(variant.exposures, 1)}
          </Text>
        </div>

        {/* Conversions */}
        <div>
          <div className='flex items-center gap-1 text-gray-500 dark:text-gray-400'>
            <TargetIcon className='size-4' />
            <Text size='xs'>{t('experiments.conversions')}</Text>
          </div>
          <Text as='p' weight='semibold' size='xl'>
            {nFormatter(variant.conversions, 1)}
          </Text>
        </div>
      </div>

      {/* Conversion Rate */}
      <div className='mt-4'>
        <Text size='sm' colour='muted'>
          {t('experiments.conversionRate')}
        </Text>
        <div className='flex items-baseline gap-2'>
          <Text as='p' weight='bold' size='2xl'>
            {variant.conversionRate}%
          </Text>
          {hasImprovement && (
            <div
              className={cx('flex items-center gap-0.5 text-sm font-medium', {
                'text-green-600 dark:text-green-400': isPositiveImprovement,
                'text-red-600 dark:text-red-400': !isPositiveImprovement,
              })}
            >
              {isPositiveImprovement ? <TrendingUpIcon className='size-4' /> : <TrendingDownIcon className='size-4' />}
              {isPositiveImprovement ? '+' : ''}
              {variant.improvement.toFixed(1)}%
            </div>
          )}
        </div>
      </div>

      {/* Probability of winning */}
      <div className='mt-4'>
        <div className='flex items-center justify-between'>
          <Text size='sm' colour='muted'>
            {t('experiments.probabilityOfWinning')}
          </Text>
          <Text size='sm' weight='semibold'>
            {variant.probabilityOfBeingBest}%
          </Text>
        </div>
        <div className='mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700'>
          <div
            className={cx('h-full rounded-full transition-all duration-500', {
              'bg-green-500': variant.probabilityOfBeingBest >= 95,
              'bg-yellow-500': variant.probabilityOfBeingBest >= 80 && variant.probabilityOfBeingBest < 95,
              'bg-gray-400 dark:bg-gray-500': variant.probabilityOfBeingBest < 80,
            })}
            style={{ width: `${variant.probabilityOfBeingBest}%` }}
          />
        </div>
      </div>
    </div>
  )
}

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
        <div className='rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20'>
          <Text colour='muted'>{error || t('experiments.loadError')}</Text>
        </div>
      </div>
    )
  }

  const controlVariant = results.variants.find((v) => v.isControl)
  const controlRate = controlVariant?.conversionRate || 0

  // Sort variants: control first, then by probability
  const sortedVariants = [...results.variants].sort((a, b) => {
    if (a.isControl) return -1
    if (b.isControl) return 1
    return b.probabilityOfBeingBest - a.probabilityOfBeingBest
  })

  return (
    <div className='mt-4'>
      {/* Header */}
      <div className='mb-6 flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Button onClick={onBack} secondary small>
            <ArrowLeftIcon className='mr-1 size-4' />
            {t('common.back')}
          </Button>
          <div>
            <Text as='h2' size='xl' weight='bold'>
              {experiment.name}
            </Text>
            {experiment.description && (
              <Text size='sm' colour='muted'>
                {experiment.description}
              </Text>
            )}
          </div>
        </div>
        <div
          className={cx('rounded-full px-3 py-1 text-sm font-medium', {
            'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400': results.status === 'draft',
            'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400': results.status === 'running',
            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400': results.status === 'paused',
            'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400': results.status === 'completed',
          })}
        >
          {t(`experiments.status.${results.status}`)}
        </div>
      </div>

      {/* Summary stats */}
      <div className='mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4'>
        <div className='rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800'>
          <Text size='sm' colour='muted'>
            {t('experiments.totalExposures')}
          </Text>
          <Text as='p' weight='bold' size='2xl'>
            {nFormatter(results.totalExposures, 1)}
          </Text>
        </div>
        <div className='rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800'>
          <Text size='sm' colour='muted'>
            {t('experiments.totalConversions')}
          </Text>
          <Text as='p' weight='bold' size='2xl'>
            {nFormatter(results.totalConversions, 1)}
          </Text>
        </div>
        <div className='rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800'>
          <Text size='sm' colour='muted'>
            {t('experiments.variantsCount')}
          </Text>
          <Text as='p' weight='bold' size='2xl'>
            {results.variants.length}
          </Text>
        </div>
        <div className='rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800'>
          <Text size='sm' colour='muted'>
            {t('experiments.confidenceLevel')}
          </Text>
          <Text as='p' weight='bold' size='2xl'>
            {results.confidenceLevel}%
          </Text>
        </div>
      </div>

      {/* Winner announcement */}
      {results.hasWinner && results.winnerKey && (
        <div className='mb-6 flex items-center gap-3 rounded-lg border border-green-300 bg-green-50 p-4 dark:border-green-700 dark:bg-green-900/20'>
          <TrophyIcon className='size-8 text-green-500' />
          <div>
            <Text weight='semibold' size='lg'>
              {t('experiments.winnerFound')}
            </Text>
            <Text colour='muted'>
              {t('experiments.winnerDescription', {
                variant: results.variants.find((v) => v.key === results.winnerKey)?.name || results.winnerKey,
              })}
            </Text>
          </div>
        </div>
      )}

      {/* No data message */}
      {results.totalExposures === 0 && (
        <div className='mb-6 rounded-lg border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20'>
          <Text weight='semibold'>{t('experiments.noDataYet')}</Text>
          <Text colour='muted' size='sm'>
            {t('experiments.noDataDescription')}
          </Text>
        </div>
      )}

      {/* Variant cards */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {_map(sortedVariants, (variant) => (
          <VariantCard
            key={variant.key}
            variant={variant}
            isWinner={results.hasWinner && variant.key === results.winnerKey}
            controlRate={controlRate}
          />
        ))}
      </div>

      {/* Hypothesis reminder */}
      {experiment.hypothesis && (
        <div className='mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800'>
          <Text weight='semibold' size='sm'>
            {t('experiments.hypothesisLabel')}
          </Text>
          <Text className='mt-1 italic' colour='muted'>
            {experiment.hypothesis}
          </Text>
        </div>
      )}

      {/* Statistical note */}
      <div className='mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800'>
        <Text size='xs' colour='muted'>
          {t('experiments.statisticalNote')}
        </Text>
      </div>
    </div>
  )
}

export default ExperimentResults

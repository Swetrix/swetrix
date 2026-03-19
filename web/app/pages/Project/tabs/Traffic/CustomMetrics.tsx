import { ScalesIcon, XIcon } from '@phosphor-icons/react'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '~/utils/generic'

import { ProjectViewCustomEvent } from '../../View/interfaces/traffic'

interface CustomMetricProps {
  metric: ProjectViewCustomEvent
  onRemove: () => void
}

const CustomMetric = ({ metric, onRemove }: CustomMetricProps) => {
  const { t } = useTranslation('common')

  const displayValue = useMemo(() => {
    const { customEventName, metaKey, metaValue, metricKey } = metric

    if (metaKey && metaValue) {
      return t('project.metrics.filterKV', {
        customEventName,
        metaKey,
        metaValue,
        metricKey,
      })
    }

    if (metaKey) {
      return t('project.metrics.filterK', {
        customEventName,
        metaKey,
        metricKey,
      })
    }

    if (metaValue) {
      return t('project.metrics.filterV', {
        customEventName,
        metaValue,
        metricKey,
      })
    }

    return t('project.metrics.filterNoKV', {
      customEventName,
      metricKey,
    })
  }, [t, metric])

  return (
    <span className='m-1 inline-flex items-center rounded-md border border-gray-200 bg-white py-0.5 pr-1 pl-2.5 text-sm font-medium text-gray-700 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-gray-200'>
      {displayValue}
      <button
        onClick={onRemove}
        type='button'
        className='ml-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:bg-gray-100 focus:text-gray-700 focus:outline-hidden dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-gray-200 dark:focus:bg-slate-700 dark:focus:text-gray-200'
        title={t('project.removeFilter')}
        aria-label={t('project.removeFilter')}
      >
        <svg
          className='h-2 w-2'
          stroke='currentColor'
          fill='none'
          viewBox='0 0 8 8'
        >
          <path strokeLinecap='round' strokeWidth='1.5' d='M1 1l6 6m0-6L1 7' />
        </svg>
      </button>
    </span>
  )
}

interface FiltersProps {
  metrics: ProjectViewCustomEvent[]
  onRemoveMetric: (id: ProjectViewCustomEvent['id']) => void
  resetMetrics: () => void
  className?: string
}

const CustomMetrics = ({
  metrics,
  onRemoveMetric,
  resetMetrics,
  className,
}: FiltersProps) => {
  const { t } = useTranslation('common')

  if (_isEmpty(metrics)) {
    return null
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg border border-gray-200 bg-white px-2 py-1 dark:border-slate-800/60 dark:bg-slate-900/25',
        className,
      )}
    >
      <div className='flex min-w-0 flex-1 items-center gap-1'>
        <ScalesIcon className='size-5 shrink-0 text-gray-500 dark:text-gray-400' />
        <div className='flex flex-wrap'>
          {_map(metrics, (metric) => (
            <CustomMetric
              key={metric.id}
              metric={metric}
              onRemove={() => {
                onRemoveMetric(metric.id)
              }}
            />
          ))}
        </div>
      </div>
      <button
        type='button'
        title={t('project.resetFilters')}
        aria-label={t('project.resetFilters')}
        onClick={resetMetrics}
        className='shrink-0'
      >
        <XIcon className='size-5 cursor-pointer rounded-md p-0.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-gray-200' />
      </button>
    </div>
  )
}

export default memo(CustomMetrics)

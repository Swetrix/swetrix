import { ScaleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import React, { memo, useMemo } from 'react'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import { useTranslation } from 'react-i18next'

import { IProjectViewCustomEvent } from '../interfaces/traffic'

interface ICustomMetric {
  metric: IProjectViewCustomEvent
  onRemove: () => void
}

const CustomMetric = ({ metric, onRemove }: ICustomMetric): JSX.Element => {
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
    <span className='m-1 inline-flex items-center rounded-md bg-gray-50 py-0.5 pl-2.5 pr-1 text-sm font-medium text-gray-800 dark:bg-slate-800 dark:text-gray-50'>
      {displayValue}
      <button
        onClick={onRemove}
        type='button'
        className='ml-0.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-gray-800 hover:bg-gray-300 hover:text-gray-900 focus:bg-gray-300 focus:text-gray-900 focus:outline-none dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-gray-800 dark:hover:text-gray-300 dark:focus:bg-gray-800 dark:focus:text-gray-300'
      >
        <span className='sr-only'>Remove filter</span>
        <svg className='h-2 w-2' stroke='currentColor' fill='none' viewBox='0 0 8 8'>
          <path strokeLinecap='round' strokeWidth='1.5' d='M1 1l6 6m0-6L1 7' />
        </svg>
      </button>
    </span>
  )
}

interface IFilters {
  metrics: IProjectViewCustomEvent[]
  onRemoveMetric: (id: IProjectViewCustomEvent['id']) => void
  resetMetrics: () => void
}

const CustomMetrics = ({ metrics, onRemoveMetric, resetMetrics }: IFilters) => {
  if (_isEmpty(metrics)) {
    return null
  }

  return (
    <div className='mt-2 flex items-center justify-between rounded-md bg-slate-200 p-1 shadow dark:border dark:border-slate-800/50 dark:bg-slate-800/25'>
      <div className='flex items-center'>
        <ScaleIcon className='box-content size-6 flex-shrink-0 px-1 text-gray-700 dark:text-gray-200' />
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
      <XMarkIcon
        className='box-content size-6 flex-shrink-0 cursor-pointer stroke-2 px-1 text-gray-800 hover:text-gray-600 dark:text-gray-200 dark:hover:text-gray-300'
        onClick={resetMetrics}
      />
    </div>
  )
}

export default memo(CustomMetrics)

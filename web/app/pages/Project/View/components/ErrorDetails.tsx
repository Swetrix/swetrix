import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { SwetrixErrorDetails } from '~/lib/models/Project'
import Tooltip from '~/ui/Tooltip'
import { getRelativeDateIfPossible } from '~/utils/date'

import { MetricCard } from './MetricCards'

interface IAggregatedMetadata {
  key: string
  value: string
  count: number
}

interface ErrorDetailsProps {
  details: SwetrixErrorDetails
  metadata?: IAggregatedMetadata[]
}

export const ErrorDetails = ({ details, metadata }: ErrorDetailsProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')

  const firstSeen = useMemo(() => {
    return getRelativeDateIfPossible(details.first_seen, language)
  }, [details.first_seen, language])

  const lastSeen = useMemo(() => {
    return getRelativeDateIfPossible(details.last_seen, language)
  }, [details.last_seen, language])

  return (
    <div className='mb-5'>
      <div className='mb-5 flex flex-wrap justify-center gap-5 lg:justify-start'>
        <div className='flex flex-col font-mono'>
          <p className='font-bold tracking-tighter text-slate-900 max-md:text-xl md:text-2xl dark:text-gray-50'>{`${details.name}${details.message ? `: ${details.message}` : ''}`}</p>
          <p className='text-sm font-bold tracking-tighter text-slate-800 dark:text-gray-200'>
            {t('dashboard.atFile', {
              filename: details.filename ?? 'Unknown file',
              lineno: details.lineno ?? 'N/A',
              colno: details.colno ?? 'N/A',
            })}
          </p>
        </div>

        <MetricCard
          classes={{
            value: 'max-md:text-xl md:text-2xl',
            label: '[&_span]:!text-slate-800 dark:[&_span]:!text-gray-200',
          }}
          label={t('dashboard.firstSeen')}
          value={details.first_seen || 'N/A'}
          valueMapper={(value) => (
            <Tooltip className='max-w-content !w-full' tooltipNode={<span>{firstSeen}</span>} text={`${value} UTC`} />
          )}
        />

        <MetricCard
          classes={{
            value: 'max-md:text-xl md:text-2xl',
            label: '[&_span]:!text-slate-800 dark:[&_span]:!text-gray-200',
          }}
          label={t('dashboard.lastSeen')}
          value={details.last_seen || 'N/A'}
          valueMapper={(value) => (
            <Tooltip className='max-w-content !w-full' tooltipNode={<span>{lastSeen}</span>} text={`${value} UTC`} />
          )}
        />
      </div>

      {details.stackTrace && (
        <div className='mb-5'>
          <h3 className='mb-2 text-lg font-medium text-slate-900 dark:text-gray-50'>Stack trace</h3>
          <pre className='max-h-64 overflow-auto rounded-lg bg-slate-100 p-4 text-sm text-slate-800 dark:bg-slate-800 dark:text-gray-200'>
            {details.stackTrace}
          </pre>
        </div>
      )}

      {metadata && metadata.length > 0 && (
        <div className='mb-5'>
          <h3 className='mb-2 text-lg font-medium text-slate-900 dark:text-gray-50'>Metadata</h3>
          <div className='rounded-lg border border-slate-200 dark:border-slate-700'>
            <div className='grid grid-cols-3 gap-4 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-gray-300'>
              <div>Key</div>
              <div>Value</div>
              <div>Count</div>
            </div>
            {metadata.map((item, index) => (
              <div
                key={`${item.key}-${item.value}-${index}`}
                className='grid grid-cols-3 gap-4 border-t border-slate-200 px-4 py-2 text-sm dark:border-slate-700'
              >
                <div className='font-mono text-slate-900 dark:text-gray-50'>{item.key}</div>
                <div className='font-mono text-slate-700 dark:text-gray-300'>{item.value}</div>
                <div className='text-slate-600 dark:text-gray-400'>{item.count}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

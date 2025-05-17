import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { SwetrixErrorDetails } from '~/lib/models/Project'
import Tooltip from '~/ui/Tooltip'
import { getRelativeDateIfPossible } from '~/utils/date'

import { MetricCard } from './MetricCards'

interface ErrorDetailsProps {
  details: SwetrixErrorDetails
}

export const ErrorDetails = ({ details }: ErrorDetailsProps) => {
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
  )
}

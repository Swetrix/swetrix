import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { IErrorDetails } from '../interfaces/error'
import { MetricCard } from './MetricCards'
import { getRelativeDateIfPossible } from 'utils/date'
import Tooltip from 'ui/Tooltip'

interface IErrorDetailsComponent {
  details: IErrorDetails
}

export const ErrorDetails = ({ details }: IErrorDetailsComponent) => {
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
      <div className='flex flex-col'>
        <p className='font-bold text-slate-900 dark:text-gray-50 max-md:text-xl md:text-3xl'>{`${details.name}: ${details.message}`}</p>
        <p className='text-sm font-medium text-slate-700 dark:text-gray-200'>
          {t('dashboard.atFile', {
            filename: details.filename,
            lineno: details.lineno,
            colno: details.colno,
          })}
        </p>
      </div>

      <MetricCard
        classes={{
          value: 'max-md:text-xl md:text-3xl',
        }}
        label={t('dashboard.firstSeen')}
        value={details.first_seen || 'N/A'}
        valueMapper={(value) => (
          <Tooltip className='max-w-content !w-full' tooltipNode={<span>{firstSeen}</span>} text={`${value} UTC`} />
        )}
      />

      <MetricCard
        classes={{
          value: 'max-md:text-xl md:text-3xl',
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

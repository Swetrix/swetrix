import _capitalize from 'lodash/capitalize'
import _size from 'lodash/size'
import _truncate from 'lodash/truncate'
import { useTranslation } from 'react-i18next'

import { getLocaleDisplayName, getStringFromTime, getTimeFromSeconds } from '~/utils/generic'

import { SessionDetails as Details } from '../interfaces/session'

import CCRow from './CCRow'
import { MetricCard, MetricCardSelect } from './MetricCards'

interface SessionDetailsProps {
  details: Details
}

export const SessionDetails = ({ details }: SessionDetailsProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')

  const geo = [
    {
      label: t('project.mapping.cc'),
      value: details.cc,
    },
    {
      label: t('project.mapping.rg'),
      value: details.rg,
    },
    {
      label: t('project.mapping.ct'),
      value: details.ct,
    },
  ]

  const browser = [
    {
      label: t('project.mapping.br'),
      value: details.br || 'N/A',
    },
    {
      label: t('project.mapping.brv'),
      value: details.brv || 'N/A',
    },
  ]

  const os = [
    {
      label: t('project.mapping.os'),
      value: details.os || 'N/A',
    },
    {
      label: t('project.mapping.osv'),
      value: details.osv || 'N/A',
    },
  ]

  const utm = [
    {
      label: t('project.mapping.so'),
      value: details.so || 'N/A',
    },
    {
      label: t('project.mapping.me'),
      value: details.me || 'N/A',
    },
    {
      label: t('project.mapping.ca'),
      value: details.ca || 'N/A',
    },
    {
      label: t('project.mapping.te'),
      value: details.te || 'N/A',
    },
    {
      label: t('project.mapping.co'),
      value: details.co || 'N/A',
    },
  ]

  return (
    <div className='mb-5 flex flex-wrap justify-center gap-5 lg:justify-start'>
      <MetricCardSelect
        classes={{
          value: 'max-md:text-xl md:text-2xl',
          label: '[&_span]:!text-slate-800 dark:[&_span]:!text-gray-200',
        }}
        values={geo}
        selectLabel={t('project.geo')}
        valueMapper={({ value }, index) => {
          if (index !== 0) {
            return value || 'N/A'
          }

          if (!value) {
            return t('project.unknownCountry')
          }

          return (
            <div className='flex items-center'>
              <CCRow size={26} cc={value} language={language} />
            </div>
          )
        }}
      />
      <MetricCardSelect
        classes={{
          value: 'max-md:text-xl md:text-2xl',
          label: '[&_span]:!text-slate-800 dark:[&_span]:!text-gray-200',
        }}
        values={os}
        selectLabel={t('project.osInfo')}
      />
      <MetricCard
        classes={{
          value: 'max-md:text-xl md:text-2xl',
          label: '[&_span]:!text-slate-800 dark:[&_span]:!text-gray-200',
        }}
        label={t('project.mapping.dv')}
        value={details.dv || 'N/A'}
        valueMapper={(value) => _capitalize(value)}
      />
      <MetricCardSelect
        classes={{
          value: 'max-md:text-xl md:text-2xl',
          label: '[&_span]:!text-slate-800 dark:[&_span]:!text-gray-200',
        }}
        values={browser}
        selectLabel={t('project.browserInfo')}
      />
      <MetricCard
        classes={{
          value: 'max-md:text-xl md:text-2xl',
          label: '[&_span]:!text-slate-800 dark:[&_span]:!text-gray-200',
        }}
        label={t('project.mapping.lc')}
        value={details.lc || 'N/A'}
        valueMapper={(value) => {
          if (value === 'N/A') {
            return value
          }

          return getLocaleDisplayName(value, language)
        }}
      />
      <MetricCard
        classes={{
          value: 'max-md:text-xl md:text-2xl',
          label: '[&_span]:!text-slate-800 dark:[&_span]:!text-gray-200',
        }}
        label={t('project.mapping.ref')}
        value={details.ref || 'N/A'}
        valueMapper={(value) => {
          if (_size(value) < 20) {
            return value
          }

          return (
            <span title={value}>
              {_truncate(value, {
                length: 20,
              })}
            </span>
          )
        }}
      />
      <MetricCardSelect
        classes={{
          value: 'max-md:text-xl md:text-2xl',
          label: '[&_span]:!text-slate-800 dark:[&_span]:!text-gray-200',
        }}
        values={utm}
        selectLabel={t('project.campaigns')}
      />
      <MetricCard
        classes={{
          value: `max-md:text-xl md:text-2xl ${details.isLive ? '!text-red-500 font-semibold' : ''}`,
          label: '[&_span]:!text-slate-800 dark:[&_span]:!text-gray-200',
        }}
        label={t('dashboard.sessionDuration')}
        value={
          details.isLive ? (
            <span className='flex items-center'>
              <span className='mr-1.5 h-2.5 w-2.5 animate-pulse rounded-full bg-red-500' />
              {t('dashboard.live').toUpperCase()}
            </span>
          ) : details.sdur !== undefined ? (
            getStringFromTime(getTimeFromSeconds(details.sdur))
          ) : (
            'N/A'
          )
        }
      />
    </div>
  )
}

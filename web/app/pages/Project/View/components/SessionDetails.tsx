import cx from 'clsx'
import dayjs from 'dayjs'
import _capitalize from 'lodash/capitalize'
import _isEmpty from 'lodash/isEmpty'
import _size from 'lodash/size'
import _truncate from 'lodash/truncate'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { SessionDetails as Details } from '~/lib/models/Project'
import { getLocaleDisplayName, getStringFromTime, getTimeFromSeconds } from '~/utils/generic'

import CCRow from './CCRow'
import { MetricCard, MetricCardSelect } from './MetricCards'

interface PageflowItem {
  type: 'pageview' | 'event' | 'error'
  value: string
  created: string
}

interface SessionDetailsProps {
  details: Details
  pages?: PageflowItem[]
}

export const SessionDetails = ({ details, pages }: SessionDetailsProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')

  // Calculate session duration from pages if sdur is 0 or not available
  const sessionDuration = useMemo(() => {
    if (details.sdur && details.sdur > 0) {
      return details.sdur
    }

    // Fallback: calculate duration from pageview timestamps only (for consistency with session list)
    if (!_isEmpty(pages)) {
      const pageviews = pages!.filter((p) => p.type === 'pageview')
      if (pageviews.length >= 1) {
        const firstPageview = pageviews[0]
        const lastPageview = pageviews[pageviews.length - 1]
        const diffSeconds = dayjs(lastPageview.created).diff(dayjs(firstPageview.created), 'seconds')
        if (diffSeconds > 0) {
          return diffSeconds
        }
      }
    }

    return 0
  }, [details.sdur, pages])

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
          value: cx('max-md:text-xl md:text-2xl', details.isLive ? '!text-red-500 font-semibold' : ''),
          label: '[&_span]:!text-slate-800 dark:[&_span]:!text-gray-200',
        }}
        label={t('dashboard.sessionDuration')}
        value={
          details.isLive ? (
            <span className='flex items-center'>
              <span className='mr-1.5 h-2.5 w-2.5 animate-pulse rounded-full bg-red-500' />
              {t('dashboard.live').toUpperCase()}
            </span>
          ) : sessionDuration > 0 ? (
            getStringFromTime(getTimeFromSeconds(sessionDuration))
          ) : (
            'N/A'
          )
        }
      />
    </div>
  )
}

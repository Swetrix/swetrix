import React, { memo } from 'react'
import { useTranslation } from 'react-i18next'
import _isEmpty from 'lodash/isEmpty'
import { getStringFromTime, getTimeFromSeconds } from 'utils/generic'
import { IOverallPerformanceObject } from 'redux/models/IProject'
import { MetricCard } from './MetricCards'

interface IMetricCards {
  overall: Partial<IOverallPerformanceObject>
  overallCompare?: Partial<IOverallPerformanceObject>
  activePeriodCompare?: string
}

const PerformanceMetricCards = ({ overall, overallCompare, activePeriodCompare }: IMetricCards) => {
  const { t } = useTranslation('common')

  let frontendChange = overall.frontendChange
  let backendChange = overall.backendChange
  let networkChange = overall.networkChange

  if (!_isEmpty(overallCompare) && activePeriodCompare !== 'previous') {
    // @ts-ignore
    frontendChange = overall.current?.frontend - overallCompare?.current?.frontend
    // @ts-ignore
    backendChange = overall.current?.backend - overallCompare?.current?.backend
    // @ts-ignore
    networkChange = overall.current?.network - overallCompare?.current?.network
  }

  return (
    <div className='mb-5 flex flex-wrap justify-center gap-5 lg:justify-start'>
      <MetricCard
        label={t('dashboard.frontend')}
        value={overall.current?.frontend}
        change={frontendChange}
        goodChangeDirection='up'
        valueMapper={(value, type) =>
          `${type === 'badge' && value > 0 ? '+' : ''}${getStringFromTime(getTimeFromSeconds(value), true)}`
        }
      />
      <MetricCard
        label={t('dashboard.backend')}
        value={overall.current?.backend}
        change={backendChange}
        goodChangeDirection='up'
        valueMapper={(value, type) =>
          `${type === 'badge' && value > 0 ? '+' : ''}${getStringFromTime(getTimeFromSeconds(value), true)}`
        }
      />
      <MetricCard
        label={t('dashboard.network')}
        value={overall.current?.network}
        change={networkChange}
        goodChangeDirection='up'
        valueMapper={(value, type) =>
          `${type === 'badge' && value > 0 ? '+' : ''}${getStringFromTime(getTimeFromSeconds(value), true)}`
        }
      />
    </div>
  )
}

export default memo(PerformanceMetricCards)

import cx from 'clsx'
import _isEmpty from 'lodash/isEmpty'
import _isNumber from 'lodash/isNumber'
import _map from 'lodash/map'
import _round from 'lodash/round'
import React, { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { OverallObject, OverallPerformanceObject } from '~/lib/models/Project'
import { Badge } from '~/ui/Badge'
import { Text } from '~/ui/Text'
import {
  nFormatter,
  getStringFromTime,
  getTimeFromSeconds,
} from '~/utils/generic'

interface MetricCardProps {
  label: string
  value: React.ReactNode
  goodChangeDirection?: 'up' | 'down'
  change?: number
  type?: 'percent' | 'string'
  valueMapper?: (value: any, type: 'main' | 'badge') => any
  classes?: {
    container?: string
    value?: string
    label?: string
  }
}

const ChangeBadge = ({
  change,
  type,
  goodChangeDirection,
  valueMapper,
}: Partial<MetricCardProps>) => {
  if (!_isNumber(change)) {
    return null
  }

  if (change === 0) {
    const label = valueMapper
      ? valueMapper(change, 'badge')
      : `0${type === 'percent' ? '%' : ''}`

    return <Badge colour='slate' label={label} />
  }

  if (change < 0 && goodChangeDirection === 'up') {
    const label = valueMapper
      ? valueMapper(change, 'badge')
      : `${change}${type === 'percent' ? '%' : ''}`

    return <Badge colour='green' label={label} />
  }

  if (change < 0 && goodChangeDirection === 'down') {
    const label = valueMapper
      ? valueMapper(change, 'badge')
      : `${change}${type === 'percent' ? '%' : ''}`

    return <Badge colour='slate' label={label} />
  }

  if (change > 0 && goodChangeDirection === 'up') {
    const label = valueMapper
      ? valueMapper(change, 'badge')
      : `${change}${type === 'percent' ? '%' : ''}`

    return <Badge colour='slate' label={label} />
  }

  if (change > 0 && goodChangeDirection === 'down') {
    const label = valueMapper
      ? valueMapper(change, 'badge')
      : `${change}${type === 'percent' ? '%' : ''}`

    return <Badge colour='green' label={label} />
  }
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  change,
  type,
  goodChangeDirection,
  valueMapper,
  classes,
}) => (
  <div className={cx('flex flex-col', classes?.container)}>
    <Text
      size='4xl'
      weight='bold'
      className={cx('whitespace-nowrap', classes?.value)}
    >
      {valueMapper ? valueMapper(value, 'main') : value}
    </Text>
    <div
      className={cx(
        'flex items-center whitespace-nowrap',
        {
          'space-x-2': _isNumber(change),
        },
        classes?.label,
      )}
    >
      <Text size='sm' weight='bold'>
        {label}
      </Text>
      <ChangeBadge
        change={change}
        type={type}
        goodChangeDirection={goodChangeDirection}
        valueMapper={valueMapper}
      />
    </div>
  </div>
)

interface MetricCardsProps {
  overall: Partial<OverallObject>
  overallCompare?: Partial<OverallObject>
  activePeriodCompare?: string
}

export const MetricCards = memo(
  ({ overall, overallCompare, activePeriodCompare }: MetricCardsProps) => {
    const { t } = useTranslation('common')

    let uniqueChange = overall.uniqueChange
    let usersChange = overall.usersChange
    let allChange = overall.change
    let bounceRateChange = overall.bounceRateChange
    let sdurChange = overall.sdurChange

    if (!_isEmpty(overallCompare) && activePeriodCompare !== 'previous') {
      uniqueChange =
        (overall.current?.unique as number) -
        (overallCompare?.current?.unique as number)
      usersChange =
        (overall.current?.users as number) -
        (overallCompare?.current?.users as number)
      allChange =
        (overall.current?.all as number) -
        (overallCompare?.current?.all as number)
      bounceRateChange =
        ((overall.current?.bounceRate as number) -
          (overallCompare.current?.bounceRate as number)) *
        -1
      sdurChange =
        (overall.current?.sdur as number) -
        (overallCompare?.current?.sdur as number)
    }

    if (overall.customEVFilterApplied) {
      return (
        <MetricCard
          label={t('project.events')}
          value={overall.current?.all}
          change={allChange}
          type='percent'
          goodChangeDirection='down'
          valueMapper={(value, type) =>
            `${type === 'badge' && value > 0 ? '+' : ''}${nFormatter(value, 1)}`
          }
        />
      )
    }

    return (
      <>
        <MetricCard
          label={t('dashboard.users')}
          value={overall.current?.users}
          change={usersChange}
          type='percent'
          goodChangeDirection='down'
          valueMapper={(value, type) =>
            `${type === 'badge' && value > 0 ? '+' : ''}${nFormatter(value, 1)}`
          }
        />
        <MetricCard
          label={t('dashboard.sessions')}
          value={overall.current?.unique}
          change={uniqueChange}
          type='percent'
          goodChangeDirection='down'
          valueMapper={(value, type) =>
            `${type === 'badge' && value > 0 ? '+' : ''}${nFormatter(value, 1)}`
          }
        />
        <MetricCard
          label={t('dashboard.pageviews')}
          value={overall.current?.all}
          change={allChange}
          type='percent'
          goodChangeDirection='down'
          valueMapper={(value, type) =>
            `${type === 'badge' && value > 0 ? '+' : ''}${nFormatter(value, 1)}`
          }
        />
        <MetricCard
          label={t('dashboard.bounceRate')}
          value={_round(overall.current?.bounceRate as number, 1)}
          change={_round(bounceRateChange as number, 1)}
          type='percent'
          goodChangeDirection='up'
          valueMapper={(value, type) =>
            `${type === 'badge' && value > 0 ? '+' : ''}${value}%`
          }
        />
        <MetricCard
          label={t('dashboard.sessionDuration')}
          value={overall.current?.sdur}
          change={sdurChange}
          goodChangeDirection='down'
          valueMapper={(value, type) =>
            `${type === 'badge' && value > 0 ? '+' : ''}${getStringFromTime(getTimeFromSeconds(value))}`
          }
        />
      </>
    )
  },
)

interface PerformanceMetricCardsProps {
  overall: Partial<OverallPerformanceObject>
  overallCompare?: Partial<OverallPerformanceObject>
  activePeriodCompare?: string
}

export const PerformanceMetricCards = memo(
  ({
    overall,
    overallCompare,
    activePeriodCompare,
  }: PerformanceMetricCardsProps) => {
    const { t } = useTranslation('common')

    let frontendChange = overall.frontendChange
    let backendChange = overall.backendChange
    let networkChange = overall.networkChange

    if (!_isEmpty(overallCompare) && activePeriodCompare !== 'previous') {
      frontendChange =
        (overall.current?.frontend ?? 0) -
        (overallCompare?.current?.frontend ?? 0)
      backendChange =
        (overall.current?.backend ?? 0) -
        (overallCompare?.current?.backend ?? 0)
      networkChange =
        (overall.current?.network ?? 0) -
        (overallCompare?.current?.network ?? 0)
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
  },
)

MetricCards.displayName = 'MetricCards'
PerformanceMetricCards.displayName = 'PerformanceMetricCards'

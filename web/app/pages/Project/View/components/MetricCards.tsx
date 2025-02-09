import { ChevronDownIcon, ChevronUpIcon, XMarkIcon } from '@heroicons/react/24/outline'
import cx from 'clsx'
import _isEmpty from 'lodash/isEmpty'
import _isNumber from 'lodash/isNumber'
import _map from 'lodash/map'
import _round from 'lodash/round'
import React, { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import OutsideClickHandler from 'react-outside-click-handler'

import { OverallObject, OverallPerformanceObject } from '~/lib/models/Project'
import { Badge } from '~/ui/Badge'
import { nFormatter, getStringFromTime, getTimeFromSeconds } from '~/utils/generic'

interface MetricCardProps {
  label: string
  value: string | number | undefined | null
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

const ChangeBadge = ({ change, type, goodChangeDirection, valueMapper }: Partial<MetricCardProps>) => {
  if (!_isNumber(change)) {
    return null
  }

  if (change === 0) {
    const label = valueMapper ? valueMapper(change, 'badge') : `0${type === 'percent' ? '%' : ''}`

    return <Badge colour='slate' label={label} />
  }

  if (change < 0 && goodChangeDirection === 'up') {
    const label = valueMapper ? valueMapper(change, 'badge') : `${change}${type === 'percent' ? '%' : ''}`

    return <Badge colour='green' label={label} />
  }

  if (change < 0 && goodChangeDirection === 'down') {
    const label = valueMapper ? valueMapper(change, 'badge') : `${change}${type === 'percent' ? '%' : ''}`

    return <Badge colour='red' label={label} />
  }

  if (change > 0 && goodChangeDirection === 'up') {
    const label = valueMapper ? valueMapper(change, 'badge') : `${change}${type === 'percent' ? '%' : ''}`

    return <Badge colour='red' label={label} />
  }

  if (change > 0 && goodChangeDirection === 'down') {
    const label = valueMapper ? valueMapper(change, 'badge') : `${change}${type === 'percent' ? '%' : ''}`

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
    <div
      className={cx('font-mono text-4xl font-bold whitespace-nowrap text-slate-900 dark:text-gray-50', classes?.value)}
    >
      {valueMapper ? valueMapper(value, 'main') : value}
    </div>
    <div
      className={cx(
        'flex items-center font-mono text-sm font-bold whitespace-nowrap',
        {
          'space-x-2': _isNumber(change),
        },
        classes?.label,
      )}
    >
      <span className='text-slate-900 dark:text-gray-50'>{label}</span>
      <ChangeBadge change={change} type={type} goodChangeDirection={goodChangeDirection} valueMapper={valueMapper} />
    </div>
  </div>
)

interface MetricCardSelectProps {
  values: {
    label: string
    value: string | number | undefined | null
  }[]
  valueMapper?: (value: any, index: number) => any
  selectLabel: string
  classes?: {
    value?: string
    label?: string
    container?: string
  }
}

export const MetricCardSelect = ({ values, valueMapper, selectLabel, classes }: MetricCardSelectProps) => {
  const [selected, setSelected] = useState(0)
  const [show, setShow] = useState(false)

  const _onSelect = (value: number) => {
    setSelected(value)
    setShow(false)
  }

  return (
    <div className={cx('flex flex-col font-mono', classes?.container)}>
      <div className={cx('text-4xl font-bold whitespace-nowrap text-slate-900 dark:text-gray-50', classes?.value)}>
        {valueMapper ? valueMapper(values[selected], selected) : values[selected].value}
      </div>
      <div className='relative flex items-center text-sm font-bold whitespace-nowrap'>
        <OutsideClickHandler onOutsideClick={() => setShow(false)}>
          <span
            className={cx('cursor-pointer text-slate-900 dark:text-gray-50', classes?.label)}
            onClick={() => setShow(!show)}
          >
            {values[selected].label}{' '}
            {show ? <ChevronUpIcon className='inline h-4 w-4' /> : <ChevronDownIcon className='inline h-4 w-4' />}
          </span>
          {show ? (
            <div className='absolute top-4 z-10 mt-2 max-h-[200px] min-w-[250px] overflow-auto rounded-md border border-black/10 bg-white text-gray-900 dark:border-slate-700/50 dark:bg-slate-900'>
              <div className='flex w-full flex-col p-2'>
                <p className='px-1 text-sm font-semibold text-gray-900 dark:text-gray-50'>{selectLabel}</p>
                {_map(values, ({ label }, index) => (
                  <div
                    key={label}
                    onClick={() => _onSelect(index)}
                    className='flex w-full cursor-pointer flex-row items-center justify-between px-1 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800'
                  >
                    <p>{label}</p>
                  </div>
                ))}
              </div>
              <XMarkIcon
                className='absolute top-2 right-2 h-5 w-5 cursor-pointer text-gray-900 dark:text-gray-50'
                onClick={() => setShow(!show)}
              />
            </div>
          ) : null}
        </OutsideClickHandler>
      </div>
    </div>
  )
}

interface MetricCardsProps {
  overall: Partial<OverallObject>
  overallCompare?: Partial<OverallObject>
  activePeriodCompare?: string
}

export const MetricCards = memo(({ overall, overallCompare, activePeriodCompare }: MetricCardsProps) => {
  const { t } = useTranslation('common')

  let uniqueChange = overall.uniqueChange
  let allChange = overall.change
  let bounceRateChange = overall.bounceRateChange
  let sdurChange = overall.sdurChange

  if (!_isEmpty(overallCompare) && activePeriodCompare !== 'previous') {
    uniqueChange = (overall.current?.unique as number) - (overallCompare?.current?.unique as number)
    allChange = (overall.current?.all as number) - (overallCompare?.current?.all as number)
    bounceRateChange = ((overall.current?.bounceRate as number) - (overallCompare.current?.bounceRate as number)) * -1
    sdurChange = (overall.current?.sdur as number) - (overallCompare?.current?.sdur as number)
  }

  if (overall.customEVFilterApplied) {
    return (
      <MetricCard
        label={t('project.events')}
        value={overall.current?.all}
        change={allChange}
        type='percent'
        goodChangeDirection='down'
        valueMapper={(value, type) => `${type === 'badge' && value > 0 ? '+' : ''}${nFormatter(value, 1)}`}
      />
    )
  }

  return (
    <>
      <MetricCard
        label={t('dashboard.unique')}
        value={overall.current?.unique}
        change={uniqueChange}
        type='percent'
        goodChangeDirection='down'
        valueMapper={(value, type) => `${type === 'badge' && value > 0 ? '+' : ''}${nFormatter(value, 1)}`}
      />
      <MetricCard
        label={t('dashboard.pageviews')}
        value={overall.current?.all}
        change={allChange}
        type='percent'
        goodChangeDirection='down'
        valueMapper={(value, type) => `${type === 'badge' && value > 0 ? '+' : ''}${nFormatter(value, 1)}`}
      />
      <MetricCard
        label={t('dashboard.bounceRate')}
        value={_round(overall.current?.bounceRate as number, 1)}
        change={_round(bounceRateChange as number, 1)}
        type='percent'
        goodChangeDirection='up'
        valueMapper={(value, type) => `${type === 'badge' && value > 0 ? '+' : ''}${value}%`}
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
})

interface PerformanceMetricCardsProps {
  overall: Partial<OverallPerformanceObject>
  overallCompare?: Partial<OverallPerformanceObject>
  activePeriodCompare?: string
}

export const PerformanceMetricCards = memo(
  ({ overall, overallCompare, activePeriodCompare }: PerformanceMetricCardsProps) => {
    const { t } = useTranslation('common')

    let frontendChange = overall.frontendChange
    let backendChange = overall.backendChange
    let networkChange = overall.networkChange

    if (!_isEmpty(overallCompare) && activePeriodCompare !== 'previous') {
      // @ts-expect-error
      frontendChange = overall.current?.frontend - overallCompare?.current?.frontend
      // @ts-expect-error
      backendChange = overall.current?.backend - overallCompare?.current?.backend
      // @ts-expect-error
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
  },
)

MetricCards.displayName = 'MetricCards'
PerformanceMetricCards.displayName = 'PerformanceMetricCards'

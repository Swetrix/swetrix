import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline'
import cx from 'clsx'
import _isEmpty from 'lodash/isEmpty'
import _isNumber from 'lodash/isNumber'
import _map from 'lodash/map'
import _round from 'lodash/round'
import React, { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { OverallObject, OverallPerformanceObject } from '~/lib/models/Project'
import { Badge } from '~/ui/Badge'
import OutsideClickHandler from '~/ui/OutsideClickHandler'
import { nFormatter, getStringFromTime, getTimeFromSeconds } from '~/utils/generic'

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

    return <Badge colour='slate' label={label} />
  }

  if (change > 0 && goodChangeDirection === 'up') {
    const label = valueMapper ? valueMapper(change, 'badge') : `${change}${type === 'percent' ? '%' : ''}`

    return <Badge colour='slate' label={label} />
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
    <div className={cx('text-4xl font-bold whitespace-nowrap text-slate-900 dark:text-gray-50', classes?.value)}>
      {valueMapper ? valueMapper(value, 'main') : value}
    </div>
    <div
      className={cx(
        'flex items-center text-sm font-bold whitespace-nowrap',
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
    <div className={cx('flex flex-col', classes?.container)}>
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
            <ChevronDownIcon
              className={cx(
                'inline h-4 w-4 transform transition-transform duration-200',
                show ? 'rotate-180' : 'rotate-0',
              )}
            />
          </span>
          <div
            className={cx(
              'absolute top-4 z-10 mt-2 min-w-[250px] origin-top transform cursor-auto overflow-hidden rounded-md border border-black/10 bg-white break-words whitespace-normal text-gray-900 shadow-lg transition-all duration-200 ease-out dark:border-slate-700/50 dark:bg-slate-900',
              show
                ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
                : 'pointer-events-none -translate-y-1 scale-95 opacity-0',
            )}
          >
            <div className='flex w-full flex-col'>
              <div className='flex items-center justify-between border-b border-black/10 bg-white p-2 dark:border-slate-700/50 dark:bg-slate-900'>
                <p className='text-sm font-semibold text-gray-900 dark:text-gray-50'>{selectLabel}</p>
                <button
                  className='-m-1 rounded-md p-1 hover:bg-gray-200 dark:hover:bg-slate-700'
                  type='button'
                  onClick={() => setShow(!show)}
                >
                  <XMarkIcon className='h-5 w-5 cursor-pointer rounded-md text-gray-900 dark:text-gray-50' />
                </button>
              </div>
              <div className='scrollbar-thin max-h-[200px] overflow-x-hidden overflow-y-auto p-1'>
                {_map(values, ({ label }, index) => (
                  <button
                    type='button'
                    key={label}
                    onClick={() => _onSelect(index)}
                    className='w-full rounded-md p-2 text-left text-sm text-gray-700 hover:bg-gray-200 dark:text-gray-50 dark:hover:bg-slate-700'
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
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

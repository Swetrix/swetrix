import React, { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import cx from 'clsx'
// @ts-ignore
import OutsideClickHandler from 'react-outside-click-handler'
import _round from 'lodash/round'
import _isEmpty from 'lodash/isEmpty'
import _isNumber from 'lodash/isNumber'
import _map from 'lodash/map'
import { nFormatter, getStringFromTime, getTimeFromSeconds } from 'utils/generic'
import { IOverallObject } from 'redux/models/IProject'
import { ChevronDownIcon, ChevronUpIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Badge } from 'ui/Badge'

interface IMetricCard {
  label: string
  value: string | number | undefined | null
  goodChangeDirection?: 'up' | 'down'
  change?: number
  type?: 'percent' | 'string'
  valueMapper?: (value: any, type: 'main' | 'badge') => any
  classes?: {
    value?: string
    label?: string
  }
}

const ChangeBadge = ({ change, type, goodChangeDirection, valueMapper }: Partial<IMetricCard>) => {
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

export const MetricCard: React.FC<IMetricCard> = ({
  label,
  value,
  change,
  type,
  goodChangeDirection,
  valueMapper,
  classes,
}) => (
  <div className='flex flex-col'>
    <div className={cx('whitespace-nowrap text-4xl font-bold text-slate-900 dark:text-gray-50', classes?.value)}>
      {valueMapper ? valueMapper(value, 'main') : value}
    </div>
    <div
      className={cx(
        'flex items-center whitespace-nowrap text-sm font-bold',
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

interface IMetricCardSelect {
  values: {
    label: string
    value: string | number | undefined | null
  }[]
  valueMapper?: (value: any, index: number) => any
  selectLabel: string
  classes?: {
    value?: string
    label?: string
  }
}

export const MetricCardSelect: React.FC<IMetricCardSelect> = ({ values, valueMapper, selectLabel, classes }) => {
  const [selected, setSelected] = useState(0)
  const [show, setShow] = useState<boolean>(false)

  const _onSelect = (value: number) => {
    setSelected(value)
    setShow(false)
  }

  return (
    <div className='flex flex-col'>
      <div className={cx('whitespace-nowrap text-4xl font-bold text-slate-900 dark:text-gray-50', classes?.value)}>
        {valueMapper ? valueMapper(values[selected], selected) : values[selected].value}
      </div>
      <div className='relative flex items-center whitespace-nowrap text-sm font-bold'>
        <OutsideClickHandler onOutsideClick={() => setShow(false)}>
          <span
            className={cx('cursor-pointer text-slate-900 dark:text-gray-50', classes?.label)}
            onClick={() => setShow(!show)}
          >
            {values[selected].label}{' '}
            {show ? <ChevronUpIcon className='inline h-4 w-4' /> : <ChevronDownIcon className='inline h-4 w-4' />}
          </span>
          {show && (
            <div className='top-15 absolute z-10 mt-2 max-h-[200px] min-w-[250px] overflow-auto rounded-md border border-gray-200 bg-white text-gray-900 shadow-lg dark:border-slate-700/50 dark:bg-slate-900'>
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
                className='absolute right-2 top-2 h-5 w-5 cursor-pointer text-gray-900 dark:text-gray-50'
                onClick={() => setShow(!show)}
              />
            </div>
          )}
        </OutsideClickHandler>
      </div>
    </div>
  )
}

interface IMetricCards {
  overall: Partial<IOverallObject>
  overallCompare?: Partial<IOverallObject>
  activePeriodCompare?: string
}

const MetricCards = ({ overall, overallCompare, activePeriodCompare }: IMetricCards) => {
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
      <div className='mb-5 flex flex-wrap justify-center gap-5 lg:justify-start'>
        <MetricCard
          label={t('project.events')}
          value={overall.current?.all}
          change={allChange}
          type='percent'
          goodChangeDirection='down'
          valueMapper={(value, type) => `${type === 'badge' && value > 0 ? '+' : ''}${nFormatter(value, 1)}`}
        />
      </div>
    )
  }

  return (
    <div className='mb-5 flex flex-wrap justify-center gap-5 lg:justify-start'>
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
    </div>
  )
}

export default memo(MetricCards)

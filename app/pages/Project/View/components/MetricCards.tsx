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
import {
  ChevronDownIcon, ChevronUpIcon, XMarkIcon,
} from '@heroicons/react/24/outline'
import { Badge } from 'ui/Badge'

interface IMetricCard {
  label: string
  value: string | number | undefined | null
  goodChangeDirection?: 'up' | 'down'
  change?: number
  type?: 'percent' | 'string'
  valueMapper?: (value: any, type: 'main' | 'badge') => any
}

const ChangeBadge = ({
  change, type, goodChangeDirection, valueMapper,
}: Partial<IMetricCard>) => {
  if (!_isNumber(change)) {
    return null
  }

  if (change === 0) {
    const label = valueMapper ? valueMapper(change, 'badge') : `0${type === 'percent' ? '%' : ''}`

    return (
      <Badge
        colour='slate'
        label={label}
      />
    )
  }

  if (change < 0 && goodChangeDirection === 'up') {
    const label = valueMapper ? valueMapper(change, 'badge') : `${change}${type === 'percent' ? '%' : ''}`

    return (
      <Badge
        colour='green'
        label={label}
      />
    )
  }

  if (change < 0 && goodChangeDirection === 'down') {
    const label = valueMapper ? valueMapper(change, 'badge') : `${change}${type === 'percent' ? '%' : ''}`

    return (
      <Badge
        colour='red'
        label={label}
      />
    )
  }

  if (change > 0 && goodChangeDirection === 'up') {
    const label = valueMapper ? valueMapper(change, 'badge') : `${change}${type === 'percent' ? '%' : ''}`

    return (
      <Badge
        colour='red'
        label={label}
      />
    )
  }

  if (change > 0 && goodChangeDirection === 'down') {
    const label = valueMapper ? valueMapper(change, 'badge') : `${change}${type === 'percent' ? '%' : ''}`

    return (
      <Badge
        colour='green'
        label={label}
      />
    )
  }
}

export const MetricCard: React.FC<IMetricCard> = ({ label, value, change, type, goodChangeDirection, valueMapper }) => (
  <div className='flex flex-col'>
    <div className='font-bold text-4xl whitespace-nowrap text-slate-900 dark:text-gray-50'>
      {valueMapper ? valueMapper(value, 'main') : value}
    </div>
    <div
      className={cx('flex items-center font-bold whitespace-nowrap text-sm', {
        'space-x-2': _isNumber(change),
      })}
    >
      <span className='text-slate-900 dark:text-gray-50'>
        {label}
      </span>
      <ChangeBadge
        change={change}
        type={type}
        goodChangeDirection={goodChangeDirection}
        valueMapper={valueMapper}
      />
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
}

export const MetricCardSelect: React.FC<IMetricCardSelect> = ({ values, valueMapper, selectLabel }) => {
  const [selected, setSelected] = useState(0)
  const [show, setShow] = useState<boolean>(false)

  const _onSelect = (value: number) => {
    setSelected(value)
    setShow(false)
  }

  return (
    <div className='flex flex-col'>
      <div className='font-bold text-4xl whitespace-nowrap text-slate-900 dark:text-gray-50'>
        {valueMapper ? valueMapper(values[selected], selected) : values[selected].value}
      </div>
      <div className='flex items-center font-bold whitespace-nowrap text-sm relative'>
        <OutsideClickHandler
          onOutsideClick={() => setShow(false)}
        >
          <span
            className='text-slate-900 dark:text-gray-50 cursor-pointer'
            onClick={() => setShow(!show)}
          >
            {values[selected].label}
            {' '}
            {show ? <ChevronUpIcon className='inline w-4 h-4' /> : <ChevronDownIcon className='inline w-4 h-4' />}
          </span>
          {show && (
            <div className='absolute z-10 mt-2 top-15 text-gray-900 bg-white border border-gray-200 rounded-md shadow-lg dark:bg-slate-900 dark:border-slate-700/50 min-w-[250px] max-h-[200px] overflow-auto'>
              <div className='flex flex-col w-full p-2'>
                <p className='text-sm font-semibold text-gray-900 dark:text-gray-50 px-1'>
                  {selectLabel}
                </p>
                {_map(values, ({ label }, index) => (
                  <div
                    key={label}
                    onClick={() => _onSelect(index)}
                    className='flex flex-row items-center justify-between cursor-pointer w-full px-1 py-2 text-sm text-gray-700 dark:text-gray-200 dark:bg-slate-900 hover:bg-gray-200 dark:hover:bg-slate-800'
                  >
                    <p>{label}</p>
                  </div>
                ))}
              </div>
              <XMarkIcon className='absolute top-2 right-2 w-5 h-5 text-gray-900 cursor-pointer dark:text-gray-50' onClick={() => setShow(!show)} />
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
      <div className='flex justify-center lg:justify-start gap-5 mb-5 flex-wrap'>
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
    <div className='flex justify-center lg:justify-start gap-5 mb-5 flex-wrap'>
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
        valueMapper={(value, type) => `${type === 'badge' && value > 0 ? '+' : ''}${getStringFromTime(getTimeFromSeconds(value))}`}
      />
    </div>
  )
}

export default memo(MetricCards)

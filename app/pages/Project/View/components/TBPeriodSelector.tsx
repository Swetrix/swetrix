import React, { memo, Fragment, useMemo } from 'react'
import { Popover, Transition } from '@headlessui/react'
import { CalendarDaysIcon } from '@heroicons/react/24/outline'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import { useTranslation } from 'react-i18next'
import _map from 'lodash/map'
import _includes from 'lodash/includes'
import cx from 'clsx'
import { ALL_PERIODS } from 'redux/constants'

interface ITBPeriodSelector {
  title: string | number | React.ReactNode
  items: any[]
  /* (function): A function that is called when an item is selected. */
  onSelect: (item: any, e?: React.MouseEvent<HTMLElement>) => void | null
  activePeriod: any
  updateTimebucket: (tb: string) => void
  timeBucket: string
  classes?: {
    timeBucket?: string
    periods?: string
  }
}

const TBPeriodSelector = ({
  items,
  title,
  onSelect,
  activePeriod,
  updateTimebucket,
  timeBucket,
  classes,
}: ITBPeriodSelector): JSX.Element => {
  const { t } = useTranslation('common')

  const periods = useMemo(() => {
    return _map(ALL_PERIODS, (period: string) => ({
      label: t(`project.${period}`),
      value: period,
      available: _includes(activePeriod?.tbs, period),
    }))
  }, [activePeriod, t])

  return (
    <Popover className='relative'>
      <Popover.Button className='inline-flex w-full px-3 md:px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-50 outline-none group'>
        <CalendarDaysIcon className='w-5 h-5 mr-1' />
        <span>{title}</span>
        <ChevronDownIcon
          className='ml-2 h-5 w-5 transition duration-150 ease-in-out text-gray-700 dark:text-gray-50 group-hover:text-gray-500'
          aria-hidden='true'
        />
      </Popover.Button>
      <Transition
        as={Fragment}
        enter='transition ease-out duration-200'
        enterFrom='opacity-0 translate-y-1'
        enterTo='opacity-100 translate-y-0'
        leave='transition ease-in duration-150'
        leaveFrom='opacity-100 translate-y-0'
        leaveTo='opacity-0 translate-y-1'
      >
        {/* w-56 */}
        <Popover.Panel className='absolute left-1/2 md:left-auto right-0 z-20 mt-3 w-max max-w-sm -translate-x-1/2 transform md:transform-none px-4 sm:px-0 lg:max-w-3xl'>
          <div className='p-1 overflow-hidden rounded-lg shadow-lg ring-1 ring-black/5 bg-gray-50 dark:bg-slate-800'>
            <div
              className={cx(
                'bg-slate-200 dark:bg-slate-700 rounded-md relative z-0 flex items-center space-x-5 px-2 py-3 mb-1',
                classes?.timeBucket,
              )}
            >
              {_map(periods, ({ label, value, available }) => (
                <Popover.Button
                  key={value}
                  type='button'
                  onClick={() => {
                    if (!available || timeBucket === value) {
                      return
                    }

                    updateTimebucket(value)
                  }}
                  className={cx('relative capitalize inline-flex items-center text-sm font-medium', {
                    'text-gray-900 dark:text-gray-50': timeBucket === value,
                    'text-gray-700 dark:text-gray-300': available && timeBucket !== value,
                    'text-gray-400 dark:text-gray-500': !available && timeBucket !== value,
                    'cursor-pointer': available,
                    'cursor-default': !available,
                  })}
                >
                  {label}
                </Popover.Button>
              ))}
            </div>
            <ul className={cx('text-left w-full', classes?.periods)}>
              {_map(items, (item) => (
                <Popover.Button
                  as='li'
                  key={item.label}
                  onClick={(e: React.MouseEvent<HTMLElement>) => onSelect(item, e)}
                  className='text-gray-700 dark:text-gray-50 rounded-md block px-4 py-2 text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700'
                >
                  {item.dropdownLabel || item.label}
                </Popover.Button>
              ))}
            </ul>
          </div>
        </Popover.Panel>
      </Transition>
    </Popover>
  )
}

TBPeriodSelector.defaultProps = {
  name: null,
}

export default memo(TBPeriodSelector)

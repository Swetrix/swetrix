import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import cx from 'clsx'
import _includes from 'lodash/includes'
import _map from 'lodash/map'
import { CalendarIcon } from 'lucide-react'
import React, { memo, Fragment, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { VALID_TIME_BUCKETS, TimeBucket } from '~/lib/constants'

interface TBPeriodSelectorProps {
  title: string | number | React.ReactNode
  items: any[]
  /* (function): A function that is called when an item is selected. */
  onSelect: (item: any, e?: React.MouseEvent<HTMLElement>) => void | null
  activePeriod: any
  classes?: {
    timeBucket?: string
    periods?: string
  }
  updateTimebucket: (timeBucket: TimeBucket) => void
  timeBucket: TimeBucket
}

const TBPeriodSelector = ({
  items,
  title,
  onSelect,
  activePeriod,
  classes,
  updateTimebucket,
  timeBucket,
}: TBPeriodSelectorProps) => {
  const { t } = useTranslation('common')

  const timeBuckets = useMemo(() => {
    return _map(VALID_TIME_BUCKETS, (period: TimeBucket) => ({
      label: t(`project.${period}`),
      value: period,
      available: _includes(activePeriod?.tbs, period),
    }))
  }, [activePeriod, t])

  return (
    <Popover className='relative'>
      {({ open }) => (
        <>
          <PopoverButton className='group inline-flex w-full px-2.5 py-2 text-sm font-medium text-gray-700 outline-hidden md:px-4 dark:text-gray-50'>
            <CalendarIcon className='mr-1 h-5 w-5' strokeWidth={1.5} />
            <span>{title}</span>
            <ChevronDownIcon
              className={cx(
                'ml-2 h-5 w-5 transform-gpu text-gray-700 transition duration-150 ease-in-out group-hover:text-gray-500 dark:text-gray-50',
                {
                  'rotate-180': open,
                },
              )}
              aria-hidden='true'
            />
          </PopoverButton>
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
            <PopoverPanel className='absolute right-2.5 z-20 mt-3 w-max max-w-sm transform px-4 sm:px-0 md:left-auto md:transform-none lg:max-w-3xl'>
              <div className='overflow-hidden rounded-lg bg-gray-50 p-1 ring-1 ring-black/5 dark:bg-slate-800'>
                <div
                  className={cx(
                    'relative z-0 mb-1 flex items-center space-x-1 rounded-md bg-gray-200 px-1 py-1.5 dark:bg-slate-700/60',
                    classes?.timeBucket,
                  )}
                >
                  {_map(timeBuckets, ({ label, value, available }) => (
                    <PopoverButton
                      key={value}
                      type='button'
                      onClick={() => {
                        if (!available || timeBucket === value) {
                          return
                        }

                        updateTimebucket(value)
                      }}
                      className={cx(
                        'relative inline-flex items-center rounded px-2 py-1.5 text-sm font-medium capitalize transition-colors duration-150 ease-in-out',
                        {
                          'bg-gray-50 font-semibold text-gray-900 dark:bg-slate-800 dark:text-gray-50':
                            timeBucket === value,
                          'text-gray-800 hover:bg-gray-300 dark:text-gray-200 dark:hover:bg-slate-800':
                            available && timeBucket !== value,
                          'text-gray-400 dark:text-gray-500': !available && timeBucket !== value,
                          'cursor-pointer': available,
                          'cursor-not-allowed': !available,
                        },
                      )}
                    >
                      {label}
                    </PopoverButton>
                  ))}
                </div>
                <ul className={cx('w-full text-left', classes?.periods)}>
                  {_map(items, (item) => (
                    <PopoverButton
                      as='li'
                      key={item.label}
                      onClick={(e: React.MouseEvent<HTMLElement>) => onSelect(item, e)}
                      className='block cursor-pointer rounded-md px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:text-gray-50 dark:hover:bg-slate-700'
                    >
                      {item.dropdownLabel || item.label}
                    </PopoverButton>
                  ))}
                </ul>
              </div>
            </PopoverPanel>
          </Transition>
        </>
      )}
    </Popover>
  )
}

export default memo(TBPeriodSelector)

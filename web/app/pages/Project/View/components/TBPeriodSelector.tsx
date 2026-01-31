import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react'
import cx from 'clsx'
import _includes from 'lodash/includes'
import _map from 'lodash/map'
import { CalendarDotsIcon, CaretDownIcon } from '@phosphor-icons/react'
import React, { memo, Fragment, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import {
  TBPeriodPairsProps,
  TimeBucket,
  VALID_TIME_BUCKETS,
} from '~/lib/constants'
import { PERIOD_HOTKEYS_MAP } from '~/modals/ViewProjectHotkeys'
import { Badge } from '~/ui/Badge'

import { useViewProjectContext } from '../ViewProject'

import CurrentTime from './CurrentTime'

interface TBPeriodSelectorProps {
  title: string | number | React.ReactNode
  items: TBPeriodPairsProps[]
  /* (function): A function that is called when an item is selected. */
  onSelect: (
    item: TBPeriodPairsProps,
    e?: React.MouseEvent<HTMLElement>,
  ) => void | null
  activePeriod?: TBPeriodPairsProps
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
  classes,
}: TBPeriodSelectorProps) => {
  const { dataLoading, updateTimebucket, timeBucket } = useViewProjectContext()
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
          <PopoverButton className='group inline-flex w-full rounded-md border border-gray-50/0 p-2 text-sm font-medium text-gray-700 outline-hidden transition-colors ring-inset hover:border-gray-300 hover:bg-white focus:z-10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:text-gray-50 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200'>
            <CalendarDotsIcon className='mr-1 h-5 w-5' strokeWidth={1.5} />
            <span>{title}</span>
            <CaretDownIcon
              className={cx(
                'ml-2 h-5 w-5 transform-gpu text-gray-700 transition ease-in-out group-hover:text-gray-500 dark:text-gray-50',
                {
                  'rotate-180': open,
                },
              )}
              aria-hidden='true'
            />
          </PopoverButton>
          <Transition
            as={Fragment}
            enter='transition ease-out'
            enterFrom='opacity-0 translate-y-1'
            enterTo='opacity-100 translate-y-0'
            leave='transition ease-in duration-150'
            leaveFrom='opacity-100 translate-y-0'
            leaveTo='opacity-0 translate-y-1'
          >
            {/* w-56 */}
            <PopoverPanel className='absolute right-0 z-20 mt-2 w-max max-w-sm px-4 sm:px-0 lg:max-w-3xl'>
              <div className='overflow-hidden rounded-lg bg-gray-50 p-1 ring-1 ring-black/10 dark:bg-slate-800'>
                <CurrentTime />
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
                        if (!available || timeBucket === value || dataLoading) {
                          return
                        }

                        updateTimebucket(value)
                      }}
                      className={cx(
                        'relative inline-flex items-center rounded px-2 py-1.5 text-sm font-medium capitalize transition-colors',
                        {
                          'bg-gray-50 font-semibold text-gray-900 dark:bg-slate-800 dark:text-gray-50':
                            timeBucket === value,
                          'text-gray-800 hover:bg-gray-300 dark:text-gray-200 dark:hover:bg-slate-800':
                            available && timeBucket !== value,
                          'text-gray-400 dark:text-gray-500':
                            !available && timeBucket !== value,
                          'cursor-pointer': available && !dataLoading,
                          'cursor-wait': available && dataLoading,
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
                      onClick={(e: React.MouseEvent<HTMLElement>) =>
                        onSelect(item, e)
                      }
                      className={cx(
                        'flex cursor-pointer items-center justify-between space-x-1 rounded-md p-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:text-gray-50 dark:hover:bg-slate-700',
                        {
                          'cursor-wait': dataLoading,
                        },
                      )}
                    >
                      <span>{item.dropdownLabel || item.label}</span>
                      <Badge
                        colour='slate'
                        label={PERIOD_HOTKEYS_MAP[item.period]}
                      />
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

import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import cx from 'clsx'
import _map from 'lodash/map'
import { CalendarIcon } from 'lucide-react'
import { Fragment, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

interface PeriodSelectorProps {
  activePeriod: string
  setActivePeriod: (period: string) => void
  isLoading: boolean
}

export const PeriodSelector = ({
  activePeriod,
  setActivePeriod,
  isLoading,
}: PeriodSelectorProps) => {
  const { t } = useTranslation('common')

  const periods = useMemo(() => {
    return [
      {
        label: t('project.thisHour'),
        period: '1h',
      },
      {
        label: t('project.last24h'),
        period: '1d',
      },
      {
        label: t('project.lastXDays', { amount: 7 }),
        period: '7d',
      },
      {
        label: t('project.lastXWeeks', { amount: 4 }),
        period: '4w',
      },
      {
        label: t('project.lastXMonths', { amount: 3 }),
        period: '3M',
      },
      {
        label: t('project.lastXMonths', { amount: 12 }),
        period: '12M',
      },
      {
        label: t('project.lastXMonths', { amount: 24 }),
        period: '24M',
      },
      {
        label: t('project.all'),
        period: 'all',
      },
    ]
  }, [t])

  const period = periods.find((item) => item.period === activePeriod)?.label

  return (
    <Popover className='relative'>
      {({ open }) => (
        <>
          <PopoverButton className='group inline-flex w-full rounded-md border border-transparent bg-gray-50 p-2 text-sm font-medium text-gray-700 outline-hidden transition-colors hover:border-gray-300 hover:bg-white dark:bg-slate-900 dark:text-gray-50 hover:dark:border-slate-700/80 dark:hover:bg-slate-800'>
            <CalendarIcon className='mr-1 h-5 w-5' strokeWidth={1.5} />
            <span>{period}</span>
            <ChevronDownIcon
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
                <ul className='w-full text-left'>
                  {_map(periods, (item) => (
                    <PopoverButton
                      as='li'
                      key={item.label}
                      onClick={() => setActivePeriod(item.period)}
                      className={cx(
                        'block cursor-pointer rounded-md px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:text-gray-50 dark:hover:bg-slate-700',
                        {
                          'cursor-wait': isLoading,
                        },
                      )}
                    >
                      {item.label}
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

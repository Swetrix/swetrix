import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react'
import cx from 'clsx'
import _map from 'lodash/map'
import { ArrowsDownUpIcon, CaretDownIcon } from '@phosphor-icons/react'
import { Fragment, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { useAuth } from '~/providers/AuthProvider'

interface SortSelectorProps {
  activeSort: string
  setActiveSort: (sort: string) => void
  isLoading: boolean
}

export const SORT_OPTIONS = {
  ALPHA_ASC: 'alpha_asc',
  ALPHA_DESC: 'alpha_desc',
  DATE_ASC: 'date_asc',
  DATE_DESC: 'date_desc',
} as const

export const SortSelector = ({
  activeSort,
  setActiveSort,
  isLoading,
}: SortSelectorProps) => {
  const { t } = useTranslation('common')

  const { isLoading: authLoading } = useAuth()

  const sortOptions = useMemo(() => {
    return [
      {
        label: t('dashboard.sortAlphaAsc'),
        sort: SORT_OPTIONS.ALPHA_ASC,
      },
      {
        label: t('dashboard.sortAlphaDesc'),
        sort: SORT_OPTIONS.ALPHA_DESC,
      },
      {
        label: t('dashboard.sortDateAsc'),
        sort: SORT_OPTIONS.DATE_ASC,
      },
      {
        label: t('dashboard.sortDateDesc'),
        sort: SORT_OPTIONS.DATE_DESC,
      },
    ]
  }, [t])

  useEffect(() => {
    if (authLoading) return

    if (!sortOptions.find((item) => item.sort === activeSort)) {
      setActiveSort(sortOptions[0].sort)
    }
  }, [sortOptions, activeSort, setActiveSort, authLoading])

  const sortLabel = sortOptions.find((item) => item.sort === activeSort)?.label

  if (sortOptions.length === 0 || authLoading) return null

  return (
    <Popover className='relative'>
      {({ open }) => (
        <>
          <PopoverButton className='group inline-flex w-full rounded-md border border-transparent bg-gray-50 p-2 text-sm font-medium text-gray-700 outline-hidden transition-colors hover:border-gray-300 hover:bg-white dark:bg-slate-900 dark:text-gray-50 hover:dark:border-slate-700/80 dark:hover:bg-slate-800'>
            <ArrowsDownUpIcon className='mr-1 h-5 w-5' />
            <span>{sortLabel}</span>
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
            <PopoverPanel className='absolute right-0 z-20 mt-2 w-max max-w-sm px-4 sm:px-0 lg:max-w-3xl'>
              <div className='overflow-hidden rounded-lg bg-gray-50 p-1 ring-1 ring-black/10 dark:bg-slate-800'>
                <ul className='w-full text-left'>
                  {_map(sortOptions, (item) => (
                    <PopoverButton
                      as='li'
                      key={item.sort}
                      onClick={() => setActiveSort(item.sort)}
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

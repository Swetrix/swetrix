import React, { Fragment, useEffect, useMemo } from 'react'
import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import { useTranslation } from 'react-i18next'
import _map from 'lodash/map'
import cx from 'clsx'
import { ArrowUpDown } from 'lucide-react'
import { DASHBOARD_TABS } from './Tabs'
import useFeatureFlag from '~/hooks/useFeatureFlag'
import { FeatureFlag } from '~/lib/models/User'
import { useSelector } from 'react-redux'
import { StateType } from '~/lib/store'

interface SortSelectorProps {
  activeSort: string
  setActiveSort: (sort: string) => void
  isLoading: boolean
  activeTab: (typeof DASHBOARD_TABS)[number]['id']
}

export const SORT_OPTIONS = {
  ALPHA_ASC: 'alpha_asc',
  ALPHA_DESC: 'alpha_desc',
  DATE_ASC: 'date_asc',
  DATE_DESC: 'date_desc',
  PAGEVIEWS_ASC: 'pageviews_asc',
  PAGEVIEWS_DESC: 'pageviews_desc',
  LAST_VISIT_DESC: 'last_visit_desc',
} as const

export const SortSelector = ({ activeSort, setActiveSort, isLoading, activeTab }: SortSelectorProps) => {
  const { t } = useTranslation('common')

  const { loading: authLoading } = useSelector((state: StateType) => state.auth)

  const isHostnameNavigationEnabled = useFeatureFlag(FeatureFlag['dashboard-hostname-cards'])

  const sortOptions = useMemo(() => {
    return [
      ...(activeTab === 'lost-traffic' && !isHostnameNavigationEnabled
        ? []
        : [
            {
              label: t('dashboard.sortAlphaAsc'),
              sort: SORT_OPTIONS.ALPHA_ASC,
            },
            {
              label: t('dashboard.sortAlphaDesc'),
              sort: SORT_OPTIONS.ALPHA_DESC,
            },
          ]),
      ...(isHostnameNavigationEnabled || activeTab !== 'default'
        ? []
        : [
            {
              label: t('dashboard.sortDateAsc'),
              sort: SORT_OPTIONS.DATE_ASC,
            },
            {
              label: t('dashboard.sortDateDesc'),
              sort: SORT_OPTIONS.DATE_DESC,
            },
          ]),
      ...(!isHostnameNavigationEnabled || activeTab !== 'default'
        ? []
        : [
            {
              label: t('dashboard.pageviewsDesc'),
              sort: SORT_OPTIONS.PAGEVIEWS_DESC,
            },
            {
              label: t('dashboard.pageviewsAsc'),
              sort: SORT_OPTIONS.PAGEVIEWS_ASC,
            },
          ]),
      ...(activeTab === 'lost-traffic'
        ? [
            {
              label: t('dashboard.lastVisitDesc'),
              sort: SORT_OPTIONS.LAST_VISIT_DESC,
            },
          ]
        : []),
    ]
  }, [t, isHostnameNavigationEnabled, activeTab])

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
          <PopoverButton className='group inline-flex w-full px-2.5 py-2 text-sm font-medium text-gray-700 outline-hidden md:px-4 dark:text-gray-50'>
            <ArrowUpDown className='mr-1 h-5 w-5' strokeWidth={1.5} />
            <span>{sortLabel}</span>
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
            <PopoverPanel className='absolute right-0 left-1/2 z-20 mt-3 w-max max-w-sm -translate-x-1/2 transform px-4 sm:px-0 md:left-auto md:transform-none lg:max-w-3xl'>
              <div className='overflow-hidden rounded-lg bg-gray-50 p-1 ring-1 shadow-lg ring-black/5 dark:bg-slate-800'>
                <ul className='w-full text-left'>
                  {_map(sortOptions, (item) => (
                    <PopoverButton
                      as='li'
                      key={item.sort}
                      onClick={() => setActiveSort(item.sort)}
                      className={cx(
                        'block cursor-pointer rounded-md px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:text-gray-50 dark:hover:bg-slate-700',
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

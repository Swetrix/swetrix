import cx from 'clsx'
import dayjs from 'dayjs'
import _find from 'lodash/find'
import { MagnifyingGlassIcon, UsersIcon } from '@phosphor-icons/react'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import {
  MAX_MONTHS_IN_PAST,
  PERIOD_PAIRS_COMPARE,
  TBPeriodPairsProps,
} from '~/lib/constants'
import { useAuth } from '~/providers/AuthProvider'
import DatePicker from '~/ui/Datepicker'
import Dropdown from '~/ui/Dropdown'

import { useViewProjectContext } from '../ViewProject'

import { BackButton } from './BackButton'
import LiveVisitorsDropdown from './LiveVisitorsDropdown'
import { RefreshStatsButton } from './RefreshStatsButton'
import TBPeriodSelector from './TBPeriodSelector'

type ProfileTypeFilter = 'all' | 'anonymous' | 'identified'

interface DashboardHeaderProps {
  // Optional props
  showLiveVisitors?: boolean
  showRefreshButton?: boolean
  showSearchButton?: boolean
  showPeriodSelector?: boolean
  hideTimeBucket?: boolean
  timeBucketSelectorItems?: TBPeriodPairsProps[]

  // Back button link (when provided, shows a back button on the far left)
  backLink?: string
  backButtonLabel?: string
  onBack?: () => void

  // Left side content (displayed after back button, before live visitors)
  leftContent?: React.ReactNode

  // Right side content (for segments/export dropdowns or action buttons)
  rightContent?: React.ReactNode

  // Profile type filter (for Profiles view)
  profileTypeFilter?: ProfileTypeFilter
  onProfileTypeFilterChange?: (type: ProfileTypeFilter) => void
}

const DashboardHeader = ({
  showLiveVisitors = true,
  showRefreshButton = true,
  showSearchButton = true,
  showPeriodSelector = true,
  hideTimeBucket = false,
  timeBucketSelectorItems: customTimeBucketSelectorItems,
  backLink,
  backButtonLabel,
  onBack,
  leftContent,
  rightContent,
  profileTypeFilter,
  onProfileTypeFilterChange,
}: DashboardHeaderProps) => {
  const { isLoading: authLoading } = useAuth()
  const {
    dataLoading,
    activePeriod,
    dateRange,
    updatePeriod,
    periodPairs,
    isActiveCompare,
    setIsActiveCompare,
    compareDisable,
    maxRangeCompare,
    dateRangeCompare,
    setDateRangeCompare,
    activePeriodCompare,
    setActivePeriodCompare,
    periodPairsCompare,
    setPeriodPairsCompare,
    setShowFiltersSearch,
    resetDateRange,
    refCalendar,
    refCalendarCompare,
    refreshStats,
  } = useViewProjectContext()

  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const [searchParams, setSearchParams] = useSearchParams()

  const timeBucketSelectorItems = customTimeBucketSelectorItems || periodPairs
  const activeDropdownLabelCompare = _find(
    periodPairsCompare,
    (p) => p.period === activePeriodCompare,
  )?.label

  const tbPeriodPairsCompare = (
    tFn: typeof t,
    customDateRange?: Date[],
    lng?: string,
  ) => {
    const result = [
      {
        label: tFn('project.previousPeriod'),
        period: PERIOD_PAIRS_COMPARE.PREVIOS,
      },
      {
        label: tFn('project.customDate'),
        period: PERIOD_PAIRS_COMPARE.CUSTOM,
      },
      {
        label: tFn('project.disableCompare'),
        period: PERIOD_PAIRS_COMPARE.DISABLE,
      },
    ]

    if (customDateRange) {
      const from = dayjs(customDateRange[0]).locale(lng || 'en')
      const to = dayjs(customDateRange[1]).locale(lng || 'en')

      const label = from.isSame(to, 'day')
        ? from.format('D MMM YYYY')
        : `${from.format('D MMM')} - ${to.format('D MMM YYYY')}`

      return [
        {
          label,
          period: PERIOD_PAIRS_COMPARE.CUSTOM,
          isCustomDate: true,
        },
        ...result.filter((p) => p.period !== PERIOD_PAIRS_COMPARE.CUSTOM),
      ]
    }

    return result
  }

  return (
    <div className='relative top-0 z-20 -mt-2 flex flex-col items-center justify-between bg-gray-50/50 py-2 backdrop-blur-md lg:sticky lg:flex-row dark:bg-slate-950/50'>
      <div className='flex flex-wrap items-center justify-center gap-2'>
        {backLink ? <BackButton to={backLink} label={backButtonLabel} /> : null}
        {onBack ? (
          <BackButton onClick={onBack} label={backButtonLabel} />
        ) : null}
        {leftContent}
        {showLiveVisitors ? <LiveVisitorsDropdown /> : null}
        {profileTypeFilter && onProfileTypeFilterChange ? (
          <Dropdown
            items={
              [
                { value: 'all', label: t('project.allUsers') },
                { value: 'anonymous', label: t('project.anonymous') },
                { value: 'identified', label: t('project.identified') },
              ] as const
            }
            title={
              <span className='flex items-center'>
                <UsersIcon className='mr-1.5 h-4 w-4' />
                {profileTypeFilter === 'all'
                  ? t('project.allUsers')
                  : profileTypeFilter === 'anonymous'
                    ? t('project.anonymous')
                    : t('project.identified')}
              </span>
            }
            labelExtractor={(item) => item.label}
            keyExtractor={(item) => item.value}
            onSelect={(item) => {
              onProfileTypeFilterChange(item.value as ProfileTypeFilter)
            }}
            buttonClassName='rounded-md border border-gray-50/0 p-2 text-sm font-medium text-gray-700 transition-colors ring-inset hover:border-gray-300 hover:bg-white focus:z-10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:text-gray-50 hover:dark:border-slate-700/80 dark:hover:bg-slate-900 focus:dark:ring-gray-200'
            chevron='mini'
            headless
          />
        ) : null}
      </div>
      <div className='mx-auto mt-3 flex w-full max-w-[420px] flex-wrap items-center justify-center gap-x-2 gap-y-1 sm:mx-0 sm:w-auto sm:max-w-none sm:flex-nowrap sm:justify-between lg:mt-0'>
        {showRefreshButton ? (
          <RefreshStatsButton onRefresh={refreshStats} />
        ) : null}
        {showSearchButton ? (
          <div className='border-gray-200 dark:border-slate-800'>
            <button
              type='button'
              title={t('project.search')}
              onClick={() => {
                if (dataLoading) {
                  return
                }

                setShowFiltersSearch(true)
              }}
              className={cx(
                'relative rounded-md border border-transparent p-2 text-sm font-medium transition-colors ring-inset hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden hover:dark:border-slate-700/80 dark:hover:bg-slate-900 focus:dark:ring-gray-200',
                {
                  'cursor-not-allowed opacity-50': authLoading || dataLoading,
                },
              )}
            >
              <MagnifyingGlassIcon className='h-5 w-5 text-gray-700 dark:text-gray-50' />
            </button>
          </div>
        ) : null}
        {rightContent}
        {showPeriodSelector ? (
          <div className='flex items-center'>
            <TBPeriodSelector
              classes={{
                timeBucket: hideTimeBucket ? 'hidden' : '',
              }}
              activePeriod={activePeriod}
              items={timeBucketSelectorItems}
              title={activePeriod?.label}
              onSelect={(pair) => {
                if (dataLoading) {
                  return
                }

                if (pair.period === PERIOD_PAIRS_COMPARE.COMPARE) {
                  if (isActiveCompare) {
                    compareDisable()
                  } else {
                    setIsActiveCompare(true)
                  }

                  return
                }

                if (pair.isCustomDate) {
                  setTimeout(() => {
                    refCalendar.current?.openCalendar()
                  }, 100)
                } else {
                  resetDateRange()
                  updatePeriod(pair)
                }
              }}
            />
            <DatePicker
              ref={refCalendar}
              onChange={([from, to]) => {
                const newSearchParams = new URLSearchParams(
                  searchParams.toString(),
                )
                newSearchParams.set('from', from.toISOString())
                newSearchParams.set('to', to.toISOString())
                newSearchParams.set('period', 'custom')
                setSearchParams(newSearchParams)
              }}
              value={dateRange || []}
              maxDateMonths={MAX_MONTHS_IN_PAST}
              maxRange={0}
            />
            <DatePicker
              ref={refCalendarCompare}
              onChange={(date) => {
                setDateRangeCompare(date)
                setActivePeriodCompare(PERIOD_PAIRS_COMPARE.CUSTOM)
                setPeriodPairsCompare(tbPeriodPairsCompare(t, date, language))
              }}
              value={dateRangeCompare || []}
              maxDateMonths={MAX_MONTHS_IN_PAST}
              maxRange={maxRangeCompare}
            />
          </div>
        ) : null}
        {isActiveCompare ? (
          <>
            <div className='text-md mx-2 font-medium whitespace-pre-line text-gray-600 dark:text-gray-200'>
              vs
            </div>
            <Dropdown
              items={periodPairsCompare}
              title={activeDropdownLabelCompare}
              labelExtractor={(pair) => pair.label}
              keyExtractor={(pair) => pair.label}
              onSelect={(pair) => {
                if (pair.period === PERIOD_PAIRS_COMPARE.DISABLE) {
                  compareDisable()
                  return
                }

                if (pair.period === PERIOD_PAIRS_COMPARE.CUSTOM) {
                  setTimeout(() => {
                    refCalendarCompare.current?.openCalendar()
                  }, 100)
                } else {
                  setPeriodPairsCompare(
                    tbPeriodPairsCompare(t, undefined, language),
                  )
                  setDateRangeCompare(null)
                  setActivePeriodCompare(pair.period)
                }
              }}
              chevron='mini'
              headless
            />
          </>
        ) : null}
      </div>
    </div>
  )
}

export default DashboardHeader

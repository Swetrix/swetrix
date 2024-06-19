import React, { memo, useState, useEffect, useMemo, Fragment } from 'react'
import type i18next from 'i18next'
import InnerHTML from 'dangerously-set-html-content'
import { ArrowLongRightIcon, ArrowLongLeftIcon } from '@heroicons/react/24/solid'
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/20/solid'
import {
  FunnelIcon,
  MapIcon,
  Bars4Icon,
  ArrowsPointingOutIcon,
  ChartPieIcon,
  PuzzlePieceIcon,
  RectangleGroupIcon,
} from '@heroicons/react/24/outline'
import cx from 'clsx'
import { pie } from 'billboard.js'
import _keys from 'lodash/keys'
import _values from 'lodash/values'
import _map from 'lodash/map'
import _isEmpty from 'lodash/isEmpty'
import _isString from 'lodash/isString'
import _orderBy from 'lodash/orderBy'
import _reduce from 'lodash/reduce'
import _round from 'lodash/round'
import _find from 'lodash/find'
import _includes from 'lodash/includes'
import _floor from 'lodash/floor'
import _size from 'lodash/size'
import _slice from 'lodash/slice'
import _sum from 'lodash/sum'
import _ceil from 'lodash/ceil'
import _sortBy from 'lodash/sortBy'
import _fromPairs from 'lodash/fromPairs'
import _toPairs from 'lodash/toPairs'
import _reverse from 'lodash/reverse'

import { nFormatter } from 'utils/generic'
import Progress from 'ui/Progress'
import Sort from 'ui/icons/Sort'
import Modal from 'ui/Modal'
import Button from 'ui/Button'
import Chart from 'ui/Chart'
import { PROJECT_TABS } from 'redux/constants'
import { IEntry } from 'redux/models/IEntry'
import InteractiveMap from './components/InteractiveMap'
import UserFlow from './components/UserFlow'
import { iconClassName } from './ViewProject.helpers'
import Spin from 'ui/icons/Spin'

const ENTRIES_PER_PANEL = 5
const ENTRIES_PER_CUSTOM_EVENTS_PANEL = 6

const PANELS_WITH_BARS = ['cc', 'rg', 'ct', 'ce', 'os', 'br', 'dv', 'pg']

// function that checks if there are custom tabs for a specific type
const checkCustomTabs = (panelID: string, customTabs: any) => {
  if (_isEmpty(customTabs)) return false

  return Boolean(_find(customTabs, (el) => el.panelID === panelID))
}

const checkIfBarsNeeded = (panelID: string) => {
  return _includes(PANELS_WITH_BARS, panelID)
}

const removeDuplicates = (arr: any[], keys: string[]) => {
  const uniqueObjects: any[] = []

  const isDuplicate = (obj: any) => {
    // eslint-disable-next-line
    for (const uniqueObj of uniqueObjects) {
      let isMatch = true

      // eslint-disable-next-line
      for (const key of keys) {
        if (uniqueObj[key] !== obj[key]) {
          isMatch = false
          break
        }
      }
      if (isMatch) {
        return true
      }
    }
    return false
  }

  // eslint-disable-next-line
  for (const obj of arr) {
    if (!isDuplicate(obj)) {
      uniqueObjects.push(obj)
    }
  }

  return uniqueObjects
}

interface IPanelContainer {
  name: string | JSX.Element
  children?: React.ReactNode
  noSwitch?: boolean
  icon?: React.ReactNode
  type: string
  onExpandClick?: () => void
  activeFragment: number | string
  setActiveFragment: (arg: number) => void
  customTabs?: any
  activeTab?: string
  isCustomContent?: boolean
}

// noSwitch - 'previous' and 'next' buttons
const PanelContainer = ({
  name,
  children,
  noSwitch,
  icon,
  type,
  activeFragment = 0,
  setActiveFragment = () => {},
  customTabs = [],
  activeTab,
  isCustomContent,
  onExpandClick = () => {},
}: IPanelContainer): JSX.Element => (
  <div
    className={cx(
      'relative max-h-96 min-h-72 overflow-hidden rounded-lg bg-white px-4 pt-5 shadow dark:border dark:border-slate-800/50 dark:bg-slate-800/25 sm:px-6 sm:pt-6',
      {
        'pb-12': !noSwitch,
        'pb-5': noSwitch,
      },
    )}
  >
    <div className='mb-2 flex items-center justify-between'>
      <h3 className='flex items-center text-lg font-semibold leading-6 text-gray-900 dark:text-gray-50'>
        {icon && (
          <>
            {icon}
            &nbsp;
          </>
        )}
        {name}
      </h3>
      <div className='flex'>
        {(checkIfBarsNeeded(type) || checkCustomTabs(type, customTabs)) && (
          <Bars4Icon
            className={cx(iconClassName, 'cursor-pointer', {
              'text-slate-900 dark:text-gray-50': activeFragment === 0,
              'text-slate-400 dark:text-slate-500': _isString(activeFragment) || activeFragment === 1,
            })}
            onClick={() => setActiveFragment(0)}
          />
        )}

        {/* if it is a Country tab  */}
        {(type === 'cc' || type === 'rg' || type === 'ct') && (
          <>
            <MapIcon
              className={cx(iconClassName, 'ml-2 cursor-pointer', {
                'text-slate-900 dark:text-gray-50': activeFragment === 1,
                'text-slate-400 dark:text-slate-500': _isString(activeFragment) || activeFragment === 0,
              })}
              onClick={() => setActiveFragment(1)}
            />
            <ArrowsPointingOutIcon
              className={cx(iconClassName, 'ml-2 cursor-pointer text-slate-400 dark:text-slate-500', {
                hidden: activeFragment === 0,
              })}
              onClick={onExpandClick}
            />
          </>
        )}

        {type === 'pg' && activeTab !== PROJECT_TABS.performance && activeTab !== PROJECT_TABS.errors && (
          <>
            <RectangleGroupIcon
              className={cx(iconClassName, 'ml-2 cursor-pointer', {
                'text-slate-900 dark:text-gray-50': activeFragment === 1,
                'text-slate-400 dark:text-slate-500': _isString(activeFragment) || activeFragment === 0,
              })}
              onClick={() => setActiveFragment(1)}
            />
            <ArrowsPointingOutIcon
              className={cx(iconClassName, 'ml-2 cursor-pointer text-slate-400 dark:text-slate-500', {
                hidden: activeFragment === 0,
              })}
              onClick={onExpandClick}
            />
          </>
        )}

        {/* if this tab using Circle showing stats panel */}
        {(type === 'ce' || type === 'os' || type === 'br' || type === 'dv') && (
          <ChartPieIcon
            className={cx(iconClassName, 'ml-2 cursor-pointer', {
              'text-slate-900 dark:text-gray-50': activeFragment === 1,
              'text-slate-400 dark:text-slate-500': _isString(activeFragment) || activeFragment === 0,
            })}
            onClick={() => setActiveFragment(1)}
          />
        )}

        {/* if it is a 'Custom events' tab  */}
        {type === 'ce' && (
          <>
            <ArrowsPointingOutIcon
              className={cx(iconClassName, 'ml-2 cursor-pointer text-slate-400 dark:text-slate-500')}
              onClick={onExpandClick}
            />
          </>
        )}

        {checkCustomTabs(type, customTabs) && (
          <>
            {/* This is a temp fix to prevent multiple tabs of the same extensionID be displayed */}
            {/* TODO: Investigate the issue and fix it */}
            {_map(removeDuplicates(customTabs, ['extensionID', 'panelID']), ({ extensionID, panelID, onOpen }) => {
              if (panelID !== type) return null

              const onClick = () => {
                if (onOpen) {
                  onOpen()
                }
                setActiveFragment(extensionID)
              }

              return (
                <PuzzlePieceIcon
                  key={`${extensionID}-${panelID}`}
                  className={cx(iconClassName, 'ml-2 cursor-pointer', {
                    'text-slate-900 dark:text-gray-50': activeFragment === extensionID,
                    'text-slate-400 dark:text-slate-500': activeFragment === 0,
                  })}
                  onClick={onClick}
                />
              )
            })}
          </>
        )}
      </div>
    </div>
    {/* for other tabs */}
    <div
      className={cx('flex h-full flex-col scroll-auto', {
        'overflow-auto': !(
          type === 'pg' &&
          activeTab !== PROJECT_TABS.performance &&
          activeTab !== PROJECT_TABS.errors &&
          activeFragment === 1
        ),
        relative: isCustomContent,
      })}
    >
      {children}
    </div>
  </div>
)

// Options for circle chart showing the stats of data
const getPieOptions = (customs: any, uniques: number, t: any) => {
  const tQuantity = t('project.quantity')
  const tConversion = t('project.conversion')
  const tRatio = t('project.ratio')
  const quantity = _values(customs)
  const conversion = _map(quantity, (el) => _round((el / uniques) * 100, 2))

  return {
    tooltip: {
      contents: {
        text: {
          QUANTITY: _values(customs),
          CONVERSION: conversion,
        },
        template: `
          <ul class='bg-gray-100 dark:text-gray-50 dark:bg-slate-700 rounded-md shadow-md px-3 py-1'>
            {{
              <li class='flex'>
                <div class='w-3 h-3 rounded-sm mt-1.5 mr-2' style=background-color:{=COLOR}></div>
                <span>{=NAME}</span>
              </li>
              <hr class='border-gray-200 dark:border-slate-600' />
              <li class='flex justify-between'>
                <span>${tQuantity}</span>
                <span class='pl-4'>{=QUANTITY}</span>
              </li>
              <li class='flex justify-between'>
                <span>${tConversion}</span>
                <span class='pl-4'>{=CONVERSION}%</span>
              </li>
              <li class='flex justify-between'>
                <span>${tRatio}</span>
                <span class='pl-4'>{=VALUE}</span>
              </li>
            }}
          </ul>`,
      },
    },
  }
}

interface ICustomEvents {
  customs: any
  chartData: any
  onFilter: any
  t: typeof i18next.t
  getCustomEventMetadata: (event: string) => any
  customTabs: any
}

interface ISortRows {
  label: string
  sortByAscend: boolean
  sortByDescend: boolean
}

interface IKVTable {
  data: any
  t: any
  uniques: number
}

const KVTable = ({ data, t, uniques }: IKVTable) => {
  const processed = useMemo(() => {
    return _reduce(
      data,
      (acc: any, curr: any) => {
        if (!acc[curr.key]) {
          acc[curr.key] = []
        }

        acc[curr.key].push({
          value: curr.value,
          count: curr.count,
        })

        return acc
      },
      {},
    )
  }, [data])

  if (_isEmpty(data)) {
    return <p className='mb-2 text-gray-600 dark:text-gray-200'>{t('project.noData')}</p>
  }

  return _map(processed, (value, key) => {
    return (
      <table key={key} className='mb-4 w-full border-separate border-spacing-y-1'>
        <thead>
          <tr className='text-gray-600 dark:text-gray-200'>
            <th className='flex w-2/5 items-center pl-2 text-left sm:w-4/6'>{key}</th>
            <th className='w-[30%] sm:w-1/6'>
              <p className='flex items-center justify-end'>{t('project.quantity')}</p>
            </th>
            <th className='w-[30%] pr-2 sm:w-1/6'>
              <p className='flex items-center justify-end'>{t('project.conversion')}</p>
            </th>
          </tr>
        </thead>
        <tbody>
          {_map(value, ({ value: nestedValue, count }) => (
            <tr
              key={nestedValue}
              className='group py-3 text-gray-900 even:bg-gray-50 hover:bg-gray-100 dark:text-gray-50 dark:even:bg-slate-800 hover:dark:bg-slate-700'
            >
              <td className='flex items-center py-1 pl-2 text-left'>{nestedValue}</td>
              <td className='py-1 text-right'>
                {count}
                &nbsp;&nbsp;
              </td>
              <td className='py-1 pr-2 text-right'>{uniques === 0 ? 100 : _round((count / uniques) * 100, 2)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  })
}

// Tabs with custom events like submit form, press button, go to the link rate etc.
const CustomEvents = ({ customs, chartData, onFilter, t, customTabs = [], getCustomEventMetadata }: ICustomEvents) => {
  const [page, setPage] = useState(0)
  const [detailsOpened, setDetailsOpened] = useState(false)
  const [activeEvents, setActiveEvents] = useState<any>({})
  const [loadingEvents, setLoadingEvents] = useState<any>({})
  const [eventsMetadata, setEventsMetadata] = useState<any>({})
  const [customsEventsData, setCustomsEventsData] = useState<any>(customs)
  const currentIndex = page * ENTRIES_PER_CUSTOM_EVENTS_PANEL
  const keys = _keys(customsEventsData)
  const keysToDisplay = useMemo(
    () => _slice(keys, currentIndex, currentIndex + ENTRIES_PER_CUSTOM_EVENTS_PANEL),
    [keys, currentIndex],
  )
  const uniques = _sum(chartData.uniques)
  const [chartOptions, setChartOptions] = useState<any>({})
  const [activeFragment, setActiveFragment] = useState<number>(0)
  const totalPages = useMemo(() => _ceil(_size(keys) / ENTRIES_PER_CUSTOM_EVENTS_PANEL), [keys])
  const canGoPrev = () => page > 0
  const canGoNext = () => page < _floor((_size(keys) - 1) / ENTRIES_PER_CUSTOM_EVENTS_PANEL)
  const [sort, setSort] = useState<ISortRows>({
    label: 'quantity',
    sortByAscend: false,
    sortByDescend: false,
  })

  useEffect(() => {
    const sizeKeys = _size(keys)

    if (currentIndex > sizeKeys) {
      setPage(_floor(sizeKeys / ENTRIES_PER_CUSTOM_EVENTS_PANEL))
    }
  }, [currentIndex, keys])

  useEffect(() => {
    setCustomsEventsData(customs)
    setSort({
      label: 'quantity',
      sortByAscend: false,
      sortByDescend: false,
    })
  }, [customs])

  useEffect(() => {
    setPage(0)
  }, [chartData])

  const onPrevious = () => {
    if (canGoPrev()) {
      setPage(page - 1)
    }
  }

  const onNext = () => {
    if (canGoNext()) {
      setPage(page + 1)
    }
  }

  const sortedAsc = (obj: any, sortByKeys?: boolean) => {
    if (sortByKeys) {
      return _fromPairs(_sortBy(_toPairs(obj), (pair) => pair[0]))
    }

    return _fromPairs(
      _toPairs(obj).sort((a: any, b: any) => {
        return b[1] - a[1]
      }),
    )
  }

  const sortedDesc = (obj: any, sortByKeys?: boolean) => {
    if (sortByKeys) {
      return _fromPairs(_reverse(_sortBy(_toPairs(obj), (pair) => pair[0])))
    }

    return _fromPairs(
      _toPairs(obj).sort((a: any, b: any) => {
        return a[1] - b[1]
      }),
    )
  }

  const toggleEventMetadata = (ev: string) => async (e: any) => {
    e.stopPropagation()

    setActiveEvents((events: any) => ({
      ...events,
      [ev]: !events[ev],
    }))

    if (!eventsMetadata[ev]) {
      setLoadingEvents((events: any) => ({
        ...events,
        [ev]: true,
      }))

      try {
        const data = await getCustomEventMetadata(ev)
        setEventsMetadata((metadata: any) => ({
          ...metadata,
          [ev]: data,
        }))
      } catch (reason) {
        console.error(`[ERROR](toggleEventMetadata) Failed to get metadata for event ${ev}`, reason)
        setEventsMetadata((metadata: any) => ({
          ...metadata,
          [ev]: [],
        }))
      }

      setLoadingEvents((events: any) => ({
        ...events,
        [ev]: false,
      }))
    }
  }

  const onModalClose = () => {
    setDetailsOpened(false)

    // a timeout is needed to prevent the flicker of data fields in the modal when closing
    setTimeout(() => {
      setActiveEvents({})
      setEventsMetadata({})
    }, 300)
  }

  const onSortBy = (label: string) => {
    const sortByKeys = label === 'event'

    if (sort.sortByAscend) {
      setCustomsEventsData(sortedDesc(customsEventsData, sortByKeys))
      setSort({
        label,
        sortByAscend: false,
        sortByDescend: true,
      })
      return
    }

    if (sort.sortByDescend) {
      setCustomsEventsData(customs)
      setSort({
        label,
        sortByAscend: false,
        sortByDescend: false,
      })
      return
    }

    setCustomsEventsData(sortedAsc(customsEventsData, sortByKeys))
    setSort({
      label,
      sortByAscend: true,
      sortByDescend: false,
    })
  }

  useEffect(() => {
    if (!_isEmpty(chartData)) {
      const options = getPieOptions(customsEventsData, uniques, t)
      setChartOptions({
        data: {
          columns: _map(keys, (ev) => [ev, customsEventsData[ev]]),
          type: pie(),
        },
        ...options,
      })
    }
  }, [chartData, customsEventsData, t]) // eslint-disable-line react-hooks/exhaustive-deps

  const CustomEventsTable = () => (
    <div className='overflow-y-auto'>
      <table className='w-full border-separate border-spacing-y-1'>
        <thead>
          <tr className='text-base text-gray-900 dark:text-gray-50'>
            <th
              className='flex w-2/5 cursor-pointer items-center pl-2 text-left hover:opacity-90 sm:w-4/6'
              onClick={() => onSortBy('event')}
            >
              {t('project.event')}
              <Sort
                className='ml-1'
                sortByAscend={sort.label === 'event' && sort.sortByAscend}
                sortByDescend={sort.label === 'event' && sort.sortByDescend}
              />
            </th>
            <th className='w-[30%] sm:w-1/6'>
              <p
                className='flex cursor-pointer items-center justify-end hover:opacity-90'
                onClick={() => onSortBy('quantity')}
              >
                {t('project.quantity')}
                <Sort
                  className='ml-1'
                  sortByAscend={sort.label === 'quantity' && sort.sortByAscend}
                  sortByDescend={sort.label === 'quantity' && sort.sortByDescend}
                />
                &nbsp;&nbsp;
              </p>
            </th>
            <th className='w-[30%] pr-2 sm:w-1/6'>
              <p
                className='flex cursor-pointer items-center justify-end hover:opacity-90'
                onClick={() => onSortBy('conversion')}
              >
                {t('project.conversion')}
                <Sort
                  className='ml-1'
                  sortByAscend={sort.label === 'conversion' && sort.sortByAscend}
                  sortByDescend={sort.label === 'conversion' && sort.sortByDescend}
                />
              </p>
            </th>
          </tr>
        </thead>
        <tbody>
          {_map(keysToDisplay, (ev) => (
            <Fragment key={ev}>
              <tr
                className={cx(
                  'group cursor-pointer text-base text-gray-900 even:bg-gray-50 hover:bg-gray-100 dark:text-gray-50 dark:even:bg-slate-800 hover:dark:bg-slate-700',
                  {
                    'animate-pulse bg-gray-100 dark:bg-slate-700': loadingEvents[ev],
                  },
                )}
                onClick={toggleEventMetadata(ev)}
              >
                <td className='flex items-center py-1 text-left'>
                  {loadingEvents[ev] ? (
                    <Spin className='ml-1 mr-2' />
                  ) : activeEvents[ev] ? (
                    <ChevronUpIcon className='h-5 w-auto pl-1 pr-2 text-gray-500 hover:opacity-80 dark:text-gray-300' />
                  ) : (
                    <ChevronDownIcon className='h-5 w-auto pl-1 pr-2 text-gray-500 hover:opacity-80 dark:text-gray-300' />
                  )}
                  {ev}
                </td>
                <td className='py-1 text-right'>
                  {customsEventsData[ev]}
                  &nbsp;&nbsp;
                </td>
                <td className='py-1 pr-2 text-right'>
                  {uniques === 0 ? 100 : _round((customsEventsData[ev] / uniques) * 100, 2)}%
                </td>
              </tr>
              {activeEvents[ev] && !loadingEvents[ev] && (
                <tr>
                  <td className='pl-9' colSpan={3}>
                    <KVTable data={eventsMetadata[ev]} t={t} uniques={uniques} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )

  // for showing chart circle of stats a data
  if (activeFragment === 1 && !_isEmpty(chartData)) {
    return (
      <PanelContainer
        name={t('project.customEv')}
        type='ce'
        setActiveFragment={setActiveFragment}
        activeFragment={activeFragment}
        onExpandClick={() => setDetailsOpened(true)}
      >
        {_isEmpty(chartData) ? (
          <p className='mt-1 text-base text-gray-700 dark:text-gray-300'>{t('project.noParamData')}</p>
        ) : (
          <Chart options={chartOptions} current='panels-ce' />
        )}
        <Modal
          onClose={onModalClose}
          isOpened={detailsOpened}
          title={t('project.customEv')}
          message={<CustomEventsTable />}
          size='large'
        />
      </PanelContainer>
    )
  }

  // Showing custom tabs (Extensions Marketplace)
  // todo: check activeFragment for being equal to customTabs -> extensionID + panelID
  if (!_isEmpty(customTabs) && typeof activeFragment === 'string') {
    const { tabContent } = _find(customTabs, (tab) => tab.extensionID === activeFragment)

    return (
      <PanelContainer
        name={t('project.customEv')}
        type='ce'
        activeFragment={activeFragment}
        setActiveFragment={setActiveFragment}
        customTabs={customTabs}
        onExpandClick={() => {}}
        isCustomContent
      >
        {/* Using this instead of dangerouslySetInnerHTML to support script tags */}
        {tabContent && <InnerHTML className='absolute overflow-auto' html={tabContent} />}
      </PanelContainer>
    )
  }

  return (
    <PanelContainer
      customTabs={customTabs}
      name={t('project.customEv')}
      type='ce'
      setActiveFragment={setActiveFragment}
      activeFragment={activeFragment}
      onExpandClick={() => setDetailsOpened(true)}
    >
      <table className='table-fixed'>
        <thead>
          <tr className='text-gray-900 dark:text-gray-50'>
            <th
              className='flex w-4/6 cursor-pointer items-center text-left hover:opacity-90'
              onClick={() => onSortBy('event')}
            >
              {t('project.event')}
              <Sort
                className='ml-1'
                sortByAscend={sort.label === 'event' && sort.sortByAscend}
                sortByDescend={sort.label === 'event' && sort.sortByDescend}
              />
            </th>
            <th className='w-1/6 text-right'>
              <p className='flex cursor-pointer items-center hover:opacity-90' onClick={() => onSortBy('quantity')}>
                {t('project.quantity')}
                <Sort
                  className='ml-1'
                  sortByAscend={sort.label === 'quantity' && sort.sortByAscend}
                  sortByDescend={sort.label === 'quantity' && sort.sortByDescend}
                />
                &nbsp;&nbsp;
              </p>
            </th>
            <th className='w-1/6 text-right'>
              <p className='flex cursor-pointer items-center hover:opacity-90' onClick={() => onSortBy('conversion')}>
                {t('project.conversion')}
                <Sort
                  className='ml-1'
                  sortByAscend={sort.label === 'conversion' && sort.sortByAscend}
                  sortByDescend={sort.label === 'conversion' && sort.sortByDescend}
                />
              </p>
            </th>
          </tr>
        </thead>
        <tbody>
          {_map(keysToDisplay, (ev) => (
            <tr
              key={ev}
              className='group cursor-pointer text-gray-900 hover:bg-gray-100 dark:text-gray-50 hover:dark:bg-slate-700'
              onClick={() => onFilter('ev', ev)}
            >
              <td className='flex items-center text-left'>
                {ev}
                <FunnelIcon className='ml-2 hidden h-4 w-4 text-gray-500 group-hover:block dark:text-gray-300' />
              </td>
              <td className='text-right'>
                {customsEventsData[ev]}
                &nbsp;&nbsp;
              </td>
              <td className='text-right'>
                {/*
                  Added a uniques === 0 check because uniques value may be zero and dividing by zero will cause an
                  Infinity% value to be displayed.
                */}
                {uniques === 0 ? 100 : _round((customsEventsData[ev] / uniques) * 100, 2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* for pagination in tabs */}
      {_size(keys) > ENTRIES_PER_CUSTOM_EVENTS_PANEL && (
        <div className='w-card-toggle-sm absolute bottom-0 sm:!w-card-toggle'>
          <div className='mb-2 flex select-none justify-between'>
            <div>
              <span className='text-xs font-light lowercase text-gray-500 dark:text-gray-200'>
                {_size(keys)} {t('project.results')}
              </span>
              <span className='text-xs font-light text-gray-500 dark:text-gray-200'>
                . {t('project.page')} {page + 1} / {totalPages}
              </span>
            </div>
            <div className='flex w-[4.5rem] justify-between'>
              <Button
                className={cx(
                  'border-none bg-gray-100 px-1.5 py-0.5 font-light text-gray-500 shadow dark:bg-slate-800 dark:text-gray-200',
                  {
                    'cursor-not-allowed opacity-50': !canGoPrev(),
                    'hover:bg-gray-200 hover:dark:bg-slate-700': canGoPrev(),
                  },
                )}
                type='button'
                onClick={onPrevious}
                disabled={!canGoPrev()}
                focus={false}
              >
                <ArrowLongLeftIcon className='h-5 w-5' />
              </Button>
              <Button
                className={cx(
                  'border-none bg-gray-100 px-1.5 py-0.5 font-light text-gray-500 shadow dark:bg-slate-800 dark:text-gray-200',
                  {
                    'cursor-not-allowed opacity-50': !canGoNext(),
                    'hover:bg-gray-200 hover:dark:bg-slate-700': canGoNext(),
                  },
                )}
                onClick={onNext}
                disabled={!canGoNext()}
                type='button'
                focus={false}
              >
                <ArrowLongRightIcon className='h-5 w-5' />
              </Button>
            </div>
          </div>
        </div>
      )}
      <Modal
        onClose={onModalClose}
        isOpened={detailsOpened}
        title={t('project.customEv')}
        message={<CustomEventsTable />}
        size='large'
      />
    </PanelContainer>
  )
}

interface IPanel {
  name: string | JSX.Element
  data: IEntry[]
  rowMapper?: (row: any) => string | JSX.Element
  valueMapper?: (value: number) => number
  capitalize?: boolean
  linkContent?: boolean
  t: typeof i18next.t
  icon: any
  id: string
  hideFilters?: boolean
  onFilter: any
  customTabs?: any
  pid?: string | null
  period?: string | null
  timeBucket?: string | null
  from?: string | null
  to?: string | null
  timezone?: string | null
  activeTab?: string
  onFragmentChange?: (arg: number) => void
  filters?: string[]
  projectPassword?: string
}

const Panel = ({
  name,
  data,
  rowMapper = (row: IEntry): string => row.name,
  valueMapper = (value: number): number => value,
  capitalize,
  linkContent,
  t,
  icon,
  id,
  hideFilters,
  onFilter = () => {},
  customTabs = [],
  pid,
  period,
  timeBucket,
  from,
  to,
  timezone,
  activeTab,
  onFragmentChange = () => {},
  filters,
  projectPassword,
}: IPanel): JSX.Element => {
  const [page, setPage] = useState(0)
  const currentIndex = page * ENTRIES_PER_PANEL
  const total = useMemo(() => _reduce(data, (prev, curr) => prev + curr.count, 0), [data])
  const totalPages = _ceil(_size(data) / ENTRIES_PER_PANEL)
  const entries = useMemo(() => _orderBy(data, 'count', 'desc'), [data])
  const entriesToDisplay = _slice(entries, currentIndex, currentIndex + ENTRIES_PER_PANEL)
  const [activeFragment, setActiveFragment] = useState(0)
  const [modal, setModal] = useState(false)
  const [isReversedUserFlow, setIsReversedUserFlow] = useState<boolean>(false)
  const canGoPrev = () => page > 0
  const canGoNext = () => page < _floor((_size(entries) - 1) / ENTRIES_PER_PANEL)

  const _onFilter = hideFilters ? () => {} : onFilter

  useEffect(() => {
    const sizeKeys = _size(entries)

    if (currentIndex > sizeKeys) {
      setPage(_floor(sizeKeys / ENTRIES_PER_PANEL))
    }
  }, [currentIndex, entries])

  useEffect(() => {
    setPage(0)
  }, [data])

  const onPrevious = () => {
    if (canGoPrev()) {
      setPage(page - 1)
    }
  }

  const onNext = () => {
    if (canGoNext()) {
      setPage(page + 1)
    }
  }

  const _setActiveFragment = (index: number) => {
    setActiveFragment(index)

    if (onFragmentChange) {
      onFragmentChange(index)
    }
  }

  // Showing map of stats a data
  if ((id === 'cc' || id === 'rg' || id === 'ct') && activeFragment === 1 && !_isEmpty(data)) {
    return (
      <PanelContainer
        name={name}
        icon={icon}
        type={id}
        activeFragment={activeFragment}
        setActiveFragment={_setActiveFragment}
        onExpandClick={() => setModal(true)}
        customTabs={customTabs}
      >
        <InteractiveMap data={data} total={total} onClickCountry={(key) => _onFilter(id, key)} />
        <Modal
          onClose={() => setModal(false)}
          closeText={t('common.close')}
          isOpened={modal}
          message={<InteractiveMap data={data} total={total} onClickCountry={(key) => _onFilter(id, key)} />}
          size='large'
        />
      </PanelContainer>
    )
  }

  // User flow tab for the Page panel
  if (id === 'pg' && activeFragment === 1) {
    return (
      <PanelContainer
        name={name}
        icon={icon}
        type={id}
        activeFragment={activeFragment}
        setActiveFragment={_setActiveFragment}
        onExpandClick={() => setModal(true)}
        customTabs={customTabs}
      >
        {/* @ts-ignore */}
        <UserFlow
          projectPassword={projectPassword}
          pid={pid || ''}
          period={period || ''}
          timeBucket={timeBucket || ''}
          from={from || ''}
          to={to || ''}
          timezone={timezone || ''}
          filters={filters || []}
          isReversed={isReversedUserFlow}
          setReversed={() => setIsReversedUserFlow(!isReversedUserFlow)}
          t={t}
        />
        <Modal
          onClose={() => setModal(false)}
          closeText={t('common.close')}
          isOpened={modal}
          customButtons={
            <button
              type='button'
              onClick={() => setIsReversedUserFlow(!isReversedUserFlow)}
              className='mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-none dark:border-gray-600 dark:bg-slate-700 dark:text-gray-50 dark:hover:border-gray-600 dark:hover:bg-gray-700 sm:ml-3 sm:mt-0 sm:w-auto sm:text-sm'
            >
              {t('project.reverse')}
            </button>
          }
          message={
            <div className='h-[500px] dark:text-gray-800'>
              {/* @ts-ignore */}
              <UserFlow
                projectPassword={projectPassword}
                pid={pid || ''}
                period={period || ''}
                timeBucket={timeBucket || ''}
                from={from || ''}
                to={to || ''}
                timezone={timezone || ''}
                filters={filters || []}
                isReversed={isReversedUserFlow}
                t={t}
              />
            </div>
          }
          size='large'
        />
      </PanelContainer>
    )
  }

  // Showing chart of stats a data
  if ((id === 'os' || id === 'br' || id === 'dv') && activeFragment === 1 && !_isEmpty(data)) {
    const tQuantity = t('project.quantity')
    const tRatio = t('project.ratio')
    const columns = _map(data, (el) => [el.name, el.count])
    const values = _map(data, (el) => valueMapper(el.count))

    const options = {
      data: {
        columns,
        type: pie(),
      },
      tooltip: {
        contents: {
          text: {
            QUANTITY: values,
          },
          template: `
            <ul class='bg-gray-100 dark:text-gray-50 dark:bg-slate-700 rounded-md shadow-md px-3 py-1'>
              {{
                <li class='flex'>
                  <div class='w-3 h-3 rounded-sm mt-1.5 mr-2' style=background-color:{=COLOR}></div>
                  <span>{=NAME}</span>
                </li>
                <hr class='border-gray-200 dark:border-slate-600' />
                <li class='flex justify-between'>
                  <span>${tQuantity}</span>
                  <span class='pl-4'>{=QUANTITY}</span>
                </li>
                <li class='flex justify-between'>
                  <span>${tRatio}</span>
                  <span class='pl-4'>{=VALUE}</span>
                </li>
              }}
            </ul>`,
        },
      },
    }

    return (
      <PanelContainer
        name={name}
        icon={icon}
        type={id}
        setActiveFragment={_setActiveFragment}
        activeFragment={activeFragment}
        customTabs={customTabs}
        activeTab={activeTab}
      >
        {_isEmpty(data) ? (
          <p className='mt-1 text-base text-gray-700 dark:text-gray-300'>{t('project.noParamData')}</p>
        ) : (
          <Chart options={options} current={`Panels-${id}`} />
        )}
      </PanelContainer>
    )
  }

  // Showing custom tabs (Extensions Marketplace)
  // todo: check activeFragment for being equal to customTabs -> extensionID + panelID
  if (!_isEmpty(customTabs) && typeof activeFragment === 'string' && !_isEmpty(data)) {
    const { tabContent } = _find(customTabs, (tab) => tab.extensionID === activeFragment)

    return (
      <PanelContainer
        name={name}
        icon={icon}
        type={id}
        activeFragment={activeFragment}
        setActiveFragment={_setActiveFragment}
        onExpandClick={() => setModal(true)}
        customTabs={customTabs}
        activeTab={activeTab}
        isCustomContent
      >
        {/* Using this instead of dangerouslySetInnerHTML to support script tags */}
        <InnerHTML className='absolute overflow-auto' html={tabContent} />
      </PanelContainer>
    )
  }

  return (
    <PanelContainer
      name={name}
      icon={icon}
      type={id}
      activeFragment={activeFragment}
      setActiveFragment={_setActiveFragment}
      customTabs={customTabs}
      activeTab={activeTab}
    >
      {_isEmpty(data) ? (
        <p className='mt-1 text-base text-gray-700 dark:text-gray-300'>{t('project.noParamData')}</p>
      ) : (
        _map(entriesToDisplay, (entry) => {
          const { count, name: entryName, cc } = entry
          const perc = _round((count / total) * 100, 2)
          const rowData = rowMapper(entry)
          const valueData = valueMapper(count)

          return (
            <Fragment key={`${id}-${entryName}-${cc}`}>
              <div
                className={cx('mt-[0.32rem] flex justify-between rounded first:mt-0 dark:text-gray-50', {
                  'group cursor-pointer hover:bg-gray-100 hover:dark:bg-slate-700': !hideFilters,
                })}
                onClick={() => _onFilter(id, entryName)}
              >
                {linkContent ? (
                  <a
                    className={cx('label flex items-center text-blue-600 hover:underline dark:text-blue-500', {
                      capitalize,
                    })}
                    href={rowData as string}
                    target='_blank'
                    rel='noopener noreferrer nofollow'
                    aria-label={`${rowData} (opens in a new tab)`}
                  >
                    {rowData}
                    {!hideFilters && (
                      <FunnelIcon className='ml-2 hidden h-4 w-4 text-gray-500 group-hover:block dark:text-gray-300' />
                    )}
                  </a>
                ) : (
                  <span className={cx('label flex items-center', { capitalize })}>
                    {rowData}
                    {!hideFilters && (
                      <FunnelIcon className='ml-2 hidden h-4 w-4 text-gray-500 group-hover:block dark:text-gray-300' />
                    )}
                  </span>
                )}
                <span className='ml-3 dark:text-gray-50'>
                  {activeTab === PROJECT_TABS.traffic ? nFormatter(valueData, 1) : valueData}
                  &nbsp;
                  {activeTab !== PROJECT_TABS.performance && (
                    <span className='font-light text-gray-500 dark:text-gray-200'>
                      ({perc}
                      %)
                    </span>
                  )}
                </span>
              </div>
              <Progress now={perc} />
            </Fragment>
          )
        })
      )}
      {/* for pagination in tabs */}
      {_size(entries) > ENTRIES_PER_PANEL && (
        <div className='w-card-toggle-sm absolute bottom-0 sm:!w-card-toggle'>
          <div className='mb-2 flex select-none justify-between'>
            <div>
              <span className='text-xs font-light lowercase text-gray-500 dark:text-gray-200'>
                {_size(entries)} {t('project.results')}
              </span>
              <span className='text-xs font-light text-gray-500 dark:text-gray-200'>
                . {t('project.page')} {page + 1} / {totalPages}
              </span>
            </div>
            <div className='flex w-[4.5rem] justify-between'>
              <Button
                className={cx(
                  'border-none bg-gray-100 px-1.5 py-0.5 font-light text-gray-500 shadow dark:bg-slate-800 dark:text-gray-200',
                  {
                    'cursor-not-allowed opacity-50': !canGoPrev(),
                    'hover:bg-gray-200 hover:dark:bg-slate-700': canGoPrev(),
                  },
                )}
                type='button'
                onClick={onPrevious}
                disabled={!canGoPrev()}
                focus={false}
              >
                <ArrowLongLeftIcon className='h-5 w-5' />
              </Button>
              <Button
                className={cx(
                  'border-none bg-gray-100 px-1.5 py-0.5 font-light text-gray-500 shadow dark:bg-slate-800 dark:text-gray-200',
                  {
                    'cursor-not-allowed opacity-50': !canGoNext(),
                    'hover:bg-gray-200 hover:dark:bg-slate-700': canGoNext(),
                  },
                )}
                onClick={onNext}
                disabled={!canGoNext()}
                type='button'
                focus={false}
              >
                <ArrowLongRightIcon className='h-5 w-5' />
              </Button>
            </div>
          </div>
        </div>
      )}
    </PanelContainer>
  )
}

const PanelMemo = memo(Panel)
const CustomEventsMemo = memo(CustomEvents)

export { PanelMemo as Panel, CustomEventsMemo as CustomEvents }

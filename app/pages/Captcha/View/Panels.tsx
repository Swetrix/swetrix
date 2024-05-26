import React, { memo, useState, useEffect, useMemo, Fragment } from 'react'
import type i18next from 'i18next'
import { ArrowSmallUpIcon, ArrowSmallDownIcon } from '@heroicons/react/24/solid'
import {
  FunnelIcon,
  MapIcon,
  Bars4Icon,
  ArrowsPointingOutIcon,
  ChartPieIcon,
  ArrowLongRightIcon,
  ArrowLongLeftIcon,
} from '@heroicons/react/24/outline'
import cx from 'clsx'
import { pie } from 'billboard.js'
import _keys from 'lodash/keys'
import _values from 'lodash/values'
import _map from 'lodash/map'
import _isEmpty from 'lodash/isEmpty'
import _reduce from 'lodash/reduce'
import _round from 'lodash/round'
import _ceil from 'lodash/ceil'
import _orderBy from 'lodash/orderBy'
import _includes from 'lodash/includes'
import _floor from 'lodash/floor'
import _size from 'lodash/size'
import _slice from 'lodash/slice'
import _sum from 'lodash/sum'

import Progress from 'ui/Progress'
import PulsatingCircle from 'ui/icons/PulsatingCircle'
import Modal from 'ui/Modal'
import Chart from 'ui/Chart'
import Button from 'ui/Button'

import { IEntry } from 'redux/models/IEntry'

import LiveVisitorsDropdown from './components/LiveVisitorsDropdown'
import InteractiveMap from '../../Project/View/components/InteractiveMap'
import { iconClassName } from './ViewCaptcha.helpers'

const ENTRIES_PER_PANEL = 5

const panelsWithBars = ['cc', 'ce', 'os', 'br', 'dv']

const checkIfBarsNeeded = (panelID: string) => {
  return _includes(panelsWithBars, panelID)
}

interface IPanelContainer {
  name: string
  children?: React.ReactNode
  noSwitch?: boolean
  icon?: React.ReactNode
  type: string
  openModal?: () => void
  activeFragment?: number | string
  setActiveFragment?: (arg: number) => void
}

// noSwitch - 'previous' and 'next' buttons
const PanelContainer = ({
  name,
  children,
  noSwitch,
  icon,
  type,
  openModal = () => {},
  activeFragment = 0,
  setActiveFragment = () => {},
}: IPanelContainer): JSX.Element => (
  <div
    className={cx(
      'relative bg-white dark:bg-slate-800/25 pt-5 px-4 min-h-72 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden',
      {
        'pb-12': !noSwitch,
        'pb-5': noSwitch,
      },
    )}
  >
    <div className='flex items-center justify-between mb-2'>
      <h3 className='flex items-center text-lg leading-6 font-semibold text-gray-900 dark:text-gray-50'>
        {icon && (
          <>
            {icon}
            &nbsp;
          </>
        )}
        {name}
      </h3>
      <div className='flex'>
        {checkIfBarsNeeded(type) && (
          <Bars4Icon
            className={cx(iconClassName, 'cursor-pointer', {
              'text-blue-500': activeFragment === 0,
              'text-gray-900 dark:text-gray-50': activeFragment === 1,
            })}
            onClick={() => setActiveFragment(0)}
          />
        )}

        {/* if it is a Country tab  */}
        {type === 'cc' && (
          <>
            <MapIcon
              className={cx(iconClassName, 'ml-2 cursor-pointer', {
                'text-blue-500': activeFragment === 1,
                'text-gray-900 dark:text-gray-50': activeFragment === 0,
              })}
              onClick={() => setActiveFragment(1)}
            />
            <ArrowsPointingOutIcon
              className={cx(iconClassName, 'ml-2 cursor-pointer text-gray-900 dark:text-gray-50', {
                hidden: activeFragment === 0,
              })}
              onClick={openModal}
            />
          </>
        )}
        {/* if this tab using Circle showing stats panel */}
        {(type === 'ce' || type === 'os' || type === 'br' || type === 'dv') && (
          <ChartPieIcon
            className={cx(iconClassName, 'ml-2 cursor-pointer', {
              'text-blue-500': activeFragment === 1,
              'text-gray-900 dark:text-gray-50': activeFragment === 0,
            })}
            onClick={() => setActiveFragment(1)}
          />
        )}
      </div>
    </div>
    {/* for other tabs */}
    <div className='flex flex-col h-full scroll-auto overflow-auto'>{children}</div>
  </div>
)

// First tab with stats
const Overview = ({
  overall,
  chartData,
  activePeriod,
  t,
  live,
  sessionDurationAVG,
  projectId,
}: {
  overall: any
  chartData: any
  activePeriod: any
  t: typeof i18next.t
  live: number | string
  sessionDurationAVG: number
  projectId: string
}) => {
  const pageviewsDidGrowUp = overall.percChange >= 0
  const uniqueDidGrowUp = overall.percChangeUnique >= 0
  const pageviews = _sum(chartData?.visits) || 0
  const uniques = _sum(chartData?.uniques) || 0
  let bounceRate = 0

  if (pageviews > 0) {
    bounceRate = _round((uniques * 100) / pageviews, 1)
  }

  return (
    <PanelContainer name={t('project.overview')} noSwitch type=''>
      <div className='flex text-lg justify-between'>
        <div className='flex items-center dark:text-gray-50'>
          <PulsatingCircle className='mr-1.5' type='big' />
          {t('dashboard.liveVisitors')}:
        </div>
        <LiveVisitorsDropdown projectId={projectId} live={live} />
      </div>
      {!_isEmpty(chartData) && (
        <>
          <p className='text-lg font-semibold dark:text-gray-50'>
            {t('project.statsFor')}
            <span className='lowercase'>
              &nbsp;
              {activePeriod.label}
            </span>
          </p>

          <div className='flex justify-between'>
            <p className='text-lg dark:text-gray-50'>{t('dashboard.pageviews')}:</p>
            <p className='h-5 mr-2 text-gray-900 dark:text-gray-50 text-xl'>{pageviews}</p>
          </div>

          <div className='flex justify-between'>
            <p className='text-lg dark:text-gray-50'>{t('dashboard.unique')}:</p>
            <p className='h-5 mr-2 text-gray-900 dark:text-gray-50 text-xl'>{uniques}</p>
          </div>

          <div className='flex justify-between'>
            <p className='text-lg dark:text-gray-50'>{t('dashboard.bounceRate')}:</p>
            <p className='h-5 mr-2 text-gray-900 dark:text-gray-50 text-xl'>{bounceRate}%</p>
          </div>
          <div className='flex justify-between'>
            <p className='text-lg dark:text-gray-50'>{t('dashboard.sessionDuration')}:</p>
            <p className='h-5 mr-2 text-gray-900 dark:text-gray-50 text-xl'>{sessionDurationAVG}</p>
          </div>
          <hr className='my-2 border-gray-200 dark:border-gray-600' />
        </>
      )}
      <p className='text-lg font-semibold dark:text-gray-50'>{t('project.weeklyStats')}</p>
      <div className='flex justify-between'>
        <p className='text-lg dark:text-gray-50'>{t('dashboard.pageviews')}:</p>
        <dd className='flex items-baseline'>
          <p className='h-5 mr-2 text-gray-900 dark:text-gray-50 text-lg'>{overall.thisWeek}</p>
          <p
            className={cx('flex text-sm -ml-1 items-baseline', {
              'text-green-600': pageviewsDidGrowUp,
              'text-red-600': !pageviewsDidGrowUp,
            })}
          >
            {pageviewsDidGrowUp ? (
              <>
                <ArrowSmallUpIcon className='self-center flex-shrink-0 h-4 w-4 text-green-500' />
                <span className='sr-only'>{t('dashboard.inc')}</span>
              </>
            ) : (
              <>
                <ArrowSmallDownIcon className='self-center flex-shrink-0 h-4 w-4 text-red-500' />
                <span className='sr-only'>{t('dashboard.dec')}</span>
              </>
            )}
            {overall.percChange}%
          </p>
        </dd>
      </div>
      <div className='flex justify-between'>
        <p className='text-lg dark:text-gray-50'>{t('dashboard.unique')}:</p>
        <dd className='flex items-baseline'>
          <p className='h-5 mr-2 text-gray-900 dark:text-gray-50 text-lg'>{overall.thisWeekUnique}</p>
          <p
            className={cx('flex text-sm -ml-1 items-baseline', {
              'text-green-600': uniqueDidGrowUp,
              'text-red-600': !uniqueDidGrowUp,
            })}
          >
            {uniqueDidGrowUp ? (
              <>
                <ArrowSmallUpIcon className='self-center flex-shrink-0 h-4 w-4 text-green-500' />
                <span className='sr-only'>{t('dashboard.inc')}</span>
              </>
            ) : (
              <>
                <ArrowSmallDownIcon className='self-center flex-shrink-0 h-4 w-4 text-red-500' />
                <span className='sr-only'>{t('dashboard.dec')}</span>
              </>
            )}
            {overall.percChangeUnique}%
          </p>
        </dd>
      </div>
    </PanelContainer>
  )
}

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
          <ul class='bg-gray-100 dark:text-gray-50 dark:bg-slate-800 rounded-md shadow-md px-3 py-1'>
            {{
              <li class='flex'>
                <div class='w-3 h-3 rounded-sm mt-1.5 mr-2' style=background-color:{=COLOR}></div>
                <span>{=NAME}</span>
              </li>
              <hr class='border-gray-200 dark:border-gray-600' />
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

// Tabs with custom events like submit form, press button, go to the link rate etc.
const CustomEvents = ({
  customs,
  chartData,
  onFilter,
  t,
}: {
  customs: any
  chartData: any
  onFilter: any
  t: typeof i18next.t
}) => {
  const keys = _keys(customs)
  const uniques = _sum(chartData.uniques)
  const [chartOptions, setChartOptions] = useState<any>({})
  const [activeFragment, setActiveFragment] = useState<number>(0)

  useEffect(() => {
    if (!_isEmpty(chartData)) {
      const options = getPieOptions(customs, uniques, t)
      setChartOptions({
        data: {
          columns: _map(keys, (ev) => [ev, customs[ev]]),
          type: pie(),
        },
        ...options,
      })
    }
  }, [chartData, customs, t]) // eslint-disable-line react-hooks/exhaustive-deps

  // for showing chart circle of stats a data
  if (activeFragment === 1 && !_isEmpty(chartData)) {
    return (
      <PanelContainer
        name={t('project.customEv')}
        type='ce'
        setActiveFragment={setActiveFragment}
        activeFragment={activeFragment}
      >
        {_isEmpty(chartData) ? (
          <p className='mt-1 text-base text-gray-700 dark:text-gray-300'>{t('project.noParamData')}</p>
        ) : (
          <Chart options={chartOptions} current='panels-ce' />
        )}
      </PanelContainer>
    )
  }

  return (
    <PanelContainer
      name={t('project.customEv')}
      type='ce'
      setActiveFragment={setActiveFragment}
      activeFragment={activeFragment}
    >
      <table className='table-fixed'>
        <thead>
          <tr className='text-gray-900 dark:text-gray-50'>
            <th className='w-4/6 text-left'>{t('project.event')}</th>
            <th className='w-1/6 text-right'>
              {t('project.quantity')}
              &nbsp;&nbsp;
            </th>
            <th className='w-1/6 text-right'>{t('project.conversion')}</th>
          </tr>
        </thead>
        <tbody>
          {_map(keys, (ev) => (
            <tr
              key={ev}
              className='text-gray-900 dark:text-gray-50 group hover:bg-gray-100 hover:dark:bg-slate-800 cursor-pointer'
              onClick={() => onFilter('ev', ev)}
            >
              <td className='text-left flex items-center'>
                {ev}
                <FunnelIcon className='ml-2 w-4 h-4 text-gray-500 hidden group-hover:block dark:text-gray-300' />
              </td>
              <td className='text-right'>
                {customs[ev]}
                &nbsp;&nbsp;
              </td>
              <td className='text-right'>{_round((customs[ev] / uniques) * 100, 2)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </PanelContainer>
  )
}

interface IPanel {
  name: string
  data: IEntry[]
  rowMapper?: (row: any) => string | JSX.Element
  capitalize?: boolean
  linkContent?: boolean
  t: typeof i18next.t
  icon: any
  id: string
  hideFilters?: boolean
  onFilter: any
}

const Panel = ({
  name,
  data,
  rowMapper = (row: IEntry): string => row.name,
  capitalize,
  linkContent,
  t,
  icon,
  id,
  hideFilters,
  onFilter = () => {},
}: IPanel): JSX.Element => {
  const [page, setPage] = useState(0)
  const currentIndex = page * ENTRIES_PER_PANEL
  const total = useMemo(() => _reduce(data, (prev, curr) => prev + curr.count, 0), [data])
  const totalPages = _ceil(total / ENTRIES_PER_PANEL)
  const entries = useMemo(() => _orderBy(data, 'count', 'desc'), [data])
  const entriesToDisplay = _slice(entries, currentIndex, currentIndex + ENTRIES_PER_PANEL)
  const [activeFragment, setActiveFragment] = useState(0)
  const [modal, setModal] = useState(false)
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
  // Showing map of stats a data
  if (id === 'cc' && activeFragment === 1 && !_isEmpty(data)) {
    return (
      <PanelContainer
        name={name}
        icon={icon}
        type={id}
        activeFragment={activeFragment}
        setActiveFragment={setActiveFragment}
        openModal={() => setModal(true)}
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

  // Showing chart of stats a data (start if)
  if ((id === 'os' || id === 'br' || id === 'dv') && activeFragment === 1 && !_isEmpty(data)) {
    const tQuantity = t('project.quantity')
    const tRatio = t('project.ratio')
    const columns = _map(data, (el) => [el.name, el.count])
    const values = _map(data, (el) => el.count)

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
            <ul class='bg-gray-100 dark:text-gray-50 dark:bg-slate-800 rounded-md shadow-md px-3 py-1'>
              {{
                <li class='flex'>
                  <div class='w-3 h-3 rounded-sm mt-1.5 mr-2' style=background-color:{=COLOR}></div>
                  <span>{=NAME}</span>
                </li>
                <hr class='border-gray-200 dark:border-gray-600' />
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
        setActiveFragment={setActiveFragment}
        activeFragment={activeFragment}
      >
        {_isEmpty(data) ? (
          <p className='mt-1 text-base text-gray-700 dark:text-gray-300'>{t('project.noParamData')}</p>
        ) : (
          <Chart options={options} current={`Panels-${id}`} />
        )}
      </PanelContainer>
    )
  }

  return (
    <PanelContainer
      name={name}
      icon={icon}
      type={id}
      activeFragment={activeFragment}
      setActiveFragment={setActiveFragment}
    >
      {_isEmpty(data) ? (
        <p className='mt-1 text-base text-gray-700 dark:text-gray-300'>{t('project.noParamData')}</p>
      ) : (
        _map(entriesToDisplay, (entry) => {
          const { count, name: entryName } = entry
          const perc = _round((count / total) * 100, 2)
          const rowData = rowMapper(entry)
          const valueData = count

          return (
            <Fragment key={entryName}>
              <div
                className={cx('flex justify-between mt-[0.32rem] first:mt-0 dark:text-gray-50 rounded', {
                  'group hover:bg-gray-100 hover:dark:bg-slate-800 cursor-pointer': !hideFilters,
                })}
                onClick={() => _onFilter(id, entryName)}
              >
                {linkContent ? (
                  <a
                    className={cx('flex items-center label hover:underline text-blue-600 dark:text-blue-500', {
                      capitalize,
                    })}
                    href={rowData as string}
                    target='_blank'
                    rel='noopener noreferrer nofollow'
                    aria-label={`${rowData} (opens in a new tab)`}
                  >
                    {rowData}
                    {!hideFilters && (
                      <FunnelIcon className='ml-2 w-4 h-4 text-gray-500 hidden group-hover:block dark:text-gray-300' />
                    )}
                  </a>
                ) : (
                  <span className={cx('flex items-center label', { capitalize })}>
                    {rowData}
                    {!hideFilters && (
                      <FunnelIcon className='ml-2 w-4 h-4 text-gray-500 hidden group-hover:block dark:text-gray-300' />
                    )}
                  </span>
                )}
                <span className='ml-3 dark:text-gray-50'>
                  {valueData}
                  &nbsp;
                  <span className='text-gray-500 dark:text-gray-200 font-light'>
                    ({perc}
                    %)
                  </span>
                </span>
              </div>
              <Progress now={perc} />
            </Fragment>
          )
        })
      )}
      {/* for pagination in tabs */}
      {_size(entries) > ENTRIES_PER_PANEL && (
        <div className='absolute bottom-0 w-card-toggle-sm sm:!w-card-toggle'>
          <div className='flex justify-between select-none mb-2'>
            <div>
              <span className='text-gray-500 dark:text-gray-200 font-light lowercase text-xs'>
                {_size(entries)} {t('project.results')}
              </span>
              <span className='text-gray-500 dark:text-gray-200 font-light text-xs'>
                . {t('project.page')} {page + 1} / {totalPages}
              </span>
            </div>
            <div className='flex justify-between w-[4.5rem]'>
              <Button
                className={cx(
                  'text-gray-500 dark:text-gray-200 font-light shadow bg-gray-100 dark:bg-slate-800 border-none px-1.5 py-0.5',
                  {
                    'opacity-50 cursor-not-allowed': !canGoPrev(),
                    'hover:bg-gray-200 hover:dark:bg-slate-700': canGoPrev(),
                  },
                )}
                type='button'
                onClick={onPrevious}
                disabled={!canGoPrev()}
                focus={false}
              >
                <ArrowLongLeftIcon className='w-5 h-5' />
              </Button>
              <Button
                className={cx(
                  'text-gray-500 dark:text-gray-200 font-light shadow bg-gray-100 dark:bg-slate-800 border-none px-1.5 py-0.5',
                  {
                    'opacity-50 cursor-not-allowed': !canGoNext(),
                    'hover:bg-gray-200 hover:dark:bg-slate-700': canGoNext(),
                  },
                )}
                onClick={onNext}
                disabled={!canGoNext()}
                type='button'
                focus={false}
              >
                <ArrowLongRightIcon className='w-5 h-5' />
              </Button>
            </div>
          </div>
        </div>
      )}
    </PanelContainer>
  )
}

const PanelMemo = memo(Panel)
const OverviewMemo = memo(Overview)
const CustomEventsMemo = memo(CustomEvents)

export { PanelMemo as Panel, OverviewMemo as Overview, CustomEventsMemo as CustomEvents }

import React, {
  memo, useState, useEffect, useMemo, Fragment,
} from 'react'
import {
  ArrowSmallUpIcon, ArrowSmallDownIcon, ArrowLongRightIcon, ArrowLongLeftIcon,
} from '@heroicons/react/24/solid'
import {
  FunnelIcon, MapIcon, Bars4Icon, ArrowsPointingOutIcon, ChartPieIcon, PuzzlePieceIcon,
} from '@heroicons/react/24/outline'
import cx from 'clsx'
import PropTypes from 'prop-types'
import { pie } from 'billboard.js'
import _keys from 'lodash/keys'
import _values from 'lodash/values'
import _map from 'lodash/map'
import _isEmpty from 'lodash/isEmpty'
import _isFunction from 'lodash/isFunction'
import _reduce from 'lodash/reduce'
import _round from 'lodash/round'
import _find from 'lodash/find'
import _includes from 'lodash/includes'
import _floor from 'lodash/floor'
import _size from 'lodash/size'
import _slice from 'lodash/slice'
import _sum from 'lodash/sum'
import _ceil from 'lodash/ceil'

import Progress from 'ui/Progress'
import PulsatingCircle from 'ui/icons/PulsatingCircle'
import Modal from 'ui/Modal'
import Button from 'ui/Button'
import Chart from 'ui/Chart'
import LiveVisitorsDropdown from './components/LiveVisitorsDropdown'
import InteractiveMap from './components/InteractiveMap'
import { iconClassName } from './ViewProject.helpers'

const ENTRIES_PER_PANEL = 5
const ENTRIES_PER_CUSTOM_EVENTS_PANEL = 6

const panelsWithBars = ['cc', 'ce', 'os', 'br', 'dv']

// function that checks if there are custom tabs for a specific type
const checkCustomTabs = (panelID: string, customTabs: any) => {
  if (_isEmpty(customTabs)) return false

  return Boolean(_find(customTabs, (el) => el.panelID === panelID))
}

const checkIfBarsNeeded = (panelID: string) => {
  return _includes(panelsWithBars, panelID)
}

// noSwitch - 'previous' and 'next' buttons
const PanelContainer = ({
  name, children, noSwitch, icon, type, openModal, activeFragment, setActiveFragment, customTabs,
}: {
  name: string,
  children?: React.ReactNode,
  noSwitch?: boolean,
  icon?: React.ReactNode,
  type: string,
  openModal?: () => void,
  activeFragment: number | string,
  setActiveFragment: (arg: number) => void,
  customTabs?: any,
}): JSX.Element => (
  <div
    className={cx('relative bg-white dark:bg-gray-750 pt-5 px-4 min-h-72 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden', {
      'pb-12': !noSwitch,
      'pb-5': noSwitch,
    })}
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
        {(checkIfBarsNeeded(type) || checkCustomTabs(type, customTabs)) && (
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
        {checkCustomTabs(type, customTabs) && (
          <>
            {_map(customTabs, ({ extensionID, panelID }) => (
              <PuzzlePieceIcon
                key={`${extensionID}-${panelID}`}
                className={cx(iconClassName, 'ml-2 cursor-pointer', {
                  'text-blue-500': activeFragment === extensionID,
                  'text-gray-900 dark:text-gray-50': activeFragment === 0,
                })}
                onClick={() => setActiveFragment(extensionID)}
              />
            ))}
          </>
        )}
      </div>
    </div>
    {/* for other tabs */}
    <div className='flex flex-col h-full scroll-auto overflow-auto'>
      {children}
    </div>
  </div>
)

PanelContainer.propTypes = {
  name: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  noSwitch: PropTypes.bool,
  activeFragment: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  setActiveFragment: PropTypes.func,
  icon: PropTypes.node,
}

PanelContainer.defaultProps = {
  icon: null,
  noSwitch: false,
  activeFragment: 0,
  setActiveFragment: () => { },
  openModal: () => { },
  customTabs: [],
}

// First tab with stats
const Overview = ({
  overall, chartData, activePeriod, t, live, sessionDurationAVG, projectId,
}: {
  overall: any
  chartData: any
  activePeriod: any
  t: (arg: string) => string
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
    <PanelContainer name={t('project.overview')} noSwitch type='' openModal={() => {}}>
      <div className='flex text-lg justify-between'>
        <div className='flex items-center dark:text-gray-50'>
          <PulsatingCircle className='mr-1.5' type='big' />
          {t('dashboard.liveVisitors')}
          :
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
            <p className='text-lg dark:text-gray-50'>
              {t('dashboard.pageviews')}
              :
            </p>
            <p className='h-5 mr-2 text-gray-900 dark:text-gray-50 text-xl'>
              {pageviews}
            </p>
          </div>

          <div className='flex justify-between'>
            <p className='text-lg dark:text-gray-50'>
              {t('dashboard.unique')}
              :
            </p>
            <p className='h-5 mr-2 text-gray-900 dark:text-gray-50 text-xl'>
              {uniques}
            </p>
          </div>

          <div className='flex justify-between'>
            <p className='text-lg dark:text-gray-50'>
              {t('dashboard.bounceRate')}
              :
            </p>
            <p className='h-5 mr-2 text-gray-900 dark:text-gray-50 text-xl'>
              {bounceRate}
              %
            </p>
          </div>
          <div className='flex justify-between'>
            <p className='text-lg dark:text-gray-50'>
              {t('dashboard.sessionDuration')}
              :
            </p>
            <p className='h-5 mr-2 text-gray-900 dark:text-gray-50 text-xl'>
              {sessionDurationAVG}
            </p>
          </div>
          <hr className='my-2 border-gray-200 dark:border-gray-600' />
        </>
      )}
      <p className='text-lg font-semibold dark:text-gray-50'>
        {t('project.weeklyStats')}
      </p>
      <div className='flex justify-between'>
        <p className='text-lg dark:text-gray-50'>
          {t('dashboard.pageviews')}
          :
        </p>
        <dd className='flex items-baseline'>
          <p className='h-5 mr-2 text-gray-900 dark:text-gray-50 text-lg'>
            {overall.thisWeek}
          </p>
          <p
            className={cx('flex text-sm -ml-1 items-baseline', {
              'text-green-600': pageviewsDidGrowUp,
              'text-red-600': !pageviewsDidGrowUp,
            })}
          >
            {pageviewsDidGrowUp ? (
              <>
                <ArrowSmallUpIcon className='self-center flex-shrink-0 h-4 w-4 text-green-500' />
                <span className='sr-only'>
                  {t('dashboard.inc')}
                </span>
              </>
            ) : (
              <>
                <ArrowSmallDownIcon className='self-center flex-shrink-0 h-4 w-4 text-red-500' />
                <span className='sr-only'>
                  {t('dashboard.dec')}
                </span>
              </>
            )}
            {overall.percChange}
            %
          </p>
        </dd>
      </div>
      <div className='flex justify-between'>
        <p className='text-lg dark:text-gray-50'>
          {t('dashboard.unique')}
          :
        </p>
        <dd className='flex items-baseline'>
          <p className='h-5 mr-2 text-gray-900 dark:text-gray-50 text-lg'>
            {overall.thisWeekUnique}
          </p>
          <p
            className={cx('flex text-sm -ml-1 items-baseline', {
              'text-green-600': uniqueDidGrowUp,
              'text-red-600': !uniqueDidGrowUp,
            })}
          >
            {uniqueDidGrowUp ? (
              <>
                <ArrowSmallUpIcon className='self-center flex-shrink-0 h-4 w-4 text-green-500' />
                <span className='sr-only'>
                  {t('dashboard.inc')}
                </span>
              </>
            ) : (
              <>
                <ArrowSmallDownIcon className='self-center flex-shrink-0 h-4 w-4 text-red-500' />
                <span className='sr-only'>
                  {t('dashboard.dec')}
                </span>
              </>
            )}
            {overall.percChangeUnique}
            %
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
          <ul class='bg-gray-100 dark:text-gray-50 dark:bg-gray-700 rounded-md shadow-md px-3 py-1'>
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
  customs, chartData, onFilter, t,
}: {
  customs: any
  chartData: any
  onFilter: any
  t: (arg0: string) => string
}) => {
  const [page, setPage] = useState(0)
  const currentIndex = page * ENTRIES_PER_CUSTOM_EVENTS_PANEL
  const keys = _keys(customs)
  const keysToDisplay = useMemo(() => _slice(keys, currentIndex, currentIndex + ENTRIES_PER_CUSTOM_EVENTS_PANEL), [keys, currentIndex])
  const uniques = _sum(chartData.uniques)
  const [chartOptions, setChartOptions] = useState<any>({})
  const [activeFragment, setActiveFragment] = useState<number>(0)
  const totalPages = useMemo(() => _ceil(_size(keys) / ENTRIES_PER_CUSTOM_EVENTS_PANEL), [keys])
  const canGoPrev = () => page > 0
  const canGoNext = () => page < _floor((_size(keys) - 1) / ENTRIES_PER_CUSTOM_EVENTS_PANEL)

  useEffect(() => {
    const sizeKeys = _size(keys)

    if (currentIndex > sizeKeys) {
      setPage(_floor(sizeKeys / ENTRIES_PER_CUSTOM_EVENTS_PANEL))
    }
  }, [currentIndex, keys])

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
          <p className='mt-1 text-base text-gray-700 dark:text-gray-300'>
            {t('project.noParamData')}
          </p>
        ) : (
          <Chart
            options={chartOptions}
            current='panels-ce'
          />
        )}
      </PanelContainer>
    )
  }

  return (
    <PanelContainer name={t('project.customEv')} type='ce' setActiveFragment={setActiveFragment} activeFragment={activeFragment}>
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
          {_map(keysToDisplay, (ev) => (
            <tr
              key={ev}
              className='text-gray-900 dark:text-gray-50 group hover:bg-gray-100 hover:dark:bg-gray-700 cursor-pointer'
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
              <td className='text-right'>
                {_round((customs[ev] / uniques) * 100, 2)}
                %
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* for pagination in tabs */}
      {_size(keys) > ENTRIES_PER_CUSTOM_EVENTS_PANEL && (
        <div className='absolute bottom-0 w-card-toggle-sm sm:w-card-toggle'>
          <div className='flex justify-between select-none mb-2'>
            <div>
              <span className='text-gray-500 dark:text-gray-200 font-light lowercase text-xs'>
                {_size(keys)}
                {' '}
                {t('project.results')}
              </span>
              <span className='text-gray-500 dark:text-gray-200 font-light text-xs'>
                .
                {' '}
                {t('project.page')}
                {' '}
                {page + 1}
                {' '}
                /
                {' '}
                {totalPages}
              </span>
            </div>
            <div className='flex justify-between w-[4.5rem]'>
              <Button
                className={cx('text-gray-500 dark:text-gray-200 font-light shadow bg-gray-100 dark:bg-gray-800 border-none px-1.5 py-0.5', {
                  'opacity-50 cursor-not-allowed': !canGoPrev(),
                  'hover:bg-gray-200 hover:dark:bg-slate-700': canGoPrev(),
                })}
                type='button'
                onClick={onPrevious}
                disabled={!canGoPrev()}
                focus={false}
              >
                <ArrowLongLeftIcon className='w-5 h-5' />
              </Button>
              <Button
                className={cx('text-gray-500 dark:text-gray-200 font-light shadow bg-gray-100 dark:bg-gray-800 border-none px-1.5 py-0.5', {
                  'opacity-50 cursor-not-allowed': !canGoNext(),
                  'hover:bg-gray-200 hover:dark:bg-slate-700': canGoNext(),
                })}
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

CustomEvents.propTypes = {
  customs: PropTypes.objectOf(PropTypes.number).isRequired,
  onFilter: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  chartData: PropTypes.objectOf(PropTypes.any).isRequired,
}

const Panel = ({
  name, data, rowMapper, valueMapper, capitalize, linkContent, t, icon, id, hideFilters, onFilter, customTabs,
}: {
  name: string
  data: any
  rowMapper: any
  valueMapper: any
  capitalize: boolean
  linkContent: boolean
  t: (arg0: string) => string
  icon: any
  id: string
  hideFilters: boolean
  onFilter: any
  customTabs?: any
}): JSX.Element => {
  const [page, setPage] = useState(0)
  const currentIndex = page * ENTRIES_PER_PANEL
  const keys = useMemo(() => _keys(data).sort((a, b) => data[b] - data[a]), [data])
  const keysToDisplay = useMemo(() => _slice(keys, currentIndex, currentIndex + ENTRIES_PER_PANEL), [keys, currentIndex])
  const total = useMemo(() => _reduce(keys, (prev, curr) => prev + data[curr], 0), [keys]) // eslint-disable-line
  const totalPages = useMemo(() => _ceil(_size(keys) / ENTRIES_PER_PANEL), [keys])
  const [activeFragment, setActiveFragment] = useState(0)
  const [modal, setModal] = useState(false)
  const canGoPrev = () => page > 0
  const canGoNext = () => page < _floor((_size(keys) - 1) / ENTRIES_PER_PANEL)

  const _onFilter = hideFilters ? () => { } : onFilter

  useEffect(() => {
    const sizeKeys = _size(keys)

    if (currentIndex > sizeKeys) {
      setPage(_floor(sizeKeys / ENTRIES_PER_PANEL))
    }
  }, [currentIndex, keys])

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
        customTabs={customTabs}
      >
        <InteractiveMap
          data={data}
          total={total}
          onClickCountry={(key) => _onFilter(id, key)}
        />
        <Modal
          onClose={() => setModal(false)}
          closeText={t('common.close')}
          isOpened={modal}
          message={(
            <InteractiveMap
              data={data}
              total={total}
              onClickCountry={(key) => _onFilter(id, key)}
            />
          )}
          size='large'
        />
      </PanelContainer>
    )
  }
  // Showing chart of stats a data (start if)
  if ((id === 'os' || id === 'br' || id === 'dv') && activeFragment === 1 && !_isEmpty(data)) {
    const tQuantity = t('project.quantity')
    const tRatio = t('project.ratio')
    const mappedData = _map(data, valueMapper)

    const options = {
      data: {
        columns: _map(data, (e, index) => [index, e]),
        type: pie(),
      },
      tooltip: {
        contents: {
          text: {
            QUANTITY: _values(mappedData),
          },
          template: `
            <ul class='bg-gray-100 dark:text-gray-50 dark:bg-gray-700 rounded-md shadow-md px-3 py-1'>
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
        customTabs={customTabs}
      >
        {_isEmpty(data) ? (
          <p className='mt-1 text-base text-gray-700 dark:text-gray-300'>
            {t('project.noParamData')}
          </p>
        ) : (
          <Chart
            options={options}
            current={`Panels-${id}`}
          />
        )}
      </PanelContainer>
    )
  }
  // Showing chart of stats a data (end if)

  // Showing custom tabs (Extensions Marketplace)
  // todo: check activeFragment for being equal to customTabs -> extensionID + panelID
  if (!_isEmpty(customTabs) && typeof activeFragment === 'string' && !_isEmpty(data)) {
    const content = _find(customTabs, (tab) => tab.extensionID === activeFragment).tabContent

    return (
      <PanelContainer
        name={name}
        icon={icon}
        type={id}
        activeFragment={activeFragment}
        setActiveFragment={setActiveFragment}
        openModal={() => setModal(true)}
        customTabs={customTabs}
      >
        {/* eslint-disable-next-line react/no-danger */}
        <div dangerouslySetInnerHTML={{ __html: content }} />
      </PanelContainer>
    )
  }

  return (
    <PanelContainer name={name} icon={icon} type={id} activeFragment={activeFragment} setActiveFragment={setActiveFragment} customTabs={customTabs}>
      {_isEmpty(data) ? (
        <p className='mt-1 text-base text-gray-700 dark:text-gray-300'>
          {t('project.noParamData')}
        </p>
      ) : _map(keysToDisplay, key => {
        const perc = _round((data[key] / total) * 100, 2)
        const rowData = _isFunction(rowMapper) ? rowMapper(key) : key
        const valueData = _isFunction(valueMapper) ? valueMapper(data[key]) : data[key]

        return (
          <Fragment key={key}>
            <div
              className={cx('flex justify-between mt-[0.32rem] first:mt-0 dark:text-gray-50 rounded', {
                'group hover:bg-gray-100 hover:dark:bg-gray-700 cursor-pointer': !hideFilters,
              })}
              onClick={() => _onFilter(id, key)}
            >
              {linkContent ? (
                <a
                  className={cx('flex items-center label hover:underline text-blue-600 dark:text-blue-500', { capitalize })}
                  href={rowData}
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
                  (
                  {perc}
                  %)
                </span>
              </span>
            </div>
            <Progress now={perc} />
          </Fragment>
        )
      })}
      {/* for pagination in tabs */}
      {_size(keys) > ENTRIES_PER_PANEL && (
        <div className='absolute bottom-0 w-card-toggle-sm sm:w-card-toggle'>
          <div className='flex justify-between select-none mb-2'>
            <div>
              <span className='text-gray-500 dark:text-gray-200 font-light lowercase text-xs'>
                {_size(keys)}
                {' '}
                {t('project.results')}
              </span>
              <span className='text-gray-500 dark:text-gray-200 font-light text-xs'>
                .
                {' '}
                {t('project.page')}
                {' '}
                {page + 1}
                {' '}
                /
                {' '}
                {totalPages}
              </span>
            </div>
            <div className='flex justify-between w-[4.5rem]'>
              <Button
                className={cx('text-gray-500 dark:text-gray-200 font-light shadow bg-gray-100 dark:bg-gray-800 border-none px-1.5 py-0.5', {
                  'opacity-50 cursor-not-allowed': !canGoPrev(),
                  'hover:bg-gray-200 hover:dark:bg-slate-700': canGoPrev(),
                })}
                type='button'
                onClick={onPrevious}
                disabled={!canGoPrev()}
                focus={false}
              >
                <ArrowLongLeftIcon className='w-5 h-5' />
              </Button>
              <Button
                className={cx('text-gray-500 dark:text-gray-200 font-light shadow bg-gray-100 dark:bg-gray-800 border-none px-1.5 py-0.5', {
                  'opacity-50 cursor-not-allowed': !canGoNext(),
                  'hover:bg-gray-200 hover:dark:bg-slate-700': canGoNext(),
                })}
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

Panel.propTypes = {
  name: PropTypes.string.isRequired,
  data: PropTypes.objectOf(PropTypes.number).isRequired,
  id: PropTypes.string,
  rowMapper: PropTypes.func,
  valueMapper: PropTypes.func,
  onFilter: PropTypes.func,
  capitalize: PropTypes.bool,
  linkContent: PropTypes.bool,
  hideFilters: PropTypes.bool,
  icon: PropTypes.node,
}

Panel.defaultProps = {
  id: null,
  rowMapper: null,
  valueMapper: null,
  capitalize: false,
  linkContent: false,
  onFilter: () => { },
  hideFilters: false,
  icon: null,
  customTabs: [],
}

const PanelMemo = memo(Panel)
const OverviewMemo = memo(Overview)
const CustomEventsMemo = memo(CustomEvents)

export {
  PanelMemo as Panel,
  OverviewMemo as Overview,
  CustomEventsMemo as CustomEvents,
}

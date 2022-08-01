import React, {
  memo, useState, useEffect, useMemo, Fragment,
} from 'react'
import { ArrowSmUpIcon, ArrowSmDownIcon } from '@heroicons/react/solid'
import {
  FilterIcon, MapIcon, ViewListIcon, ArrowsExpandIcon, ChartPieIcon,
} from '@heroicons/react/outline'
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
import _floor from 'lodash/floor'
import _size from 'lodash/size'
import _slice from 'lodash/slice'
import _sum from 'lodash/sum'

import Progress from 'ui/Progress'
import PulsatingCircle from 'ui/icons/PulsatingCircle'
import Modal from 'ui/Modal'
import Chart from 'ui/Chart'
import InteractiveMap from './InteractiveMap'
import { iconClassName } from './ViewProject'

const ENTRIES_PER_PANEL = 5

// noSwitch - 'previous' and 'next' buttons
const PanelContainer = ({
  name, children, noSwitch, icon, type, openModal, activeFragment, setActiveFragment,
}) => (
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
      {type === 'cc' && (
        <div className='flex'>
          <ViewListIcon
            className={cx(iconClassName, 'cursor-pointer', {
              'text-blue-500': activeFragment === 0,
              'text-gray-900 dark:text-gray-50': activeFragment === 1,
            })}
            onClick={() => setActiveFragment(0)}
          />
          <MapIcon
            className={cx(iconClassName, 'ml-2 cursor-pointer', {
              'text-blue-500': activeFragment === 1,
              'text-gray-900 dark:text-gray-50': activeFragment === 0,
            })}
            onClick={() => setActiveFragment(1)}
          />
          <ArrowsExpandIcon
            className={cx(iconClassName, 'ml-2 cursor-pointer text-gray-900 dark:text-gray-50', {
              hidden: activeFragment === 0,
            })}
            onClick={openModal}
          />
        </div>
      )}
      {(type === 'ce' || type === 'os' || type === 'br' || type === 'dv') && (
        <div className='flex'>
          <ViewListIcon
            className={cx(iconClassName, 'cursor-pointer', {
              'text-blue-500': activeFragment === 0,
              'text-gray-900 dark:text-gray-50': activeFragment === 1,
            })}
            onClick={() => setActiveFragment(0)}
          />
          <ChartPieIcon
            className={cx(iconClassName, 'ml-2 cursor-pointer', {
              'text-blue-500': activeFragment === 1,
              'text-gray-900 dark:text-gray-50': activeFragment === 0,
            })}
            onClick={() => setActiveFragment(1)}
          />
        </div>
      )}
    </div>
    <div className='flex flex-col h-full scroll-auto overflow-auto'>
      {children}
    </div>
  </div>
)

PanelContainer.propTypes = {
  name: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  noSwitch: PropTypes.bool,
  activeFragment: PropTypes.number,
  setActiveFragment: PropTypes.func,
  icon: PropTypes.node,
}

PanelContainer.defaultProps = {
  icon: null,
  noSwitch: false,
  activeFragment: 0,
  setActiveFragment: () => { },
}

const Overview = ({
  overall, chartData, activePeriod, t, live,
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
    <PanelContainer name={t('project.overview')} noSwitch>
      <div className='flex text-lg justify-between'>
        <div className='flex items-center dark:text-gray-50'>
          <PulsatingCircle className='mr-1.5' type='big' />
          {t('dashboard.liveVisitors')}
          :
        </div>
        <p className='h-5 mr-2 text-gray-900 dark:text-gray-50 text-xl'>
          {live}
        </p>
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
          <hr className='my-2' />
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
                <ArrowSmUpIcon className='self-center flex-shrink-0 h-4 w-4 text-green-500' />
                <span className='sr-only'>
                  {t('dashboard.inc')}
                </span>
              </>
            ) : (
              <>
                <ArrowSmDownIcon className='self-center flex-shrink-0 h-4 w-4 text-red-500' />
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
                <ArrowSmUpIcon className='self-center flex-shrink-0 h-4 w-4 text-green-500' />
                <span className='sr-only'>
                  {t('dashboard.inc')}
                </span>
              </>
            ) : (
              <>
                <ArrowSmDownIcon className='self-center flex-shrink-0 h-4 w-4 text-red-500' />
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

const getPieOptions = (customs, uniques, t) => {
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

const CustomEvents = ({
  customs, chartData, t,
}) => {
  const keys = _keys(customs)
  const uniques = _sum(chartData.uniques)
  const [chartOptions, setChartOptions] = useState({})
  const [activeFragment, setActiveFragment] = useState(0)

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
          <tr>
            <th className='w-4/6 text-left text-gray-900 dark:text-gray-50'>{t('project.event')}</th>
            <th className='w-1/6 text-right text-gray-900 dark:text-gray-50'>
              {t('project.quantity')}
              &nbsp;&nbsp;
            </th>
            <th className='w-1/6 text-right text-gray-900 dark:text-gray-50'>{t('project.conversion')}</th>
          </tr>
        </thead>
        <tbody>
          {_map(keys, (ev) => (
            <tr key={ev}>
              <td className='text-left text-gray-900 dark:text-gray-50'>
                {ev}
              </td>
              <td className='text-right text-gray-900 dark:text-gray-50'>
                {customs[ev]}
                &nbsp;&nbsp;
              </td>
              <td className='text-right text-gray-900 dark:text-gray-50'>
                {_round((customs[ev] / uniques) * 100, 2)}
                %
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </PanelContainer>
  )
}

CustomEvents.propTypes = {
  customs: PropTypes.objectOf(PropTypes.number).isRequired,
}

const Panel = ({
  name, data, rowMapper, capitalize, linkContent, t, icon, id, hideFilters, onFilter,
}) => {
  const [page, setPage] = useState(0)
  const currentIndex = page * ENTRIES_PER_PANEL
  const keys = useMemo(() => _keys(data).sort((a, b) => data[b] - data[a]), [data])
  const keysToDisplay = useMemo(() => _slice(keys, currentIndex, currentIndex + 5), [keys, currentIndex])
  const total = useMemo(() => _reduce(keys, (prev, curr) => prev + data[curr], 0), [keys]) // eslint-disable-line
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

  if ((id === 'os' || id === 'br' || id === 'dv') && activeFragment === 1 && !_isEmpty(data)) {
    const tQuantity = t('project.quantity')
    const tRatio = t('project.ratio')

    const options = {
      data: {
        columns: _map(data, (e, index) => [index, e]),
        type: pie(),
      },
      tooltip: {
        contents: {
          text: {
            QUANTITY: _values(data),
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

  return (
    <PanelContainer name={name} icon={icon} type={id} activeFragment={activeFragment} setActiveFragment={setActiveFragment}>
      {_isEmpty(data) ? (
        <p className='mt-1 text-base text-gray-700 dark:text-gray-300'>
          {t('project.noParamData')}
        </p>
      ) : _map(keysToDisplay, key => {
        const perc = _round((data[key] / total) * 100, 2)
        const rowData = _isFunction(rowMapper) ? rowMapper(key) : key

        return (
          <Fragment key={key}>
            <div
              className={cx('flex justify-between mt-1 dark:text-gray-50 rounded', {
                'group hover:bg-gray-100 hover:dark:bg-gray-700 cursor-pointer': !hideFilters,
              })}
              onClick={() => _onFilter(id, key)}
            >
              {linkContent ? (
                <a
                  className={cx('flex items-center label hover:underline text-blue-600 dark:text-blue-500', { capitalize })}
                  href={rowData}
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  {rowData}
                  {!hideFilters && (
                    <FilterIcon className='ml-2 w-4 h-4 text-gray-500 hidden group-hover:block dark:text-gray-300' />
                  )}
                </a>
              ) : (
                <span className={cx('flex items-center label', { capitalize })}>
                  {rowData}
                  {!hideFilters && (
                    <FilterIcon className='ml-2 w-4 h-4 text-gray-500 hidden group-hover:block dark:text-gray-300' />
                  )}
                </span>
              )}
              <span className='ml-3 dark:text-gray-50'>
                {data[key]}
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
      {_size(keys) > 5 && (
        <div className='absolute bottom-0 w-card-toggle'>
          <div className='flex justify-between select-none mb-2'>
            <span
              className={cx('text-gray-500 dark:text-gray-200 font-light', {
                hoverable: canGoPrev(),
                disabled: !canGoPrev(),
              })}
              role='button'
              onClick={onPrevious}
              tabIndex={0}
            >
              &lt;
              &nbsp;
              {t('project.prev')}
            </span>
            <span
              className={cx('text-gray-500 dark:text-gray-200 font-light', {
                hoverable: canGoNext(),
                disabled: !canGoNext(),
              })}
              role='button'
              onClick={onNext}
              tabIndex={0}
            >
              {t('project.next')}
              &nbsp;
              &gt;
            </span>
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
  onFilter: PropTypes.func,
  capitalize: PropTypes.bool,
  linkContent: PropTypes.bool,
  hideFilters: PropTypes.bool,
  icon: PropTypes.node,
}

Panel.defaultProps = {
  id: null,
  rowMapper: null,
  capitalize: false,
  linkContent: false,
  onFilter: () => { },
  hideFilters: false,
  icon: null,
}

const PanelMemo = memo(Panel)
const OverviewMemo = memo(Overview)
const CustomEventsMemo = memo(CustomEvents)

export {
  PanelMemo as Panel,
  OverviewMemo as Overview,
  CustomEventsMemo as CustomEvents,
}

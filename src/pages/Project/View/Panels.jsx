import React, { memo, useState, useMemo, Fragment } from 'react'
import { ArrowSmUpIcon } from '@heroicons/react/solid'
import { ArrowSmDownIcon } from '@heroicons/react/solid'
import cx from 'classnames'
import PropTypes from 'prop-types'
import _keys from 'lodash/keys'
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

const ENTRIES_PER_PANEL = 5

const PanelContainer = ({
  name, children,
}) => (
  <div className='relative bg-white pt-5 px-4 pb-12 min-h-72 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden'>
    <h3 className='text-lg leading-6 font-semibold mb-2 text-gray-900'>{name}</h3>
    <div className='flex flex-col h-full scroll-auto'>
      {children}
    </div>
  </div>
)

PanelContainer.propTypes = {
  name: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
}

const Overview = ({
  overall, chartData, activePeriod,
}) => {
  const pageviewsDidGrowUp = overall.percChange >= 0
  const uniqueDidGrowUp = overall.percChangeUnique >= 0
  const pageviews = _sum(chartData.visits)
  const uniques = _sum(chartData.uniques)

  return (
    <PanelContainer name='Overview'>
      {!_isEmpty(chartData) && (
        <>
          <p className='text-lg font-semibold'>
            Stats for
            <span className='lowercase'> {activePeriod.label}</span>
          </p>

          <div className='flex justify-between'>
            <p className='text-lg'>Pageviews:</p>
            <p className='h-5 w-5 mr-2 text-gray-900 text-xl'>
              {pageviews}
            </p>
          </div>

          <div className='flex justify-between'>
            <p className='text-lg'>Unique views:</p>
            <p className='h-5 w-5 mr-2 text-gray-900 text-xl'>
              {uniques}
            </p>
          </div>
          <hr className='my-2' />
        </>
      )}
      <p className='text-lg font-semibold'>
        Weekly stats
      </p>
      <div className='flex justify-between'>
        <p className='text-lg'>Pageviews:</p>
        <dd className='flex items-baseline'>
          <p className='h-5 w-5 mr-2 text-gray-900 text-lg'>
            {overall.thisWeek}
          </p>
          <p className={cx('flex text-sm -ml-1 items-baseline', {
            'text-green-600': pageviewsDidGrowUp,
            'text-red-600': !pageviewsDidGrowUp,
          })}>
            {pageviewsDidGrowUp ? (
              <>
                <ArrowSmUpIcon className='self-center flex-shrink-0 h-4 w-4 text-green-500' />
                <span className='sr-only'>
                  Increased by
                </span>
              </>
            ) : (
              <>
                <ArrowSmDownIcon className='self-center flex-shrink-0 h-4 w-4 text-red-500' />
                <span className='sr-only'>
                  Descreased by
                </span>
              </>
            )}
            {overall.percChange}%
          </p>
        </dd>
      </div>
      <div className='flex justify-between'>
        <p className='text-lg'>Unique views:</p>
        <dd className='flex items-baseline'>
          <p className='h-5 w-5 mr-2 text-gray-900 text-lg'>
            {overall.thisWeekUnique}
          </p>
          <p className={cx('flex text-sm -ml-1 items-baseline', {
            'text-green-600': uniqueDidGrowUp,
            'text-red-600': !uniqueDidGrowUp,
          })}>
            {uniqueDidGrowUp ? (
              <>
                <ArrowSmUpIcon className='self-center flex-shrink-0 h-4 w-4 text-green-500' />
                <span className='sr-only'>
                  Increased by
                </span>
              </>
            ) : (
              <>
                <ArrowSmDownIcon className='self-center flex-shrink-0 h-4 w-4 text-red-500' />
                <span className='sr-only'>
                  Descreased by
                </span>
              </>
            )}
            {overall.percChangeUnique}%
          </p>
        </dd>
      </div>
    </PanelContainer>
  )
}

const CustomEvents = ({
  customs, chartData,
}) => {
  const keys = _keys(customs)
  const uniques = _sum(chartData.uniques)

  return (
    <PanelContainer name='Custom events'>
      <table className='table-fixed'>
        <thead>
          <tr>
            <th className='w-4/6 text-left text-gray-900'>Event</th>
            <th className='w-1/6 text-right text-gray-900'>Quantity&nbsp;&nbsp;</th>
            <th className='w-1/6 text-right text-gray-900'>Conversion</th>
          </tr>
        </thead>
        <tbody>
          {_map(keys, (ev) => (
            <tr key={ev}>
              <td className='text-left'>{ev}</td>
              <td className='text-right'>{customs[ev]}&nbsp;&nbsp;</td>
              <td className='text-right'>{_round((customs[ev] / uniques) * 100, 2)}%</td>
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
  name, data, rowMapper, capitalize, linkContent,
}) => {
  const [page, setPage] = useState(0)
  const currentIndex = page * ENTRIES_PER_PANEL
  const keys = useMemo(() => _keys(data).sort((a, b) => data[b] - data[a]), [data])
  const keysToDisplay = useMemo(() => _slice(keys, currentIndex, currentIndex + 5), [keys, currentIndex])
  const total = useMemo(() => _reduce(keys, (prev, curr) => prev + data[curr], 0), [keys]) // eslint-disable-line

  const canGoPrev = () => page > 0
  const canGoNext = () => page < _floor(_size(keys) / ENTRIES_PER_PANEL)

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

  return (
    <PanelContainer name={name}>
      {_isEmpty(data) ? (
        <p className='mt-1 text-base text-gray-700'>No data for this parameter yet</p>
      ) : _map(keysToDisplay, key => {
        const perc = _round(data[key] / total * 100, 2)
        const rowData = _isFunction(rowMapper) ? rowMapper(key) : key

        return (
          <Fragment key={key}>
            <div className='flex justify-between mt-1'>
              {linkContent ? (
                <a className={cx('flex label hover:underline text-blue-600', { capitalize })} href={rowData} target='_blank' rel='noopener noreferrer'>
                  {rowData}
                </a>
              ) : (
                <span className={cx('flex label', { capitalize })}>
                  {rowData}
                </span>
              )}
              <span className='ml-3'>
                {data[key]}
                &nbsp;
                <span className='text-gray-500 font-light'>({perc}%)</span>
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
              className={cx('text-gray-500 font-light', {
                hoverable: canGoPrev(),
                disabled: !canGoPrev(),
              })}
              role='button'
              onClick={onPrevious}
            >
              &lt; Previous
          </span>
            <span
              className={cx('text-gray-500 font-light', {
                hoverable: canGoNext(),
                disabled: !canGoNext(),
              })}
              role='button'
              onClick={onNext}
            >
              Next &gt;
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
  rowMapper: PropTypes.func,
  capitalize: PropTypes.bool,
  linkContent: PropTypes.bool,
}

Panel.defaultProps = {
  rowMapper: null,
  capitalize: false,
  linkContent: false,
}

const PanelMemo = memo(Panel)
const OverviewMemo = memo(Overview)
const CustomEventsMemo = memo(CustomEvents)

export {
  PanelMemo as Panel,
  OverviewMemo as Overview,
  CustomEventsMemo as CustomEvents,
}
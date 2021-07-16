import React, { memo, useState, useMemo, Fragment } from 'react'
import cx from 'classnames'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import _isEmpty from 'lodash/isEmpty'
import _reduce from 'lodash/reduce'
import _round from 'lodash/round'
import _floor from 'lodash/floor'
import _size from 'lodash/size'
import _slice from 'lodash/slice'

import Progress from 'ui/Progress'

const ENTRIES_PER_PANEL = 5

const Panel = ({ name, data }) => {
  const [page, setPage] = useState(0)
  const currentIndex = page * ENTRIES_PER_PANEL
  const keys = useMemo(() => _keys(data).sort((a, b) => data[b] - data[a]), [data])
  const keysToDisplay = useMemo(() => _slice(keys, currentIndex, currentIndex + 5), [keys, currentIndex])
  const total = useMemo(() => _reduce(keys, (prev, curr) => prev + data[curr], 0), [keys])

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
    <div className='relative bg-white pt-5 px-4 pb-12 h-72 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden'>
      <h3 className='text-lg leading-6 font-semibold mb-2 text-gray-900'>{name}</h3>
      <div className='flex flex-col h-full'>
        {_isEmpty(data) ? (
          <p className="mt-1 text-base text-gray-700">There's currently no data for this parameter</p>
        ) : _map(keysToDisplay, key => {
          const perc = _round(data[key] / total * 100, 2)

          return (
            <Fragment key={key}>
              <div className='flex justify-between mt-1'>
                <span className='label'>{key}</span>
                <span className='ml-3'>
                  {data[key]}&nbsp;
                  <span className='text-gray-500 font-light'>({perc}%)</span>
                </span>
              </div>
              <Progress now={perc} />
            </Fragment>
          )
        })}
        {_size(keys) > 5 && (
          <div className="absolute bottom-0 w-card-toggle">
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
      </div>
    </div>
  )
}

const PanelMemo = memo(Panel)

export {
  PanelMemo as Panel,
}
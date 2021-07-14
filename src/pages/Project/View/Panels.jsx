import React, { memo, useState, useMemo, Fragment } from 'react'
import Card from 'react-bootstrap/Card'
import ProgressBar from 'react-bootstrap/ProgressBar'
import cx from 'classnames'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import _isEmpty from 'lodash/isEmpty'
import _reduce from 'lodash/reduce'
import _round from 'lodash/round'
import _floor from 'lodash/floor'
import _size from 'lodash/size'
import _slice from 'lodash/slice'

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
    <Card style={{ height: '300px' }} className='w31-5 m-3 shadow-sm'>
      <Card.Body>
        <Card.Title>{name}</Card.Title>
        <Card.Text>
          {_isEmpty(data) ? (
            <p>There's currently no data for this parameter</p>
          ) : _map(keysToDisplay, key => {
            const perc = _round(data[key] / total * 100, 2)
  
            return (
              <Fragment key={key}>
                <div className='d-flex justify-content-between'>
                  <span className='label'>{key}</span>
                  <span className='ml-3'>
                    {data[key]}&nbsp;
                    <span className='text-secondary font-weight-light'>({perc}%)</span>
                  </span>
                </div>
                <ProgressBar now={perc} />
              </Fragment>
            )
          })}
          {_size(keys) > 5 && (
            <div className='d-flex justify-content-between position-absolute fixed-bottom user-select-none pl-3 pr-3 mb-2'>
              <span
                className={cx('text-secondary font-weight-light', {
                  hoverable: canGoPrev(),
                  disabled: !canGoPrev(),
                })}
                role='button'
                onClick={onPrevious}
              >
                &lt; Previous
              </span>
              <span
                className={cx('text-secondary font-weight-light', {
                  hoverable: canGoNext(),
                  disabled: !canGoNext(),
                })}
                role='button'
                onClick={onNext}
              >
                Next &gt;
              </span>
            </div>
          )}
        </Card.Text>
      </Card.Body>
    </Card>
  )
}

const PanelMemo = memo(Panel)

export {
  PanelMemo as Panel,
}
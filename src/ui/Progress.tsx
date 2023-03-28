import React, { memo } from 'react'
import PropTypes from 'prop-types'

const Progress = ({ now }: {
  now: number,
}): JSX.Element => (
  <div className='relative'>
    <div className='overflow-hidden h-2 text-xs flex rounded bg-blue-200 dark:bg-gray-500'>
      <div style={{ width: `${now}%` }} className='shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 dark:bg-blue-700' />
    </div>
  </div>
)

Progress.propTypes = {
  now: PropTypes.number.isRequired,
}

export default memo(Progress)

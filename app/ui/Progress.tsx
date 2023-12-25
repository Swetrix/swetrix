import React, { memo } from 'react'
import PropTypes from 'prop-types'

interface IProgress {
  now: number
}

const Progress = ({ now }: IProgress): JSX.Element => (
  <div className='relative' data-testid='progress'>
    <div className='overflow-hidden h-2 text-xs flex rounded bg-blue-200 dark:bg-slate-600'>
      <div
        style={{ width: `${now}%` }}
        className='shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 dark:bg-blue-700'
      />
    </div>
  </div>
)

Progress.propTypes = {
  now: PropTypes.number.isRequired,
}

export default memo(Progress)

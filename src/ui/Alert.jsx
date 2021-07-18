// Custom Alert template for react-alert
import React, { memo } from 'react'
import cx from 'classnames'
import PropTypes from 'prop-types'
import { CheckCircleIcon } from '@heroicons/react/solid'
import { InformationCircleIcon } from '@heroicons/react/solid'
import { XCircleIcon } from '@heroicons/react/solid'
import { XIcon } from '@heroicons/react/solid'

const AlertTemplate = ({ message, options, className, close }) => {
  const { type } = options
  const isInfo = type === 'info'
  const isSuccess = type === 'success'
  const isError = type === 'error'

  return (
    <div className={cx('flex justify-between items-center mb-5 mr-2 rounded-md p-4 z-20 shadow-sm w-96', {
      'bg-green-50': isSuccess,
      'bg-blue-50': isInfo,
      'bg-red-50': isError,
    }, className)}>
      <div className='flex-shrink-0'>
        {isInfo && <InformationCircleIcon className='h-5 w-5 mr-2 text-blue-400' />}
        {isSuccess && <CheckCircleIcon className='h-5 w-5 mr-2 text-green-400' />}
        {isError && <XCircleIcon className='h-6 w-6 mr-2 text-red-400' />}
      </div>
      <span className={cx('text-sm font-medium uppercase', {
        'text-green-800': isSuccess,
        'text-blue-700': isInfo,
        'text-red-800': isError,
      })}>{message}</span>
      <button
        onClick={close}
        type='button'
        className={cx('inline-flex cursor-pointer rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2', {
          'bg-green-50 text-green-500 hover:bg-green-100 focus:ring-offset-green-50 focus:ring-green-600': isSuccess,
          'bg-blue-50 text-blue-500 hover:bg-blue-100 focus:ring-offset-blue-50 focus:ring-blue-600': isInfo,
          'bg-red-50 text-red-500 hover:bg-red-100 focus:ring-offset-red-50 focus:ring-red-600': isError,
        })}>
        <span className='sr-only'>Dismiss</span>
        <XIcon className='h-5 w-5' />
      </button>
    </div>
  )
}

AlertTemplate.propTypes = {
  message: PropTypes.string,
  className: PropTypes.string,
  options: PropTypes.object,
  close: PropTypes.func,
}

AlertTemplate.defaultProps = {
  message: '',
  className: '',
  options: {},
  close: () => { },
}

export default memo(AlertTemplate)
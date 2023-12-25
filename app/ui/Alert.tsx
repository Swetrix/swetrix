// Custom Alert template for react-alert
import React, { memo } from 'react'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import { CheckCircleIcon, InformationCircleIcon, XCircleIcon, XMarkIcon } from '@heroicons/react/24/solid'

interface IAlert {
  /* (string): The message to be displayed in the alert. */
  message: string
  //  (object): An object containing the options for the alert, including the type property, which can have the values 'info', 'success', or 'error'.
  options: {
    type: 'info' | 'success' | 'error'
  }
  // (function): A callback function to be called when the alert is closed.
  close: () => void
}

// AlertTemplate component
const AlertTemplate = ({ message, options, close }: IAlert): JSX.Element => {
  const { t } = useTranslation('common')
  const { type } = options
  const isInfo = type === 'info'
  const isSuccess = type === 'success'
  const isError = type === 'error'

  return (
    <div className='pointer-events-auto w-72 min-[425px]:w-96 mb-5 mr-2 min-[425px]:mr-5 z-50 overflow-hidden rounded-lg bg-white dark:bg-slate-900 shadow-lg ring-1 ring-black dark:ring-slate-800 ring-opacity-5'>
      <div className='p-4'>
        <div className='flex items-start'>
          <div className='flex-shrink-0'>
            {isInfo && <InformationCircleIcon className='h-6 w-6 text-blue-400' aria-hidden='true' />}
            {isSuccess && <CheckCircleIcon className='h-6 w-6 text-green-400' aria-hidden='true' />}
            {isError && <XCircleIcon className='h-6 w-6 text-red-400' aria-hidden='true' />}
          </div>
          <div className='ml-3 w-0 flex-1 pt-0.5'>
            <p className='text-sm font-medium text-gray-900 dark:text-gray-50'>
              {isInfo && t('common.info')}
              {isSuccess && t('common.success')}
              {isError && t('common.error')}
            </p>
            <p className='mt-1 text-sm text-gray-500 dark:text-gray-300'>{message}</p>
          </div>
          <div className='ml-4 flex flex-shrink-0'>
            <button
              type='button'
              className='inline-flex rounded-md bg-white dark:bg-slate-900 text-gray-400 hover:text-gray-500 dark:text-gray-200 dark:hover:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
              onClick={close}
            >
              <span className='sr-only'>{t('common.close')}</span>
              <XMarkIcon className='h-5 w-5' aria-hidden='true' />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Define prop types for the component
AlertTemplate.propTypes = {
  message: PropTypes.string,
  className: PropTypes.string,
  options: PropTypes.shape({
    type: PropTypes.oneOf(['info', 'success', 'error']),
  }),
  close: PropTypes.func,
}

// Define default props for the component
AlertTemplate.defaultProps = {
  message: '',
  className: '',
  options: {},
  close: () => {},
}

export default memo(AlertTemplate)

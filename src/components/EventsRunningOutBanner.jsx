import React, { memo } from 'react'
import { ExclamationIcon, XIcon } from '@heroicons/react/outline'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { authActions } from 'redux/actions/auth'

const EventsRunningOutBanner = () => {
  const { t } = useTranslation('common')
  const dispatch = useDispatch()

  const logoutHandler = () => {
    dispatch(authActions.logout())
  }

  return (
    <div className='bg-yellow-400'>
      <div className='max-w-7xl mx-auto py-3 px-3 sm:px-6 lg:px-8'>
        <div className='flex items-center justify-between flex-wrap'>
          <div className='w-0 flex-1 flex items-center'>
            <span className='flex p-2 rounded-lg bg-yellow-600'>
              <ExclamationIcon className='h-6 w-6 text-white' aria-hidden='true' />
            </span>
            <p className='ml-3 font-medium text-black truncate'>
              <span className='md:hidden'>You are running out of events!</span>
              <span className='hidden md:inline'>You have used more than 85% of the available events per your tier for this month.</span>
            </p>
          </div>
          <div className='order-3 mt-2 flex-shrink-0 w-full sm:order-2 sm:mt-0 sm:w-auto'>
            {/* TODO: SHOW MODAL */}
            <span
              className='flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-yellow-600 bg-white hover:bg-yellow-50'
            >
              Learn more
            </span>
          </div>
          <div className='order-2 flex-shrink-0 sm:order-3 sm:ml-3'>
            <button
              type='button'
              className='-mr-1 flex p-2 rounded-md hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-white sm:-mr-2'
            >
              <span className='sr-only'>Dismiss</span>
              <XIcon className='h-6 w-6 text-black' aria-hidden='true' />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default memo(EventsRunningOutBanner)

import React, { memo, useState } from 'react'
import { ExclamationIcon, XIcon } from '@heroicons/react/outline'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'

import Modal from 'ui/Modal'
import UIActions from 'redux/actions/ui'
import { SHOW_BANNER_AT_PERC } from 'redux/constants'

const EventsRunningOutBanner = () => {
  const { t } = useTranslation('common')
  const dispatch = useDispatch()
  const showNoEventsLeftBanner = useSelector(state => state.ui.misc.showNoEventsLeftBanner)
  const [showModeInfoModal, setShowModeInfoModal] = useState(false)

  const closeHandler = () => {
    dispatch(UIActions.setShowNoEventsLeftBanner(false))
  }

  if (!showNoEventsLeftBanner) {
    return null
  }

  return (
    <>
      <div className='bg-yellow-400 dark:bg-yellow-500'>
        <div className='max-w-7xl mx-auto py-3 px-3 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between flex-wrap'>
            <div className='w-0 flex-1 flex items-center'>
              <span className='flex p-2 rounded-lg bg-yellow-600'>
                <ExclamationIcon className='h-6 w-6 text-white' aria-hidden='true' />
              </span>
              <p className='ml-3 font-medium text-black truncate'>
                <span className='md:hidden'>
                  {t('dashboard.lowEventsTitle')}
                </span>
                <span className='hidden md:inline'>
                  {t('dashboard.eventsXPercUsed', {
                    amount: SHOW_BANNER_AT_PERC,
                  })}
                </span>
              </p>
            </div>
            <div className='order-3 mt-2 flex-shrink-0 w-full sm:order-2 sm:mt-0 sm:w-auto'>
              <span
                onClick={() => setShowModeInfoModal(true)}
                className='flex items-center justify-center cursor-pointer px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-yellow-600 bg-gray-50 hover:bg-yellow-50 dark:text-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600'
              >
                {t('common.learnMore')}
              </span>
            </div>
            <div className='order-2 flex-shrink-0 sm:order-3 sm:ml-3'>
              <button
                type='button'
                onClick={closeHandler}
                className='-mr-1 flex p-2 rounded-md hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-white sm:-mr-2'
              >
                <span className='sr-only'>
                  {t('common.close')}
                </span>
                <XIcon className='h-6 w-6 text-black' aria-hidden='true' />
              </button>
            </div>
          </div>
        </div>
      </div>
      <Modal
        onClose={() => setShowModeInfoModal(false)}
        onSubmit={() => setShowModeInfoModal(false)}
        submitText={t('common.gotIt')}
        title={t('dashboard.lowEventsTitle')}
        message={t('dashboard.lowEventsDesc')}
        type='warning'
        isOpened={showModeInfoModal}
      />
    </>
  )
}

export default memo(EventsRunningOutBanner)

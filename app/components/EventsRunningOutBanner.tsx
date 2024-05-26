import React, { memo, useState } from 'react'
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useSelector } from 'react-redux'
import { useAppDispatch, StateType } from 'redux/store'
import { useTranslation } from 'react-i18next'

import Modal from 'ui/Modal'
import UIActions from 'redux/reducers/ui'
import { SHOW_BANNER_AT_PERC } from 'redux/constants'

const EventsRunningOutBanner = () => {
  const { t } = useTranslation('common')
  const dispatch = useAppDispatch()
  const showNoEventsLeftBanner = useSelector((state: StateType) => state.ui.misc.showNoEventsLeftBanner)
  const dashboardBlockReason = useSelector((state: StateType) => state.auth.user.dashboardBlockReason)
  const [showMoreInfoModal, setShowMoreInfoModal] = useState(false)

  const closeHandler = () => {
    dispatch(UIActions.setShowNoEventsLeftBanner(false))
  }

  if (!showNoEventsLeftBanner || dashboardBlockReason) {
    return null
  }

  return (
    <>
      <div className='bg-yellow-400 dark:bg-yellow-500'>
        <div className='mx-auto max-w-7xl px-3 py-3 sm:px-6 lg:px-8'>
          <div className='flex flex-wrap items-center justify-between'>
            <div className='flex flex-1 items-center'>
              <span className='flex rounded-lg bg-yellow-600 p-2'>
                <ExclamationTriangleIcon className='h-6 w-6 text-white' aria-hidden='true' />
              </span>
              <p className='ml-3 truncate font-medium text-black'>
                <span className='md:hidden'>{t('dashboard.lowEventsTitle')}</span>
                <span className='hidden md:inline'>
                  {t('dashboard.eventsXPercUsed', {
                    amount: SHOW_BANNER_AT_PERC,
                  })}
                </span>
              </p>
            </div>
            <div className='order-3 mt-2 w-full flex-shrink-0 sm:order-2 sm:mt-0 sm:w-auto'>
              <span
                onClick={() => setShowMoreInfoModal(true)}
                className='flex cursor-pointer items-center justify-center rounded-md border border-transparent bg-gray-50 px-4 py-2 text-sm font-medium text-yellow-600 shadow-sm hover:bg-yellow-50 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'
              >
                {t('common.learnMore')}
              </span>
            </div>
            <div className='order-2 flex-shrink-0 sm:order-3 sm:ml-3'>
              <button
                type='button'
                onClick={closeHandler}
                className='-mr-1 flex rounded-md p-2 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-white sm:-mr-2'
              >
                <span className='sr-only'>{t('common.close')}</span>
                <XMarkIcon className='h-6 w-6 text-black' aria-hidden='true' />
              </button>
            </div>
          </div>
        </div>
      </div>
      <Modal
        onClose={() => setShowMoreInfoModal(false)}
        onSubmit={() => setShowMoreInfoModal(false)}
        submitText={t('common.gotIt')}
        title={t('dashboard.lowEventsTitle')}
        message={t('dashboard.lowEventsDesc')}
        type='warning'
        isOpened={showMoreInfoModal}
      />
    </>
  )
}

export default memo(EventsRunningOutBanner)

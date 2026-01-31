import { WarningIcon, XIcon } from '@phosphor-icons/react'
import { memo, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { LOW_EVENTS_WARNING, SHOW_BANNER_AT_PERC } from '~/lib/constants'
import { useAuth } from '~/providers/AuthProvider'
import Modal from '~/ui/Modal'
import { shouldShowLowEventsBanner } from '~/utils/auth'
import { setCookie } from '~/utils/cookie'
import { secondsTillNextMonth } from '~/utils/generic'

const EventsRunningOutBanner = () => {
  const { t } = useTranslation('common')
  const [showMoreInfoModal, setShowMoreInfoModal] = useState(false)
  const [isBannerClosed, setIsBannerClosed] = useState(false)

  const { user, totalMonthlyEvents } = useAuth()

  const shouldShowBanner = useMemo(() => {
    if (!user || isBannerClosed) {
      return false
    }

    const { maxEventsCount } = user

    if (!totalMonthlyEvents || !maxEventsCount) {
      return false
    }

    return shouldShowLowEventsBanner(totalMonthlyEvents, maxEventsCount)
  }, [user, totalMonthlyEvents, isBannerClosed])

  const closeHandler = () => {
    setIsBannerClosed(true)

    const maxAge = secondsTillNextMonth() + 86400
    setCookie(LOW_EVENTS_WARNING, 1, maxAge)
  }

  if (!shouldShowBanner || user?.dashboardBlockReason) {
    return null
  }

  return (
    <>
      <div className='bg-yellow-400 dark:bg-yellow-500'>
        <div className='mx-auto max-w-7xl px-3 py-3 sm:px-6 lg:px-8'>
          <div className='flex flex-wrap items-center justify-between'>
            <div className='flex flex-1 items-center'>
              <span className='flex rounded-lg bg-yellow-600 p-2'>
                <WarningIcon
                  className='h-6 w-6 text-white'
                  aria-hidden='true'
                />
              </span>
              <p className='ml-3 truncate font-medium text-black'>
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
            <div className='order-3 mt-2 w-full shrink-0 sm:order-2 sm:mt-0 sm:w-auto'>
              <span
                onClick={() => setShowMoreInfoModal(true)}
                className='flex cursor-pointer items-center justify-center rounded-md bg-gray-50 px-4 py-2 text-sm font-medium text-yellow-600 hover:bg-yellow-50 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'
              >
                {t('common.learnMore')}
              </span>
            </div>
            <div className='order-2 shrink-0 sm:order-3 sm:ml-3'>
              <button
                type='button'
                onClick={closeHandler}
                className='-mr-1 flex rounded-md p-2 hover:bg-yellow-500 focus:ring-2 focus:ring-white focus:outline-hidden sm:-mr-2'
              >
                <span className='sr-only'>{t('common.close')}</span>
                <XIcon className='h-6 w-6 text-black' aria-hidden='true' />
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

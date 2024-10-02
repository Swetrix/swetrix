import React, { memo, useState, useMemo } from 'react'
import { LockClosedIcon } from '@heroicons/react/24/outline'
import { useSelector } from 'react-redux'
import { StateType } from 'redux/store'
import { useTranslation } from 'react-i18next'
import { DashboardBlockReason } from 'redux/models/IUser'
import Modal from 'ui/Modal'

const DashboardLockedBanner = () => {
  const { t } = useTranslation('common')
  const dashboardBlockReason = useSelector((state: StateType) => state.auth.user.dashboardBlockReason)
  const [showMoreInfoModal, setShowMoreInfoModal] = useState(false)

  const message = useMemo(() => {
    if (dashboardBlockReason === DashboardBlockReason.exceeding_plan_limits) {
      return t('project.locked.descExceedingTier')
    }
    if (dashboardBlockReason === DashboardBlockReason.trial_ended) {
      return t('project.locked.descTialEnded')
    }
    if (dashboardBlockReason === DashboardBlockReason.payment_failed) {
      return t('project.locked.descPaymentFailed')
    }
    if (dashboardBlockReason === DashboardBlockReason.subscription_cancelled) {
      return t('project.locked.descSubCancelled')
    }
  }, [t, dashboardBlockReason])

  if (!dashboardBlockReason) {
    return null
  }

  return (
    <>
      <div className='bg-yellow-400 dark:bg-yellow-500'>
        <div className='mx-auto max-w-7xl px-3 py-3 sm:px-6 lg:px-8'>
          <div className='flex flex-wrap items-center justify-between'>
            <div className='flex flex-1 items-center'>
              <span className='flex rounded-lg bg-yellow-600 p-2'>
                <LockClosedIcon className='h-6 w-6 text-white' aria-hidden='true' />
              </span>
              <p className='ml-3 font-medium text-black'>{t('dashboard.accountLocked')}</p>
            </div>
            <div className='order-3 mt-2 w-full flex-shrink-0 sm:order-2 sm:mt-0 sm:w-auto'>
              <span
                onClick={() => setShowMoreInfoModal(true)}
                className='flex cursor-pointer items-center justify-center rounded-md border border-transparent bg-gray-50 px-4 py-2 text-sm font-medium text-yellow-600 shadow-sm hover:bg-yellow-50 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'
              >
                {t('common.learnMore')}
              </span>
            </div>
          </div>
        </div>
      </div>
      <Modal
        onClose={() => setShowMoreInfoModal(false)}
        onSubmit={() => setShowMoreInfoModal(false)}
        submitText={t('common.gotIt')}
        title={t('dashboard.accountLockedTitle')}
        message={
          <span>
            {message}
            <br />
            <br />
            {t('project.locked.resolve')}
          </span>
        }
        type='warning'
        isOpened={showMoreInfoModal}
      />
    </>
  )
}

export default memo(DashboardLockedBanner)

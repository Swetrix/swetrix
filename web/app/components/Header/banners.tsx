import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from '~/ui/Link'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

import { SHOW_BANNER_AT_PERC, isSelfhosted, API_URL } from '~/lib/constants'
import { useAuth } from '~/providers/AuthProvider'
import routes from '~/utils/routes'
import Modal from '~/ui/Modal'
import { shouldShowLowEventsBanner } from '~/utils/auth'
import { DashboardBlockReason } from '~/lib/models/User'

dayjs.extend(utc)

const EventsRunningOutBanner = () => {
  const { t } = useTranslation('common')
  const [showMoreInfoModal, setShowMoreInfoModal] = useState(false)

  return (
    <>
      <div className='header-banner w-full bg-amber-500 text-gray-50'>
        <div className='mx-auto max-w-7xl space-x-2 px-4 py-2 text-center text-sm sm:px-6 lg:px-8'>
          <span className='md:hidden'>{t('dashboard.lowEventsTitle')}</span>
          <span className='hidden md:inline'>
            {t('dashboard.eventsXPercUsed', {
              amount: SHOW_BANNER_AT_PERC,
            })}
          </span>
          <button
            type='button'
            onClick={() => setShowMoreInfoModal(true)}
            className='rounded-md bg-slate-100 px-2 py-0.5 font-medium text-gray-900'
          >
            {t('common.learnMore')}
          </button>
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

const TrialBanner = () => {
  const { t } = useTranslation('common')

  return (
    <div className='header-banner w-full bg-slate-900 text-gray-100 dark:bg-slate-900/70'>
      <div className='mx-auto max-w-7xl px-4 py-2 text-center text-sm sm:px-6 lg:px-8'>
        <span className='font-medium'>
          {t('header.trialBanner.endedTitle')}
        </span>
        <span className='mx-1.5'>—</span>
        <Link to={routes.billing} className='font-semibold underline'>
          {t('header.trialBanner.reviewBilling')}
        </Link>
        <span className='ml-1.5'>{t('header.trialBanner.endedBody')}</span>
      </div>
    </div>
  )
}

const DashboardLockedBanner = () => {
  const { t } = useTranslation('common')
  const { user } = useAuth()
  const [showMoreInfoModal, setShowMoreInfoModal] = useState(false)

  const dashboardBlockReason = user?.dashboardBlockReason

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

  return (
    <>
      <div className='header-banner w-full bg-amber-500 text-gray-50'>
        <div className='mx-auto max-w-7xl space-x-2 px-4 py-2 text-center text-sm sm:px-6 lg:px-8'>
          <span>{t('dashboard.accountLocked')}</span>
          <button
            type='button'
            onClick={() => setShowMoreInfoModal(true)}
            className='rounded-md bg-slate-100 px-2 py-0.5 font-medium text-gray-900'
          >
            {t('common.learnMore')}
          </button>
        </div>
      </div>
      <Modal
        onClose={() => setShowMoreInfoModal(false)}
        closeText={t('common.close')}
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
        customButtons={
          <Link
            to={routes.billing}
            onClick={() => setShowMoreInfoModal(false)}
            className='inline-flex w-full justify-center rounded-md bg-indigo-600 px-4 py-2 text-base font-medium text-white transition-colors hover:bg-indigo-700 sm:ml-3 sm:w-auto sm:text-sm'
          >
            {t('main.goToBilling')}
          </Link>
        }
      />
    </>
  )
}

const SelfhostedCantReachAPIBanner = () => {
  const { t } = useTranslation('common')

  return (
    <div className='header-banner w-full bg-amber-500 text-gray-50'>
      <div className='mx-auto max-w-7xl space-x-2 px-4 py-2 text-center text-sm sm:px-6 lg:px-8'>
        <span>{t('ce.cantReachBackend')}</span>
      </div>
    </div>
  )
}

export const BannerManager = () => {
  const { user, isAuthenticated, totalMonthlyEvents } = useAuth()
  const [
    showSelfhostedCantReachAPIBanner,
    setShowSelfhostedCantReachAPIBanner,
  ] = useState(false)

  useEffect(() => {
    const checkApiUrl = async () => {
      if (!isSelfhosted) {
        return
      }

      const response = await fetch(`${API_URL}ping`)
      if (!response.ok) {
        setShowSelfhostedCantReachAPIBanner(true)
      }
    }

    checkApiUrl()
  }, [])

  const isExpiredTrialWithoutSubscription = useMemo(() => {
    const trialEnded =
      !!user?.trialEndDate && dayjs.utc(user.trialEndDate).isBefore(dayjs.utc())

    return (
      user?.dashboardBlockReason ===
        DashboardBlockReason.subscription_cancelled &&
      user?.planCode === 'none' &&
      trialEnded &&
      !user?.subID
    )
  }, [
    user?.dashboardBlockReason,
    user?.planCode,
    user?.trialEndDate,
    user?.subID,
  ])

  const shouldShowEventsRunningOutBanner = useMemo(() => {
    if (!user) {
      return false
    }

    const { maxEventsCount } = user

    if (!totalMonthlyEvents || !maxEventsCount) {
      return false
    }

    return shouldShowLowEventsBanner(totalMonthlyEvents, maxEventsCount)
  }, [user, totalMonthlyEvents])

  if (showSelfhostedCantReachAPIBanner) {
    return <SelfhostedCantReachAPIBanner />
  }

  if (!isSelfhosted && isAuthenticated && isExpiredTrialWithoutSubscription) {
    return <TrialBanner />
  }

  if (user?.dashboardBlockReason) {
    return <DashboardLockedBanner />
  }

  if (shouldShowEventsRunningOutBanner) {
    return <EventsRunningOutBanner />
  }

  return null
}

import { ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import utc from 'dayjs/plugin/utc'
import _round from 'lodash/round'
import { memo, useMemo, useState, useEffect } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { toast } from 'sonner'

import { getPaymentMetainfo, getUsageInfo } from '~/api'
import DashboardLockedBanner from '~/components/DashboardLockedBanner'
import { withAuthentication, auth } from '~/hoc/protected'
import { isSelfhosted, PADDLE_JS_URL, PADDLE_VENDOR_ID, CONTACT_EMAIL, paddleLanguageMapping } from '~/lib/constants'
import { DEFAULT_METAINFO, Metainfo } from '~/lib/models/Metainfo'
import { UsageInfo } from '~/lib/models/Usageinfo'
import { useAuth } from '~/providers/AuthProvider'
import { useTheme } from '~/providers/ThemeProvider'
import Button from '~/ui/Button'
import Loader from '~/ui/Loader'
import Modal from '~/ui/Modal'
import MultiProgress from '~/ui/MultiProgress'
import { loadScript } from '~/utils/generic'

import Pricing from '../../components/marketing/Pricing'

dayjs.extend(utc)
dayjs.extend(duration)

const Billing = () => {
  const [isCancelSubModalOpened, setIsCancelSubModalOpened] = useState(false)

  const [metainfo, setMetainfo] = useState<Metainfo>(DEFAULT_METAINFO)
  const [lastEvent, setLastEvent] = useState<{
    event: string
  } | null>(null)

  const { user, isLoading: authLoading } = useAuth()
  const { theme } = useTheme()
  const { isAuthenticated } = useAuth()
  const [usageInfo, setUsageInfo] = useState<UsageInfo>({
    total: 0,
    traffic: 0,
    errors: 0,
    customEvents: 0,
    captcha: 0,
    trafficPerc: 0,
    errorsPerc: 0,
    customEventsPerc: 0,
    captchaPerc: 0,
  })
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const {
    nextBillDate,
    planCode,
    subUpdateURL,
    trialEndDate,
    timeFormat,
    cancellationEffectiveDate,
    subCancelURL,
    maxEventsCount = 0,
  } = user || {}

  const isSubscriber = !['none', 'trial', 'free'].includes(planCode || '')
  const isTrial = planCode === 'trial'
  const isNoSub = planCode === 'none'

  const totalUsage = maxEventsCount ? _round((usageInfo.total / maxEventsCount) * 100, 2) : 0

  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const abortController = new AbortController()

    getPaymentMetainfo({ signal: abortController.signal })
      .then(setMetainfo)
      .catch(() => {})

    return () => abortController.abort()
  }, [])

  // Paddle (payment processor) set-up
  useEffect(() => {
    loadScript(PADDLE_JS_URL)

    const interval = setInterval(paddleSetup, 200)

    // prettier-ignore
    function paddleSetup() {
      if (isSelfhosted) {
        clearInterval(interval)
      } else if ((window as any)?.Paddle) {
        (window as any).Paddle.Setup({
          vendor: PADDLE_VENDOR_ID,
          eventCallback: setLastEvent,
        })
        clearInterval(interval)
      }
    }
  }, [])

  const loadUsageInfo = async () => {
    if (!isLoading) {
      return
    }

    try {
      const result = await getUsageInfo()
      setUsageInfo(result)
    } catch (reason: any) {
      toast.error(typeof reason === 'string' ? reason : t('apiNotifications.failedToLoadUsageInfo'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading) {
      return
    }

    loadUsageInfo()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading])

  const isTrialEnded = useMemo(() => {
    if (!trialEndDate) {
      return false
    }

    const now = dayjs.utc()
    const future = dayjs.utc(trialEndDate)
    const diff = future.diff(now)

    return diff < 0
  }, [trialEndDate])

  const trialEndsOnMessage = useMemo(() => {
    if (!trialEndDate || !isTrial) {
      return null
    }

    if (isTrialEnded) {
      return t('pricing.trialEnded')
    }

    let date

    if (language === 'en') {
      if (timeFormat === '12-hour') {
        date = dayjs(trialEndDate).locale(language).format('MMMM D, h:mm A')
      } else {
        date = dayjs(trialEndDate).locale(language).format('MMMM D, HH:mm')
      }
    } else if (timeFormat === '12-hour') {
      date = dayjs(trialEndDate).locale(language).format('D MMMM, h:mm A')
    } else {
      date = dayjs(trialEndDate).locale(language).format('D MMMM, HH:mm')
    }

    return t('billing.trialEnds', {
      date,
    })
  }, [language, trialEndDate, isTrial, timeFormat, isTrialEnded, t])

  const onSubscriptionCancel = () => {
    if (!window.Paddle) {
      if (subCancelURL) window.location.replace(subCancelURL)
      return
    }

    window.Paddle.Checkout.open({
      override: subCancelURL,
      method: 'inline',
      frameTarget: 'checkout-container',
      frameInitialHeight: 416,
      frameStyle:
        'width:100%; min-width:312px; background-color: #f9fafb; border: none; border-radius: 10px; margin-top: 10px;',
      locale: paddleLanguageMapping[language] || language,
      displayModeTheme: theme,
      country: metainfo.country,
    })
    setTimeout(() => {
      document.querySelector('#checkout-container')?.scrollIntoView()
    }, 500)
  }

  const onUpdatePaymentDetails = () => {
    if (!window.Paddle) {
      if (subUpdateURL) window.location.replace(subUpdateURL)
      return
    }

    window.Paddle.Checkout.open({
      override: subUpdateURL,
      method: 'inline',
      frameTarget: 'checkout-container',
      frameInitialHeight: 416,
      frameStyle:
        'width:100%; min-width:312px; background-color: #f9fafb; border: none; border-radius: 10px; margin-top: 10px;',
      locale: paddleLanguageMapping[language] || language,
      displayModeTheme: theme,
      country: metainfo.country,
    })
    setTimeout(() => {
      document.querySelector('#checkout-container')?.scrollIntoView()
    }, 500)
  }

  return (
    <div className='min-h-page bg-gray-50 dark:bg-slate-900'>
      <DashboardLockedBanner />

      <div className='mx-auto w-11/12 px-4 pt-12 whitespace-pre-line sm:px-6 md:w-5/6'>
        <h1 className='text-4xl font-extrabold text-gray-900 dark:text-gray-50'>{t('billing.title')}</h1>
      </div>

      <div className='mx-auto mt-5 grid w-11/12 gap-x-10 gap-y-8 px-4 pb-16 whitespace-pre-line sm:px-6 md:w-5/6 lg:grid-cols-2'>
        <div>
          <h2 id='billing' className='mb-2 text-2xl font-medium text-gray-900 dark:text-gray-50'>
            {t('billing.subscription')}
          </h2>
          <p className='mt-1 text-base text-gray-900 dark:text-gray-50'>
            {isSubscriber ? t('billing.selectPlan') : t('billing.changePlan')}
          </p>
          <p className='max-w-prose text-base text-gray-900 dark:text-gray-50'>{t('billing.membersNotification')}</p>
          {isSubscriber && nextBillDate ? (
            <div className='mt-5 max-w-prose rounded-md bg-blue-50 p-4 dark:bg-blue-600/30'>
              <div className='flex'>
                <div className='shrink-0'>
                  <InformationCircleIcon aria-hidden='true' className='h-5 w-5 text-blue-400 dark:text-blue-100' />
                </div>
                <p className='ml-3 text-sm font-medium text-blue-700 dark:text-blue-100'>
                  {t('billing.nextBillDateIs', {
                    date:
                      language === 'en'
                        ? dayjs(nextBillDate).locale(language).format('MMMM D, YYYY')
                        : dayjs(nextBillDate).locale(language).format('D MMMM, YYYY'),
                  })}
                </p>
              </div>
            </div>
          ) : null}
          {cancellationEffectiveDate ? (
            <div className='mt-5 max-w-prose rounded-md bg-blue-50 p-4 dark:bg-blue-600/30'>
              <div className='flex'>
                <div className='shrink-0'>
                  <InformationCircleIcon aria-hidden='true' className='h-5 w-5 text-blue-400 dark:text-blue-100' />
                </div>
                <div className='ml-3'>
                  <h3 className='text-sm font-medium text-blue-700 dark:text-blue-100'>
                    {t('billing.subscriptionCancelled')}
                  </h3>
                  <p className='mt-2 text-sm text-blue-700 dark:text-blue-100'>
                    {t('billing.subscriptionCancelledDescription', {
                      date:
                        language === 'en'
                          ? dayjs(cancellationEffectiveDate).locale(language).format('MMMM D, YYYY')
                          : dayjs(cancellationEffectiveDate).locale(language).format('D MMMM, YYYY'),
                    })}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
          {isTrial && trialEndsOnMessage ? (
            <div className='mt-5 max-w-prose rounded-md bg-blue-50 p-4 dark:bg-blue-600/30'>
              <div className='flex'>
                <div className='shrink-0'>
                  <InformationCircleIcon aria-hidden='true' className='h-5 w-5 text-blue-400 dark:text-blue-100' />
                </div>
                <div className='ml-3'>
                  <h3 className='text-sm font-medium text-blue-700 dark:text-blue-100'>{trialEndsOnMessage}</h3>
                  <p className='mt-1 text-sm text-blue-700 dark:text-blue-100'>{t('billing.trialDescription')}</p>
                </div>
              </div>
            </div>
          ) : null}
          {isNoSub ? (
            <div className='mt-5 max-w-prose rounded-md bg-red-50 p-4 dark:bg-red-600/30'>
              <div className='flex'>
                <div className='shrink-0'>
                  <ExclamationTriangleIcon aria-hidden='true' className='h-5 w-5 text-red-400 dark:text-red-100' />
                </div>
                <div className='ml-3'>
                  <h3 className='text-sm font-medium text-red-800 dark:text-red-100'>
                    {t('billing.noActiveSubscription')}
                  </h3>
                  <p className='mt-2 text-sm text-red-700 dark:text-red-200'>
                    {t('billing.noActiveSubscriptionDescription')}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {isLoading ? (
            <Loader />
          ) : (
            <div className='mt-8 flex flex-col'>
              <Pricing authenticated={isAuthenticated} isBillingPage lastEvent={lastEvent} />
              <div className='mt-2 space-y-2'>
                {subUpdateURL && !cancellationEffectiveDate ? (
                  <Button className='mr-2' onClick={onUpdatePaymentDetails} type='button' primary large>
                    {t('billing.update')}
                  </Button>
                ) : null}
                {subCancelURL && !cancellationEffectiveDate ? (
                  <Button onClick={() => setIsCancelSubModalOpened(true)} type='button' semiDanger large>
                    {t('billing.cancelSub')}
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </div>

        <div>
          <h2 id='usage' className='mb-2 text-2xl font-medium text-gray-900 dark:text-gray-50'>
            {t('billing.planUsage')}
          </h2>
          <p className='mt-1 max-w-prose text-base text-gray-900 dark:text-gray-50'>{t('billing.planUsageDesc')}</p>

          {isLoading ? (
            <Loader />
          ) : (
            <div className='mt-4 text-gray-900 dark:text-gray-50'>
              {totalUsage >= 80 ? (
                <div className='mb-4 rounded-md bg-amber-50 p-4 dark:bg-amber-600/30'>
                  <div className='flex'>
                    <div className='shrink-0'>
                      <ExclamationTriangleIcon
                        aria-hidden='true'
                        className='h-5 w-5 text-amber-400 dark:text-amber-100'
                      />
                    </div>
                    <div className='ml-3'>
                      <p className='text-sm text-amber-800 dark:text-amber-100'>
                        {totalUsage >= 90
                          ? t('billing.usageWarningCritical', { percentage: totalUsage })
                          : t('billing.usageWarningHigh', { percentage: totalUsage })}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <p className='mb-4 max-w-prose text-base text-gray-900 dark:text-gray-50'>
                {t('billing.usageOverview', {
                  tracked: (usageInfo.total || 0).toLocaleString(),
                  trackedPerc: totalUsage || 0,
                  maxEvents: (maxEventsCount || 0).toLocaleString(),
                })}
              </p>

              <div className='mb-4 space-y-2'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center'>
                    <div className='size-2 rounded-full bg-blue-600 dark:bg-blue-500' />
                    <span className='ml-2 text-sm'>
                      {t('billing.pageviews', {
                        quantity: usageInfo.traffic || 0,
                        percentage: usageInfo.trafficPerc || 0,
                      })}
                    </span>
                  </div>
                </div>

                <div className='flex items-center justify-between'>
                  <div className='flex items-center'>
                    <div className='size-2 rounded-full bg-fuchsia-600 dark:bg-fuchsia-500' />
                    <span className='ml-2 text-sm'>
                      {t('billing.customEvents', {
                        quantity: usageInfo.customEvents || 0,
                        percentage: usageInfo.customEventsPerc || 0,
                      })}
                    </span>
                  </div>
                </div>

                <div className='flex items-center justify-between'>
                  <div className='flex items-center'>
                    <div className='size-2 rounded-full bg-lime-600 dark:bg-lime-500' />
                    <span className='ml-2 text-sm'>
                      {t('billing.captcha', {
                        quantity: usageInfo.captcha || 0,
                        percentage: usageInfo.captchaPerc || 0,
                      })}
                    </span>
                  </div>
                </div>

                <div className='flex items-center justify-between'>
                  <div className='flex items-center'>
                    <div className='size-2 rounded-full bg-red-600 dark:bg-red-500' />
                    <span className='ml-2 text-sm'>
                      {t('billing.errors', {
                        quantity: usageInfo.errors || 0,
                        percentage: usageInfo.errorsPerc || 0,
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <p className='mb-2 text-lg font-medium text-gray-900 dark:text-gray-50'>
                {t('billing.xofy', {
                  x: (usageInfo.total || 0).toLocaleString(),
                  y: (maxEventsCount || 0).toLocaleString(),
                })}
              </p>

              <MultiProgress
                className='w-full'
                progress={[
                  {
                    value: usageInfo.traffic === 0 ? 0 : (usageInfo.traffic / maxEventsCount) * 100,
                    lightColour: '#2563eb',
                    darkColour: '#1d4ed8',
                  },
                  {
                    value: usageInfo.customEvents === 0 ? 0 : (usageInfo.customEvents / maxEventsCount) * 100,
                    lightColour: '#c026d3',
                    darkColour: '#a21caf',
                  },
                  {
                    value: usageInfo.captcha === 0 ? 0 : (usageInfo.captcha / maxEventsCount) * 100,
                    lightColour: '#65a30d',
                    darkColour: '#4d7c0f',
                  },
                  {
                    value: usageInfo.errors === 0 ? 0 : (usageInfo.errors / maxEventsCount) * 100,
                    lightColour: '#dc2626',
                    darkColour: '#b91c1c',
                  },
                ]}
              />

              <div className='mt-2 flex items-center justify-between'>
                <p className='text-sm text-gray-600 dark:text-gray-400'>
                  {t('billing.xPercentUsed', { percentage: totalUsage })}
                </p>
                <p className='text-sm text-gray-600 dark:text-gray-400'>
                  {t('billing.xPercentRemaining', { percentage: 100 - totalUsage })}
                </p>
              </div>

              <div className='mt-4 flex items-center justify-between'>
                <p className='text-sm text-gray-600 dark:text-gray-400'>{t('billing.resetDate')}</p>
                <p className='text-sm text-gray-600 dark:text-gray-400'>
                  {t('billing.daysUntilReset', {
                    days: Math.ceil(
                      (new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).getTime() -
                        new Date().getTime()) /
                        (1000 * 60 * 60 * 24),
                    ),
                  })}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      <Modal
        onClose={() => {
          setIsCancelSubModalOpened(false)
        }}
        onSubmit={() => {
          setIsCancelSubModalOpened(false)
          onSubscriptionCancel()
        }}
        submitText={t('common.yes')}
        closeText={t('common.no')}
        title={t('pricing.cancelTitle')}
        submitType='danger'
        type='error'
        message={
          <Trans
            t={t}
            i18nKey='pricing.cancelDesc'
            values={{
              email: CONTACT_EMAIL,
            }}
          />
        }
        isOpened={isCancelSubModalOpened}
      />
    </div>
  )
}

export default memo(withAuthentication(Billing, auth.authenticated))

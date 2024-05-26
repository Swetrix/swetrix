/* eslint-disable jsx-a11y/anchor-has-content, lodash/prefer-lodash-method */
import React, { memo, useMemo, useState, useEffect } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { useSelector, useDispatch } from 'react-redux'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import duration from 'dayjs/plugin/duration'
import { ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import _round from 'lodash/round'

import {
  isSelfhosted,
  PADDLE_JS_URL,
  PADDLE_VENDOR_ID,
  CONTACT_EMAIL,
  paddleLanguageMapping,
  isBrowser,
} from 'redux/constants'
import { loadScript } from 'utils/generic'
import Loader from 'ui/Loader'
import { useAppDispatch, StateType } from 'redux/store'
import sagaActions from 'redux/sagas/actions'
import { withAuthentication, auth } from 'hoc/protected'
import Modal from 'ui/Modal'
import Button from 'ui/Button'
import MultiProgress from 'ui/MultiProgress'
import Tooltip from 'ui/Tooltip'
import { IUser } from 'redux/models/IUser'
import UIActions from 'redux/reducers/ui'
import Pricing from '../MainPage/Pricing'
import DashboardLockedBanner from 'components/DashboardLockedBanner'

dayjs.extend(utc)
dayjs.extend(duration)

interface IBilling {
  ssrAuthenticated: boolean
  ssrTheme: 'dark' | 'light'
}

const Billing: React.FC<IBilling> = ({ ssrAuthenticated, ssrTheme }): JSX.Element => {
  const [isCancelSubModalOpened, setIsCancelSubModalOpened] = useState<boolean>(false)
  const { metainfo, usageinfo } = useSelector((state: StateType) => state.ui.misc)
  const {
    user,
    loading,
  }: {
    user: IUser
    loading: boolean
  } = useSelector((state: StateType) => state.auth)
  const { theme: reduxTheme } = useSelector((state: StateType) => state.ui.theme)
  const theme = isBrowser ? reduxTheme : ssrTheme
  const paddleLoaded = useSelector((state: StateType) => state.ui.misc.paddleLoaded)
  const reduxAuthenticated = useSelector((state: StateType) => state.auth.authenticated)
  const dispatch = useDispatch()
  const _dispatch = useAppDispatch()
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const authenticated = isBrowser ? reduxAuthenticated : ssrAuthenticated
  const {
    nextBillDate,
    planCode,
    subUpdateURL,
    trialEndDate,
    timeFormat,
    cancellationEffectiveDate,
    subCancelURL,
    maxEventsCount,
  } = user
  const isSubscriber = user.planCode !== 'none' && user.planCode !== 'trial' && user.planCode !== 'free'

  const isTrial: boolean = planCode === 'trial'
  const isNoSub: boolean = planCode === 'none'
  const totalUsage = _round((usageinfo.total / maxEventsCount) * 100, 2) || 0

  // Paddle (payment processor) set-up
  useEffect(() => {
    if (paddleLoaded) {
      return
    }

    loadScript(PADDLE_JS_URL)

    const eventCallback = (data: any) => {
      _dispatch(UIActions.setPaddleLastEvent(data))
    }
    // eslint-disable-next-line no-use-before-define
    const interval = setInterval(paddleSetup, 200)

    // prettier-ignore
    function paddleSetup() {
      if (isSelfhosted) {
        clearInterval(interval)
      } else if ((window as any)?.Paddle) {
        (window as any).Paddle.Setup({
          vendor: PADDLE_VENDOR_ID,
          eventCallback,
        })
        clearInterval(interval)
      }
    }
  }, [paddleLoaded]) // eslint-disable-line

  useEffect(() => {
    dispatch(sagaActions.loadUsageinfo())
  }, [dispatch])

  const isTrialEnded = useMemo(() => {
    if (!trialEndDate) {
      return false
    }

    const now = dayjs.utc()
    const future = dayjs.utc(trialEndDate)
    const diff = future.diff(now)

    return diff < 0
  }, [trialEndDate])

  const trialMessage = useMemo(() => {
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
    // @ts-ignore
    if (!window.Paddle) {
      if (subCancelURL) window.location.replace(subCancelURL)
      return
    }

    // @ts-ignore
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
      // @ts-ignore
      document.querySelector('#checkout-container').scrollIntoView()
    }, 500)
  }

  const onUpdatePaymentDetails = () => {
    // @ts-ignore
    if (!window.Paddle) {
      if (subUpdateURL) window.location.replace(subUpdateURL)
      return
    }

    // @ts-ignore
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
      // @ts-ignore
      document.querySelector('#checkout-container').scrollIntoView()
    }, 500)
  }

  return (
    <div className='min-h-page bg-gray-50 dark:bg-slate-900'>
      <DashboardLockedBanner />
      <div className='mx-auto w-11/12 whitespace-pre-line px-4 pb-16 pt-12 sm:px-6 md:w-4/5 lg:px-8'>
        <div className='mb-4 flex flex-wrap justify-between gap-y-2'>
          <h1 className='mr-2 text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50'>
            {t('billing.title')}
          </h1>
        </div>
        <h2 id='billing' className='mb-2 text-2xl font-medium tracking-tight text-gray-900 dark:text-gray-50'>
          {t('billing.subscription')}
        </h2>
        <p className='mt-1 text-base tracking-tight text-gray-900 dark:text-gray-50'>
          {isSubscriber ? t('billing.selectPlan') : t('billing.changePlan')}
        </p>
        <p className='text-base tracking-tight text-gray-900 dark:text-gray-50'>{t('billing.membersNotification')}</p>
        {isSubscriber && nextBillDate && (
          <p className='mt-1 text-base tracking-tight text-gray-900 dark:text-gray-50'>
            {t('billing.nextBillDateIs', {
              date:
                language === 'en'
                  ? dayjs(nextBillDate).locale(language).format('MMMM D, YYYY')
                  : dayjs(nextBillDate).locale(language).format('D MMMM, YYYY'),
            })}
          </p>
        )}
        {cancellationEffectiveDate && (
          <div className='mt-3 flex items-center text-lg tracking-tight text-gray-900 dark:text-gray-50'>
            <InformationCircleIcon className='mr-2 h-10 w-10 text-blue-600' aria-hidden='true' />
            <span className='max-w-prose font-medium'>
              {t('billing.cancelledSubMessage', {
                date:
                  language === 'en'
                    ? dayjs(cancellationEffectiveDate).locale(language).format('MMMM D, YYYY')
                    : dayjs(cancellationEffectiveDate).locale(language).format('D MMMM, YYYY'),
              })}
            </span>
          </div>
        )}
        {isTrial && trialMessage && (
          <div className='mt-3 text-lg tracking-tight text-gray-900 dark:text-gray-50'>
            <span className='font-medium'>{trialMessage}</span>
          </div>
        )}
        {isNoSub && (
          <div className='mt-3 flex items-center text-lg tracking-tight text-gray-900 dark:text-gray-50'>
            <ExclamationTriangleIcon className='mr-2 h-10 w-10 text-red-600' aria-hidden='true' />
            <span className='max-w-prose font-medium'>{t('billing.noSubWarning')}</span>
          </div>
        )}
        {loading ? (
          <Loader />
        ) : (
          <>
            <div className='mt-5 flex flex-col xl:flex-row xl:space-x-5'>
              <Pricing authenticated={authenticated} t={t} language={language} isBillingPage />
              <div className='space-y-2'>
                {subUpdateURL && (
                  <Button className='mr-2' onClick={onUpdatePaymentDetails} type='button' primary large>
                    {t('billing.update')}
                  </Button>
                )}
                {subCancelURL && (
                  <Button onClick={() => setIsCancelSubModalOpened(true)} type='button' semiDanger large>
                    {t('billing.cancelSub')}
                  </Button>
                )}
              </div>
            </div>
            <h2 id='usage' className='mt-5 text-2xl font-medium tracking-tight text-gray-900 dark:text-gray-50'>
              {t('billing.planUsage')}
            </h2>
            <p className='mt-1 text-base tracking-tight text-gray-900 dark:text-gray-50'>
              {t('billing.planUsageDesc')}
            </p>
            <div className='mt-2 text-lg tracking-tight text-gray-900 dark:text-gray-50'>
              <p className='mb-1 text-base font-medium tracking-tight text-gray-900 dark:text-gray-50'>
                {t('billing.xofy', {
                  x: usageinfo.total || 0,
                  y: maxEventsCount || 0,
                })}
              </p>

              <Tooltip
                text={
                  <div>
                    <p>
                      {t('billing.usageOverview', {
                        tracked: usageinfo.total || 0,
                        trackedPerc: totalUsage || 0,
                        maxEvents: maxEventsCount || 0,
                      })}
                    </p>
                    <ul className='mt-2 list-inside list-disc'>
                      <li className='marker:text-blue-600 dark:marker:text-blue-800'>
                        {t('billing.pageviews', {
                          quantity: usageinfo.traffic || 0,
                          percentage: usageinfo.trafficPerc || 0,
                        })}
                      </li>
                      <li className='marker:text-fuchsia-600 dark:marker:text-fuchsia-800'>
                        {t('billing.customEvents', {
                          quantity: usageinfo.customEvents || 0,
                          percentage: usageinfo.customEventsPerc || 0,
                        })}
                      </li>
                      <li className='marker:text-lime-600 dark:marker:text-lime-800'>
                        {t('billing.captcha', {
                          quantity: usageinfo.captcha || 0,
                          percentage: usageinfo.captchaPerc || 0,
                        })}
                      </li>
                      <li className='marker:text-red-600 dark:marker:text-red-800'>
                        {t('billing.errors', {
                          quantity: usageinfo.errors || 0,
                          percentage: usageinfo.errorsPerc || 0,
                        })}
                      </li>
                    </ul>
                  </div>
                }
                tooltipNode={
                  <MultiProgress
                    theme={theme}
                    className='w-[85vw] max-w-[25rem]'
                    progress={[
                      {
                        value: usageinfo.traffic === 0 ? 0 : (usageinfo.traffic / maxEventsCount) * 100,
                        lightColour: '#2563eb',
                        darkColour: '#1d4ed8',
                      },
                      {
                        value: usageinfo.customEvents === 0 ? 0 : (usageinfo.customEvents / maxEventsCount) * 100,
                        lightColour: '#c026d3',
                        darkColour: '#a21caf',
                      },
                      {
                        value: usageinfo.captcha === 0 ? 0 : (usageinfo.captcha / maxEventsCount) * 100,
                        lightColour: '#65a30d',
                        darkColour: '#4d7c0f',
                      },
                    ]}
                  />
                }
                className='!h-auto !w-max max-w-max'
              />
              <p className='mt-1 text-base tracking-tight text-gray-900 dark:text-gray-50'>{t('billing.resetDate')}</p>
            </div>
          </>
        )}
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
            // @ts-ignore
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

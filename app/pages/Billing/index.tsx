/* eslint-disable jsx-a11y/anchor-has-content, lodash/prefer-lodash-method */
import React, {
  memo, useMemo, useState, useEffect,
} from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { useSelector, useDispatch } from 'react-redux'
import { Link } from '@remix-run/react'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import duration from 'dayjs/plugin/duration'
import { ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import _round from 'lodash/round'

import {
  isSelfhosted, PADDLE_JS_URL, PADDLE_VENDOR_ID, CONTACT_EMAIL, paddleLanguageMapping, isBrowser,
} from 'redux/constants'
import { loadScript } from 'utils/generic'
import Loader from 'ui/Loader'
import { useAppDispatch, StateType } from 'redux/store'
import routes from 'routesPath'
import sagaActions from 'redux/sagas/actions'
import { withAuthentication, auth } from 'hoc/protected'
import Modal from 'ui/Modal'
import { IUser } from 'redux/models/IUser'
import UIActions from 'redux/reducers/ui'
import Pricing from '../MainPage/Pricing'

dayjs.extend(utc)
dayjs.extend(duration)

interface IBilling {
  ssrAuthenticated: boolean,
}

const Billing: React.FC<IBilling> = ({ ssrAuthenticated }): JSX.Element => {
  const [isCancelSubModalOpened, setIsCancelSubModalOpened] = useState<boolean>(false)
  const { metainfo, usageinfo } = useSelector((state: StateType) => state.ui.misc)
  const { user, loading }: {
    user: IUser, loading: boolean,
  } = useSelector((state: StateType) => state.auth)
  const { theme } = useSelector((state: StateType) => state.ui.theme)
  const paddleLoaded = useSelector((state: StateType) => state.ui.misc.paddleLoaded)
  const reduxAuthenticated = useSelector((state: StateType) => state.auth.authenticated)
  const dispatch = useDispatch()
  const _dispatch = useAppDispatch()
  const { t, i18n: { language } }: {
    t: (key: string, optinions?: {
      [key: string]: string | number,
    }) => string,
    i18n: {
      language: string,
    },
  } = useTranslation('common')
  const authenticated = isBrowser ? reduxAuthenticated : ssrAuthenticated
  const {
    nextBillDate, planCode, subUpdateURL, trialEndDate, timeFormat, cancellationEffectiveDate, subCancelURL, maxEventsCount,
  } = user

  const isTrial: boolean = planCode === 'trial'
  const isNoSub: boolean = planCode === 'none'
  const totalUsage = _round((usageinfo.total / maxEventsCount) * 100, 2)

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
      frameStyle: 'width:100%; min-width:312px; background-color: #f9fafb; border: none; border-radius: 10px; margin-top: 10px;',
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
      frameStyle: 'width:100%; min-width:312px; background-color: #f9fafb; border: none; border-radius: 10px; margin-top: 10px;',
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
    <div className='bg-gray-50 dark:bg-slate-900 min-h-page'>
      <div className='w-11/12 md:w-4/5 mx-auto pb-16 pt-12 px-4 sm:px-6 lg:px-8 whitespace-pre-line'>
        <div className='flex justify-between flex-wrap gap-y-2 mb-4'>
          <h1 className='text-4xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight mr-2'>
            {t('billing.title')}
          </h1>
          <div>
            {subUpdateURL && (
              <span onClick={onUpdatePaymentDetails} className='inline-flex select-none cursor-pointer mr-2 items-center border border-transparent leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm'>
                {t('billing.update')}
              </span>
            )}
            {subCancelURL && (
              <span onClick={() => setIsCancelSubModalOpened(true)} className='inline-flex select-none cursor-pointer items-center border border-transparent leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-sm text-white bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-700 px-4 py-2 text-sm'>
                {t('billing.cancelSub')}
              </span>
            )}
          </div>
        </div>
        <p className='text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
          {t('billing.desc')}
          <br />
          <Link to={`${routes.billing}#usage`} className='text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-500'>
            {t('billing.gotoUsage')}
          </Link>
        </p>
        <hr className='mt-3 mb-2 border-gray-200 dark:border-gray-600' />
        {cancellationEffectiveDate && (
          <div className='flex items-center text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
            <InformationCircleIcon className='h-10 w-10 mr-2 text-blue-600' aria-hidden='true' />
            <span className='font-bold max-w-prose'>
              {t('billing.cancelledSubMessage', {
                date: language === 'en'
                  ? dayjs(cancellationEffectiveDate).locale(language).format('MMMM D, YYYY')
                  : dayjs(cancellationEffectiveDate).locale(language).format('D MMMM, YYYY'),
              })}
            </span>
          </div>
        )}
        {nextBillDate && (
          <div className='text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
            <span className='font-bold'>
              {t('billing.nextBillDate')}
            </span>
            &nbsp;
            <span>
              {language === 'en'
                ? dayjs(nextBillDate).locale(language).format('MMMM D, YYYY')
                : dayjs(nextBillDate).locale(language).format('D MMMM, YYYY')}
            </span>
          </div>
        )}
        {isTrial && trialMessage && (
          <div className='text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
            <span className='font-bold'>
              {trialMessage}
            </span>
          </div>
        )}
        {isNoSub && (
          <div className='flex items-center text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
            <ExclamationTriangleIcon className='h-10 w-10 mr-2 text-red-600' aria-hidden='true' />
            <span className='font-bold max-w-prose'>
              {t('billing.noSubWarning')}
            </span>
          </div>
        )}
        {loading ? (
          <Loader />
        ) : (
          <>
            <Pricing authenticated={authenticated} t={t} language={language} />
            <p className='text-lg text-gray-900 dark:text-gray-50 tracking-tight mt-10'>
              <Trans
                // @ts-ignore
                t={t}
                i18nKey='billing.contact'
                values={{ email: CONTACT_EMAIL }}
                // @ts-ignore
                components={{
                  mail: <a title={`Email us at ${CONTACT_EMAIL}`} href={`mailto:${CONTACT_EMAIL}`} className='font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400' />,
                  amount: 5,
                }}
              />
            </p>
            <h2 id='usage' className='mt-5 text-3xl font-bold text-gray-900 dark:text-gray-50 tracking-tight mr-2'>
              {t('billing.planUsage')}
            </h2>
            <p className='mt-1 text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
              {t('billing.usageOverview', {
                tracked: usageinfo.total,
                trackedPerc: totalUsage,
                maxEvents: maxEventsCount,
              })}
            </p>
            <div className='mt-2 text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
              {t('billing.breakdown')}
              <ul className='list-disc list-inside'>
                <li>
                  {t('billing.pageviews', {
                    quantity: usageinfo.traffic,
                    percentage: usageinfo.trafficPerc,
                  })}
                </li>
                <li>
                  {t('billing.customEvents', {
                    quantity: usageinfo.customEvents,
                    percentage: usageinfo.customEventsPerc,
                  })}
                </li>
                <li>
                  {t('billing.captcha', {
                    quantity: usageinfo.captcha,
                    percentage: usageinfo.captchaPerc,
                  })}
                </li>
              </ul>
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
        message={(
          <Trans
            // @ts-ignore
            t={t}
            i18nKey='pricing.cancelDesc'
            values={{
              email: CONTACT_EMAIL,
            }}
          />
        )}
        isOpened={isCancelSubModalOpened}
      />
    </div>
  )
}

export default memo(withAuthentication(Billing, auth.authenticated))

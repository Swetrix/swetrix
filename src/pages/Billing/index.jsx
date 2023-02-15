/* eslint-disable jsx-a11y/anchor-has-content, lodash/prefer-lodash-method */
import React, { memo, useMemo } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { useSelector } from 'react-redux'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import duration from 'dayjs/plugin/duration'

import { CONTACT_EMAIL, paddleLanguageMapping } from 'redux/constants'
import { withAuthentication, auth } from 'hoc/protected'
import Title from 'components/Title'
import Pricing from '../MainPage/Pricing'

dayjs.extend(utc)
dayjs.extend(duration)

const Billing = () => {
  const { user } = useSelector(state => state.auth)
  const { theme } = useSelector(state => state.ui.theme)
  const { t, i18n: { language } } = useTranslation('common')
  const {
    nextBillDate, planCode, subUpdateURL, trialEndDate, timeFormat,
  } = user

  const isFree = planCode === 'free'
  const isTrial = planCode === 'trial'

  const trialMessage = useMemo(() => {
    if (!trialEndDate || !isTrial) {
      return null
    }

    const now = dayjs.utc()
    const future = dayjs.utc(trialEndDate)
    const diff = future.diff(now)

    if (diff < 0) {
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
  }, [language, trialEndDate, isTrial, timeFormat, t])

  const onUpdatePaymentDetails = () => {
    if (!window.Paddle) {
      window.location.replace(subUpdateURL)
      return
    }

    window.Paddle.Checkout.open({
      override: subUpdateURL,
      method: 'inline',
      frameTarget: 'checkout-container',
      frameInitialHeight: 416,
      frameStyle: 'width:100%; min-width:312px; background-color: #f9fafb; border: none; border-radius: 10px; margin-top: 10px;',
      locale: paddleLanguageMapping[language] || language,
      displayModeTheme: theme,
    })
    setTimeout(() => {
      document.querySelector('#checkout-container').scrollIntoView()
    }, 500)
  }

  return (
    <Title title={t('titles.billing')}>
      <div className='bg-gray-50 dark:bg-gray-800'>
        <div className='w-11/12 md:w-4/5 mx-auto pb-16 pt-12 px-4 sm:px-6 lg:px-8 whitespace-pre-line'>
          <div className='flex justify-between flex-wrap gap-y-2 mb-4'>
            <h1 className='text-4xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight mr-2'>
              {t('billing.title')}
            </h1>
            {!isFree && !isTrial && (
              <span onClick={onUpdatePaymentDetails} className='inline-flex cursor-pointer items-center border border-transparent leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm'>
                {t('billing.update')}
              </span>
            )}
          </div>
          <p className='text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
            {t('billing.desc')}
          </p>
          <hr className='mt-3 mb-2 border-gray-200 dark:border-gray-600' />
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
          <Pricing t={t} language={language} />
          <p className='text-lg text-gray-900 dark:text-gray-50 tracking-tight mt-10'>
            <Trans
              t={t}
              i18nKey='billing.contact'
              values={{ email: CONTACT_EMAIL }}
              components={{
                mail: <a href={`mailto:${CONTACT_EMAIL}`} className='font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400' />,
              }}
            />
          </p>
        </div>
      </div>
    </Title>
  )
}

export default memo(withAuthentication(Billing, auth.authenticated))

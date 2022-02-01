/* eslint-disable jsx-a11y/anchor-has-content */
import React, { memo } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { useSelector } from 'react-redux'

import Pricing from '../MainPage/Pricing'
import { CONTACT_EMAIL, paddleLanguageMapping } from 'redux/constants'
import { withAuthentication, auth } from 'hoc/protected'
import Title from 'components/Title'

const Features = () => {
  const { user } = useSelector(state => state.auth)
  const { theme } = useSelector(state => state.ui.theme)
  const { t, i18n: { language } } = useTranslation('common')

  const isFree = user.planCode === 'free'

  const onUpdatePaymentDetails = () => {
    if (!window.Paddle) {
      window.location.replace(user.subUpdateURL)
      return
    }

    window.Paddle.Checkout.open({
      override: user.subUpdateURL,
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
            {!isFree && (
              <span onClick={onUpdatePaymentDetails} className='inline-flex cursor-pointer items-center border border-transparent leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm'>
                {t('billing.update')}
              </span>
            )}
          </div>
          <p className='text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
            {t('billing.desc')}
          </p>
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

export default memo(withAuthentication(Features, auth.authenticated))

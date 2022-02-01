/* eslint-disable jsx-a11y/anchor-has-content */
import React from 'react'
import { useTranslation, Trans } from 'react-i18next'

import Pricing from '../MainPage/Pricing'
import { CONTACT_EMAIL } from 'redux/constants'
import { withAuthentication, auth } from 'hoc/protected'
import Title from 'components/Title'

const Features = () => {
  const { t, i18n: { language } } = useTranslation('common')

  return (
    <Title title={t('titles.billing')}>
      <div className='bg-gray-50 dark:bg-gray-800'>
        <div className='w-11/12 md:w-4/5 mx-auto pb-16 pt-12 px-4 sm:px-6 lg:px-8 whitespace-pre-line'>
          <h1 className='text-4xl mb-4 font-extrabold text-gray-900 dark:text-gray-50 tracking-tight'>
            {t('billing.title')}
          </h1>
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

export default withAuthentication(Features, auth.authenticated)

/* eslint-disable jsx-a11y/anchor-has-content */
import React from 'react'
import { useTranslation, Trans } from 'react-i18next'

import { CONTACT_EMAIL } from 'redux/constants'
import Title from 'components/Title'

const Contact = () => {
  const { t } = useTranslation('common')

  return (
    <Title title={t('titles.contact')}>
      <div className='bg-gray-50 dark:bg-gray-800 min-h-min-footer'>
        <div className='w-11/12 md:w-4/5 mx-auto pb-16 pt-12 px-4 sm:px-6 lg:px-8 whitespace-pre-line'>
          <h1 className='text-4xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight'>
            {t('titles.contact')}
          </h1>
          <p className='mt-2 text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
            <Trans
              t={t}
              i18nKey='contact.desc'
              values={{ email: CONTACT_EMAIL }}
              components={{
                mail: <a href={`mailto:${CONTACT_EMAIL}`} className='font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500' />,
              }}
            />
          </p>
        </div>
      </div>
    </Title>
  )
}

export default Contact

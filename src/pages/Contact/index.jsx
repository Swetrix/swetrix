/* eslint-disable jsx-a11y/anchor-has-content */
import React from 'react'
import { useTranslation, Trans } from 'react-i18next'

import Title from 'components/Title'

const Contact = () => {
  const { t } = useTranslation('common')

  return (
    <Title title={t('titles.contact')}>
      <div className='bg-gray-50 min-h-min-footer'>
        <div className='w-11/12 md:w-4/5 mx-auto pb-16 pt-12 px-4 sm:px-6 lg:px-8 whitespace-pre-line'>
          <h1 className='text-4xl font-extrabold text-gray-900 tracking-tight'>
            {t('titles.contact')}
          </h1>
          <p className='mt-2 text-lg text-gray-900 tracking-tight'>
            <Trans
              t={t}
              i18nKey='contact.desc'
              values={{ email: 'contact@swetrix.com'}}
              components={{
                mail: <a href='mailto:contact@swetrix.com' className='font-medium text-indigo-600 hover:text-indigo-500' />,
              }}
            />
          </p>
        </div>
      </div>
    </Title>
  )
}

export default Contact

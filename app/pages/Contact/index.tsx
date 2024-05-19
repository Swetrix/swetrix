/* eslint-disable jsx-a11y/anchor-has-content */
import React from 'react'
import { useTranslation, Trans } from 'react-i18next'

import { CONTACT_EMAIL, TWITTER_URL, TWITTER_USERNAME, DISCORD_URL } from 'redux/constants'

const Contact = (): JSX.Element => {
  const { t } = useTranslation('common')

  return (
    <div className='min-h-min-footer bg-gray-50 dark:bg-slate-900'>
      <div className='w-11/12 md:w-4/5 mx-auto pb-16 pt-12 px-4 sm:px-6 lg:px-8 whitespace-pre-line'>
        <h1 className='text-4xl font-bold text-gray-900 dark:text-gray-50 tracking-tight'>{t('titles.contact')}</h1>
        <div className='mt-2 text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
          <Trans
            t={t}
            i18nKey='contact.description'
            values={{ email: CONTACT_EMAIL, twitterHandle: TWITTER_USERNAME }}
            components={{
              mail: (
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className='font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500'
                />
              ),
              twitter: (
                <a
                  href={TWITTER_URL}
                  className='font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500'
                />
              ),
              discord: (
                <a
                  href={DISCORD_URL}
                  className='font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500'
                />
              ),
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default Contact

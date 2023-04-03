/* eslint-disable jsx-a11y/anchor-has-content */
import React from 'react'
import { useTranslation, Trans } from 'react-i18next'

import {
  CONTACT_EMAIL, TWITTER_URL, TWITTER_USERNAME, DISCORD_URL,
} from 'redux/constants'
import Title from 'components/Title'

const Contact = (): JSX.Element => {
  const { t }: {
    t: (key: string) => string
  } = useTranslation('common')

  return (
    <Title title={t('titles.contact')}>
      <div className='bg-gray-50 dark:bg-gray-800 min-h-min-footer'>
        <div className='w-11/12 md:w-4/5 mx-auto pb-16 pt-12 px-4 sm:px-6 lg:px-8 whitespace-pre-line'>
          <h1 className='text-4xl font-bold text-gray-900 dark:text-gray-50 tracking-tight'>
            {t('titles.contact')}
          </h1>
          <p className='mt-2 text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
            {t('contact.howTo')}

            <ol className='list-decimal ml-5 sm:ml-10'>
              <li className='mt-1'>
                <Trans
                  // @ts-ignore
                  t={t}
                  i18nKey='contact.ways.email'
                  values={{ email: CONTACT_EMAIL }}
                  components={{
                    mail: <a href={`mailto:${CONTACT_EMAIL}`} className='font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500' />,
                  }}
                />
              </li>
              <li className='mt-1'>
                <Trans
                  // @ts-ignore
                  t={t}
                  i18nKey='contact.ways.twitter'
                  values={{ twitter: TWITTER_USERNAME }}
                  components={{
                    url: <a href={TWITTER_URL} className='font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500' />,
                  }}
                />
              </li>
              <li className='mt-1'>
                <Trans
                  // @ts-ignore
                  t={t}
                  i18nKey='contact.ways.discord'
                  components={{
                    url: <a href={DISCORD_URL} className='font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500' />,
                  }}
                />
              </li>
              <li className='mt-1'>
                {t('contact.ways.chat')}
              </li>
            </ol>
          </p>
        </div>
      </div>
    </Title>
  )
}

export default Contact

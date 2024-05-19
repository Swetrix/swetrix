/* eslint-disable jsx-a11y/anchor-has-content */
import React from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'

import { CONTACT_EMAIL, TWITTER_URL, TWITTER_USERNAME, DISCORD_URL, DOCS_URL, BOOK_A_CALL_URL } from 'redux/constants'

interface IPanel {
  href: string
  title: string
  description: string
}

const Panel = ({ href, title, description }: IPanel) => (
  <a
    href={href}
    target='_blank'
    rel='noopener noreferrer'
    className='relative block rounded-2xl bg-gray-100 hover:bg-gray-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 p-10 border border-gray-300/80 dark:border-slate-900/80'
  >
    <ArrowTopRightOnSquareIcon className='w-5 h-5 absolute top-5 right-5 text-gray-900' />
    <h3 className='text-lg font-semibold leading-7 text-gray-900'>{title}</h3>
    <p className='mt-3 text-sm leading-6 text-gray-600'>{description}</p>
  </a>
)

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
        <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:col-span-2 lg:gap-8 mt-8'>
          <Panel href={DOCS_URL} title={t('contact.docs.title')} description={t('contact.docs.desc')} />
          <Panel href={BOOK_A_CALL_URL} title={t('contact.demo.title')} description={t('contact.demo.desc')} />
        </div>
      </div>
    </div>
  )
}

export default Contact

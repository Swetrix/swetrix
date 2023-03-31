/* eslint-disable jsx-a11y/anchor-has-content */
import React, { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation, Trans } from 'react-i18next'
import _map from 'lodash/map'

import Title from 'components/Title'
import {
  CHROME_EXTENSION_URL, FIREFOX_ADDON_URL, DOCS_URL,
} from 'redux/constants'
import routes from 'routes'

const Features = (): JSX.Element => {
  const { t }: {
    t: (key: string, options?: {
      [key: string]: string | number | boolean | undefined
    }) => string
  } = useTranslation('common')

  return (
    <Title title={t('titles.features')}>
      <div className='bg-gray-50 dark:bg-gray-800'>
        <div className='w-11/12 md:w-4/5 mx-auto pb-16 pt-12 px-4 sm:px-6 lg:px-8 whitespace-pre-line'>
          <h1 className='text-4xl font-bold text-gray-900 dark:text-gray-50 tracking-tight'>
            {t('titles.features')}
          </h1>

          <h3 className='text-2xl font-normal text-gray-900 dark:text-gray-50 tracking-tight mt-4'>
            {t('features.feature1Name')}
          </h3>
          <p className='text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
            <Trans
              // @ts-ignore
              t={t}
              i18nKey='features.feature1Content'
              components={{
                docs: <a className='text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500' href={`${DOCS_URL}/swetrix-js-reference#trackviews`} target='_blank' rel='noreferrer noopener' />,
                gh: <a className='text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500' href='https://github.com/Swetrix' target='_blank' rel='noopener noreferrer' />,
              }}
            />
          </p>

          <h3 className='text-2xl font-normal text-gray-900 dark:text-gray-50 tracking-tight mt-4'>
            {t('features.feature2Name')}
          </h3>
          <p className='text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
            <Trans
              // @ts-ignore
              t={t}
              i18nKey='features.feature2Content'
              components={{
                firefox: <a className='text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500' href={FIREFOX_ADDON_URL} target='_blank' rel='noopener noreferrer' aria-label='Firefox Addon (opens in a new tab)' />,
                chrome: <a className='text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500' href={CHROME_EXTENSION_URL} target='_blank' rel='noopener noreferrer' aria-label='Chrome Extension (opens in a new tab)' />,
              }}
            />
          </p>
          {_map(t('features.list', { returnObjects: true }), (feature: {
            name: string
            content: string
          }) => (
            <Fragment key={feature.name}>
              <h3 className='text-2xl font-normal text-gray-900 dark:text-gray-50 tracking-tight mt-4'>
                {feature.name}
              </h3>
              <p className='text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
                {feature.content}
              </p>
            </Fragment>
          ))}
        </div>
      </div>
      <div className='bg-indigo-600 dark:bg-gray-750'>
        <div className='w-4/5 mx-auto pb-16 pt-12 px-4 sm:px-6 lg:px-8 lg:flex lg:items-center lg:justify-between'>
          <h2 className='text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-50'>
            <span className='block text-white'>
              {t('features.ready')}
            </span>
            <span className='block text-gray-300'>
              {t('features.start')}
            </span>
          </h2>
          <div className='mt-6 space-y-4 sm:space-y-0 sm:flex sm:space-x-5'>
            <Link
              to={routes.signup}
              className='flex items-center justify-center px-3 py-2 border border-transparent text-lg font-medium rounded-md shadow-sm text-indigo-800 bg-indigo-50 hover:bg-indigo-100'
              aria-label={t('titles.signup')}
            >
              {t('common.getStarted')}
            </Link>
          </div>
        </div>
      </div>
    </Title>
  )
}

export default Features

/* eslint-disable jsx-a11y/anchor-has-content */
import React, { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { HashLink } from 'react-router-hash-link'
import { useTranslation, Trans } from 'react-i18next'
import _map from 'lodash/map'

import Title from 'components/Title'
import routes from 'routes'

const Features = () => {
  const { t } = useTranslation('common')

  return (
    <Title title={t('titles.features')}>
      <div className='bg-gray-50'>
        <div className='w-11/12 md:w-4/5 mx-auto pb-16 pt-12 px-4 sm:px-6 lg:px-8'>
          <h1 className='text-4xl font-extrabold text-gray-900 tracking-tight'>
            {t('titles.features')}
          </h1>

          <h3 className='text-2xl font-normal text-gray-900 tracking-tight mt-4'>
            {t('features.feature1Name')}
          </h3>
          <p className='text-lg text-gray-900 tracking-tight'>
            <Trans
              t={t}
              i18nKey='features.feature1Content'
              components={{
                docs: <HashLink className='text-indigo-600 hover:text-indigo-500' to={`${routes.docs}#docs-tv`} />,
                gh: <a className='text-indigo-600 hover:text-indigo-500' href='https://github.com/Swetrix' target='_blank' rel='noopener noreferrer' />,
              }}
            />
          </p>

          {_map(t('features.list', { returnObjects: true }), (feature) => (
            <Fragment key={feature.name}>
              <h3 className='text-2xl font-normal text-gray-900 tracking-tight mt-4'>
                {feature.name}
              </h3>
              <p className='text-lg text-gray-900 tracking-tight'>
                {feature.content}
              </p>
            </Fragment>
          ))}
        </div>
      </div>
      <div className='bg-indigo-600'>
        <div className='w-4/5 mx-auto pb-16 pt-12 px-4 sm:px-6 lg:px-8 lg:flex lg:items-center lg:justify-between'>
          <h2 className='text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900'>
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

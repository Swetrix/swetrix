import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import routes from 'routes'
import Title from 'components/Title'

const NotFound = () => {
  const { t } = useTranslation('common')

  return (
    <Title title={t('notFoundPage.title')}>
      <div className='bg-gray-50 dark:bg-gray-800 min-h-min-footer px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8'>
        <div className='max-w-max mx-auto'>
          <main className='sm:flex'>
            <p className='text-4xl font-bold text-indigo-600 dark:text-indigo-500 sm:text-5xl'>
              404
            </p>
            <div className='sm:ml-6'>
              <div className='sm:border-l sm:border-gray-200 sm:pl-6'>
                <h1 className='text-4xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight sm:text-5xl'>
                  {t('notFoundPage.title')}
                </h1>
                <p className='mt-1 whitespace-pre-line text-base text-gray-500 dark:text-gray-300'>
                  {t('notFoundPage.description')}
                </p>
              </div>
              <div className='mt-8 flex space-x-3 sm:border-l sm:border-transparent sm:pl-6'>
                <Link
                  to={routes.main}
                  className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                >
                  {t('notFoundPage.goHome')}
                </Link>
                <Link
                  to={routes.contact}
                  className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:text-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 dark:focus:ring-gray-50'
                >
                  {t('notFoundPage.support')}
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    </Title>
  )
}

export default NotFound

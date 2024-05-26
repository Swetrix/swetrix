import React from 'react'
import { Link } from '@remix-run/react'
import { useTranslation } from 'react-i18next'

import routes from 'routesPath'

const NotFound = (): JSX.Element => {
  const { t } = useTranslation('common')

  return (
    <div className='min-h-min-footer bg-gray-50 px-4 py-16 dark:bg-slate-900 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8'>
      <div className='mx-auto max-w-max'>
        <main className='sm:flex'>
          <p className='text-4xl font-bold text-indigo-600 dark:text-indigo-500 sm:text-5xl'>404</p>
          <div className='sm:ml-6'>
            <div className='sm:border-l sm:border-gray-200 sm:pl-6'>
              <h1 className='text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50 sm:text-5xl'>
                {t('notFoundPage.title')}
              </h1>
              <p className='mt-1 whitespace-pre-line text-base text-gray-500 dark:text-gray-300'>
                {t('notFoundPage.description')}
              </p>
            </div>
            <div className='mt-8 flex space-x-3 sm:border-l sm:border-transparent sm:pl-6'>
              <Link
                to={routes.main}
                className='inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
              >
                {t('notFoundPage.goHome')}
              </Link>
              <Link
                to={routes.contact}
                className='inline-flex items-center rounded-md border border-transparent bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700 dark:focus:ring-gray-50'
              >
                {t('notFoundPage.support')}
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default NotFound

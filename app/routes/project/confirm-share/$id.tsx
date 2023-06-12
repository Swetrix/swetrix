import React, { useState, useEffect, memo } from 'react'
import { useDispatch } from 'react-redux'
import { useParams, Link } from '@remix-run/react'
import { useTranslation } from 'react-i18next'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'
import _split from 'lodash/split'

import sagaActions from 'redux/sagas/actions'
import Loader from 'ui/Loader'
import routes from 'routesPath'
import { AppDispatch } from 'redux/store'

const Page = () => {
  const { t }: {
    t: (key: string) => string
  } = useTranslation('common')
  const dispatch: AppDispatch = useDispatch()
  const { id }: {
    id: string
  } = useParams()
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    setLoading(true)
    const path = _split(window.location.pathname, '/')[1]

    dispatch(
      sagaActions.shareVerifyAsync(
        { path, id },
        () => setLoading(false),
        (verifyError) => {
          setError(verifyError)
          setLoading(false)
        },
      ),
    )
  }, [id]) // eslint-disable-line

  if (loading) {
    return (
      <div>
        <div className='min-h-page bg-gray-50 dark:bg-slate-900'>
          <Loader />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <div className='bg-gray-50 dark:bg-slate-900 min-h-page px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8'>
          <div className='max-w-max mx-auto'>
            <main className='sm:flex'>
              <XCircleIcon className='h-12 w-12 text-red-400' aria-hidden='true' />
              <div className='sm:ml-6'>
                <div className='sm:border-l max-w-prose sm:border-gray-200 sm:pl-6'>
                  <h1 className='text-4xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight sm:text-5xl'>
                    {error}
                  </h1>
                </div>
                <div className='mt-8 flex space-x-3 sm:border-l sm:border-transparent sm:pl-6'>
                  <Link
                    to={routes.dashboard}
                    className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                  >
                    {t('common.dashboard')}
                  </Link>
                  <Link
                    to={routes.contact}
                    className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:text-gray-50 dark:bg-slate-800 dark:hover:bg-slate-700 dark:focus:ring-gray-50'
                  >
                    {t('notFoundPage.support')}
                  </Link>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className='bg-gray-50 dark:bg-slate-900 min-h-page px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8'>
        <div className='max-w-max mx-auto'>
          <main className='sm:flex'>
            <CheckCircleIcon className='h-12 w-12 text-green-500 dark:text-green-400' aria-hidden='true' />
            <div className='sm:ml-6'>
              <div className='sm:border-l max-w-prose sm:border-gray-200 sm:pl-6'>
                <h1 className='text-4xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight sm:text-5xl'>
                  {t('apiNotifications.acceptInvitation')}
                </h1>
              </div>
              <div className='mt-8 flex space-x-3 sm:border-l sm:border-transparent sm:pl-6'>
                <Link
                  to={routes.dashboard}
                  className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                >
                  {t('common.dashboard')}
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default memo(Page)

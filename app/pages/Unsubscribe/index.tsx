import React, { useState, useEffect, memo } from 'react'
import { useParams, Link } from '@remix-run/react'
import { useTranslation } from 'react-i18next'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'
import _isString from 'lodash/isString'
import { useSelector } from 'react-redux'

import { StateType } from 'redux/store'
import { unsubscribeFromEmailReports, unsubscribeFromEmailReports3rdParty } from 'api'
import Loader from 'ui/Loader'
import routes from 'routesPath'

interface IUnsubscribe {
  type: 'user-reports' | '3rdparty'
}

const Unsubscribe = ({ type }: IUnsubscribe): JSX.Element => {
  const { t } = useTranslation('common')
  const { token } = useParams()
  const { authenticated } = useSelector((state: StateType) => state.auth)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    setLoading(true)

    if (!_isString(token)) {
      setError(t('apiNotifications.invalidToken'))
      setLoading(false)
      return
    }

    if (type === 'user-reports') {
      unsubscribeFromEmailReports(token)
        .then(() => {
          setLoading(false)
        })
        .catch((reason) => {
          setError(_isString(reason) ? reason : reason?.response?.data?.message || reason.message)
        })
        .finally(() => {
          setLoading(false)
        })
    }

    if (type === '3rdparty') {
      unsubscribeFromEmailReports3rdParty(token)
        .then(() => {
          setLoading(false)
        })
        .catch((reason) => {
          setError(_isString(reason) ? reason : reason?.response?.data?.message || reason.message)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [token, type]) // eslint-disable-line

  if (loading) {
    return (
      <div className='min-h-page bg-gray-50 dark:bg-slate-900'>
        <Loader />
      </div>
    )
  }

  if (error) {
    return (
      <div className='min-h-page bg-gray-50 px-4 py-16 dark:bg-slate-900 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8'>
        <div className='mx-auto max-w-max'>
          <main className='sm:flex'>
            <XCircleIcon className='h-12 w-12 text-red-400' aria-hidden='true' />
            <div className='sm:ml-6'>
              <div className='max-w-prose sm:border-l sm:border-gray-200 sm:pl-6'>
                <h1 className='text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50 sm:text-5xl'>
                  {error}
                </h1>
              </div>
              <div className='mt-8 flex space-x-3 sm:border-l sm:border-transparent sm:pl-6'>
                {authenticated ? (
                  <Link
                    to={routes.dashboard}
                    className='inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
                  >
                    {t('common.dashboard')}
                  </Link>
                ) : (
                  <Link
                    to={routes.signin}
                    className='inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
                  >
                    {t('auth.signin.button')}
                  </Link>
                )}
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

  return (
    <div className='min-h-page bg-gray-50 px-4 py-16 dark:bg-slate-900 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8'>
      <div className='mx-auto max-w-max'>
        <main className='sm:flex'>
          <CheckCircleIcon className='h-12 w-12 text-green-500 dark:text-green-400' aria-hidden='true' />
          <div className='sm:ml-6'>
            <div className='max-w-prose sm:border-l sm:border-gray-200 sm:pl-6'>
              <h1 className='text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50 sm:text-5xl'>
                {t('unsubscribe.success')}
              </h1>
            </div>
            <div className='mt-8 flex space-x-3 sm:border-l sm:border-transparent sm:pl-6'>
              {authenticated ? (
                <Link
                  to={routes.dashboard}
                  className='inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
                >
                  {t('common.dashboard')}
                </Link>
              ) : (
                <Link
                  to={routes.signin}
                  className='inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
                >
                  {t('auth.signin.button')}
                </Link>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default memo(Unsubscribe)

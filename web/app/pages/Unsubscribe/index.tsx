import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'
import _isString from 'lodash/isString'
import { useState, useEffect, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, Link } from 'react-router'

import { unsubscribeFromEmailReports, unsubscribeFromEmailReports3rdParty } from '~/api'
import { useAuth } from '~/providers/AuthProvider'
import Loader from '~/ui/Loader'
import routes from '~/utils/routes'

interface UnsubscribeProps {
  type: 'user-reports' | '3rdparty'
}

const Unsubscribe = ({ type }: UnsubscribeProps) => {
  const { t } = useTranslation('common')
  const { token } = useParams()
  const { isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
      <div className='min-h-page bg-gray-50 px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8 dark:bg-slate-900'>
        <div className='mx-auto max-w-max'>
          <main className='sm:flex'>
            <XCircleIcon className='h-12 w-12 text-red-400' aria-hidden='true' />
            <div className='sm:ml-6'>
              <div className='max-w-prose sm:border-l sm:border-gray-200 sm:pl-6'>
                <h1 className='text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl dark:text-gray-50'>
                  {error}
                </h1>
              </div>
              <div className='mt-8 flex space-x-3 font-mono sm:border-l sm:border-transparent sm:pl-6'>
                {isAuthenticated ? (
                  <Link
                    to={routes.dashboard}
                    className='inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-hidden'
                  >
                    {t('common.dashboard')}
                  </Link>
                ) : (
                  <Link
                    to={routes.signin}
                    className='inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-hidden'
                  >
                    {t('auth.signin.button')}
                  </Link>
                )}
                <Link
                  to={routes.contact}
                  className='inline-flex items-center rounded-md border border-transparent bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-hidden dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700 dark:focus:ring-gray-50'
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
    <div className='min-h-page bg-gray-50 px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8 dark:bg-slate-900'>
      <div className='mx-auto max-w-max'>
        <main className='sm:flex'>
          <CheckCircleIcon className='h-12 w-12 text-green-500 dark:text-green-400' aria-hidden='true' />
          <div className='sm:ml-6'>
            <div className='max-w-prose sm:border-l sm:border-gray-200 sm:pl-6'>
              <h1 className='text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl dark:text-gray-50'>
                {t('unsubscribe.success')}
              </h1>
            </div>
            <div className='mt-8 flex space-x-3 font-mono sm:border-l sm:border-transparent sm:pl-6'>
              {isAuthenticated ? (
                <Link
                  to={routes.dashboard}
                  className='inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-hidden'
                >
                  {t('common.dashboard')}
                </Link>
              ) : (
                <Link
                  to={routes.signin}
                  className='inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-hidden'
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

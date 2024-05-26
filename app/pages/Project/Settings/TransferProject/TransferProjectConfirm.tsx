import React, { useState, useEffect, memo } from 'react'
import { Link } from '@remix-run/react'
import { useTranslation } from 'react-i18next'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'

import Loader from 'ui/Loader'

import { confirmTransferProject } from 'api'
import routes from 'routesPath'

const TransferProjectConfirm = (): JSX.Element => {
  const { t } = useTranslation('common')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')

  const handleConfirm = async (token: string) => {
    try {
      await confirmTransferProject(token)
    } catch (e) {
      setError(t('apiNotifications.invalidToken'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    const query = new URLSearchParams(window.location.search)
    const token = query.get('token')

    if (!token) {
      setError(t('apiNotifications.invalidToken'))
      setLoading(false)
      return
    }

    handleConfirm(token)
  }, []) // eslint-disable-line

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
                <Link
                  to={routes.dashboard}
                  className='inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
                >
                  {t('common.dashboard')}
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

  return (
    <div className='min-h-page bg-gray-50 px-4 py-16 dark:bg-slate-900 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8'>
      <div className='mx-auto max-w-max'>
        <main className='sm:flex'>
          <CheckCircleIcon className='h-12 w-12 text-green-500 dark:text-green-400' aria-hidden='true' />
          <div className='sm:ml-6'>
            <div className='max-w-prose sm:border-l sm:border-gray-200 sm:pl-6'>
              <h1 className='text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50 sm:text-5xl'>
                {t('apiNotifications.acceptInvitation')}
              </h1>
            </div>
            <div className='mt-8 flex space-x-3 sm:border-l sm:border-transparent sm:pl-6'>
              <Link
                to={routes.dashboard}
                className='inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
              >
                {t('common.dashboard')}
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default memo(TransferProjectConfirm)

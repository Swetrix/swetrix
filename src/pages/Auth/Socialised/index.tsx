import React, {
  useEffect, useState, memo,
} from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'
import _replace from 'lodash/replace'

import { processGoogleToken } from 'api'
import Title from 'components/Title'
import Loader from 'ui/Loader'
import routes from 'routes'

const Socialised = (): JSX.Element => {
  const { t }: {
    t: (key: string, optinions?: {
      [key: string]: string | number,
    }) => string,
  } = useTranslation('common')
  const [loading, setLoading] = useState<boolean>(true)
  const [isError, setIsError] = useState<boolean>(false)

  // For some reason, Google redirects to a hash URL, let's fix it
  const _location = _replace(window.location.href, `${routes.socialised}#`, `${routes.socialised}?`)

  const { searchParams } = new URL(_location)
  const hash = searchParams.get('state')
  const token = searchParams.get('access_token')

  console.log(hash, token)

  useEffect(() => {
    const processCode = async () => {
      if (!token || !hash) {
        setIsError(true)
        return
      }

      try {
        await processGoogleToken(token, hash)
      } catch (reason) {
        setIsError(true)
        console.error(`[ERROR] Error while processing Google code: ${reason}`)
      } finally {
        setLoading(false)
      }
    }

    setLoading(true)
    processCode()
  }, []) // eslint-disable-line

  if (loading) {
    return (
      <Title title={t('titles.socialisation')}>
        <div className='min-h-page bg-gray-50 dark:bg-gray-800'>
          <Loader />
        </div>
      </Title>
    )
  }

  if (isError) {
    return (
      <Title title={t('titles.socialisation')}>
        <div className='bg-gray-50 dark:bg-gray-800 min-h-page px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8'>
          <div className='max-w-max mx-auto'>
            <main className='sm:flex'>
              <XCircleIcon className='h-12 w-12 text-red-400' aria-hidden='true' />
              <div className='sm:ml-6'>
                <div className='sm:border-l max-w-prose sm:border-gray-200 sm:pl-6'>
                  <h1 className='text-4xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight sm:text-5xl'>
                    {t('apiNotifications.socialisationGenericError')}
                  </h1>
                </div>
                <div className='mt-8 flex space-x-3 sm:border-l sm:border-transparent sm:pl-6'>
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

  return (
    <Title title={t('titles.socialisation')}>
      <div className='bg-gray-50 dark:bg-gray-800 min-h-page px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8'>
        <div className='max-w-max mx-auto'>
          <main className='sm:flex'>
            <CheckCircleIcon className='h-12 w-12 text-green-500 dark:text-green-400' aria-hidden='true' />
            <div className='sm:ml-6'>
              <div className='sm:border-l max-w-prose sm:border-gray-200 sm:pl-6'>
                <h1 className='text-4xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight sm:text-5xl'>
                  {t('auth.socialisation.success')}
                </h1>
              </div>
            </div>
          </main>
        </div>
      </div>
    </Title>
  )
}

export default memo(Socialised)

import React, { useEffect, useState, memo } from 'react'
import { Link } from '@remix-run/react'
import { useTranslation } from 'react-i18next'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'
import _split from 'lodash/split'
import _replace from 'lodash/replace'

import { processSSOToken } from 'api'
import { SSO_PROVIDERS } from 'redux/constants'
import Loader from 'ui/Loader'
import routes from 'routesPath'

const Socialised = (): JSX.Element => {
  const { t } = useTranslation('common')
  const [loading, setLoading] = useState<boolean>(true)
  const [isError, setIsError] = useState<boolean>(false)

  useEffect(() => {
    // For some reason, Google redirects to a hash URL, let's fix it
    const _location = _replace(window.location.href, `${routes.socialised}#`, `${routes.socialised}?`)

    const { searchParams } = new URL(_location)
    const hash = searchParams.get('state')
    const accessToken = searchParams.get('access_token')
    const code = searchParams.get('code')
    const provider = _split(hash, ':')[0]

    const processCode = async () => {
      if (!hash || !provider) {
        setIsError(true)
        return
      }

      let _token

      if (provider === SSO_PROVIDERS.GOOGLE) {
        _token = accessToken
      }

      if (provider === SSO_PROVIDERS.GITHUB) {
        _token = code
      }

      if (!_token) {
        setIsError(true)
        return
      }

      try {
        await processSSOToken(_token, hash)
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
      <div className='min-h-page bg-gray-50 dark:bg-slate-900'>
        <Loader />
      </div>
    )
  }

  if (isError) {
    return (
      <div className='min-h-page bg-gray-50 px-4 py-16 dark:bg-slate-900 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8'>
        <div className='mx-auto max-w-max'>
          <main className='sm:flex'>
            <XCircleIcon className='h-12 w-12 text-red-400' aria-hidden='true' />
            <div className='sm:ml-6'>
              <div className='max-w-prose sm:border-l sm:border-gray-200 sm:pl-6'>
                <h1 className='text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50 sm:text-5xl'>
                  {t('auth.socialisation.failed')}
                </h1>
                <p className='mt-1 max-w-prose whitespace-pre-line text-base text-gray-700 dark:text-gray-300'>
                  {t('auth.socialisation.failedDesc')}
                </p>
              </div>
              <div className='mt-8 flex space-x-3 sm:border-l sm:border-transparent sm:pl-6'>
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
                {t('auth.socialisation.authSuccess')}
              </h1>
              <p className='mt-1 max-w-prose whitespace-pre-line text-base text-gray-700 dark:text-gray-300'>
                {t('auth.socialisation.successDesc')}
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default memo(Socialised)

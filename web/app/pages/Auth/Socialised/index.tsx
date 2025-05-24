import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'
import _replace from 'lodash/replace'
import _split from 'lodash/split'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { processSSOToken, processSSOTokenCommunityEdition } from '~/api'
import { isSelfhosted, SSO_PROVIDERS } from '~/lib/constants'
import Loader from '~/ui/Loader'
import routes from '~/utils/routes'

const Socialised = () => {
  const { t } = useTranslation('common')
  const [loading, setLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    // For some reason, Google redirects to a hash URL, let's fix it
    const _location = _replace(window.location.href, `${routes.socialised}#`, `${routes.socialised}?`)

    const { searchParams } = new URL(_location)
    const state = searchParams.get('state')
    const accessToken = searchParams.get('access_token')
    const code = searchParams.get('code')
    const provider = _split(state, ':')[0]

    const processCode = async () => {
      if (!state || !provider) {
        setIsError(true)
        return
      }

      let _code

      if (provider === SSO_PROVIDERS.GOOGLE) {
        _code = accessToken
      }

      if (provider === SSO_PROVIDERS.GITHUB) {
        _code = code
      }

      if (!_code) {
        setIsError(true)
        return
      }

      try {
        await processSSOToken(_code, state)
      } catch (reason) {
        setIsError(true)
        console.error(`[ERROR] Error while processing Google code: ${reason}`)
      } finally {
        setLoading(false)
      }
    }

    const processCodeCommunityEdition = async () => {
      if (!state || !code) {
        setIsError(true)
        return
      }

      try {
        await processSSOTokenCommunityEdition(code, state, `${window.location.origin}${routes.socialised}`)
      } catch (reason) {
        setIsError(true)
        console.error(`[ERROR] Error while processing OIDC code: ${reason}`)
      } finally {
        setLoading(false)
      }
    }

    setLoading(true)

    if (isSelfhosted) {
      processCodeCommunityEdition()
    } else {
      processCode()
    }
  }, [])

  if (loading) {
    return (
      <div className='min-h-page bg-gray-50 dark:bg-slate-900'>
        <Loader />
      </div>
    )
  }

  if (isError) {
    return (
      <div className='min-h-page bg-gray-50 px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8 dark:bg-slate-900'>
        <div className='mx-auto max-w-max'>
          <main className='sm:flex'>
            <XCircleIcon className='h-12 w-12 text-red-400' aria-hidden='true' />
            <div className='sm:ml-6'>
              <div className='max-w-prose sm:border-l sm:border-gray-200 sm:pl-6'>
                <h1 className='text-4xl font-extrabold text-gray-900 sm:text-5xl dark:text-gray-50'>
                  {t('auth.socialisation.failed')}
                </h1>
                <p className='mt-1 max-w-prose text-base whitespace-pre-line text-gray-700 dark:text-gray-300'>
                  {t('auth.socialisation.failedDesc')}
                </p>
              </div>
              <div className='mt-8 flex space-x-3 sm:border-l sm:border-transparent sm:pl-6'>
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
              <h1 className='text-4xl font-extrabold text-gray-900 sm:text-5xl dark:text-gray-50'>
                {t('auth.socialisation.authSuccess')}
              </h1>
              <p className='mt-1 max-w-prose text-base whitespace-pre-line text-gray-700 dark:text-gray-300'>
                {t('auth.socialisation.successDesc')}
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Socialised

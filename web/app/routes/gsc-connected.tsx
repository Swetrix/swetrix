import { XCircleIcon } from '@heroicons/react/24/solid'
import _replace from 'lodash/replace'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, redirect, useNavigate } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { processGSCToken } from '~/api'
import { isSelfhosted } from '~/lib/constants'
import Loader from '~/ui/Loader'
import routes from '~/utils/routes'

export async function loader() {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  return null
}

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export default function GscConnected() {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    // For some reason, Google redirects to a hash URL, let's fix it
    const _location = _replace(window.location.href, `${routes.gsc_connected}#`, `${routes.gsc_connected}?`)

    const { searchParams } = new URL(_location)
    const state = searchParams.get('state')
    const code = searchParams.get('code')

    // Prevent duplicate callback processing in React 18 StrictMode (dev) or other double-invocation scenarios
    const processedKey = state ? `gsc_processed:${state}` : null
    if (processedKey && sessionStorage.getItem(processedKey) === '1') {
      setLoading(false)
      return
    }

    const processCode = async () => {
      if (!state || !code) {
        setIsError(true)
        return
      }

      try {
        const { pid } = await processGSCToken(code, state)
        navigate({
          pathname: _replace(routes.project_settings, ':id', pid),
          search: new URLSearchParams({ tab: 'integrations', gsc: 'connected' }).toString(),
        })
      } catch (reason) {
        setIsError(true)
        setLoading(false)
        console.error(`[ERROR] Error while processing GSC integration: ${reason}`)
      }
    }

    setLoading(true)

    processCode()
  }, [navigate])

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
                  {t('gsc.failed')}
                </h1>
                <p className='mt-1 max-w-prose text-base whitespace-pre-line text-gray-700 dark:text-gray-300'>
                  {t('gsc.failedDesc')}
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

  return null
}

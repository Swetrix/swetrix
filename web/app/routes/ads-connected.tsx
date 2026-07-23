import _replace from 'lodash/replace'
import { useEffect, useState } from 'react'
import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { redirect, useLoaderData, useNavigate } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { serverFetch } from '~/api/api.server'
import { useAuthProxy } from '~/hooks/useAuthProxy'
import StatusPage from '~/ui/StatusPage'
import routes from '~/utils/routes'
import { getTitle } from '~/utils/seo'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export const meta: MetaFunction = () => [
  ...getTitle('Google Ads Connected'),
  { name: 'robots', content: 'noindex' },
]

export interface AdsConnectedLoaderData {
  error?: string
  useClientFallback?: boolean
}

export async function loader({
  request,
}: LoaderFunctionArgs): Promise<AdsConnectedLoaderData | Response> {
  const url = new URL(request.url)

  // Google sometimes redirects with hash instead of query params
  // The hash won't be available server-side, so we need client-side fallback
  const state = url.searchParams.get('state')
  const code = url.searchParams.get('code')

  if (!state || !code) {
    // If params are missing, it might be in the hash - need client-side handling
    return { useClientFallback: true }
  }

  const result = await serverFetch<{ pid: string }>(
    request,
    'v1/project/ads/process-token',
    {
      method: 'POST',
      body: { code, state },
    },
  )

  // If auth fails (401/403), the backend rejected the request before touching
  // the authorization code, so the client (which has localStorage tokens) can
  // safely retry the exchange
  if (result.status === 401 || result.status === 403) {
    return { useClientFallback: true }
  }

  if (result.error || !result.data) {
    // Any other failure may have happened after the code was redeemed -
    // retrying client-side would just fail with invalid_grant, so surface
    // the error instead
    const error = Array.isArray(result.error)
      ? result.error.join(', ')
      : result.error

    return { error: error || 'Unknown error' }
  }

  const { pid } = result.data
  const redirectUrl = _replace(routes.project_settings, ':id', pid)

  return redirect(`${redirectUrl}?tab=integrations`)
}

export default function AdsConnectedRoute() {
  const data = useLoaderData<AdsConnectedLoaderData>()

  // Always use client-side handler when loader indicates fallback
  if (data.useClientFallback) {
    return <AdsHashHandler />
  }

  // This shouldn't be reached normally, but handle edge cases
  return (
    <StatusPage
      type='error'
      title='Failed to connect Google Ads'
      description={data.error || 'Unknown error'}
      actions={[{ label: 'Support', to: routes.contact }]}
    />
  )
}

function AdsHashHandler() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const { processAdsToken } = useAuthProxy()
  // The callback params may live in the URL hash, which only exists in the
  // browser - parse after mount so SSR and hydration both render the loading
  // state instead of a premature "invalid parameters" error
  const [params, setParams] = useState<{
    state: string | null
    code: string | null
  } | null>(null)

  useEffect(() => {
    // Fix Google's hash URL redirect (sometimes Google uses # instead of ?)
    const _location = _replace(
      window.location.href,
      `${routes.ads_connected}#`,
      `${routes.ads_connected}?`,
    )
    const { searchParams } = new URL(_location)
    setParams({
      state: searchParams.get('state'),
      code: searchParams.get('code'),
    })
  }, [])

  useEffect(() => {
    if (!params?.state || !params?.code) return

    const { state, code } = params

    // Prevent duplicate processing in React StrictMode or on refresh
    const processedKey = `ads_processed:${state}`
    if (sessionStorage.getItem(processedKey) === '1') {
      return
    }
    sessionStorage.setItem(processedKey, '1')

    processAdsToken(code, state)
      .then(({ pid }) => {
        navigate({
          pathname: _replace(routes.project_settings, ':id', pid),
          search: new URLSearchParams({ tab: 'integrations' }).toString(),
        })
      })
      .catch((reason) => {
        sessionStorage.removeItem(processedKey)
        setError(String(reason))
        console.error(
          `[ERROR] Error while processing Google Ads integration: ${reason}`,
        )
      })
  }, [navigate, params, processAdsToken])

  if (params && (!params.state || !params.code)) {
    return (
      <StatusPage
        type='error'
        title='Failed to connect Google Ads'
        description='Invalid callback parameters'
        actions={[{ label: 'Support', to: routes.contact }]}
      />
    )
  }

  if (error) {
    return (
      <StatusPage
        type='error'
        title='Failed to connect Google Ads'
        description={error}
        actions={[{ label: 'Support', to: routes.contact }]}
      />
    )
  }

  return <StatusPage loading />
}

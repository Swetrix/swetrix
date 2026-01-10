import _replace from 'lodash/replace'
import { useEffect, useState } from 'react'
import type { LoaderFunctionArgs } from 'react-router'
import { redirect, useLoaderData, useNavigate } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { useAuthProxy } from '~/hooks/useAuthProxy'
import { serverFetch } from '~/api/api.server'
import { isSelfhosted } from '~/lib/constants'
import StatusPage from '~/ui/StatusPage'
import routes from '~/utils/routes'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export interface GscConnectedLoaderData {
  error?: string
  useClientFallback?: boolean
}

export async function loader({ request }: LoaderFunctionArgs): Promise<GscConnectedLoaderData | Response> {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  const url = new URL(request.url)

  // Google sometimes redirects with hash instead of query params
  // The hash won't be available server-side, so we need client-side fallback
  const state = url.searchParams.get('state')
  const code = url.searchParams.get('code')

  if (!state || !code) {
    // If params are missing, it might be in the hash - need client-side handling
    return { useClientFallback: true }
  }

  const result = await serverFetch<{ pid: string }>(request, 'v1/project/gsc/process-token', {
    method: 'POST',
    body: { code, state },
  })

  // If auth fails (401/403), fall back to client-side which has localStorage tokens
  if (result.status === 401 || result.status === 403) {
    return { useClientFallback: true }
  }

  if (result.error || !result.data) {
    // For other errors, also try client-side as a fallback
    // This handles cases where server-side cookies aren't synced with localStorage
    return { useClientFallback: true }
  }

  const { pid } = result.data
  const redirectUrl = _replace(routes.project_settings, ':id', pid)

  return redirect(`${redirectUrl}?tab=integrations`)
}

export default function GscConnectedRoute() {
  const data = useLoaderData<GscConnectedLoaderData>()

  // Always use client-side handler when loader indicates fallback
  if (data.useClientFallback) {
    return <GscHashHandler />
  }

  // This shouldn't be reached normally, but handle edge cases
  return (
    <StatusPage
      type='error'
      title='Failed to connect Google Search Console'
      description={data.error || 'Unknown error'}
      actions={[{ label: 'Support', to: routes.contact }]}
    />
  )
}

function GscHashHandler() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const { processGSCToken } = useAuthProxy()
  const [{ state, code }] = useState(() => {
    if (typeof window === 'undefined') return { state: null, code: null }
    // Fix Google's hash URL redirect (sometimes Google uses # instead of ?)
    const _location = _replace(window.location.href, `${routes.gsc_connected}#`, `${routes.gsc_connected}?`)
    const { searchParams } = new URL(_location)
    return {
      state: searchParams.get('state'),
      code: searchParams.get('code'),
    }
  })

  useEffect(() => {
    if (!state || !code) return

    // Prevent duplicate processing in React StrictMode or on refresh
    const processedKey = `gsc_processed:${state}`
    if (sessionStorage.getItem(processedKey) === '1') {
      return
    }
    sessionStorage.setItem(processedKey, '1')

    processGSCToken(code, state)
      .then(({ pid }) => {
        navigate({
          pathname: _replace(routes.project_settings, ':id', pid),
          search: new URLSearchParams({ tab: 'integrations' }).toString(),
        })
      })
      .catch((reason) => {
        sessionStorage.removeItem(processedKey)
        setError(String(reason))
        console.error(`[ERROR] Error while processing GSC integration: ${reason}`)
      })
  }, [navigate, state, code, processGSCToken])

  if (!state || !code) {
    return (
      <StatusPage
        type='error'
        title='Failed to connect Google Search Console'
        description='Invalid callback parameters'
        actions={[{ label: 'Support', to: routes.contact }]}
      />
    )
  }

  if (error) {
    return (
      <StatusPage
        type='error'
        title='Failed to connect Google Search Console'
        description={error}
        actions={[{ label: 'Support', to: routes.contact }]}
      />
    )
  }

  return <StatusPage loading />
}

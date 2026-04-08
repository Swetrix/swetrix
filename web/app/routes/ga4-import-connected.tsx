import _replace from 'lodash/replace'
import { useEffect, useState } from 'react'
import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { redirect, useLoaderData, useNavigate } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { processGA4ImportTokenServer } from '~/api/api.server'
import { useAuthProxy } from '~/hooks/useAuthProxy'
import { isSelfhosted } from '~/lib/constants'
import StatusPage from '~/ui/StatusPage'
import routes from '~/utils/routes'
import { getTitle } from '~/utils/seo'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export const meta: MetaFunction = () => [
  ...getTitle('Google Analytics Import Connected'),
  { name: 'robots', content: 'noindex' },
]

export interface Ga4ImportConnectedLoaderData {
  error?: string
  useClientFallback?: boolean
}

export async function loader({
  request,
}: LoaderFunctionArgs): Promise<Ga4ImportConnectedLoaderData | Response> {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  const url = new URL(request.url)

  const state = url.searchParams.get('state')
  const code = url.searchParams.get('code')

  if (!state || !code) {
    return { useClientFallback: true }
  }

  const result = await processGA4ImportTokenServer(request, code, state)

  if (result.status === 401 || result.status === 403) {
    return { useClientFallback: true }
  }

  if (result.error || !result.data) {
    return { useClientFallback: true }
  }

  const { pid } = result.data
  const redirectUrl = _replace(routes.project_settings, ':id', pid)

  return redirect(`${redirectUrl}?tab=import&ga4=connected`)
}

export default function Ga4ImportConnectedRoute() {
  const data = useLoaderData<Ga4ImportConnectedLoaderData>()

  if (data.useClientFallback) {
    return <Ga4HashHandler />
  }

  return (
    <StatusPage
      type='error'
      title='Failed to connect Google Analytics'
      description={data.error || 'Unknown error'}
      actions={[{ label: 'Support', to: routes.contact }]}
    />
  )
}

function Ga4HashHandler() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const { processGA4ImportToken } = useAuthProxy()
  const [{ state, code }] = useState(() => {
    if (typeof window === 'undefined') return { state: null, code: null }
    const _location = _replace(
      window.location.href,
      `${routes.ga4_import_connected}#`,
      `${routes.ga4_import_connected}?`,
    )
    const { searchParams } = new URL(_location)
    return {
      state: searchParams.get('state'),
      code: searchParams.get('code'),
    }
  })

  useEffect(() => {
    if (!state || !code) return

    const processedKey = `ga4_import_processed:${state}`
    if (sessionStorage.getItem(processedKey) === '1') {
      return
    }
    sessionStorage.setItem(processedKey, '1')

    processGA4ImportToken(code, state)
      .then(({ pid }) => {
        navigate({
          pathname: _replace(routes.project_settings, ':id', pid),
          search: new URLSearchParams({
            tab: 'import',
            ga4: 'connected',
          }).toString(),
        })
      })
      .catch((reason) => {
        sessionStorage.removeItem(processedKey)
        setError(String(reason))
        console.error(
          `[ERROR] Error while processing GA4 import connection: ${reason}`,
        )
      })
  }, [navigate, state, code, processGA4ImportToken])

  if (!state || !code) {
    return (
      <StatusPage
        type='error'
        title='Failed to connect Google Analytics'
        description='Invalid callback parameters'
        actions={[{ label: 'Support', to: routes.contact }]}
      />
    )
  }

  if (error) {
    return (
      <StatusPage
        type='error'
        title='Failed to connect Google Analytics'
        description={error}
        actions={[{ label: 'Support', to: routes.contact }]}
      />
    )
  }

  return <StatusPage loading />
}

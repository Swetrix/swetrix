import _replace from 'lodash/replace'
import { useEffect, useState } from 'react'
import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { redirect, useLoaderData, useNavigate } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { serverFetch } from '~/api/api.server'
import { useAuthProxy } from '~/hooks/useAuthProxy'
import { isSelfhosted } from '~/lib/constants'
import StatusPage from '~/ui/StatusPage'
import routes from '~/utils/routes'
import { getTitle } from '~/utils/seo'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export const meta: MetaFunction = () => [
  ...getTitle('Bing Webmaster Tools Connected'),
  { name: 'robots', content: 'noindex' },
]

export interface BwtConnectedLoaderData {
  error?: string
  useClientFallback?: boolean
}

export async function loader({
  request,
}: LoaderFunctionArgs): Promise<BwtConnectedLoaderData | Response> {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  const url = new URL(request.url)
  const state = url.searchParams.get('state')
  const code = url.searchParams.get('code')

  if (!state || !code) {
    return { useClientFallback: true }
  }

  const result = await serverFetch<{ pid: string }>(
    request,
    'v1/project/bwt/process-token',
    {
      method: 'POST',
      body: { code, state },
    },
  )

  if (result.status === 401 || result.status === 403) {
    return { useClientFallback: true }
  }

  if (result.error || !result.data) {
    return { useClientFallback: true }
  }

  const { pid } = result.data
  const redirectUrl = _replace(routes.project_settings, ':id', pid)

  return redirect(`${redirectUrl}?tab=integrations`)
}

export default function BwtConnectedRoute() {
  const data = useLoaderData<BwtConnectedLoaderData>()

  if (data.useClientFallback) {
    return <BwtHashHandler />
  }

  return (
    <StatusPage
      type='error'
      title='Failed to connect Bing Webmaster Tools'
      description={data.error || 'Unknown error'}
      actions={[{ label: 'Support', to: routes.contact }]}
    />
  )
}

function BwtHashHandler() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const { processBWTToken } = useAuthProxy()
  const [{ state, code }] = useState(() => {
    if (typeof window === 'undefined') return { state: null, code: null }
    const _location = _replace(
      window.location.href,
      `${routes.bwt_connected}#`,
      `${routes.bwt_connected}?`,
    )
    const { searchParams } = new URL(_location)
    return {
      state: searchParams.get('state'),
      code: searchParams.get('code'),
    }
  })

  useEffect(() => {
    if (!state || !code) return

    const processedKey = `bwt_processed:${state}`
    if (sessionStorage.getItem(processedKey) === '1') {
      return
    }
    sessionStorage.setItem(processedKey, '1')

    processBWTToken(code, state)
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
          `[ERROR] Error while processing BWT integration: ${reason}`,
        )
      })
  }, [navigate, state, code, processBWTToken])

  if (!state || !code) {
    return (
      <StatusPage
        type='error'
        title='Failed to connect Bing Webmaster Tools'
        description='Invalid callback parameters'
        actions={[{ label: 'Support', to: routes.contact }]}
      />
    )
  }

  if (error) {
    return (
      <StatusPage
        type='error'
        title='Failed to connect Bing Webmaster Tools'
        description={error}
        actions={[{ label: 'Support', to: routes.contact }]}
      />
    )
  }

  return <StatusPage loading />
}

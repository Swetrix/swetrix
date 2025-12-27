import _replace from 'lodash/replace'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { redirect, useNavigate } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { processGSCToken } from '~/api'
import { isSelfhosted } from '~/lib/constants'
import StatusPage from '~/ui/StatusPage'
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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Checking sessionStorage for duplicate processing
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
          search: new URLSearchParams({ tab: 'integrations' }).toString(),
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
    return <StatusPage loading />
  }

  if (isError) {
    return (
      <StatusPage
        type='error'
        title={t('gsc.failed')}
        description={t('gsc.failedDesc')}
        actions={[{ label: t('notFoundPage.support'), to: routes.contact }]}
      />
    )
  }

  return null
}

import _replace from 'lodash/replace'
import _split from 'lodash/split'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAuthProxy } from '~/hooks/useAuthProxy'
import { isSelfhosted, SSO_PROVIDERS } from '~/lib/constants'
import StatusPage from '~/ui/StatusPage'
import routes from '~/utils/routes'

const Socialised = () => {
  const { t } = useTranslation('common')
  const [loading, setLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const { processSSOToken, processSSOTokenCommunityEdition } = useAuthProxy()

  useEffect(() => {
    // For some reason, Google redirects to a hash URL, let's fix it
    const _location = _replace(window.location.href, `${routes.socialised}#`, `${routes.socialised}?`)

    const { searchParams } = new URL(_location)
    const state = searchParams.get('state')
    const accessToken = searchParams.get('access_token')
    const code = searchParams.get('code')
    const provider = _split(state, ':')[0]

    // Prevent duplicate callback processing in React 18 StrictMode (dev) or other double-invocation scenarios
    const processedKey = state ? `oidc_processed:${state}` : null
    if (processedKey && sessionStorage.getItem(processedKey) === '1') {
      setLoading(false)
      return
    }

    const processCode = async () => {
      if (!state || !provider) {
        setIsError(true)
        setLoading(false)
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
        setLoading(false)
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
        setLoading(false)
        return
      }

      try {
        if (processedKey) {
          sessionStorage.setItem(processedKey, '1')
        }
        await processSSOTokenCommunityEdition(code, state, `${window.location.origin}${routes.socialised}`)
      } catch (reason) {
        setIsError(true)
        setLoading(false)
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
    return <StatusPage loading />
  }

  if (isError) {
    return (
      <StatusPage
        type='error'
        title={t('auth.socialisation.failed')}
        description={t('auth.socialisation.failedDesc')}
        actions={[{ label: t('notFoundPage.support'), to: routes.contact }]}
      />
    )
  }

  return (
    <StatusPage
      type='success'
      title={t('auth.socialisation.authSuccess')}
      description={t('auth.socialisation.successDesc')}
    />
  )
}

export default Socialised

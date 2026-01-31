import { CheckCircleIcon, XCircleIcon } from '@phosphor-icons/react'
import _map from 'lodash/map'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFetcher } from 'react-router'
import { toast } from 'sonner'

import { useAuthProxy } from '~/hooks/useAuthProxy'
import { SSO_PROVIDERS } from '~/lib/constants'
import { SSOProvider } from '~/lib/models/Auth'
import { User } from '~/lib/models/User'
import { useAuth } from '~/providers/AuthProvider'
import { useTheme } from '~/providers/ThemeProvider'
import type { UserSettingsActionData } from '~/routes/user-settings'
import Button from '~/ui/Button'
import GithubDark from '~/ui/icons/GithubDark'
import GithubLight from '~/ui/icons/GithubLight'
import Google from '~/ui/icons/GoogleG'
import { delay, openBrowserWindow } from '~/utils/generic'

const AVAILABLE_SSO_PROVIDERS = [
  {
    name: 'Google',
    key: SSO_PROVIDERS.GOOGLE,
    Icon: Google,
    icons: {
      Dark: Google,
      Light: Google,
    },
  },
  {
    name: 'Github',
    key: SSO_PROVIDERS.GITHUB,
    icons: {
      Dark: GithubDark,
      Light: GithubLight,
    },
  },
]

const getStatusByUser = (user: User | null, socialisation: string) => {
  if (!user) {
    return [false, false]
  }

  if (socialisation === SSO_PROVIDERS.GOOGLE) {
    const connected = !!user.googleId
    const unlinkable = !user.registeredWithGoogle
    return [connected, unlinkable]
  }

  if (socialisation === SSO_PROVIDERS.GITHUB) {
    const connected = !!user.githubId
    const unlinkable = !user.registeredWithGithub
    return [connected, unlinkable]
  }

  return [false, false]
}

const HASH_CHECK_FREQUENCY = 1000 // 1 second

const Socialisations = () => {
  const { user, loadUser } = useAuth()
  const { theme } = useTheme()
  const { t } = useTranslation('common')
  const [isLoading, setIsLoading] = useState(false)
  const fetcher = useFetcher<UserSettingsActionData>()
  const isUnlinking = fetcher.state !== 'idle'
  const { generateSSOAuthURL, linkBySSOHash } = useAuthProxy()

  useEffect(() => {
    if (fetcher.data?.intent === 'unlink-sso') {
      if (fetcher.data.success) {
        loadUser()
        toast.success(t('apiNotifications.socialAccountUninked'))
      } else if (fetcher.data.error) {
        toast.error(fetcher.data.error)
      }
    }
  }, [fetcher.data, loadUser, t])

  const linkSSO = async (provider: SSOProvider) => {
    setIsLoading(true)

    const authWindow = openBrowserWindow('')

    if (!authWindow) {
      toast.error(t('apiNotifications.socialisationGenericError'))
      setIsLoading(false)
      return
    }

    try {
      const {
        uuid,
        auth_url: authUrl,
        expires_in: expiresIn,
      } = await generateSSOAuthURL(provider)

      const safeAuthUrl = (() => {
        try {
          const parsed = new URL(authUrl)
          if (parsed.username || parsed.password) return null

          // Only allow expected OAuth endpoints here (no OIDC option in this UI today, but keep it future-proof).
          if (parsed.protocol !== 'https:') return null
          if (
            provider === SSO_PROVIDERS.GOOGLE &&
            parsed.hostname !== 'accounts.google.com'
          )
            return null
          if (
            provider === SSO_PROVIDERS.GITHUB &&
            parsed.hostname !== 'github.com'
          )
            return null

          return parsed.toString()
        } catch {
          return null
        }
      })()

      if (!safeAuthUrl) {
        toast.error(t('apiNotifications.socialisationGenericError'))
        setIsLoading(false)
        authWindow.close()
        return
      }

      authWindow.location.href = safeAuthUrl

      // Closing the authorisation window after the session expires
      setTimeout(authWindow.close, expiresIn)

      while (true) {
        await delay(HASH_CHECK_FREQUENCY)

        try {
          await linkBySSOHash(uuid, provider)
          authWindow.close()

          await loadUser()

          toast.success(t('apiNotifications.socialAccountLinked'))

          setIsLoading(false)
          return
        } catch {
          // Authentication is not finished yet
        }

        if (authWindow.closed) {
          setIsLoading(false)
          return
        }
      }
    } catch (reason) {
      toast.error(
        typeof reason === 'string'
          ? reason
          : t('apiNotifications.socialisationGenericError'),
      )
      setIsLoading(false)
      return
    }
  }

  const onUnlinkSSO = (provider: SSOProvider) => {
    fetcher.submit({ intent: 'unlink-sso', provider }, { method: 'POST' })
  }

  return (
    <>
      <p className='max-w-prose text-base text-gray-900 dark:text-gray-50'>
        {t('profileSettings.socialisationsDesc')}
      </p>
      <div className='mt-2 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900'>
        <table className='min-w-full divide-y divide-gray-200 dark:divide-slate-700'>
          <thead className='bg-gray-50 dark:bg-slate-800'>
            <tr>
              <th
                scope='col'
                className='px-4 py-3 text-left text-xs font-bold tracking-wider text-gray-900 uppercase dark:text-white'
              >
                {t('common.name')}
              </th>
              <th
                scope='col'
                className='px-4 py-3 text-left text-xs font-bold tracking-wider text-gray-900 uppercase dark:text-white'
              >
                {t('common.status')}
              </th>
              <th scope='col' className='px-4 py-3' />
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-200 bg-white dark:divide-slate-700 dark:bg-slate-900'>
            {_map(AVAILABLE_SSO_PROVIDERS, ({ name, key, icons }) => {
              const [connected, unlinkable] = getStatusByUser(user, key)
              const { Light, Dark } = icons
              const status = connected ? 'connected' : 'notConnected'

              return (
                <tr
                  key={key}
                  className='hover:bg-gray-50 dark:hover:bg-slate-800/50'
                >
                  <td className='px-4 py-3 text-sm text-gray-900 dark:text-gray-100'>
                    <div className='flex items-center gap-3'>
                      <div className='hidden shrink-0 sm:block'>
                        {theme === 'dark' ? (
                          <Light className='h-9 w-9 rounded-md' />
                        ) : (
                          <Dark className='h-9 w-9 rounded-md' />
                        )}
                      </div>
                      <span className='font-medium'>{name}</span>
                    </div>
                  </td>
                  <td className='px-4 py-3 text-sm text-gray-700 dark:text-gray-300'>
                    <div className='flex items-center'>
                      {status === 'notConnected' ? (
                        <XCircleIcon
                          className='mr-1.5 h-5 w-5 shrink-0 text-red-400'
                          aria-hidden='true'
                        />
                      ) : null}
                      {status === 'connected' ? (
                        <CheckCircleIcon
                          className='mr-1.5 h-5 w-5 shrink-0 text-green-400'
                          aria-hidden='true'
                        />
                      ) : null}
                      {t(`common.${status}`)}
                    </div>
                  </td>
                  <td className='px-4 py-3 text-right text-sm whitespace-nowrap'>
                    <div className='flex items-center justify-end gap-2'>
                      {connected && !unlinkable ? (
                        <Button
                          onClick={() =>
                            toast.error(
                              t('profileSettings.cantUnlinkSocialisation'),
                            )
                          }
                          small
                          danger
                        >
                          {t('common.unlink')}
                        </Button>
                      ) : null}

                      {connected && unlinkable ? (
                        <Button
                          onClick={() => onUnlinkSSO(key)}
                          loading={isUnlinking}
                          small
                          danger
                        >
                          {t('common.unlink')}
                        </Button>
                      ) : null}

                      {!connected ? (
                        <Button
                          onClick={() => linkSSO(key)}
                          loading={isLoading}
                          small
                          primary
                        >
                          {t('common.link')}
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default Socialisations

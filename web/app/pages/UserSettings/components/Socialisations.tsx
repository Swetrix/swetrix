import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'
import _map from 'lodash/map'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { generateSSOAuthURL, linkBySSOHash, unlinkSSO } from '~/api'
import { SSO_PROVIDERS } from '~/lib/constants'
import { SSOProvider } from '~/lib/models/Auth'
import { User } from '~/lib/models/User'
import { useAuth } from '~/providers/AuthProvider'
import { useTheme } from '~/providers/ThemeProvider'
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
    const connected = user.googleId
    const unlinkable = !user.registeredWithGoogle
    return [connected, unlinkable]
  }

  if (socialisation === SSO_PROVIDERS.GITHUB) {
    const connected = user.githubId
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

  const linkSSO = async (provider: SSOProvider) => {
    setIsLoading(true)

    const authWindow = openBrowserWindow('')

    if (!authWindow) {
      toast.error(t('apiNotifications.socialisationGenericError'))
      setIsLoading(false)
      return
    }

    try {
      const { uuid, auth_url: authUrl, expires_in: expiresIn } = await generateSSOAuthURL(provider)

      authWindow.location = authUrl

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
      toast.error(typeof reason === 'string' ? reason : t('apiNotifications.socialisationGenericError'))
      setIsLoading(false)
      return
    }
  }

  const onUnlinkSSO = async (provider: SSOProvider) => {
    setIsLoading(true)

    try {
      await unlinkSSO(provider)
      await loadUser()

      toast.success(t('apiNotifications.socialAccountUninked'))
    } catch (reason) {
      toast.error(typeof reason === 'string' ? reason : t('apiNotifications.socialisationUnlinkGenericError'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <p className='max-w-prose text-base text-gray-900 dark:text-gray-50'>{t('profileSettings.socialisationsDesc')}</p>
      <div className='mt-2 overflow-hidden bg-white font-mono ring-1 ring-black/10 sm:rounded-md dark:bg-slate-800'>
        <ul className='divide-y divide-gray-200 dark:divide-slate-700'>
          {_map(AVAILABLE_SSO_PROVIDERS, ({ name, key, icons }) => {
            const [connected, unlinkable] = getStatusByUser(user, key)
            const { Light, Dark } = icons

            const status = connected ? 'connected' : 'notConnected'

            return (
              <li key={key}>
                <div className='items-center px-1 py-4 sm:flex sm:px-6'>
                  <div className='flex min-w-0 flex-1 items-center'>
                    <div className='hidden shrink-0 sm:block'>
                      {theme === 'dark' ? (
                        <Light className='h-12 max-h-12 w-12 max-w-12 rounded-full' />
                      ) : (
                        <Dark className='h-12 max-h-12 w-12 max-w-12 rounded-full' />
                      )}
                    </div>
                    <div className='min-w-0 flex-1 px-2 sm:px-4 md:grid md:grid-cols-2 md:gap-4'>
                      <div>
                        <p className='text-md font-medium text-gray-800 dark:text-gray-50'>{name}</p>
                        <p className='mt-2 flex items-center text-sm text-gray-500 dark:text-gray-100'>
                          {status === 'notConnected' ? (
                            <XCircleIcon className='mr-1.5 h-5 w-5 shrink-0 text-red-400' aria-hidden='true' />
                          ) : null}
                          {status === 'connected' ? (
                            <CheckCircleIcon className='mr-1.5 h-5 w-5 shrink-0 text-green-400' aria-hidden='true' />
                          ) : null}
                          {t(`common.${status}`)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className='mt-2 flex justify-center sm:mt-0 sm:block'>
                    {connected && !unlinkable ? (
                      <Button onClick={() => toast.error(t('profileSettings.cantUnlinkSocialisation'))} small danger>
                        {t('common.unlink')}
                      </Button>
                    ) : null}

                    {connected && unlinkable ? (
                      <Button onClick={() => onUnlinkSSO(key)} loading={isLoading} small danger>
                        {t('common.unlink')}
                      </Button>
                    ) : null}

                    {!connected ? (
                      <Button onClick={() => linkSSO(key)} loading={isLoading} small primary>
                        {t('common.link')}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </>
  )
}

export default Socialisations

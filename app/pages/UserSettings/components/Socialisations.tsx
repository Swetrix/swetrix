import React, { useState, memo } from 'react'
import type i18next from 'i18next'
import { useTranslation } from 'react-i18next'
import _map from 'lodash/map'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'

import Button from 'ui/Button'
import Google from 'ui/icons/GoogleG'
import GithubDark from 'ui/icons/GithubDark'
import GithubLight from 'ui/icons/GithubLight'
import { IUser } from 'redux/models/IUser'
import { SSO_PROVIDERS } from 'redux/constants'

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

const getStatusByUser = (user: IUser, socialisation: string) => {
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

interface ISocialisations {
  user: IUser
  linkSSO: (t: typeof i18next.t, callback: (e: any) => void, provider: string) => void
  unlinkSSO: (t: typeof i18next.t, callback: (e: any) => void, provider: string) => void
  genericError: (message: string) => void
  theme: string
}

const Socialisations = ({ user, linkSSO, unlinkSSO, genericError, theme }: ISocialisations) => {
  const { t } = useTranslation('common')
  const [isLoading, setIsLoading] = useState(false)

  const _linkSSO = (provider: string) => {
    setIsLoading(true)

    linkSSO(
      t,
      () => {
        setIsLoading(false)
      },
      provider,
    )
  }

  const _unlinkSSO = (provider: string) => {
    setIsLoading(true)

    unlinkSSO(
      t,
      () => {
        setIsLoading(false)
      },
      provider,
    )
  }

  return (
    <>
      <p className='max-w-prose text-base text-gray-900 dark:text-gray-50'>{t('profileSettings.socialisationsDesc')}</p>
      <div className='overflow-hidden bg-white dark:bg-slate-800 mt-2 shadow sm:rounded-md'>
        <ul className='divide-y divide-gray-200 dark:divide-slate-700'>
          {_map(AVAILABLE_SSO_PROVIDERS, ({ name, key, icons }) => {
            const [connected, unlinkable] = getStatusByUser(user, key)
            const { Light, Dark } = icons

            const status = connected ? 'connected' : 'notConnected'

            return (
              <li key={key}>
                <div className='sm:flex items-center px-1 py-4 sm:px-6'>
                  <div className='flex min-w-0 flex-1 items-center'>
                    <div className='flex-shrink-0 hidden sm:block'>
                      {theme === 'dark' ? (
                        <Light className='max-h-12 max-w-12 h-12 w-12 rounded-full' />
                      ) : (
                        <Dark className='max-h-12 max-w-12 h-12 w-12 rounded-full' />
                      )}
                    </div>
                    <div className='min-w-0 flex-1 px-2 sm:px-4 md:grid md:grid-cols-2 md:gap-4'>
                      <div>
                        <p className='text-md font-medium text-gray-800 dark:text-gray-50'>{name}</p>
                        <p className='mt-2 flex items-center text-sm text-gray-500 dark:text-gray-100'>
                          {status === 'notConnected' && (
                            <XCircleIcon className='mr-1.5 h-5 w-5 flex-shrink-0 text-red-400' aria-hidden='true' />
                          )}
                          {status === 'connected' && (
                            <CheckCircleIcon
                              className='mr-1.5 h-5 w-5 flex-shrink-0 text-green-400'
                              aria-hidden='true'
                            />
                          )}
                          {t(`common.${status}`)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className='flex justify-center mt-2 sm:block sm:mt-0'>
                    {connected && !unlinkable && (
                      <Button onClick={() => genericError(t('profileSettings.cantUnlinkSocialisation'))} small danger>
                        {t('common.unlink')}
                      </Button>
                    )}

                    {connected && unlinkable && (
                      <Button onClick={() => _unlinkSSO(key)} loading={isLoading} small danger>
                        {t('common.unlink')}
                      </Button>
                    )}

                    {!connected && (
                      <Button onClick={() => _linkSSO(key)} loading={isLoading} small primary>
                        {t('common.link')}
                      </Button>
                    )}
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

export default memo(Socialisations)

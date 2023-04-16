import React, { useState, memo } from 'react'
import { useTranslation } from 'react-i18next'
import _map from 'lodash/map'
import {
  CheckCircleIcon, XCircleIcon,
} from '@heroicons/react/24/solid'

import Button from 'ui/Button'
import Google from 'ui/icons/GoogleG'
import { IUser } from 'redux/models/IUser'
import { SSO_PROVIDERS } from 'redux/constants'

const AVAILABLE_SOCIALISATIONS = [
  {
    name: 'Google',
    key: SSO_PROVIDERS.GOOGLE,
    Icon: Google,
  },
]

/**
 * @param {IUser} user - user object
 * @param {string} socialisation - key from SOCIALISATIONS
 * @returns {[boolean, boolean]} - [isConnected, isUnlinkable]
*/
const getStatusByUser = (user: IUser, socialisation: string) => {
  if (socialisation === SSO_PROVIDERS.GOOGLE) {
    const connected = user.googleId
    const unlinkable = !user.registeredWithGoogle
    return [connected, unlinkable]
  }

  return [false, false]
}

interface ISocialisations {
  user: IUser,
  linkSSO: (t: (key: string) => string, callback: (e: any) => void, provider: string) => void,
  unlinkSSO: (t: (key: string) => string, callback: (e: any) => void, provider: string) => void,
  genericError: (message: string) => void,
}

const Socialisations = ({
  user, linkSSO, unlinkSSO, genericError,
}: ISocialisations) => {
  const { t }: {
    t: (key: string) => string,
  } = useTranslation('common')
  const [isLoading, setIsLoading] = useState(false)

  const _linkSSO = (key: string) => {
    setIsLoading(true)

    linkSSO(t, () => {
      setIsLoading(false)
    }, key)
  }

  const _unlinkSSO = (key: string) => {
    setIsLoading(true)

    unlinkSSO(t, () => {
      setIsLoading(false)
    }, key)
  }

  return (
    <>
      <p className='max-w-prose text-base text-gray-900 dark:text-gray-50'>
        {t('profileSettings.socialisationsDesc')}
      </p>
      <div className='overflow-hidden bg-white dark:bg-gray-700 mt-2 shadow sm:rounded-md'>
        <ul className='divide-y divide-gray-200'>
          {
            _map(AVAILABLE_SOCIALISATIONS, ({
              name, key, Icon,
            }) => {
              const [connected, unlinkable] = getStatusByUser(user, key)

              const status = connected ? 'connected' : 'notConnected'

              return (
                <li key={key}>
                  <div className='sm:flex items-center px-1 py-4 sm:px-6'>
                    <div className='flex min-w-0 flex-1 items-center'>
                      <div className='flex-shrink-0 hidden sm:block'>
                        <Icon className='max-h-12 max-w-12 h-12 w-12 rounded-full' />
                      </div>
                      <div className='min-w-0 flex-1 px-2 sm:px-4 md:grid md:grid-cols-2 md:gap-4'>
                        <div>
                          <p className='text-md font-medium text-gray-800 dark:text-gray-50'>
                            {name}
                          </p>
                          <p className='mt-2 flex items-center text-sm text-gray-500 dark:text-gray-100'>
                            {status === 'notConnected' && <XCircleIcon className='mr-1.5 h-5 w-5 flex-shrink-0 text-red-400' aria-hidden='true' />}
                            {status === 'connected' && <CheckCircleIcon className='mr-1.5 h-5 w-5 flex-shrink-0 text-green-400' aria-hidden='true' />}
                            {t(`common.${status}`)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className='flex justify-center mt-2 sm:block sm:mt-0'>
                      {connected && !unlinkable && (
                        <Button
                          onClick={() => genericError(t('profileSettings.cantUnlinkSocialisation'))}
                          small
                          danger
                        >
                          {t('common.unlink')}
                        </Button>
                      )}

                      {connected && unlinkable && (
                        <Button
                          onClick={() => _unlinkSSO(key)}
                          loading={isLoading}
                          small
                          danger
                        >
                          {t('common.unlink')}
                        </Button>
                      )}

                      {!connected && (
                        <Button
                          onClick={() => _linkSSO(key)}
                          loading={isLoading}
                          small
                          primary
                        >
                          {t('common.link')}
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              )
            })
          }
        </ul>
      </div>
    </>
  )
}

export default memo(Socialisations)

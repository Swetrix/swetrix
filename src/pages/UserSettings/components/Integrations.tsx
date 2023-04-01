import React, { useState, memo } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import _map from 'lodash/map'
import _isString from 'lodash/isString'
import {
  CheckCircleIcon, XCircleIcon, ClockIcon,
} from '@heroicons/react/24/solid'

import Input from 'ui/Input'
import Button from 'ui/Button'
import Telegram from 'ui/icons/Telegram'
import { removeTgIntegration } from 'api'
import { IUser } from 'redux/models/IUser'

const getAvailableIntegrations = (t: (key: string) => string): {
  name: string,
  key: string,
  description: string,
  Icon: React.FC<React.SVGProps<SVGSVGElement>>,
}[] => ([
  {
    name: 'Telegram',
    key: 'telegram',
    description: t('profileSettings.integrationsList.telegram'),
    Icon: Telegram,
  },
])

const TG_BOT_URL: string = 'https://t.me/swetrixbot'
const TG_BOT_USERNAME: string = '@swetrixbot'

const Integrations = ({
  user, updateUserData, handleIntegrationSave, genericError,
}: {
  user: IUser,
  updateUserData: (data: Partial<IUser>) => void,
  handleIntegrationSave: (data: Partial<IUser>, cb: () => void) => void,
  genericError: (message: string) => void,
}) => {
  const { t }: {
    t: (key: string) => string,
  } = useTranslation('common')
  const available = getAvailableIntegrations(t)
  const [integrationConfigurating, setIntegrationConfigurating] = useState<string | null>(null)
  const [tgChatId, setTgChatId] = useState<string | null>(null)
  const [isIntegrationLoading, setIsIntegrationLoading] = useState<boolean>(false)
  const [isRemovalLoading, setIsRemovalLoading] = useState<boolean>(false)

  const setupIntegration = (key: string) => () => {
    setIntegrationConfigurating(key)
  }

  const addIntegration = (key: string) => () => {
    if (isIntegrationLoading) {
      return
    }

    if (key === 'telegram' && tgChatId) {
      setIsIntegrationLoading(true)
      handleIntegrationSave({
        telegramChatId: tgChatId,
      }, () => {
        setIsIntegrationLoading(false)
        setIntegrationConfigurating(null)
      })
    }
  }

  const getIntegrationStatus = (key: string) => {
    if (key === 'telegram') {
      return {
        connected: user.telegramChatId,
        confirmed: user.isTelegramChatIdConfirmed,
        id: user.telegramChatId,
      }
    }

    return {}
  }

  const removeIntegration = async (key: string) => {
    if (isRemovalLoading) {
      return
    }

    if (key === 'telegram') {
      setIsRemovalLoading(true)

      try {
        if (user.telegramChatId) {
          await removeTgIntegration(user.telegramChatId)
        } else {
          throw new Error('No chat ID')
        }
        updateUserData({
          isTelegramChatIdConfirmed: false,
          telegramChatId: null,
        })
      } catch (e) {
        if (_isString(e)) {
          genericError(e)
        } else {
          genericError(t('apiNotifications.integrationRemovalError'))
        }
        console.error(`[ERROR] Failed to remove TG integration: ${e}`)
      }
      setIsRemovalLoading(false)
    }
  }

  if (integrationConfigurating) {
    if (integrationConfigurating === 'telegram') {
      return (
        <>
          <Button
            className='mb-2 mt-2'
            onClick={() => setIntegrationConfigurating(null)}
            primary
            small
          >
            {t('common.goBack')}
          </Button>
          <p className='text-base max-w-prose text-gray-900 dark:text-gray-50'>
            <Trans
              // @ts-ignore
              t={t}
              i18nKey='profileSettings.integrationsList.tgHint'
              components={{
                // eslint-disable-next-line jsx-a11y/anchor-has-content
                url: <a href={TG_BOT_URL} className='hover:underline text-blue-600' target='_blank' rel='noreferrer noopener' />,
              }}
              values={{
                username: TG_BOT_USERNAME,
              }}
            />
          </p>
          <div className='flex items-center mt-4'>
            <Input
              type='text'
              label={t('profileSettings.chatID')}
              value={tgChatId || ''}
              placeholder={t('profileSettings.chatID')}
              className='sm:col-span-3'
              onChange={(e) => setTgChatId(e.target.value)}
              disabled={isIntegrationLoading}
            />
            <Button
              className='ml-2 mt-4'
              onClick={addIntegration(integrationConfigurating)}
              loading={isIntegrationLoading}
              primary
              large
            >
              {t('common.enable')}
            </Button>
          </div>
        </>
      )
    }

    return null
  }

  return (
    <>
      <p className='max-w-prose text-base text-gray-900 dark:text-gray-50'>
        {t('profileSettings.integrationsDesc')}
      </p>
      <div className='overflow-hidden bg-white dark:bg-gray-700 mt-2 shadow sm:rounded-md'>
        <ul className='divide-y divide-gray-200'>
          {
            _map(available, ({
              name, key, description, Icon,
            }) => {
              const { connected, confirmed, id } = getIntegrationStatus(key)
              const status = connected ? (confirmed ? 'connected' : 'pending') : 'notConnected'

              return (
                <li key={key}>
                  <div className='sm:flex items-center px-1 py-4 sm:px-6'>
                    <div className='flex min-w-0 flex-1 items-center'>
                      <div className='flex-shrink-0 hidden sm:block'>
                        <Icon className='max-h-12 max-w-12 h-12 w-12 rounded-full' />
                      </div>
                      <div className='min-w-0 flex-1 px-2 sm:px-4 md:grid md:grid-cols-2 md:gap-4'>
                        <div>
                          <p className='text-md font-medium text-gray-800 dark:text-gray-50'>{name}</p>
                          <p className='mt-2 flex items-center text-sm text-gray-500 dark:text-gray-100'>
                            <span>{description}</span>
                          </p>
                        </div>
                        <div>
                          {id && (
                            <p className='text-sm text-gray-900 dark:text-gray-50'>
                              {t('profileSettings.chatID')}
                              {`: ${id}`}
                            </p>
                          )}
                          <p className='mt-2 flex items-center text-sm text-gray-500 dark:text-gray-100'>
                            {status === 'notConnected' && <XCircleIcon className='mr-1.5 h-5 w-5 flex-shrink-0 text-red-400' aria-hidden='true' />}
                            {status === 'pending' && <ClockIcon className='mr-1.5 h-5 w-5 flex-shrink-0 text-yellow-400' aria-hidden='true' />}
                            {status === 'connected' && <CheckCircleIcon className='mr-1.5 h-5 w-5 flex-shrink-0 text-green-400' aria-hidden='true' />}
                            {t(`common.${status}`)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className='flex justify-center mt-2 sm:block sm:mt-0'>
                      {connected ? (
                        <Button onClick={() => removeIntegration(key)} small danger>
                          {t('profileSettings.removeIntegration')}
                        </Button>
                      ) : (
                        <Button onClick={setupIntegration(key)} small primary>
                          {t('profileSettings.addIntegration')}
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

export default memo(Integrations)

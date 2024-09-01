import React, { useState, memo } from 'react'
import type i18next from 'i18next'
import { useTranslation, Trans } from 'react-i18next'
import _map from 'lodash/map'
import _isString from 'lodash/isString'
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/solid'
import { toast } from 'sonner'

import Input from 'ui/Input'
import Button from 'ui/Button'
import Telegram from 'ui/icons/Telegram'
import Slack from 'ui/icons/Slack'
import Discord from 'ui/icons/Discord'
import { removeTgIntegration } from 'api'
import { IUser } from 'redux/models/IUser'

const getAvailableIntegrations = (
  t: typeof i18next.t,
): {
  name: string
  key: string
  description: string
  Icon: React.FC<React.SVGProps<SVGSVGElement>>
}[] => [
  {
    name: 'Telegram',
    key: 'telegram',
    description: t('profileSettings.integrationsList.telegram'),
    Icon: Telegram,
  },
  {
    name: 'Slack',
    key: 'slack',
    description: t('profileSettings.integrationsList.slack'),
    Icon: Slack,
  },
  {
    name: 'Discord',
    key: 'discord',
    description: t('profileSettings.integrationsList.discord'),
    Icon: Discord,
  },
]

const TG_BOT_URL = 'https://t.me/swetrixbot'
const TG_BOT_USERNAME = '@swetrixbot'

const SLACK_WEBHOOKS_HELP = 'https://api.slack.com/messaging/webhooks'
const DISCORD_WEBHOOKS_HELP = 'https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks'

const Integrations = ({
  user,
  updateUserData,
  handleIntegrationSave,
}: {
  user: IUser
  updateUserData: (data: Partial<IUser>) => void
  handleIntegrationSave: (data: Partial<IUser>, cb: (isSuccess: boolean) => void) => void
}) => {
  const { t } = useTranslation('common')
  const available = getAvailableIntegrations(t)
  const [integrationConfigurating, setIntegrationConfigurating] = useState<string | null>(null)
  const [integrationInput, setIntegrationInput] = useState<string | null>(null)
  const [isIntegrationLoading, setIsIntegrationLoading] = useState<boolean>(false)
  const [isRemovalLoading, setIsRemovalLoading] = useState<boolean>(false)

  const setupIntegration = (key: string) => () => {
    setIntegrationConfigurating(key)
  }

  const addIntegration = (key: string) => () => {
    if (isIntegrationLoading || !integrationInput) {
      return
    }

    setIsIntegrationLoading(true)

    if (key === 'telegram') {
      handleIntegrationSave(
        {
          telegramChatId: integrationInput,
        },
        () => {
          setIsIntegrationLoading(false)
          setIntegrationConfigurating(null)
          setIntegrationInput(null)
        },
      )
    }

    if (key === 'slack') {
      handleIntegrationSave(
        {
          slackWebhookUrl: integrationInput,
        },
        (isSuccess: boolean) => {
          if (!isSuccess) {
            toast.error(t('apiNotifications.integrationSaveError'))
          }

          setIsIntegrationLoading(false)
          setIntegrationConfigurating(null)
          setIntegrationInput(null)
        },
      )
    }

    if (key === 'discord') {
      handleIntegrationSave(
        {
          discordWebhookUrl: integrationInput,
        },
        (isSuccess: boolean) => {
          if (!isSuccess) {
            toast.error(t('apiNotifications.integrationSaveError'))
          }

          setIsIntegrationLoading(false)
          setIntegrationConfigurating(null)
          setIntegrationInput(null)
        },
      )
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

    if (key === 'discord') {
      return {
        connected: user.discordWebhookUrl,
        confirmed: user.discordWebhookUrl,
        id: null,
      }
    }

    if (key === 'slack') {
      return {
        connected: user.slackWebhookUrl,
        confirmed: user.slackWebhookUrl,
        id: null,
      }
    }

    return {}
  }

  const removeIntegration = async (key: string) => {
    if (isRemovalLoading) {
      return
    }

    setIsRemovalLoading(true)

    if (key === 'telegram') {
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
      } catch (reason) {
        if (_isString(reason)) {
          toast.error(reason)
        } else {
          toast.error(t('apiNotifications.integrationRemovalError'))
        }
        console.error(`[ERROR] Failed to remove TG integration: ${reason}`)
      }

      setIsRemovalLoading(false)
    }

    if (key === 'slack') {
      handleIntegrationSave(
        {
          slackWebhookUrl: null,
        },
        (isSuccess: boolean) => {
          if (!isSuccess) {
            toast.error(t('apiNotifications.integrationRemovalError'))
          }

          updateUserData({
            slackWebhookUrl: null,
          })
          setIsRemovalLoading(false)
        },
      )
    }

    if (key === 'discord') {
      handleIntegrationSave(
        {
          discordWebhookUrl: null,
        },
        (isSuccess: boolean) => {
          if (!isSuccess) {
            toast.error(t('apiNotifications.integrationRemovalError'))
          }

          updateUserData({
            discordWebhookUrl: null,
          })
          setIsRemovalLoading(false)
        },
      )
    }
  }

  if (integrationConfigurating) {
    if (integrationConfigurating === 'telegram') {
      return (
        <>
          <Button
            className='mb-2 mt-2'
            onClick={() => {
              setIntegrationInput(null)
              setIntegrationConfigurating(null)
            }}
            primary
            small
          >
            {t('common.goBack')}
          </Button>
          <p className='max-w-prose text-base text-gray-900 dark:text-gray-50'>
            <Trans
              t={t}
              i18nKey='profileSettings.integrationsList.tgHint'
              components={{
                // eslint-disable-next-line jsx-a11y/anchor-has-content
                url: (
                  <a
                    href={TG_BOT_URL}
                    className='text-blue-600 hover:underline'
                    target='_blank'
                    rel='noreferrer noopener'
                  />
                ),
              }}
              values={{
                username: TG_BOT_USERNAME,
              }}
            />
          </p>
          <div className='mt-4 flex items-end'>
            <Input
              label={t('profileSettings.chatID')}
              value={integrationInput || ''}
              className='sm:col-span-3'
              onChange={(e) => setIntegrationInput(e.target.value)}
              disabled={isIntegrationLoading}
            />
            <Button
              className='ml-2 py-2.5'
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

    if (integrationConfigurating === 'slack') {
      return (
        <>
          <Button
            className='mb-2 mt-2'
            onClick={() => {
              setIntegrationInput(null)
              setIntegrationConfigurating(null)
            }}
            primary
            small
          >
            {t('common.goBack')}
          </Button>
          <p className='max-w-prose text-base text-gray-900 dark:text-gray-50'>
            <Trans
              t={t}
              i18nKey='profileSettings.integrationsList.slackHint'
              components={{
                // eslint-disable-next-line jsx-a11y/anchor-has-content
                url: (
                  <a
                    href={SLACK_WEBHOOKS_HELP}
                    className='text-blue-600 hover:underline'
                    target='_blank'
                    rel='noreferrer noopener'
                  />
                ),
              }}
            />
          </p>
          <div className='mt-4 flex items-end'>
            <Input
              label={t('profileSettings.integrationsList.webhookUrl')}
              value={integrationInput || ''}
              className='sm:col-span-3'
              onChange={(e) => setIntegrationInput(e.target.value)}
              disabled={isIntegrationLoading}
            />
            <Button
              className='ml-2 py-2.5'
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

    if (integrationConfigurating === 'discord') {
      return (
        <>
          <Button
            className='mb-2 mt-2'
            onClick={() => {
              setIntegrationInput(null)
              setIntegrationConfigurating(null)
            }}
            primary
            small
          >
            {t('common.goBack')}
          </Button>
          <p className='max-w-prose text-base text-gray-900 dark:text-gray-50'>
            <Trans
              t={t}
              i18nKey='profileSettings.integrationsList.discordHint'
              components={{
                // eslint-disable-next-line jsx-a11y/anchor-has-content
                url: (
                  <a
                    href={DISCORD_WEBHOOKS_HELP}
                    className='text-blue-600 hover:underline'
                    target='_blank'
                    rel='noreferrer noopener'
                  />
                ),
              }}
            />
          </p>
          <div className='mt-4 flex items-end'>
            <Input
              label={t('profileSettings.integrationsList.webhookUrl')}
              value={integrationInput || ''}
              className='sm:col-span-3'
              onChange={(e) => setIntegrationInput(e.target.value)}
              disabled={isIntegrationLoading}
            />
            <Button
              className='ml-2 py-2.5'
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
      <p className='max-w-prose text-base text-gray-900 dark:text-gray-50'>{t('profileSettings.integrationsDesc')}</p>
      <div className='mt-2 overflow-hidden bg-white shadow dark:bg-slate-800 sm:rounded-md'>
        <ul className='divide-y divide-gray-200 dark:divide-slate-700'>
          {_map(available, ({ name, key, description, Icon }) => {
            const { connected, confirmed, id } = getIntegrationStatus(key)
            const status = connected ? (confirmed ? 'connected' : 'pending') : 'notConnected'

            return (
              <li key={key} className='items-center px-1 py-4 sm:flex sm:px-6'>
                <div className='flex min-w-0 flex-1 items-center'>
                  <div className='hidden flex-shrink-0 sm:block'>
                    <Icon className='size-12 max-h-12 max-w-12' />
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
                        {status === 'notConnected' && (
                          <XCircleIcon className='mr-1.5 h-5 w-5 flex-shrink-0 text-red-400' aria-hidden='true' />
                        )}
                        {status === 'pending' && (
                          <ClockIcon className='mr-1.5 h-5 w-5 flex-shrink-0 text-yellow-400' aria-hidden='true' />
                        )}
                        {status === 'connected' && (
                          <CheckCircleIcon className='mr-1.5 h-5 w-5 flex-shrink-0 text-green-400' aria-hidden='true' />
                        )}
                        {t(`common.${status}`)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className='mt-2 flex justify-center sm:mt-0 sm:block'>
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
              </li>
            )
          })}
        </ul>
      </div>
    </>
  )
}

export default memo(Integrations)

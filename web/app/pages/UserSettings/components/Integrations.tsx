import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/solid'
import type i18next from 'i18next'
import _isString from 'lodash/isString'
import _map from 'lodash/map'
import React, { useState, memo } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { toast } from 'sonner'

import { removeTgIntegration } from '~/api'
import { User } from '~/lib/models/User'
import { useAuth } from '~/providers/AuthProvider'
import Button from '~/ui/Button'
import Discord from '~/ui/icons/Discord'
import Slack from '~/ui/icons/Slack'
import Telegram from '~/ui/icons/Telegram'
import Input from '~/ui/Input'
import { trackCustom } from '~/utils/analytics'

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

interface IntegrationsProps {
  handleIntegrationSave: (data: Partial<User>, cb: (isSuccess: boolean) => void) => void
}

interface IntegrationStatus {
  connected?: string | null
  confirmed?: boolean | string | null
  id?: string | null
}

const Integrations = ({ handleIntegrationSave }: IntegrationsProps) => {
  const { user, mergeUser } = useAuth()

  const { t } = useTranslation('common')
  const available = getAvailableIntegrations(t)
  const [integrationConfigurating, setIntegrationConfigurating] = useState<string | null>(null)
  const [integrationInput, setIntegrationInput] = useState<string | null>(null)
  const [isIntegrationLoading, setIsIntegrationLoading] = useState(false)
  const [isRemovalLoading, setIsRemovalLoading] = useState(false)

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

    trackCustom('INTEGRATION_ADDED', {
      integration: key,
    })
  }

  const getIntegrationStatus = (key: string) => {
    if (!user) {
      return {} as IntegrationStatus
    }

    if (key === 'telegram') {
      return {
        connected: user.telegramChatId,
        confirmed: user.isTelegramChatIdConfirmed,
        id: user.telegramChatId,
      } satisfies IntegrationStatus
    }

    if (key === 'discord') {
      return {
        connected: user.discordWebhookUrl,
        confirmed: user.discordWebhookUrl,
        id: null,
      } satisfies IntegrationStatus
    }

    if (key === 'slack') {
      return {
        connected: user.slackWebhookUrl,
        confirmed: user.slackWebhookUrl,
        id: null,
      } satisfies IntegrationStatus
    }

    return {} as IntegrationStatus
  }

  const removeIntegration = async (key: string) => {
    if (isRemovalLoading || !user) {
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
        mergeUser({
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

          mergeUser({
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

          mergeUser({
            discordWebhookUrl: null,
          })
          setIsRemovalLoading(false)
        },
      )
    }

    trackCustom('INTEGRATION_REMOVED', {
      integration: key,
    })
  }

  if (integrationConfigurating) {
    if (integrationConfigurating === 'telegram') {
      return (
        <>
          <Button
            className='mt-2 mb-2'
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
            className='mt-2 mb-2'
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
            className='mt-2 mb-2'
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
                {t('common.details')}
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
            {_map(available, ({ name, key, description, Icon }) => {
              const { connected, confirmed, id } = getIntegrationStatus(key)
              const status = connected ? (confirmed ? 'connected' : 'pending') : 'notConnected'

              return (
                <tr key={key} className='hover:bg-gray-50 dark:hover:bg-slate-800/50'>
                  <td className='px-4 py-3 text-sm text-gray-900 dark:text-gray-100'>
                    <div className='flex items-center gap-3'>
                      <div className='hidden shrink-0 sm:block'>
                        <Icon className='size-9' />
                      </div>
                      <span className='font-medium'>{name}</span>
                    </div>
                  </td>
                  <td className='px-4 py-3 text-sm text-gray-700 dark:text-gray-300'>
                    <div className='space-y-1'>
                      <p className='text-sm text-gray-700 dark:text-gray-300'>{description}</p>
                      {id ? (
                        <p className='text-sm text-gray-900 dark:text-gray-100'>
                          {t('profileSettings.chatID')}
                          {`: ${id}`}
                        </p>
                      ) : null}
                    </div>
                  </td>
                  <td className='px-4 py-3 text-sm text-gray-700 dark:text-gray-300'>
                    <div className='flex items-center'>
                      {status === 'notConnected' ? (
                        <XCircleIcon className='mr-1.5 h-5 w-5 shrink-0 text-red-400' aria-hidden='true' />
                      ) : null}
                      {status === 'pending' ? (
                        <ClockIcon className='mr-1.5 h-5 w-5 shrink-0 text-yellow-400' aria-hidden='true' />
                      ) : null}
                      {status === 'connected' ? (
                        <CheckCircleIcon className='mr-1.5 h-5 w-5 shrink-0 text-green-400' aria-hidden='true' />
                      ) : null}
                      {t(`common.${status}`)}
                    </div>
                  </td>
                  <td className='px-4 py-3 text-right text-sm whitespace-nowrap'>
                    <div className='flex items-center justify-end gap-2'>
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

export default memo(Integrations)

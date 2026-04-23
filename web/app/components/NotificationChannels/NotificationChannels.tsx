import {
  CheckCircleIcon,
  ClockIcon,
  PaperPlaneTiltIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
  XCircleIcon,
} from '@phosphor-icons/react'
import _map from 'lodash/map'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFetcher } from 'react-router'
import { toast } from 'sonner'

import type {
  NotificationChannel,
  NotificationChannelType,
} from '~/lib/models/NotificationChannel'
import type { NotificationChannelActionData } from '~/routes/notification-channel'
import Button from '~/ui/Button'
import Discord from '~/ui/icons/Discord'
import Slack from '~/ui/icons/Slack'
import Telegram from '~/ui/icons/Telegram'
import Input from '~/ui/Input'
import Loader from '~/ui/Loader'
import Modal from '~/ui/Modal'
import Select from '~/ui/Select'
import { Text } from '~/ui/Text'

import EnableWebPushButton from './EnableWebPushButton'

type ChannelScope = 'user' | 'organisation' | 'project'

interface NotificationChannelsProps {
  scope: ChannelScope
  organisationId?: string
  projectId?: string
  /** Title above the section. */
  title?: string
  /** Helper text under the title. */
  description?: string
  /** Limit which channel types can be created in this scope. */
  allowedTypes?: NotificationChannelType[]
}

const ALL_TYPES: NotificationChannelType[] = [
  'email',
  'telegram',
  'discord',
  'slack',
  'webhook',
  'webpush',
]

const TG_BOT_URL = 'https://t.me/swetrixbot'

const ChannelTypeIcon = ({ type }: { type: NotificationChannelType }) => {
  if (type === 'telegram') return <Telegram className='size-5 shrink-0' />
  if (type === 'discord') return <Discord className='size-5 shrink-0' />
  if (type === 'slack') return <Slack className='size-5 shrink-0' />
  return null
}

interface ChannelFormState {
  name: string
  type: NotificationChannelType
  email: string
  chatId: string
  url: string
  secret: string
}

const blankForm = (
  type: NotificationChannelType = 'email',
): ChannelFormState => ({
  name: '',
  type,
  email: '',
  chatId: '',
  url: '',
  secret: '',
})

const buildConfig = (form: ChannelFormState) => {
  switch (form.type) {
    case 'email':
      return { address: form.email.trim() }
    case 'telegram':
      return { chatId: form.chatId.trim() }
    case 'slack':
    case 'discord':
      return { url: form.url.trim() }
    case 'webhook':
      return {
        url: form.url.trim(),
        secret: form.secret.trim() || null,
      }
    default:
      return {}
  }
}

const ChannelStatusPill = ({ channel }: { channel: NotificationChannel }) => {
  const { t } = useTranslation('common')
  const config = (channel.config || {}) as { unsubscribed?: boolean }
  const isUnsubscribed =
    channel.type === 'email' && config.unsubscribed === true

  if (isUnsubscribed) {
    return (
      <span className='inline-flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400'>
        <XCircleIcon className='size-4' aria-hidden />
        {t('notificationChannels.statusUnsubscribed')}
      </span>
    )
  }
  if (channel.isVerified) {
    return (
      <span className='inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400'>
        <CheckCircleIcon className='size-4' aria-hidden />
        {t('notificationChannels.statusVerified')}
      </span>
    )
  }
  return (
    <span className='inline-flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400'>
      <ClockIcon className='size-4' aria-hidden />
      {t('notificationChannels.statusPending')}
    </span>
  )
}

const summariseConfig = (channel: NotificationChannel): string => {
  const cfg = channel.config as Record<string, any>
  switch (channel.type) {
    case 'email':
      return cfg?.address || ''
    case 'telegram':
      return cfg?.chatId ? `chat ${cfg.chatId}` : ''
    case 'slack':
    case 'discord':
    case 'webhook':
      return cfg?.url || ''
    case 'webpush':
      return cfg?.userAgent || cfg?.endpoint || ''
    default:
      return ''
  }
}

const NotificationChannels = ({
  scope,
  organisationId,
  projectId,
  title,
  description,
  allowedTypes = ALL_TYPES,
}: NotificationChannelsProps) => {
  const { t } = useTranslation('common')

  const listFetcher = useFetcher<NotificationChannelActionData>()
  const mutateFetcher = useFetcher<NotificationChannelActionData>()
  const lastMutateData = useRef<NotificationChannelActionData | null>(null)

  const [channels, setChannels] = useState<NotificationChannel[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [editing, setEditing] = useState<NotificationChannel | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<ChannelFormState>(() =>
    blankForm(allowedTypes[0]),
  )
  const [pendingDelete, setPendingDelete] =
    useState<NotificationChannel | null>(null)

  const triggerList = useCallback(() => {
    const formData = new FormData()
    formData.set('intent', 'list-channels')
    formData.set('scope', scope)
    if (projectId) formData.set('projectId', projectId)
    if (organisationId) formData.set('organisationId', organisationId)
    listFetcher.submit(formData, {
      method: 'POST',
      action: '/notification-channel',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, organisationId, projectId])

  useEffect(() => {
    triggerList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, organisationId, projectId])

  useEffect(() => {
    if (listFetcher.state !== 'idle') return
    if (!listFetcher.data) return
    if (listFetcher.data.error) {
      toast.error(listFetcher.data.error)
      setIsLoaded(true)
      return
    }
    let next = listFetcher.data.channels || []
    // The /notification-channel/list endpoint returns user/own/shared channels.
    // For "user" scope, we filter to only user-owned to avoid mixing scopes.
    if (scope === 'user') {
      next = next.filter((c) => c.scope === 'user')
    }
    setChannels(next)
    setIsLoaded(true)
  }, [listFetcher.state, listFetcher.data, scope])

  useEffect(() => {
    if (mutateFetcher.state !== 'idle' || !mutateFetcher.data) return
    if (lastMutateData.current === mutateFetcher.data) return
    lastMutateData.current = mutateFetcher.data
    const { intent, success, error } = mutateFetcher.data

    if (error) {
      toast.error(error)
      return
    }
    if (!success) return

    if (intent === 'create-channel') {
      toast.success(t('notificationChannels.created'))
      setCreating(false)
      setForm(blankForm(allowedTypes[0]))
      triggerList()
    } else if (intent === 'update-channel') {
      toast.success(t('notificationChannels.updated'))
      setEditing(null)
      triggerList()
    } else if (intent === 'delete-channel') {
      toast.success(t('notificationChannels.deleted'))
      setPendingDelete(null)
      triggerList()
    } else if (intent === 'test-channel') {
      toast.success(t('notificationChannels.testSent'))
    } else if (intent === 'verify-channel') {
      toast.success(t('notificationChannels.verifyKickedOff'))
      triggerList()
    }
  }, [mutateFetcher.state, mutateFetcher.data, t, allowedTypes, triggerList])

  const submitMutate = (formData: FormData) =>
    mutateFetcher.submit(formData, {
      method: 'POST',
      action: '/notification-channel',
    })

  const onCreate = () => {
    if (!form.name.trim()) {
      toast.error(t('notificationChannels.nameRequired'))
      return
    }
    const formData = new FormData()
    formData.set('intent', 'create-channel')
    formData.set('name', form.name.trim())
    formData.set('type', form.type)
    formData.set('config', JSON.stringify(buildConfig(form)))
    if (scope === 'user') formData.set('userScoped', 'true')
    if (scope === 'organisation' && organisationId)
      formData.set('organisationId', organisationId)
    if (scope === 'project' && projectId) formData.set('projectId', projectId)
    submitMutate(formData)
  }

  const onUpdate = () => {
    if (!editing) return
    const formData = new FormData()
    formData.set('intent', 'update-channel')
    formData.set('channelId', editing.id)
    formData.set('name', form.name.trim())
    formData.set('config', JSON.stringify(buildConfig(form)))
    submitMutate(formData)
  }

  const onDelete = () => {
    if (!pendingDelete) return
    const formData = new FormData()
    formData.set('intent', 'delete-channel')
    formData.set('channelId', pendingDelete.id)
    submitMutate(formData)
  }

  const onTest = (channel: NotificationChannel) => {
    const formData = new FormData()
    formData.set('intent', 'test-channel')
    formData.set('channelId', channel.id)
    submitMutate(formData)
  }

  const onVerify = (channel: NotificationChannel) => {
    const formData = new FormData()
    formData.set('intent', 'verify-channel')
    formData.set('channelId', channel.id)
    submitMutate(formData)
  }

  const onEdit = (channel: NotificationChannel) => {
    const cfg = (channel.config || {}) as Record<string, any>
    setEditing(channel)
    setForm({
      name: channel.name,
      type: channel.type,
      email: cfg.address || '',
      chatId: cfg.chatId || '',
      url: cfg.url || '',
      secret: '',
    })
  }

  const typeOptions = useMemo(
    () =>
      allowedTypes.map((type) => ({
        type,
        label: t(`notificationChannels.types.${type}` as any) as string,
      })),
    [allowedTypes, t],
  )

  const showWebpushButton = allowedTypes.includes('webpush') && scope === 'user'

  const headingTitle = title || t('notificationChannels.heading')
  const headingDescription =
    description || t('notificationChannels.description')

  const isMutating = mutateFetcher.state !== 'idle'
  const isFormOpen = creating || !!editing

  return (
    <section>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <Text as='h3' size='lg' weight='bold'>
            {headingTitle}
          </Text>
          <Text
            as='p'
            size='sm'
            colour='secondary'
            className='mt-1 max-w-prose'
          >
            {headingDescription}
          </Text>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          {showWebpushButton ? (
            <EnableWebPushButton onSubscribed={triggerList} />
          ) : null}
          <Button
            small
            primary
            onClick={() => {
              setForm(blankForm(allowedTypes[0]))
              setCreating(true)
            }}
          >
            <span className='inline-flex items-center gap-1'>
              <PlusIcon className='size-4' aria-hidden />
              {t('notificationChannels.add')}
            </span>
          </Button>
        </div>
      </div>

      {!isLoaded ? (
        <div className='py-8'>
          <Loader />
        </div>
      ) : null}

      {isLoaded && channels.length === 0 && !isFormOpen ? (
        <Text as='p' size='sm' colour='secondary' className='mt-4'>
          {t('notificationChannels.empty')}
        </Text>
      ) : null}

      {isLoaded && channels.length > 0 ? (
        <div className='mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-950'>
          <table className='min-w-full divide-y divide-gray-200 dark:divide-slate-800'>
            <thead className='bg-gray-50 dark:bg-slate-900'>
              <tr>
                <th className='px-4 py-2 text-left text-xs font-bold tracking-wider text-gray-900 uppercase dark:text-white'>
                  {t('common.name')}
                </th>
                <th className='px-4 py-2 text-left text-xs font-bold tracking-wider text-gray-900 uppercase dark:text-white'>
                  {t('common.type')}
                </th>
                <th className='px-4 py-2 text-left text-xs font-bold tracking-wider text-gray-900 uppercase dark:text-white'>
                  {t('common.details')}
                </th>
                <th className='px-4 py-2 text-left text-xs font-bold tracking-wider text-gray-900 uppercase dark:text-white'>
                  {t('common.status')}
                </th>
                <th className='px-4 py-2' />
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-200 bg-white dark:divide-slate-800 dark:bg-slate-950'>
              {_map(channels, (channel) => (
                <tr
                  key={channel.id}
                  className='hover:bg-gray-50 dark:hover:bg-slate-900/50'
                >
                  <td className='px-4 py-3 align-top text-sm'>
                    <div className='flex items-center gap-2'>
                      <ChannelTypeIcon type={channel.type} />
                      <span className='font-medium text-gray-900 dark:text-gray-100'>
                        {channel.name}
                      </span>
                    </div>
                  </td>
                  <td className='px-4 py-3 align-top text-sm text-gray-700 capitalize dark:text-gray-300'>
                    {t(`notificationChannels.types.${channel.type}` as any) ||
                      channel.type}
                  </td>
                  <td className='px-4 py-3 align-top text-sm text-gray-600 dark:text-gray-400'>
                    <span className='font-mono break-all'>
                      {summariseConfig(channel)}
                    </span>
                  </td>
                  <td className='px-4 py-3 align-top text-sm'>
                    <ChannelStatusPill channel={channel} />
                  </td>
                  <td className='px-4 py-3 text-right align-top text-sm'>
                    <div className='flex flex-wrap items-center justify-end gap-2'>
                      <Button
                        small
                        secondary
                        onClick={() => onTest(channel)}
                        disabled={isMutating}
                        title={t('notificationChannels.test')}
                      >
                        <PaperPlaneTiltIcon className='size-4' aria-hidden />
                      </Button>
                      {!channel.isVerified &&
                      (channel.type === 'email' ||
                        channel.type === 'webhook') ? (
                        <Button
                          small
                          secondary
                          onClick={() => onVerify(channel)}
                          disabled={isMutating}
                        >
                          {t('notificationChannels.verify')}
                        </Button>
                      ) : null}
                      <Button
                        small
                        secondary
                        onClick={() => onEdit(channel)}
                        disabled={isMutating}
                        title={t('common.edit')}
                      >
                        <PencilSimpleIcon className='size-4' aria-hidden />
                      </Button>
                      <Button
                        small
                        danger
                        onClick={() => setPendingDelete(channel)}
                        disabled={isMutating}
                        title={t('common.delete')}
                      >
                        <TrashIcon className='size-4' aria-hidden />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {isFormOpen ? (
        <div className='mt-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950'>
          <Text as='h4' size='base' weight='bold'>
            {editing
              ? t('notificationChannels.editTitle')
              : t('notificationChannels.createTitle')}
          </Text>
          <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
            <Input
              label={t('common.name')}
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder='My alerts channel'
            />
            <div className={editing ? 'pointer-events-none opacity-50' : ''}>
              <Select
                label={t('notificationChannels.typeLabel')}
                items={typeOptions.map((o) => o.label)}
                title={
                  typeOptions.find((o) => o.type === form.type)?.label ||
                  form.type
                }
                onSelect={(label) => {
                  const found = typeOptions.find((o) => o.label === label)
                  if (found) setForm((prev) => ({ ...prev, type: found.type }))
                }}
                selectedItem={
                  typeOptions.find((o) => o.type === form.type)?.label
                }
              />
            </div>
          </div>

          <div className='mt-3 grid grid-cols-1 gap-3'>
            {form.type === 'email' ? (
              <Input
                type='email'
                label={t('notificationChannels.email.address')}
                value={form.email}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, email: e.target.value }))
                }
                hint={t('notificationChannels.email.hint')}
                placeholder='alerts@example.com'
              />
            ) : null}
            {form.type === 'telegram' ? (
              <>
                <Input
                  label={t('profileSettings.chatID')}
                  value={form.chatId}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, chatId: e.target.value }))
                  }
                  hint={t('notificationChannels.telegram.hint', {
                    bot: TG_BOT_URL,
                  })}
                />
              </>
            ) : null}
            {form.type === 'slack' ||
            form.type === 'discord' ||
            form.type === 'webhook' ? (
              <>
                <Input
                  label={t('notificationChannels.webhookUrl')}
                  value={form.url}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, url: e.target.value }))
                  }
                  placeholder='https://...'
                />
                {form.type === 'webhook' ? (
                  <Input
                    label={t('notificationChannels.webhook.secret')}
                    value={form.secret}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, secret: e.target.value }))
                    }
                    hint={t('notificationChannels.webhook.secretHint')}
                  />
                ) : null}
              </>
            ) : null}
            {form.type === 'webpush' ? (
              <Text as='p' size='sm' colour='secondary'>
                {t('notificationChannels.webpush.useButton')}
              </Text>
            ) : null}
          </div>

          <div className='mt-4 flex items-center justify-end gap-2'>
            <Button
              secondary
              regular
              onClick={() => {
                setCreating(false)
                setEditing(null)
              }}
              disabled={isMutating}
            >
              {t('common.cancel')}
            </Button>
            {form.type !== 'webpush' ? (
              <Button
                primary
                regular
                onClick={editing ? onUpdate : onCreate}
                loading={isMutating}
              >
                {editing ? t('common.save') : t('common.create')}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <Modal
        isOpened={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onSubmit={onDelete}
        title={t('notificationChannels.deleteTitle')}
        message={t('notificationChannels.deleteHint', {
          name: pendingDelete?.name || '',
        })}
        submitText={t('common.delete')}
        closeText={t('common.close')}
        type='error'
        submitType='danger'
      />
    </section>
  )
}

export default memo(NotificationChannels)

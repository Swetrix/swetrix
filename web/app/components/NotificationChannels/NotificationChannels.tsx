import {
  ArrowSquareOutIcon,
  BellSimpleRingingIcon,
  PaperPlaneTiltIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
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
import { Badge } from '~/ui/Badge'
import Button from '~/ui/Button'
import Input from '~/ui/Input'
import Loader from '~/ui/Loader'
import Modal from '~/ui/Modal'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'

import EnableWebPushButton from './EnableWebPushButton'
import { ChannelTypeIcon, summariseConfig } from './utils'

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
        ...(form.secret.trim() ? { secret: form.secret.trim() } : {}),
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
      <Badge
        colour='red'
        label={t('notificationChannels.statusUnsubscribed')}
      />
    )
  }
  if (channel.isVerified) {
    return (
      <Badge colour='green' label={t('notificationChannels.statusVerified')} />
    )
  }
  return (
    <Badge colour='yellow' label={t('notificationChannels.statusPending')} />
  )
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
    const name = form.name.trim()
    if (!name) {
      toast.error(t('notificationChannels.nameRequired'))
      return
    }
    const formData = new FormData()
    formData.set('intent', 'update-channel')
    formData.set('channelId', editing.id)
    formData.set('name', name)
    if (editing.type !== 'webpush') {
      formData.set('config', JSON.stringify(buildConfig(form)))
    }
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
  const canSubmitForm = !!editing || form.type !== 'webpush'

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
        <div className='mt-6 rounded-lg border border-dashed border-gray-300 bg-gray-50/40 p-8 text-center dark:border-slate-700 dark:bg-slate-900/30'>
          <div className='mx-auto flex size-12 items-center justify-center rounded-lg bg-white ring-1 ring-gray-200 ring-inset dark:bg-slate-950 dark:ring-slate-700'>
            <BellSimpleRingingIcon
              className='size-6 text-slate-500 dark:text-slate-400'
              weight='duotone'
            />
          </div>
          <Text as='p' size='base' weight='semibold' className='mt-4'>
            {t('notificationChannels.emptyTitle')}
          </Text>
          <Text
            as='p'
            size='sm'
            colour='secondary'
            className='mx-auto mt-1 max-w-md'
          >
            {t('notificationChannels.emptyDescription')}
          </Text>
          <div className='mt-5 flex justify-center'>
            <Button
              primary
              regular
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
      ) : null}

      {isLoaded && channels.length > 0 ? (
        <ul className='mt-4 space-y-2'>
          {_map(channels, (channel) => {
            const summary = summariseConfig(channel)
            const canVerify =
              !channel.isVerified &&
              (channel.type === 'email' || channel.type === 'webhook')

            return (
              <li
                key={channel.id}
                className='group flex flex-col gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:border-gray-300 sm:flex-row sm:items-center sm:gap-4 sm:p-4 dark:border-slate-800 dark:hover:border-slate-700'
              >
                <div className='flex size-10 shrink-0 items-center justify-center rounded-md bg-gray-100 dark:bg-slate-800/80'>
                  <ChannelTypeIcon type={channel.type} />
                </div>
                <div className='min-w-0 flex-1'>
                  <div className='flex items-center gap-2'>
                    <Text
                      as='span'
                      weight='semibold'
                      className='truncate text-gray-900 dark:text-gray-100'
                    >
                      {channel.name}
                    </Text>
                    <span className='shrink-0 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-gray-600 uppercase dark:bg-slate-800 dark:text-gray-300'>
                      {t(`notificationChannels.types.${channel.type}` as any) ||
                        channel.type}
                    </span>
                  </div>
                  <div className='mt-1 flex flex-wrap items-center gap-x-2 gap-y-1'>
                    {summary ? (
                      <span className='truncate font-mono text-xs text-gray-500 dark:text-gray-400'>
                        {summary}
                      </span>
                    ) : null}
                    <ChannelStatusPill channel={channel} />
                  </div>
                </div>
                <div className='flex shrink-0 flex-wrap items-center gap-1.5'>
                  {canVerify ? (
                    <Button
                      small
                      secondary
                      onClick={() => onVerify(channel)}
                      disabled={isMutating}
                    >
                      {t('notificationChannels.verify')}
                    </Button>
                  ) : null}
                  <Tooltip
                    text={t('notificationChannels.test')}
                    ariaLabel={t('notificationChannels.test')}
                    asChild
                    tooltipNode={
                      <button
                        type='button'
                        onClick={() => onTest(channel)}
                        disabled={isMutating}
                        className='inline-flex size-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-gray-100'
                      >
                        <PaperPlaneTiltIcon className='size-4' aria-hidden />
                      </button>
                    }
                  />
                  <Tooltip
                    text={t('common.edit')}
                    ariaLabel={t('common.edit')}
                    asChild
                    tooltipNode={
                      <button
                        type='button'
                        onClick={() => onEdit(channel)}
                        disabled={isMutating}
                        className='inline-flex size-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-gray-100'
                      >
                        <PencilSimpleIcon className='size-4' aria-hidden />
                      </button>
                    }
                  />
                  <Tooltip
                    text={t('common.delete')}
                    ariaLabel={t('common.delete')}
                    asChild
                    tooltipNode={
                      <button
                        type='button'
                        onClick={() => setPendingDelete(channel)}
                        disabled={isMutating}
                        className='inline-flex size-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-red-500/10 dark:hover:text-red-400'
                      >
                        <TrashIcon className='size-4' aria-hidden />
                      </button>
                    }
                  />
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}

      <Modal
        isOpened={isFormOpen}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
        size='medium'
        title={
          editing
            ? t('notificationChannels.editTitle')
            : t('notificationChannels.createTitle')
        }
        message={
          <div className='mt-1'>
            {!editing ? (
              <div>
                <Text
                  as='p'
                  size='xs'
                  weight='semibold'
                  colour='secondary'
                  className='tracking-wider uppercase'
                >
                  {t('notificationChannels.typeLabel')}
                </Text>
                <div className='mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3'>
                  {typeOptions.map((opt) => {
                    const isActive = form.type === opt.type
                    return (
                      <button
                        key={opt.type}
                        type='button'
                        onClick={() =>
                          setForm((prev) => ({ ...prev, type: opt.type }))
                        }
                        aria-pressed={isActive}
                        className={`flex flex-col items-center gap-2 rounded-md px-2 py-3 text-center ring-1 transition-colors ring-inset ${
                          isActive
                            ? 'bg-slate-900/3 ring-slate-900 dark:bg-slate-100/5 dark:ring-slate-100'
                            : 'ring-gray-300 hover:bg-gray-50 dark:ring-slate-700/80 dark:hover:bg-slate-900/40'
                        }`}
                      >
                        <ChannelTypeIcon type={opt.type} className='size-6' />
                        <span className='text-xs font-medium text-gray-900 dark:text-gray-100'>
                          {opt.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}

            <div className='mt-4'>
              <Input
                label={t('common.name')}
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder='My alerts channel'
              />
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
                <div className='space-y-2'>
                  <Input
                    label={t('notificationChannels.telegram.chatId')}
                    value={form.chatId}
                    inputMode='numeric'
                    placeholder='123456789'
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, chatId: e.target.value }))
                    }
                    hint={t('notificationChannels.telegram.hint', {
                      bot: TG_BOT_URL,
                    })}
                  />
                  <a
                    href={TG_BOT_URL}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400'
                  >
                    <ArrowSquareOutIcon className='size-3.5' aria-hidden />
                    {t('notificationChannels.telegram.openBot')}
                  </a>
                </div>
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
                    placeholder={
                      form.type === 'slack'
                        ? 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX'
                        : form.type === 'discord'
                          ? 'https://discord.com/api/webhooks/000000000000000000/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
                          : 'https://example.com/webhook'
                    }
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
          </div>
        }
        closeText={t('common.cancel')}
        submitText={
          canSubmitForm
            ? editing
              ? t('common.save')
              : t('common.create')
            : undefined
        }
        onSubmit={canSubmitForm ? (editing ? onUpdate : onCreate) : undefined}
        isLoading={isMutating}
        submitDisabled={isMutating}
      />

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

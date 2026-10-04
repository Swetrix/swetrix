import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CopyIcon,
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
  PlusIcon,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import type { ApiKey, ApiKeyInput, ApiKeyList } from '~/lib/models/ApiKey'
import ProjectAccessSelector from '~/components/ProjectAccessSelector'
import { DOCS_URL } from '~/lib/constants'
import Button from '~/ui/Button'
import Input from '~/ui/Input'
import Modal from '~/ui/Modal'
import { Link } from '~/ui/Link'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'

const requestKeys = async <T,>(
  operation?: string,
  id?: string,
  input?: ApiKeyInput,
  projectId?: string,
): Promise<T> => {
  const response = await fetch(
    `/api/api-keys${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`,
    {
      method: operation ? 'POST' : 'GET',
      headers: operation ? { 'Content-Type': 'application/json' } : undefined,
      body: operation ? JSON.stringify({ operation, id, input }) : undefined,
      cache: 'no-store',
    },
  )
  const result = await response.json()
  if (!response.ok || result?.error)
    throw new Error(
      Array.isArray(result?.error)
        ? result.error.join(', ')
        : result?.error || 'Request failed',
    )
  return result
}

const emptyInput = (): ApiKeyInput => ({
  name: '',
  scopes: [],
  allProjects: false,
  projectIds: [],
})

export default function ApiKeys({ projectId }: { projectId?: string }) {
  const { t, i18n } = useTranslation('common')
  const [data, setData] = useState<ApiKeyList | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [editor, setEditor] = useState<ApiKey | 'new' | null>(null)
  const [input, setInput] = useState<ApiKeyInput>(emptyInput)
  const [secrets, setSecrets] = useState<Record<string, string>>({})
  const [confirmation, setConfirmation] = useState<{
    operation: 'rotate' | 'delete'
    key: ApiKey
  } | null>(null)
  const [newSecret, setNewSecret] = useState<{
    name: string
    secret: string
  } | null>(null)
  const mounted = useRef(true)

  const load = useCallback(async () => {
    try {
      const result = await requestKeys<ApiKeyList>(
        undefined,
        undefined,
        undefined,
        projectId,
      )
      if (mounted.current) {
        setData(result)
        setError('')
      }
    } catch (reason) {
      if (mounted.current) setError((reason as Error).message)
    }
  }, [projectId])

  useEffect(() => {
    mounted.current = true
    void load()
    const hide = () => {
      if (document.hidden) {
        setSecrets({})
        setNewSecret(null)
      }
    }
    document.addEventListener('visibilitychange', hide)
    return () => {
      mounted.current = false
      document.removeEventListener('visibilitychange', hide)
    }
  }, [load])

  useEffect(() => {
    if (!Object.keys(secrets).length) return
    const timer = setTimeout(() => setSecrets({}), 60_000)
    return () => clearTimeout(timer)
  }, [secrets])

  const startEdit = (key: ApiKey | 'new') => {
    setEditor(key)
    setInput(
      key === 'new'
        ? emptyInput()
        : {
            name: key.name,
            scopes: key.scopes,
            allProjects: key.allProjects,
            projectIds: key.projectIds,
          },
    )
    setError('')
  }

  const closeEditor = () => {
    if (busy) return
    setEditor(null)
    setError('')
  }

  const canSave =
    Boolean(input.name.trim()) &&
    input.scopes.length > 0 &&
    (input.allProjects || input.projectIds.length > 0)

  const mutate = async (operation: string, key?: ApiKey) => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const result = await requestKeys<{ secret?: string; key?: ApiKey }>(
        operation,
        key?.id,
        ['create', 'update'].includes(operation) ? input : undefined,
      )
      setSecrets({})
      setConfirmation(null)
      setEditor(null)
      if (result?.secret)
        setNewSecret({
          name: result.key?.name || input.name,
          secret: result.secret,
        })
      toast.success(t(`apiKeys.success.${operation}`))
      await load()
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const reveal = async (key: ApiKey) => {
    if (secrets[key.id]) {
      setSecrets((current) => {
        const next = { ...current }
        delete next[key.id]
        return next
      })
      return
    }
    setBusy(true)
    try {
      const { secret } = await requestKeys<{ secret: string }>('reveal', key.id)
      setSecrets((current) => ({ ...current, [key.id]: secret }))
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const copy = async (secret: string) => {
    try {
      await navigator.clipboard.writeText(secret)
      toast.success(t('apiKeys.copied'))
    } catch {
      toast.error(t('apiKeys.copyFailed'))
    }
  }

  const permissionLabel = (scopes: string[], resource: string) =>
    scopes.includes(`${resource}:write`)
      ? t('apiKeys.readWrite')
      : scopes.includes(`${resource}:read`)
        ? t('apiKeys.readOnly')
        : t('apiKeys.none')
  const formatDate = (date: string) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(
      new Date(date),
    )

  return (
    <section
      className='text-sm text-gray-900 dark:text-gray-50'
      aria-label={t('apiKeys.title')}
    >
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div className='max-w-xl'>
          <div className='flex items-center gap-1.5'>
            <Text as='h3' size='lg' weight='bold'>
              {t('apiKeys.title')}
            </Text>
            <Tooltip
              ariaLabel={`${t('common.learnMore')}: ${t('apiKeys.title')}`}
              contentClassName='max-w-[calc(100vw-2rem)] sm:max-w-80'
              text={
                <span className='block space-y-2 text-pretty'>
                  <span className='block'>{t('apiKeys.tooltip')}</span>
                  <a
                    href={`${DOCS_URL}/settings/api-keys`}
                    className='font-semibold underline decoration-dashed hover:decoration-solid'
                    target='_blank'
                    rel='noreferrer noopener'
                  >
                    {t('common.learnMore')}
                  </a>
                </span>
              }
            />
          </div>
          <Text as='p' size='sm' colour='secondary' className='mt-1'>
            {t(
              projectId ? 'apiKeys.projectDescription' : 'apiKeys.description',
            )}
          </Text>
        </div>
        {!projectId ? (
          <Button onClick={() => startEdit('new')} disabled={!data || busy}>
            <PlusIcon className='mr-1.5 size-4' />
            {t('apiKeys.create')}
          </Button>
        ) : null}
        {projectId ? (
          <Link to='/user-settings?tab=account#api-keys'>
            {t('apiKeys.manage')}
          </Link>
        ) : null}
      </div>

      {error && !editor && !confirmation ? (
        <div
          role='alert'
          className='mt-4 flex items-center justify-between gap-3 text-red-600 dark:text-red-400'
        >
          <span>{error}</span>
          {!data ? (
            <Button variant='secondary' onClick={() => void load()}>
              {t('apiKeys.retry')}
            </Button>
          ) : null}
        </div>
      ) : null}
      {!data && !error ? (
        <output className='mt-6 block animate-pulse space-y-4'>
          <span className='sr-only'>{t('apiKeys.loading')}</span>
          <div className='h-14 rounded bg-gray-100 dark:bg-slate-800' />
          <div className='h-14 rounded bg-gray-100 dark:bg-slate-800' />
        </output>
      ) : null}

      {editor && data ? (
        <Modal
          isOpened
          onClose={closeEditor}
          title={t(editor === 'new' ? 'apiKeys.create' : 'apiKeys.edit')}
          size='medium'
          closeText={t('apiKeys.cancel')}
          customButtons={
            <Button
              type='submit'
              form='api-key-editor'
              size='lg'
              loading={busy}
              disabled={!canSave}
              className='w-full justify-center sm:w-auto'
            >
              {t(editor === 'new' ? 'apiKeys.create' : 'apiKeys.save')}
            </Button>
          }
          message={
            <form
              id='api-key-editor'
              className='max-h-[65dvh] overflow-y-auto pr-1 text-left text-gray-900 dark:text-gray-50'
              onSubmit={(event) => {
                event.preventDefault()
                event.stopPropagation()
                if (!canSave) return
                void mutate(
                  editor === 'new' ? 'create' : 'update',
                  editor === 'new' ? undefined : editor,
                )
              }}
            >
              {error ? (
                <Text
                  as='p'
                  size='sm'
                  colour='error'
                  role='alert'
                  className='mb-4'
                >
                  {error}
                </Text>
              ) : null}
              <fieldset disabled={busy} className='space-y-6'>
                <Input
                  label={t('apiKeys.name')}
                  value={input.name}
                  maxLength={80}
                  required
                  placeholder={t('apiKeys.namePlaceholder')}
                  onChange={(event) =>
                    setInput((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
                <ProjectAccessSelector
                  projects={data.projects}
                  value={input}
                  disabled={busy}
                  onChange={(access) =>
                    setInput((current) => ({
                      ...current,
                      ...access,
                      scopes: access.allProjects
                        ? current.scopes
                        : current.scopes.filter(
                            (scope) => !scope.startsWith('organisations:'),
                          ),
                    }))
                  }
                />
                <fieldset>
                  <legend className='font-medium'>
                    {t('apiKeys.permissions')}
                  </legend>
                  <Text as='p' size='sm' colour='secondary' className='mt-1'>
                    {t('apiKeys.permissionsHint')}
                  </Text>
                  {editor !== 'new' && editor.unrestricted ? (
                    <p className='mt-3 text-amber-700 dark:text-amber-400'>
                      {t('apiKeys.restrictHint')}
                    </p>
                  ) : null}
                  <div className='mt-3 divide-y divide-gray-200 border-y border-gray-200 dark:divide-slate-800 dark:border-slate-800'>
                    {Object.entries(data.scopes).map(([scope, actions]) => (
                      <fieldset
                        key={scope}
                        className='grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center'
                      >
                        <legend className='sr-only'>
                          {t(`apiKeys.resources.${scope}.name`)}
                        </legend>
                        <div>
                          <Text as='p' size='sm' weight='medium'>
                            {t(`apiKeys.resources.${scope}.name`)}
                          </Text>
                          <Text
                            as='p'
                            size='sm'
                            colour='secondary'
                            className='mt-0.5'
                          >
                            {t(`apiKeys.resources.${scope}.description`)}
                          </Text>
                        </div>
                        <div className='flex items-center gap-1'>
                          {['none', 'read', 'write'].map((access) => {
                            const selected = input.scopes.includes(
                              `${scope}:write`,
                            )
                              ? 'write'
                              : input.scopes.includes(`${scope}:read`)
                                ? 'read'
                                : 'none'
                            const disabled =
                              access !== 'none' &&
                              (!actions.includes(access) ||
                                (scope === 'organisations' &&
                                  !input.allProjects))
                            return (
                              <label
                                key={access}
                                title={
                                  disabled
                                    ? t(
                                        scope === 'organisations'
                                          ? 'apiKeys.organisationsHint'
                                          : 'apiKeys.readOnlyHint',
                                      )
                                    : undefined
                                }
                                className={`relative rounded-md px-2.5 py-2 text-xs ring-inset has-focus-visible:ring-2 has-focus-visible:ring-slate-500 ${disabled ? 'cursor-not-allowed text-gray-300 dark:text-slate-600' : 'cursor-pointer'} ${selected === access ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : disabled ? '' : 'hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                              >
                                <input
                                  className='sr-only'
                                  type='radio'
                                  name={`scope-${scope}`}
                                  disabled={disabled}
                                  checked={selected === access}
                                  onChange={() =>
                                    setInput((current) => ({
                                      ...current,
                                      scopes: [
                                        ...current.scopes.filter(
                                          (value) =>
                                            !value.startsWith(`${scope}:`),
                                        ),
                                        ...(access === 'none'
                                          ? []
                                          : access === 'read'
                                            ? [`${scope}:read`]
                                            : [
                                                `${scope}:read`,
                                                `${scope}:write`,
                                              ]),
                                      ],
                                    }))
                                  }
                                />
                                {t(
                                  access === 'none'
                                    ? 'apiKeys.none'
                                    : access === 'read'
                                      ? 'apiKeys.readOnly'
                                      : 'apiKeys.readWrite',
                                )}
                              </label>
                            )
                          })}
                        </div>
                      </fieldset>
                    ))}
                  </div>
                </fieldset>
              </fieldset>
            </form>
          }
        />
      ) : null}

      {data && !data.keys.length && !editor ? (
        <div className='mt-6'>
          <KeyIcon className='mb-3 size-6 text-gray-700 dark:text-gray-200' />
          <Text as='p' size='sm' weight='medium'>
            {t('apiKeys.emptyTitle')}
          </Text>
          <Text as='p' size='sm' colour='secondary' className='mt-1'>
            {t(projectId ? 'apiKeys.projectEmpty' : 'apiKeys.emptyDescription')}
          </Text>
        </div>
      ) : null}
      {data?.keys.length ? (
        <ul className='mt-6 space-y-6'>
          {data.keys.map((key) => (
            <li key={key.id}>
              <div className='flex flex-wrap items-start justify-between gap-x-6 gap-y-3'>
                <div className='min-w-0 flex-1'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Text
                      as='h4'
                      size='base'
                      weight='semibold'
                      className='break-all'
                    >
                      {key.name}
                    </Text>
                    {key.unrestricted ? (
                      <span className='rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300'>
                        {t('apiKeys.unrestricted')}
                      </span>
                    ) : null}
                  </div>
                  <Text as='p' size='sm' colour='secondary' className='mt-1'>
                    {key.created
                      ? t('apiKeys.created', { date: formatDate(key.created) })
                      : t('apiKeys.createdBefore')}
                    {key.rotated
                      ? ` · ${t('apiKeys.rotated', { date: formatDate(key.rotated) })}`
                      : ''}
                  </Text>
                  {projectId && key.owner ? (
                    <Text as='p' size='sm' colour='secondary' className='mt-1'>
                      {key.owner}
                    </Text>
                  ) : null}
                  {!projectId ? (
                    <div className='mt-3 flex min-w-0 items-center gap-1'>
                      <code className='min-w-0 text-sm break-all'>
                        {secrets[key.id] || key.keyPreview}
                      </code>
                      <Button
                        variant='icon'
                        disabled={busy}
                        onClick={() => void reveal(key)}
                        aria-label={t(
                          secrets[key.id] ? 'apiKeys.hide' : 'apiKeys.reveal',
                        )}
                        title={t(
                          secrets[key.id] ? 'apiKeys.hide' : 'apiKeys.reveal',
                        )}
                      >
                        {secrets[key.id] ? (
                          <EyeSlashIcon className='size-4' />
                        ) : (
                          <EyeIcon className='size-4' />
                        )}
                      </Button>
                      {secrets[key.id] ? (
                        <Button
                          variant='icon'
                          onClick={() => void copy(secrets[key.id])}
                          aria-label={t('apiKeys.copy')}
                          title={t('apiKeys.copy')}
                        >
                          <CopyIcon className='size-4' />
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                {!projectId ? (
                  <div className='flex flex-wrap gap-1'>
                    <Button
                      variant='ghost'
                      size='sm'
                      disabled={busy}
                      onClick={() => startEdit(key)}
                    >
                      {t('apiKeys.edit')}
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      disabled={busy}
                      onClick={() =>
                        setConfirmation({ operation: 'rotate', key })
                      }
                    >
                      {t('apiKeys.rotate')}
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='text-red-600 dark:text-red-400'
                      disabled={busy}
                      onClick={() =>
                        setConfirmation({ operation: 'delete', key })
                      }
                    >
                      {t('apiKeys.revoke')}
                    </Button>
                  </div>
                ) : null}
              </div>
              <Text as='p' size='sm' className='mt-3'>
                {key.allProjects
                  ? t('apiKeys.allProjects')
                  : key.projectIds
                      .map(
                        (id) =>
                          data.projects.find((project) => project.id === id)
                            ?.name || id,
                      )
                      .join(', ')}
              </Text>
              <details className='mt-2'>
                <summary className='w-fit cursor-pointer rounded text-sm font-medium focus-visible:outline-2'>
                  {key.unrestricted
                    ? t(
                        key.projectReadOnly
                          ? 'apiKeys.readOnly'
                          : 'apiKeys.fullAccess',
                      )
                    : t('apiKeys.scopeCount', {
                        count: new Set(
                          key.scopes.map((scope) => scope.split(':')[0]),
                        ).size,
                      })}
                </summary>
                {key.unrestricted ? (
                  <Text
                    as='p'
                    size='sm'
                    colour='secondary'
                    className='mt-2 max-w-xl'
                  >
                    {t('apiKeys.unrestrictedHint')}
                    {key.projectReadOnly
                      ? ` ${t('apiKeys.projectReadOnly')}`
                      : ''}
                  </Text>
                ) : (
                  <dl className='mt-3 grid max-w-lg grid-cols-[1fr_auto] gap-x-6 gap-y-2'>
                    {Object.keys(data.scopes)
                      .filter((scope) =>
                        key.scopes.some((permission) =>
                          permission.startsWith(`${scope}:`),
                        ),
                      )
                      .map((scope) => (
                        <div className='contents' key={scope}>
                          <Text as='dt' size='sm'>
                            {t(`apiKeys.resources.${scope}.name`)}
                          </Text>
                          <dd>{permissionLabel(key.scopes, scope)}</dd>
                        </div>
                      ))}
                  </dl>
                )}
              </details>
            </li>
          ))}
        </ul>
      ) : null}

      <Modal
        isOpened={Boolean(confirmation)}
        onClose={() => {
          if (!busy) setConfirmation(null)
        }}
        onSubmit={() => {
          if (confirmation)
            void mutate(confirmation.operation, confirmation.key)
        }}
        title={t(
          confirmation?.operation === 'rotate'
            ? 'apiKeys.rotateTitle'
            : 'apiKeys.revokeTitle',
          { name: confirmation?.key.name },
        )}
        message={
          <>
            <p>
              {t(
                confirmation?.operation === 'rotate'
                  ? 'apiKeys.rotateDescription'
                  : 'apiKeys.revokeDescription',
              )}
            </p>
            {error ? (
              <p role='alert' className='mt-3 text-red-600'>
                {error}
              </p>
            ) : null}
          </>
        }
        submitText={t(
          confirmation?.operation === 'rotate'
            ? 'apiKeys.rotate'
            : 'apiKeys.revoke',
        )}
        submitType='danger'
        isLoading={busy}
      />
      <Modal
        isOpened={Boolean(newSecret)}
        onClose={() => setNewSecret(null)}
        title={t('apiKeys.ready', { name: newSecret?.name })}
        message={
          <div className='space-y-4'>
            <p>{t('apiKeys.secretHint')}</p>
            <Input
              type='password'
              readOnly
              autoComplete='off'
              value={newSecret?.secret || ''}
              aria-label={t('apiKeys.secret')}
            />
            <Button
              variant='secondary'
              onClick={() => {
                if (newSecret) void copy(newSecret.secret)
              }}
            >
              <CopyIcon className='mr-2 size-4' />
              {t('apiKeys.copy')}
            </Button>
          </div>
        }
      />
    </section>
  )
}

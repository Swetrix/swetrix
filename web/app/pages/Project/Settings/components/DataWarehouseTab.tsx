import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowClockwiseIcon, ArrowUpRightIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { useFetcher } from 'react-router'
import { toast } from 'sonner'

import { useDeduplicateFetcherResponse } from '~/hooks/useDeduplicateFetcherResponse'
import type { DataWarehouseConnection } from '~/lib/models/DataExport'
import type { ProjectSettingsActionData } from '~/routes/projects.settings.$id'
import Alert from '~/ui/Alert'
import Button from '~/ui/Button'
import Input from '~/ui/Input'
import { Link } from '~/ui/Link'
import Loader from '~/ui/Loader'
import Modal from '~/ui/Modal'
import { Text } from '~/ui/Text'
import routes from '~/utils/routes'

const DOCS_URL = 'https://swetrix.com/docs/integrations/data-warehouse'
const MAX_CREDENTIAL_BYTES = 20000

interface WarehouseForm {
  gcpProjectId: string
  datasetId: string
  location: string
  tablePrefix: string
  startDate: string
}

const utcDate = (daysAgo: number) => {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - daysAgo)
  return date.toISOString().slice(0, 10)
}

const defaultForm = (projectId: string): WarehouseForm => ({
  gcpProjectId: '',
  datasetId: '',
  location: 'EU',
  tablePrefix: `swetrix_${projectId.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
  startDate: utcDate(30),
})

const connectionForm = (
  connection: DataWarehouseConnection,
): WarehouseForm => ({
  gcpProjectId: connection.gcpProjectId,
  datasetId: connection.datasetId,
  location: connection.location,
  tablePrefix: connection.tablePrefix,
  startDate: connection.startDate,
})

export default function DataWarehouseTab({
  projectId,
  hasAccess,
  isOwner,
}: {
  projectId: string
  hasAccess: boolean
  isOwner: boolean
}) {
  const { t } = useTranslation('common')
  const [connection, setConnection] = useState<DataWarehouseConnection | null>(
    null,
  )
  const [form, setForm] = useState<WarehouseForm>(() => defaultForm(projectId))
  const [credentials, setCredentials] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [credentialError, setCredentialError] = useState<string | null>(null)
  const [disconnectOpen, setDisconnectOpen] = useState(false)
  const [tested, setTested] = useState(false)
  const initialized = useRef(false)
  const actionMode = useRef<'configuration' | 'toggle' | 'sync' | 'delete'>(
    'configuration',
  )
  const formRef = useRef<HTMLFormElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const listFetcher = useFetcher<ProjectSettingsActionData>()
  const actionFetcher = useFetcher<ProjectSettingsActionData>()
  const handleListResponse =
    useDeduplicateFetcherResponse<ProjectSettingsActionData>()
  const handleActionResponse =
    useDeduplicateFetcherResponse<ProjectSettingsActionData>()
  const { submit: submitList } = listFetcher
  const settingsAction = `/projects/settings/${projectId}`
  const syncing =
    connection?.status === 'syncing' || connection?.status === 'queued'
  const busy = actionFetcher.state !== 'idle'
  const editingDisabled = busy || syncing || !hasAccess

  const fetchConnection = useCallback(() => {
    submitList(
      { intent: 'get-data-warehouse' },
      { method: 'post', action: settingsAction },
    )
  }, [submitList, settingsAction])

  useEffect(() => {
    fetchConnection()
  }, [fetchConnection])

  useEffect(() => {
    if (listFetcher.state !== 'idle' || !handleListResponse(listFetcher.data))
      return
    const result = listFetcher.data
    if (result.error) {
      setLoadError(result.error)
    } else if ('warehouseConnection' in result) {
      const nextConnection = result.warehouseConnection ?? null
      setConnection(nextConnection)
      setLoadError(null)
      if (!initialized.current) {
        setForm(
          nextConnection
            ? connectionForm(nextConnection)
            : defaultForm(projectId),
        )
        initialized.current = true
      }
    }
    setLoading(false)
  }, [listFetcher.state, listFetcher.data, handleListResponse, projectId])

  useEffect(() => {
    if (!connection || busy) return
    const timer = setInterval(fetchConnection, syncing ? 5000 : 30000)
    return () => clearInterval(timer)
  }, [connection, busy, syncing, fetchConnection])

  useEffect(() => {
    if (
      actionFetcher.state !== 'idle' ||
      !handleActionResponse(actionFetcher.data)
    )
      return
    const result = actionFetcher.data
    if (result.error) {
      setActionError(result.error)
      return
    }
    if (!result.success) return

    setActionError(null)
    if (result.intent === 'test-data-warehouse') {
      setTested(true)
      return
    }
    if (result.intent === 'delete-data-warehouse') {
      setConnection(null)
      setForm(defaultForm(projectId))
      setDisconnectOpen(false)
      toast.success(t('project.settings.warehouse.disconnected'))
    } else if (
      result.intent === 'save-data-warehouse' &&
      result.warehouseConnection
    ) {
      setConnection(result.warehouseConnection)
      if (actionMode.current === 'configuration') {
        setForm(connectionForm(result.warehouseConnection))
      }
      toast.success(t('project.settings.warehouse.saved'))
    } else if (result.intent === 'sync-data-warehouse') {
      toast.success(t('project.settings.warehouse.syncQueued'))
    }
    if (
      actionMode.current === 'configuration' ||
      actionMode.current === 'delete'
    ) {
      setCredentials('')
      setCredentialError(null)
      setTested(false)
      if (fileRef.current) fileRef.current.value = ''
    }
    fetchConnection()
  }, [
    actionFetcher.state,
    actionFetcher.data,
    handleActionResponse,
    projectId,
    t,
    fetchConnection,
  ])

  const updateForm = (key: keyof WarehouseForm, value: string) => {
    setForm((previous) => ({ ...previous, [key]: value }))
    setTested(false)
    setActionError(null)
  }

  const submitConfiguration = (
    intent: 'save-data-warehouse' | 'test-data-warehouse',
  ) => {
    if (!hasAccess) return
    if (!formRef.current?.reportValidity()) return
    const raw = credentials.trim()
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        if (
          raw.length > MAX_CREDENTIAL_BYTES ||
          parsed?.type !== 'service_account' ||
          typeof parsed?.private_key !== 'string' ||
          typeof parsed?.client_email !== 'string'
        ) {
          throw new Error('Invalid credentials')
        }
      } catch {
        setCredentialError(t('project.settings.warehouse.invalidCredentials'))
        return
      }
    } else if (!connection) {
      setCredentialError(t('project.settings.warehouse.credentialsRequired'))
      return
    }
    setCredentialError(null)
    setActionError(null)
    setTested(false)
    actionMode.current = 'configuration'
    actionFetcher.submit(
      {
        intent,
        ...form,
        enabled: String(connection?.enabled ?? true),
        ...(raw ? { credentials: raw } : {}),
      },
      { method: 'post', action: settingsAction },
    )
  }

  const submitAction = (
    intent: 'sync-data-warehouse' | 'delete-data-warehouse',
  ) => {
    if (intent === 'sync-data-warehouse' && !hasAccess) return
    setActionError(null)
    actionMode.current = intent === 'delete-data-warehouse' ? 'delete' : 'sync'
    actionFetcher.submit({ intent }, { method: 'post', action: settingsAction })
  }

  const toggleEnabled = () => {
    if (!connection || (!connection.enabled && !hasAccess)) return
    setActionError(null)
    actionMode.current = 'toggle'
    actionFetcher.submit(
      {
        intent: 'save-data-warehouse',
        ...connectionForm(connection),
        enabled: String(!connection.enabled),
      },
      { method: 'post', action: settingsAction },
    )
  }

  if (loading) return <Loader />

  return (
    <div className='flex max-w-3xl flex-col gap-6'>
      <div className='flex flex-col gap-2'>
        <Text size='sm' colour='secondary'>
          {t('project.settings.warehouse.description')}
        </Text>
        <Link
          to={DOCS_URL}
          target='_blank'
          rel='noreferrer'
          className='inline-flex w-fit items-center gap-1 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400'
        >
          {t('project.settings.warehouse.setupGuide')}
          <ArrowUpRightIcon className='size-3.5' aria-hidden='true' />
        </Link>
      </div>

      {!hasAccess ? (
        <Alert
          variant='info'
          title={t('project.settings.warehouse.upgradeTitle')}
        >
          <div className='flex flex-col items-start gap-3'>
            <span>
              {t(
                isOwner
                  ? 'project.settings.warehouse.upgradeDescription'
                  : 'project.settings.warehouse.askOwner',
              )}
            </span>
            {isOwner ? (
              <Button to={routes.billing_choose_plan} size='sm'>
                {t('project.settings.warehouse.upgrade')}
              </Button>
            ) : null}
          </div>
        </Alert>
      ) : null}

      {loadError ? (
        <Alert variant='error'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <span>{loadError}</span>
            <Button
              variant='secondary'
              size='sm'
              onClick={fetchConnection}
              loading={listFetcher.state !== 'idle'}
            >
              {t('project.settings.warehouse.retry')}
            </Button>
          </div>
        </Alert>
      ) : null}

      {connection ? (
        <section
          className='flex flex-col gap-4 border-y border-gray-200 py-5 dark:border-slate-800'
          aria-label={t('project.settings.warehouse.connectionStatus')}
        >
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <Text as='h3' weight='semibold'>
                Google BigQuery
              </Text>
              <Text
                as='p'
                size='sm'
                colour='secondary'
                className='mt-1'
                aria-live='polite'
              >
                {t(
                  `project.settings.warehouse.status.${
                    !connection.enabled
                      ? 'paused'
                      : hasAccess
                        ? connection.status
                        : 'planRequired'
                  }`,
                )}
              </Text>
            </div>
            <div className='flex flex-wrap gap-2'>
              <Button
                variant='secondary'
                size='sm'
                disabled={busy || syncing || !connection.enabled || !hasAccess}
                onClick={() => submitAction('sync-data-warehouse')}
              >
                <ArrowClockwiseIcon
                  className='mr-1.5 size-4'
                  aria-hidden='true'
                />
                {t('project.settings.warehouse.syncNow')}
              </Button>
              <Button
                variant='secondary'
                size='sm'
                disabled={busy || (!connection.enabled && !hasAccess)}
                onClick={toggleEnabled}
              >
                {t(
                  connection.enabled
                    ? 'project.settings.warehouse.pause'
                    : 'project.settings.warehouse.resume',
                )}
              </Button>
            </div>
          </div>
          <dl className='grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2'>
            <div className='min-w-0'>
              <dt className='text-gray-500 dark:text-gray-400'>
                {t('project.settings.warehouse.serviceAccount')}
              </dt>
              <dd className='mt-1 break-all text-gray-900 dark:text-gray-100'>
                {connection.serviceAccountEmail}
              </dd>
            </div>
            <div>
              <dt className='text-gray-500 dark:text-gray-400'>
                {t('project.settings.warehouse.exportedThrough')}
              </dt>
              <dd className='mt-1 text-gray-900 dark:text-gray-100'>
                {connection.lastSyncedDate ||
                  t('project.settings.warehouse.notYet')}
              </dd>
            </div>
            <div>
              <dt className='text-gray-500 dark:text-gray-400'>
                {t('project.settings.warehouse.lastSync')}
              </dt>
              <dd className='mt-1 text-gray-900 dark:text-gray-100'>
                {connection.lastSyncedAt
                  ? new Date(connection.lastSyncedAt).toLocaleString()
                  : t('project.settings.warehouse.notYet')}
              </dd>
            </div>
            <div>
              <dt className='text-gray-500 dark:text-gray-400'>
                {t('project.settings.warehouse.lastRows')}
              </dt>
              <dd className='mt-1 text-gray-900 dark:text-gray-100'>
                {connection.lastSyncedAt
                  ? connection.lastRowCount.toLocaleString()
                  : '—'}
              </dd>
            </div>
          </dl>
          {hasAccess && connection.enabled && syncing ? (
            <Text size='sm' colour='secondary'>
              {t('project.settings.warehouse.nextDate', {
                date: connection.nextDate,
              })}
            </Text>
          ) : hasAccess && connection.enabled && connection.nextSyncAt ? (
            <Text size='sm' colour='secondary'>
              {t('project.settings.warehouse.nextSync', {
                date: new Date(connection.nextSyncAt).toLocaleString(),
              })}
            </Text>
          ) : null}
          {connection.lastError ? (
            <Alert variant='error'>{connection.lastError}</Alert>
          ) : null}
          {!connection.enabled || syncing ? (
            <Text size='sm' colour='secondary'>
              {t('project.settings.warehouse.inFlight')}
            </Text>
          ) : null}
        </section>
      ) : null}

      {actionError ? <Alert variant='error'>{actionError}</Alert> : null}

      {hasAccess && (!loadError || connection) ? (
        <form
          ref={formRef}
          className='flex flex-col gap-5'
          onSubmit={(event) => {
            event.preventDefault()
            submitConfiguration('save-data-warehouse')
          }}
        >
          <div>
            <Text as='h3' weight='semibold'>
              {t('project.settings.warehouse.destination')}
            </Text>
            <Text as='p' size='sm' colour='secondary' className='mt-1'>
              {t('project.settings.warehouse.destinationHint')}
            </Text>
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            <Input
              label={t('project.settings.warehouse.googleProject')}
              value={form.gcpProjectId}
              onChange={(event) =>
                updateForm('gcpProjectId', event.target.value)
              }
              required
              pattern='[a-z][a-z0-9-]{4,61}[a-z0-9]'
              minLength={6}
              maxLength={63}
              disabled={editingDisabled}
              placeholder='my-company-analytics'
              autoComplete='off'
              spellCheck={false}
            />
            <Input
              label={t('project.settings.warehouse.dataset')}
              value={form.datasetId}
              onChange={(event) => updateForm('datasetId', event.target.value)}
              required
              pattern='[a-zA-Z0-9_]+'
              maxLength={1024}
              disabled={editingDisabled}
              placeholder='swetrix'
              autoComplete='off'
              spellCheck={false}
            />
            <Input
              label={t('project.settings.warehouse.location')}
              hint={t('project.settings.warehouse.locationHint')}
              value={form.location}
              onChange={(event) => updateForm('location', event.target.value)}
              required
              pattern='[A-Za-z][A-Za-z0-9-]{1,39}'
              maxLength={40}
              disabled={editingDisabled}
              placeholder='EU'
              autoComplete='off'
              spellCheck={false}
            />
            <Input
              label={t('project.settings.warehouse.tablePrefix')}
              hint={t('project.settings.warehouse.tablePrefixHint')}
              value={form.tablePrefix}
              onChange={(event) =>
                updateForm('tablePrefix', event.target.value)
              }
              required
              pattern='[a-zA-Z_][a-zA-Z0-9_]*'
              maxLength={101}
              disabled={editingDisabled}
              autoComplete='off'
              spellCheck={false}
            />
          </div>
          <Input
            type='date'
            label={t('project.settings.warehouse.startDate')}
            hint={t('project.settings.warehouse.startDateHint')}
            value={form.startDate}
            onChange={(event) => updateForm('startDate', event.target.value)}
            min='2000-01-01'
            max={utcDate(1)}
            required
            disabled={editingDisabled}
            className='max-w-sm'
          />
          <div className='flex flex-col gap-3'>
            <Input
              type='password'
              label={t('project.settings.warehouse.credentials')}
              hint={t(
                connection
                  ? 'project.settings.warehouse.credentialsSavedHint'
                  : 'project.settings.warehouse.credentialsHint',
              )}
              value={credentials}
              onChange={(event) => {
                setCredentials(event.target.value)
                setCredentialError(null)
                setTested(false)
              }}
              maxLength={MAX_CREDENTIAL_BYTES}
              error={credentialError}
              disabled={editingDisabled}
              autoComplete='new-password'
              spellCheck={false}
            />
            <Input
              ref={fileRef}
              type='file'
              label={t('project.settings.warehouse.credentialsFile')}
              accept='.json,application/json'
              disabled={editingDisabled}
              onChange={async (event) => {
                const file = event.target.files?.[0]
                if (!file) return
                setTested(false)
                setCredentials('')
                if (file.size > MAX_CREDENTIAL_BYTES) {
                  setCredentialError(
                    t('project.settings.warehouse.invalidCredentials'),
                  )
                  return
                }
                try {
                  setCredentials(await file.text())
                  setCredentialError(null)
                } catch {
                  setCredentialError(
                    t('project.settings.warehouse.invalidCredentials'),
                  )
                }
              }}
            />
          </div>
          {tested ? (
            <Alert variant='success'>
              {t('project.settings.warehouse.testPassed')}
            </Alert>
          ) : null}
          <div className='flex flex-wrap gap-2'>
            <Button
              type='submit'
              disabled={editingDisabled}
              loading={
                busy &&
                actionFetcher.formData?.get('intent') === 'save-data-warehouse'
              }
            >
              {t(
                connection
                  ? 'project.settings.warehouse.save'
                  : 'project.settings.warehouse.connect',
              )}
            </Button>
            <Button
              variant='secondary'
              disabled={editingDisabled}
              loading={
                busy &&
                actionFetcher.formData?.get('intent') === 'test-data-warehouse'
              }
              onClick={() => submitConfiguration('test-data-warehouse')}
            >
              {t('project.settings.warehouse.test')}
            </Button>
          </div>
        </form>
      ) : null}

      <div className='border-t border-gray-200 pt-5 dark:border-slate-800'>
        <Text as='h3' weight='semibold' size='sm'>
          {t('project.settings.warehouse.otherWarehouses')}
        </Text>
        <Text as='p' size='sm' colour='secondary' className='mt-1'>
          {t('project.settings.warehouse.otherWarehousesHint')}
        </Text>
        {connection ? (
          <Button
            variant='danger-outline'
            size='sm'
            className='mt-5'
            disabled={busy}
            onClick={() => {
              setActionError(null)
              setDisconnectOpen(true)
            }}
          >
            {t('project.settings.warehouse.disconnect')}
          </Button>
        ) : null}
      </div>

      <Modal
        type='warning'
        title={t('project.settings.warehouse.disconnectTitle')}
        message={
          <div className='flex flex-col gap-3'>
            <span>{t('project.settings.warehouse.disconnectMessage')}</span>
            {actionError ? <Alert variant='error'>{actionError}</Alert> : null}
          </div>
        }
        isOpened={disconnectOpen}
        onClose={() => {
          if (!busy) setDisconnectOpen(false)
        }}
        onSubmit={() => submitAction('delete-data-warehouse')}
        submitText={t('project.settings.warehouse.disconnect')}
        submitType='danger'
        isLoading={busy}
      />
    </div>
  )
}

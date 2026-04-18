import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CopyIcon,
  CheckIcon,
  TrashIcon,
  ArrowsClockwiseIcon,
  WarningIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  SpinnerIcon,
  PlusIcon,
} from '@phosphor-icons/react'
import cx from 'clsx'
import dayjs from 'dayjs'
import { Trans, useTranslation } from 'react-i18next'
import { useFetcher } from 'react-router'
import { toast } from 'sonner'

import type { ProxyDomain, ProxyDomainStatus } from '~/lib/models/Project'
import type { ProjectSettingsActionData } from '~/routes/projects.settings.$id'
import Button from '~/ui/Button'
import Input from '~/ui/Input'
import Loader from '~/ui/Loader'
import Modal from '~/ui/Modal'
import { Text } from '~/ui/Text'

const STATUS_CLASSES: Record<ProxyDomainStatus, string> = {
  waiting:
    'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20',
  issuing:
    'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20',
  live: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20',
  error:
    'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20',
}

const STATUS_ICONS: Record<
  ProxyDomainStatus,
  React.ComponentType<{ className?: string }>
> = {
  waiting: ClockIcon,
  issuing: SpinnerIcon,
  live: CheckCircleIcon,
  error: XCircleIcon,
}

// Same shape as the backend HOSTNAME_REGEX. Keep these in sync.
const HOSTNAME_REGEX =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/

const BLOCKED_KEYWORDS_REGEX =
  /\b(analytics|tracking|telemetry|posthog|track|metrics?|stats?|count|pixel|tag(s|ger)?|ads?)\b/i

const validateHostnameClient = (raw: string): string | null => {
  const value = raw.trim().toLowerCase()
  if (!value) return null
  if (value.length > 253) return null
  if (!HOSTNAME_REGEX.test(value)) return null
  if (value.split('.').length < 3) return null
  return value
}

function StatusBadge({
  status,
  label,
}: {
  status: ProxyDomainStatus
  label: string
}) {
  const Icon = STATUS_ICONS[status]
  return (
    <Text
      as='span'
      size='xs'
      weight='medium'
      colour='inherit'
      className={cx(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 ring-1 ring-inset',
        STATUS_CLASSES[status],
      )}
    >
      <Icon
        className={cx('size-3', { 'animate-spin': status === 'issuing' })}
      />
      {label}
    </Text>
  )
}

function CopyableCode({ value }: { value: string }) {
  const { t } = useTranslation('common')
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
      toast.success(t('project.settings.proxy.copied'))
    } catch {
      toast.error(t('common.failedToCopy'))
    }
  }

  return (
    <div className='flex items-stretch gap-2'>
      <code className='block grow overflow-x-auto rounded-md border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-900 dark:border-slate-700/80 dark:bg-slate-900 dark:text-gray-100'>
        {value}
      </code>
      <button
        type='button'
        onClick={onCopy}
        className='inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-700/80 dark:text-gray-200 dark:hover:bg-slate-900'
        title={t('project.settings.proxy.copy')}
      >
        {copied ? (
          <CheckIcon className='size-4 text-emerald-500' />
        ) : (
          <CopyIcon className='size-4' />
        )}
      </button>
    </div>
  )
}

interface ProxyDomainsTabProps {
  projectId: string
}

export default function ProxyDomainsTab({ projectId }: ProxyDomainsTabProps) {
  const { t, i18n } = useTranslation('common')

  const listFetcher = useFetcher<ProjectSettingsActionData>()
  const addFetcher = useFetcher<ProjectSettingsActionData>()
  const deleteFetcher = useFetcher<ProjectSettingsActionData>()
  const verifyFetcher = useFetcher<ProjectSettingsActionData>()

  const settingsAction = `/projects/settings/${projectId}`

  const [domains, setDomains] = useState<ProxyDomain[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [hostnameInput, setHostnameInput] = useState('')
  const [hostnameError, setHostnameError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProxyDomain | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fetchDomainsRef = useRef<() => void>(() => {})

  const statusLabels: Record<ProxyDomainStatus, string> = {
    waiting: t('project.settings.proxy.statusWaiting'),
    issuing: t('project.settings.proxy.statusIssuing'),
    live: t('project.settings.proxy.statusLive'),
    error: t('project.settings.proxy.statusError'),
  }

  const fetchDomains = useCallback(() => {
    listFetcher.submit(
      { intent: 'list-proxy-domains' },
      { method: 'POST', action: settingsAction },
    )
  }, [listFetcher, settingsAction])

  fetchDomainsRef.current = fetchDomains

  useEffect(() => {
    fetchDomains()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (listFetcher.state !== 'idle' || !listFetcher.data) return
    if (listFetcher.data.intent !== 'list-proxy-domains') return

    if (listFetcher.data.error) {
      toast.error(listFetcher.data.error)
    } else if (listFetcher.data.proxyDomains) {
      setDomains(listFetcher.data.proxyDomains)
    }
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listFetcher.state, listFetcher.data])

  // Poll while any domain is still waiting/issuing so the UI advances quickly.
  const hasPending = domains.some(
    (d) => d.status === 'waiting' || d.status === 'issuing',
  )

  useEffect(() => {
    if (!hasPending) return

    pollRef.current = setInterval(() => {
      fetchDomainsRef.current()
    }, 8000)

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [hasPending])

  useEffect(() => {
    if (addFetcher.state !== 'idle' || !addFetcher.data) return
    if (addFetcher.data.intent !== 'add-proxy-domain') return

    if (addFetcher.data.error) {
      toast.error(addFetcher.data.error)
      return
    }

    if (addFetcher.data.proxyDomain) {
      toast.success(t('project.settings.proxy.added'))
      if (addFetcher.data.proxyDomainKeywordWarning) {
        toast.warning(t('project.settings.proxy.domainKeywordWarning'))
      }
      setShowAddModal(false)
      setHostnameInput('')
      setHostnameError(null)
      fetchDomains()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addFetcher.state, addFetcher.data])

  useEffect(() => {
    if (deleteFetcher.state !== 'idle' || !deleteFetcher.data) return
    if (deleteFetcher.data.intent !== 'delete-proxy-domain') return

    if (deleteFetcher.data.error) {
      toast.error(deleteFetcher.data.error)
    } else if (deleteFetcher.data.success) {
      toast.success(t('project.settings.proxy.deleted'))
      setDeleteTarget(null)
      fetchDomains()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteFetcher.state, deleteFetcher.data])

  useEffect(() => {
    if (verifyFetcher.state !== 'idle' || !verifyFetcher.data) return
    if (verifyFetcher.data.intent !== 'verify-proxy-domain') return

    if (verifyFetcher.data.error) {
      toast.error(verifyFetcher.data.error)
    } else if (verifyFetcher.data.proxyDomain) {
      const updated = verifyFetcher.data.proxyDomain
      setDomains((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifyFetcher.state, verifyFetcher.data])

  const submitAddDomain = () => {
    const validated = validateHostnameClient(hostnameInput)
    if (!validated) {
      setHostnameError(t('project.settings.proxy.invalidDomain'))
      return
    }

    addFetcher.submit(
      { intent: 'add-proxy-domain', hostname: validated },
      { method: 'POST', action: settingsAction },
    )
  }

  const submitDelete = () => {
    if (!deleteTarget) return
    deleteFetcher.submit(
      { intent: 'delete-proxy-domain', id: deleteTarget.id },
      { method: 'POST', action: settingsAction },
    )
  }

  const verifyDomain = (domain: ProxyDomain) => {
    verifyFetcher.submit(
      { intent: 'verify-proxy-domain', id: domain.id },
      { method: 'POST', action: settingsAction },
    )
  }

  const liveDomain = useMemo(
    () => domains.find((d) => d.status === 'live'),
    [domains],
  )

  const adding = addFetcher.state !== 'idle'
  const deleting = deleteFetcher.state !== 'idle'

  return (
    <div className='space-y-6'>
      <div className='rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10'>
        <div className='flex gap-3'>
          <WarningIcon className='size-5 shrink-0 text-amber-600 dark:text-amber-400' />
          <div className='space-y-2 text-sm'>
            <Text as='p' weight='semibold' colour='primary'>
              {t('project.settings.proxy.warningTitle')}
            </Text>
            <ul className='ml-5 list-disc space-y-1 text-gray-700 dark:text-gray-300'>
              <li>
                <Trans
                  i18nKey='project.settings.proxy.warningSubdomain'
                  t={t}
                  components={{
                    1: (
                      <code className='rounded bg-amber-100 px-1 dark:bg-amber-500/20' />
                    ),
                    3: (
                      <code className='rounded bg-amber-100 px-1 dark:bg-amber-500/20' />
                    ),
                    5: (
                      <code className='rounded bg-amber-100 px-1 dark:bg-amber-500/20' />
                    ),
                  }}
                />
              </li>
              <li>
                <Trans
                  i18nKey='project.settings.proxy.warningGeneric'
                  t={t}
                  components={{
                    1: (
                      <code className='rounded bg-amber-100 px-1 dark:bg-amber-500/20' />
                    ),
                  }}
                />
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div>
        <div className='flex items-center justify-between'>
          <Text as='h3' size='base' weight='semibold' colour='primary'>
            {t('project.settings.proxy.domainsTitle')}
          </Text>
          <Button
            type='button'
            primary
            small
            onClick={() => {
              setHostnameInput('')
              setHostnameError(null)
              setShowAddModal(true)
            }}
          >
            <PlusIcon className='size-4' />
            {t('project.settings.proxy.addDomain')}
          </Button>
        </div>

        {loading ? (
          <div className='mt-4 flex justify-center py-8'>
            <Loader />
          </div>
        ) : domains.length === 0 ? (
          <div className='mt-4 rounded-lg border border-dashed border-gray-300 py-8 text-center dark:border-slate-700'>
            <Text as='p' size='sm' colour='muted'>
              {t('project.settings.proxy.noDomains')}
            </Text>
          </div>
        ) : (
          <div className='mt-4 space-y-4'>
            {domains.map((domain) => (
              <div
                key={domain.id}
                className='rounded-lg border border-gray-200 dark:border-slate-800'
              >
                <div className='flex items-center justify-between gap-3 px-4 py-3'>
                  <div className='min-w-0 flex-1'>
                    <Text
                      as='p'
                      size='sm'
                      weight='semibold'
                      colour='primary'
                      className='truncate font-mono'
                    >
                      {domain.hostname}
                    </Text>
                    {domain.liveSince ? (
                      <Text as='p' size='xs' colour='muted' className='mt-0.5'>
                        {t('project.settings.proxy.liveSince', {
                          date: dayjs(domain.liveSince)
                            .locale(i18n.language)
                            .format('lll'),
                        })}
                      </Text>
                    ) : null}
                  </div>
                  <StatusBadge
                    status={domain.status}
                    label={statusLabels[domain.status]}
                  />
                  <div className='flex items-center gap-1'>
                    <button
                      type='button'
                      onClick={() => verifyDomain(domain)}
                      disabled={verifyFetcher.state !== 'idle'}
                      className='rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-gray-200'
                      title={t('project.settings.proxy.verifyNow')}
                    >
                      <ArrowsClockwiseIcon
                        className={cx('size-4', {
                          'animate-spin': verifyFetcher.state !== 'idle',
                        })}
                      />
                    </button>
                    <button
                      type='button'
                      onClick={() => setDeleteTarget(domain)}
                      className='rounded p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300'
                      title={t('common.delete')}
                    >
                      <TrashIcon className='size-4' />
                    </button>
                  </div>
                </div>

                {domain.status !== 'live' ? (
                  <div className='space-y-3 border-t border-gray-200 bg-gray-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/40'>
                    <Text as='h4' size='sm' weight='semibold' colour='primary'>
                      {t('project.settings.proxy.almostThere')}
                    </Text>

                    <Text as='p' size='sm' colour='muted'>
                      <Trans
                        i18nKey='project.settings.proxy.cnameInstructions'
                        t={t}
                        components={{ 1: <strong /> }}
                      />
                    </Text>

                    <div>
                      <Text
                        as='p'
                        size='xs'
                        weight='semibold'
                        colour='primary'
                        className='mb-1 font-mono'
                      >
                        {domain.hostname}
                      </Text>
                      <CopyableCode value={domain.proxyTarget} />
                    </div>

                    <Text as='p' size='xs' colour='muted'>
                      <Trans
                        i18nKey='project.settings.proxy.cnameTip'
                        t={t}
                        components={{ 1: <strong /> }}
                      />
                    </Text>

                    {domain.status === 'error' && domain.errorMessage ? (
                      <Text as='p' size='xs' colour='error'>
                        {t('project.settings.proxy.errorPrefix')}
                        {domain.errorMessage}
                      </Text>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className='rounded-lg border border-gray-200 p-4 dark:border-slate-800'>
        <Text as='h3' size='base' weight='semibold' colour='primary'>
          {t('project.settings.proxy.snippetTitle')}
        </Text>
        <Text as='p' size='sm' colour='muted' className='mt-1'>
          {t('project.settings.proxy.snippetDescription')}
        </Text>

        {liveDomain ? (
          <div className='mt-4 space-y-4'>
            <div>
              <Text
                as='p'
                size='xs'
                weight='semibold'
                colour='primary'
                className='mb-1'
              >
                {t('project.settings.proxy.scriptTagLabel')}
              </Text>
              <CopyableCode
                value={`<script src="https://${liveDomain.hostname}/script.js" defer></script>`}
              />
            </div>
            <div>
              <Text
                as='p'
                size='xs'
                weight='semibold'
                colour='primary'
                className='mb-1'
              >
                {t('project.settings.proxy.initLabel')}
              </Text>
              <CopyableCode
                value={`swetrix.init("${projectId}", {\n  apiURL: "https://${liveDomain.hostname}/log",\n})`}
              />
            </div>
            <a
              href='https://swetrix.com/docs/adblockers/managed-proxy'
              target='_blank'
              rel='noreferrer'
              className='inline-block text-sm text-indigo-600 hover:text-indigo-500 dark:text-slate-300 dark:hover:text-white'
            >
              {t('project.settings.proxy.learnMore')}
            </a>
          </div>
        ) : (
          <Text as='p' size='sm' colour='muted' className='mt-4'>
            {t('project.settings.proxy.atLeastOneLive')}
          </Text>
        )}
      </div>

      <Modal
        isOpened={showAddModal}
        onClose={() => {
          if (!adding) setShowAddModal(false)
        }}
        title={t('project.settings.proxy.addDomainTitle')}
        size='medium'
        message={
          <div className='space-y-4'>
            <div className='rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10'>
              <div className='flex gap-3'>
                <WarningIcon className='size-5 shrink-0 text-amber-600 dark:text-amber-400' />
                <div className='space-y-2 text-sm'>
                  <Text as='p' weight='semibold' colour='primary'>
                    {t('project.settings.proxy.warningTitle')}
                  </Text>
                  <ul className='ml-5 list-disc space-y-1 text-gray-700 dark:text-gray-300'>
                    <li>
                      <Trans
                        i18nKey='project.settings.proxy.warningSubdomain'
                        t={t}
                        components={{
                          1: (
                            <code className='rounded bg-amber-100 px-1 dark:bg-amber-500/20' />
                          ),
                          3: (
                            <code className='rounded bg-amber-100 px-1 dark:bg-amber-500/20' />
                          ),
                          5: (
                            <code className='rounded bg-amber-100 px-1 dark:bg-amber-500/20' />
                          ),
                        }}
                      />
                    </li>
                    <li>
                      <Trans
                        i18nKey='project.settings.proxy.warningGeneric'
                        t={t}
                        components={{
                          1: (
                            <code className='rounded bg-amber-100 px-1 dark:bg-amber-500/20' />
                          ),
                        }}
                      />
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <Input
              label={t('project.settings.proxy.domain')}
              placeholder={t('project.settings.proxy.domainPlaceholder')}
              value={hostnameInput}
              onChange={(e) => {
                setHostnameInput(e.target.value)
                setHostnameError(null)
              }}
              error={hostnameError}
            />

            {hostnameInput && BLOCKED_KEYWORDS_REGEX.test(hostnameInput) ? (
              <Text as='p' size='xs' colour='warning'>
                {t('project.settings.proxy.domainKeywordWarning')}
              </Text>
            ) : null}
          </div>
        }
        submitText={t('common.add')}
        closeText={t('common.cancel')}
        onSubmit={submitAddDomain}
        isLoading={adding}
        submitDisabled={!hostnameInput.trim()}
      />

      <Modal
        isOpened={!!deleteTarget}
        onClose={() => {
          if (!deleting) setDeleteTarget(null)
        }}
        type='warning'
        title={t('project.settings.proxy.deleteTitle')}
        message={
          <Text as='p'>{t('project.settings.proxy.deleteConfirm')}</Text>
        }
        submitText={t('common.delete')}
        closeText={t('common.cancel')}
        submitType='danger'
        onSubmit={submitDelete}
        isLoading={deleting}
      />
    </div>
  )
}

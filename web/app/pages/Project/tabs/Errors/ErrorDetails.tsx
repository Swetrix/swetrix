import _map from 'lodash/map'
import {
  FileCodeIcon,
  CaretDownIcon,
  CaretUpIcon,
  ClipboardIcon,
  CheckIcon,
  CodeIcon,
  UsersIcon,
  CaretRightIcon,
} from '@phosphor-icons/react'
import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from '~/ui/Link'
import { useLocation } from 'react-router'

import type {
  ErrorAffectedSession,
  ErrorDetailsResponse,
} from '~/api/api.server'
import { useErrorSessionsProxy } from '~/hooks/useAnalyticsProxy'
import {
  BROWSER_LOGO_MAP,
  OS_LOGO_MAP,
  OS_LOGO_MAP_DARK,
} from '~/lib/constants'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import { useTheme } from '~/providers/ThemeProvider'
import { Badge } from '~/ui/Badge'
import Button from '~/ui/Button'
import Flag from '~/ui/Flag'
import Loader from '~/ui/Loader'
import { Text } from '~/ui/Text'
import { getRelativeDateIfPossible } from '~/utils/date'
import { cn } from '~/utils/generic'

const STACK_PREVIEW_LINES_COUNT = 5

interface ErrorDetailsProps {
  details: ErrorDetailsResponse['details']
  chart?: React.ReactNode
  period?: string
  from?: string
  to?: string
  timeBucket?: string
  projectPassword?: string
}

const BrowserIcon = ({ browser }: { browser: string | null }) => {
  if (!browser) return null

  const logoUrl = BROWSER_LOGO_MAP[browser as keyof typeof BROWSER_LOGO_MAP]

  if (!logoUrl) return null

  return <img src={logoUrl} className='h-4 w-4' alt='' />
}

const OSIcon = ({ os, theme }: { os: string | null; theme: string }) => {
  if (!os) return null

  const logoUrlLight = OS_LOGO_MAP[os as keyof typeof OS_LOGO_MAP]
  const logoUrlDark = OS_LOGO_MAP_DARK[os as keyof typeof OS_LOGO_MAP_DARK]

  let logoUrl = theme === 'dark' ? logoUrlDark : logoUrlLight
  logoUrl ||= logoUrlLight

  if (!logoUrl) return null

  return <img src={logoUrl} className='h-4 w-4' alt='' />
}

const SectionCard = ({
  title,
  meta,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title: React.ReactNode
  meta?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}) => (
  <div
    className={cn(
      'flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-slate-800/60 dark:bg-slate-900/25',
      className,
    )}
  >
    <div className='flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-slate-800/60'>
      <div className='flex min-w-0 items-center gap-2'>
        <Text
          as='h3'
          size='sm'
          weight='semibold'
          colour='primary'
          className='truncate'
        >
          {title}
        </Text>
        {meta ? (
          <Text size='xs' colour='muted' className='font-mono'>
            {meta}
          </Text>
        ) : null}
      </div>
      {actions ? (
        <div className='flex shrink-0 items-center gap-1'>{actions}</div>
      ) : null}
    </div>
    <div className={cn('flex-1', bodyClassName)}>{children}</div>
  </div>
)

const ToolbarButton = ({
  onClick,
  ariaLabel,
  ariaExpanded,
  active,
  children,
}: {
  onClick: () => void
  ariaLabel?: string
  ariaExpanded?: boolean
  active?: boolean
  children: React.ReactNode
}) => (
  <button
    type='button'
    onClick={onClick}
    aria-label={ariaLabel}
    aria-expanded={ariaExpanded}
    className={cn(
      'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
      'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
      'dark:text-gray-300 dark:hover:bg-slate-800 dark:hover:text-gray-100',
      active &&
        'bg-gray-100 text-gray-900 dark:bg-slate-800 dark:text-gray-100',
    )}
  >
    {children}
  </button>
)

interface SessionRowProps {
  session: ErrorAffectedSession
}

const SessionRow = ({ session }: SessionRowProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const { theme } = useTheme()
  const location = useLocation()

  const lastErrorAt = useMemo(() => {
    return getRelativeDateIfPossible(session.lastErrorAt, language)
  }, [session.lastErrorAt, language])

  const params = new URLSearchParams(location.search)
  params.delete('eid')
  params.set('psid', session.psid)
  params.set('tab', 'sessions')
  const sessionUrl = `?${params.toString()}`

  return (
    <Link
      to={sessionUrl}
      className='group flex items-center justify-between gap-3 rounded-md px-2.5 py-2 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800/40'
    >
      <div className='flex min-w-0 flex-1 items-center gap-3'>
        <div className='flex shrink-0 items-center gap-1.5'>
          {session.cc ? (
            <Flag
              className='rounded-xs'
              country={session.cc}
              size={16}
              alt=''
              aria-hidden='true'
            />
          ) : (
            <span className='inline-block size-4 rounded-xs bg-gray-200 dark:bg-slate-800' />
          )}
          <BrowserIcon browser={session.br} />
          <OSIcon os={session.os} theme={theme} />
        </div>
        <div className='flex min-w-0 flex-col'>
          <Text
            size='xs'
            weight='medium'
            truncate
            className={cn(
              'text-gray-900 dark:text-gray-100',
              !session.profileId && 'italic',
            )}
          >
            {session.profileId || t('project.unknownUser')}
          </Text>
          <Text size='xxs' colour='muted' className='tabular-nums'>
            {lastErrorAt} · {session.errorCount}{' '}
            {t('project.occurrences').toLowerCase()}
          </Text>
        </div>
      </div>
      <CaretRightIcon className='size-4 shrink-0 text-gray-400 transition-colors group-hover:text-gray-700 dark:group-hover:text-gray-200' />
    </Link>
  )
}

export const ErrorDetails = ({
  details,
  chart,
  period = '7d',
  from = '',
  to = '',
  timeBucket = 'hour',
}: ErrorDetailsProps) => {
  const { t } = useTranslation('common')
  const { id } = useCurrentProject()
  const { fetchErrorSessions } = useErrorSessionsProxy()

  const [isStackTraceExpanded, setIsStackTraceExpanded] = useState(false)
  const [isCopiedStack, setIsCopiedStack] = useState(false)
  const [isCopiedEid, setIsCopiedEid] = useState(false)
  const [isCopiedFile, setIsCopiedFile] = useState(false)

  const [sessions, setSessions] = useState<ErrorAffectedSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState<boolean | null>(null)
  const [sessionsTotal, setSessionsTotal] = useState(0)
  const [sessionsSkip, setSessionsSkip] = useState(0)
  const isMountedRef = useRef(true)

  const SESSIONS_TAKE = 5

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const status: { label: string; colour: 'red' | 'yellow' | 'slate' } =
    useMemo(() => {
      if (details.status === 'active') {
        return { label: t('error.status.active'), colour: 'red' }
      }
      if (details.status === 'regressed') {
        return { label: t('error.status.regressed'), colour: 'yellow' }
      }
      return { label: t('error.status.resolved'), colour: 'slate' }
    }, [details.status, t])

  const stackTraceLines = useMemo(
    () => (details.stackTrace ? details.stackTrace.split('\n') : []),
    [details.stackTrace],
  )
  const canLoadMoreSessions = sessions.length < sessionsTotal
  const fileLocation = useMemo(() => {
    if (!details.filename) return ''

    return `${details.filename}${details.lineno ? `:${details.lineno}` : ''}${details.colno ? `:${details.colno}` : ''}`
  }, [details.filename, details.lineno, details.colno])

  useEffect(() => {
    const shouldExpand =
      stackTraceLines.length > 0 && stackTraceLines.length <= 8
    setIsStackTraceExpanded(shouldExpand)
    setIsCopiedStack(false)
    setIsCopiedEid(false)
    setIsCopiedFile(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [details.eid])

  const handleCopyStackTrace = async () => {
    if (!details.stackTrace) return

    try {
      await navigator.clipboard.writeText(details.stackTrace)
      setIsCopiedStack(true)
      setTimeout(() => setIsCopiedStack(false), 2000)
    } catch (err) {
      console.error('Failed to copy stack trace:', err)
    }
  }

  const handleCopyEid = async () => {
    if (!details.eid) return

    try {
      await navigator.clipboard.writeText(details.eid)
      setIsCopiedEid(true)
      setTimeout(() => setIsCopiedEid(false), 2000)
    } catch (err) {
      console.error('Failed to copy error id:', err)
    }
  }

  const handleCopyFile = async () => {
    if (!fileLocation) return

    try {
      await navigator.clipboard.writeText(fileLocation)
      setIsCopiedFile(true)
      setTimeout(() => setIsCopiedFile(false), 2000)
    } catch (err) {
      console.error('Failed to copy file location:', err)
    }
  }

  const loadSessions = useCallback(
    async (reset = false) => {
      if (sessionsLoading) return

      setSessionsLoading(true)
      const skip = reset ? 0 : sessionsSkip

      try {
        const result = await fetchErrorSessions(id, details.eid, {
          timeBucket,
          period,
          from,
          to,
          take: SESSIONS_TAKE,
          skip,
        })

        if (!isMountedRef.current) return

        if (result) {
          if (reset) {
            setSessions(result.sessions)
          } else {
            setSessions((prev) => [...prev, ...result.sessions])
          }
          setSessionsTotal(result.total)
          setSessionsSkip(skip + SESSIONS_TAKE)
        }
      } catch (reason) {
        console.error('[ErrorDetails] Failed to load sessions:', reason)
      } finally {
        if (isMountedRef.current) {
          setSessionsLoading(false)
        }
      }
    },
    [
      id,
      details.eid,
      timeBucket,
      period,
      from,
      to,
      sessionsLoading,
      sessionsSkip,
      fetchErrorSessions,
    ],
  )

  useEffect(() => {
    setSessions([])
    setSessionsSkip(0)
    loadSessions(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [details.eid, period, from, to])

  const formatStackTraceLine = (line: string) => {
    const atMatch = line.match(/(\s*at\s+)([^(]+)(\s*\(([^)]+)\))?/)
    const fileMatch = line.match(/([^:]+):(\d+):(\d+)/)

    if (atMatch) {
      const [, prefix, funcName, , location] = atMatch
      return (
        <p>
          <span className='text-gray-500 dark:text-slate-500'>{prefix}</span>
          <span className='font-medium text-gray-800 dark:text-slate-200'>
            {funcName}
          </span>
          {location ? (
            <>
              <span className='text-gray-500 dark:text-slate-500'> (</span>
              <span className='text-gray-700 dark:text-slate-300'>
                {location}
              </span>
              <span className='text-gray-500 dark:text-slate-500'>)</span>
            </>
          ) : null}
        </p>
      )
    }

    if (fileMatch) {
      const [, file, lineNum, colNum] = fileMatch
      return (
        <p>
          <span className='text-gray-700 dark:text-slate-300'>{file}</span>
          <span className='text-gray-500 dark:text-slate-500'>:</span>
          <span className='text-gray-700 dark:text-slate-300'>{lineNum}</span>
          <span className='text-gray-500 dark:text-slate-500'>:</span>
          <span className='text-gray-700 dark:text-slate-300'>{colNum}</span>
        </p>
      )
    }

    return <p className='block text-gray-800 dark:text-slate-200'>{line}</p>
  }

  const stackPreviewLines = stackTraceLines.slice(0, STACK_PREVIEW_LINES_COUNT)
  const stackHiddenCount = Math.max(
    0,
    stackTraceLines.length - STACK_PREVIEW_LINES_COUNT,
  )

  return (
    <div className='space-y-3'>
      <header className='flex flex-col gap-3'>
        <div className='flex flex-wrap items-center gap-x-3 gap-y-1.5'>
          <Badge label={status.label} colour={status.colour} />
          <button
            type='button'
            onClick={handleCopyEid}
            className='group inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-[11px] text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
            aria-label={t('project.copy')}
          >
            <span>{details.eid}</span>
            {isCopiedEid ? (
              <CheckIcon className='size-3 text-emerald-500' />
            ) : (
              <ClipboardIcon className='size-3 opacity-60 transition-opacity group-hover:opacity-100' />
            )}
          </button>
        </div>

        <div className='space-y-1'>
          <h2 className='text-2xl leading-tight font-bold tracking-tight wrap-break-word text-gray-900 dark:text-white'>
            {details.name}
          </h2>
          {details.message ? (
            <p className='font-mono text-sm wrap-break-word text-gray-600 dark:text-gray-400'>
              {details.message}
            </p>
          ) : null}
        </div>

        {details.filename ? (
          <div className='inline-flex w-fit max-w-full items-center gap-2 rounded-md bg-gray-100 px-2.5 py-1.5 font-mono text-xs text-gray-700 dark:bg-slate-900 dark:text-slate-300'>
            <FileCodeIcon className='size-3.5 shrink-0 text-gray-500 dark:text-slate-500' />
            <span className='min-w-0 truncate'>{fileLocation}</span>
            <button
              type='button'
              onClick={handleCopyFile}
              className='-mr-1 ml-0.5 shrink-0 rounded-sm p-0.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-slate-800 dark:hover:text-slate-200'
              aria-label={t('project.copy')}
            >
              {isCopiedFile ? (
                <CheckIcon className='size-3.5 text-emerald-500' />
              ) : (
                <ClipboardIcon className='size-3.5' />
              )}
            </button>
          </div>
        ) : null}
      </header>

      {chart}

      <div className='grid grid-cols-1 gap-3 lg:grid-cols-3'>
        {details.stackTrace ? (
          <SectionCard
            className='lg:col-span-2'
            title={
              <span className='inline-flex items-center gap-1.5'>
                <CodeIcon className='size-4 text-gray-500 dark:text-slate-400' />
                {t('project.stackTraceXFrames', {
                  x: stackTraceLines.length,
                })}
              </span>
            }
            actions={
              <>
                <ToolbarButton
                  onClick={handleCopyStackTrace}
                  ariaLabel={t('project.copy')}
                >
                  {isCopiedStack ? (
                    <>
                      <CheckIcon className='size-3.5 text-emerald-500' />
                      {t('project.copied')}
                    </>
                  ) : (
                    <>
                      <ClipboardIcon className='size-3.5' />
                      {t('project.copy')}
                    </>
                  )}
                </ToolbarButton>
                {stackTraceLines.length > STACK_PREVIEW_LINES_COUNT ? (
                  <ToolbarButton
                    onClick={() => setIsStackTraceExpanded((v) => !v)}
                    ariaExpanded={isStackTraceExpanded}
                  >
                    {isStackTraceExpanded ? (
                      <>
                        <CaretUpIcon className='size-3.5' />
                        {t('common.collapse')}
                      </>
                    ) : (
                      <>
                        <CaretDownIcon className='size-3.5' />
                        {t('common.expand')}
                      </>
                    )}
                  </ToolbarButton>
                ) : null}
              </>
            }
            bodyClassName='bg-gray-50/60 dark:bg-slate-950/30'
          >
            <div
              className={cn(
                'font-mono text-xs leading-relaxed',
                isStackTraceExpanded ? 'max-h-104 overflow-auto' : '',
              )}
            >
              <div className='space-y-0.5 px-4 py-3'>
                {(isStackTraceExpanded
                  ? stackTraceLines
                  : stackPreviewLines
                ).map((line, index) => (
                  <div key={index} className='flex'>
                    <span className='mr-3 inline-block w-6 shrink-0 text-right text-gray-400 tabular-nums select-none dark:text-slate-600'>
                      {index + 1}
                    </span>
                    <div className='min-w-0 flex-1'>
                      {formatStackTraceLine(line)}
                    </div>
                  </div>
                ))}
              </div>
              {!isStackTraceExpanded && stackHiddenCount > 0 ? (
                <button
                  type='button'
                  onClick={() => setIsStackTraceExpanded(true)}
                  className='flex w-full items-center justify-center gap-1.5 border-t border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100/60 hover:text-gray-900 dark:border-slate-800/60 dark:text-slate-400 dark:hover:bg-slate-800/40 dark:hover:text-slate-200'
                >
                  <CaretDownIcon className='size-3.5' />
                  {t('project.showMore', { count: stackHiddenCount })}
                </button>
              ) : null}
            </div>
          </SectionCard>
        ) : null}

        <SectionCard
          className={!details.stackTrace ? 'lg:col-span-3' : undefined}
          title={
            <span className='inline-flex items-center gap-1.5'>
              <UsersIcon className='size-4 text-gray-500 dark:text-slate-400' />
              {t('project.affectedSessionsList')}
            </span>
          }
          meta={
            sessionsTotal > 0
              ? sessionsTotal.toLocaleString()
              : sessionsLoading && sessions.length === 0
                ? '…'
                : '0'
          }
        >
          {sessionsLoading && sessions.length === 0 ? (
            <div className='flex items-center justify-center py-8'>
              <Loader className='pt-0!' />
            </div>
          ) : sessions.length === 0 ? (
            <div className='flex items-center justify-center py-10'>
              <Text as='p' size='sm' colour='muted' className='text-center'>
                {t('project.noAffectedSessions')}
              </Text>
            </div>
          ) : (
            <div className='flex flex-col gap-3 p-2'>
              <div className='flex flex-col gap-0.5'>
                {_map(sessions, (session) => (
                  <SessionRow key={session.psid} session={session} />
                ))}
              </div>
              {canLoadMoreSessions ? (
                <Button
                  variant='secondary'
                  size='sm'
                  onClick={() => loadSessions()}
                  disabled={!!sessionsLoading}
                  loading={!!sessionsLoading}
                  className='mx-2 mb-1 justify-center'
                >
                  {t('project.loadMore')}
                </Button>
              ) : null}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}

import _map from 'lodash/map'
import {
  FileCodeIcon,
  CalendarDotsIcon,
  HashIcon,
  ArrowSquareOutIcon,
  UsersIcon,
  PulseIcon,
  CaretDownIcon,
  CaretUpIcon,
  ClipboardIcon,
  CheckIcon,
} from '@phosphor-icons/react'
import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'

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

const STACK_PREVIEW_LINES_COUNT = 5

interface ErrorDetailsProps {
  details: ErrorDetailsResponse['details']
  period?: string
  from?: string
  to?: string
  timeBucket?: string
  projectPassword?: string
}

const StatItem = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
}) => (
  <div className='flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-900/25'>
    <Text
      size='xs'
      weight='medium'
      colour='muted'
      className='flex items-center gap-1.5 tracking-wide uppercase'
    >
      {icon}
      {label}
    </Text>
    <Text size='xl' weight='semibold' colour='primary'>
      {value}
    </Text>
  </div>
)

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
      className='group flex items-start justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 transition-colors hover:border-gray-200 hover:bg-gray-100 dark:border-slate-700/50 dark:bg-slate-900/50 dark:hover:border-slate-600 dark:hover:bg-slate-700/50'
    >
      <div className='flex min-w-0 flex-1 items-start gap-3'>
        <div className='flex shrink-0 items-center gap-2 pt-0.5'>
          {session.cc ? (
            <Flag
              className='rounded-xs'
              country={session.cc}
              size={16}
              alt=''
              aria-hidden='true'
            />
          ) : null}
          <BrowserIcon browser={session.br} />
          <OSIcon os={session.os} theme={theme} />
        </div>
        <div className='flex min-w-0 flex-col gap-0.5'>
          <Text
            size='xs'
            weight='medium'
            truncate
            className='text-gray-900 dark:text-gray-200'
          >
            {session.profileId || t('project.unknownUser')}
          </Text>
          <Text size='xs' colour='muted' truncate>
            {lastErrorAt} · {session.errorCount}{' '}
            {t('project.occurrences').toLowerCase()}
          </Text>
        </div>
      </div>
      <ArrowSquareOutIcon className='mt-0.5 size-4 shrink-0 text-gray-400 transition-colors group-hover:text-gray-600 dark:group-hover:text-gray-300' />
    </Link>
  )
}

export const ErrorDetails = ({
  details,
  period = '7d',
  from = '',
  to = '',
  timeBucket = 'hour',
}: ErrorDetailsProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
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

  const firstSeen = useMemo(() => {
    return getRelativeDateIfPossible(details.first_seen, language)
  }, [details.first_seen, language])

  const lastSeen = useMemo(() => {
    return getRelativeDateIfPossible(details.last_seen, language)
  }, [details.last_seen, language])

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
          <span className='text-slate-500 dark:text-slate-400'>{prefix}</span>
          <span className='font-medium text-slate-700 dark:text-slate-300'>
            {funcName}
          </span>
          {location ? (
            <>
              <span className='text-slate-600 dark:text-slate-400'> (</span>
              <span className='text-slate-800 dark:text-slate-300'>
                {location}
              </span>
              <span className='text-slate-600 dark:text-slate-400'>)</span>
            </>
          ) : null}
        </p>
      )
    }

    if (fileMatch) {
      const [, file, lineNum, colNum] = fileMatch
      return (
        <p>
          <span className='text-slate-800 dark:text-slate-300'>{file}</span>
          <span className='text-slate-500 dark:text-slate-400'>:</span>
          <span className='text-slate-600 dark:text-slate-300'>{lineNum}</span>
          <span className='text-slate-500 dark:text-slate-400'>:</span>
          <span className='text-slate-600 dark:text-slate-300'>{colNum}</span>
        </p>
      )
    }

    return <p className='block text-slate-800 dark:text-slate-300'>{line}</p>
  }

  const stackPreviewLines = stackTraceLines.slice(0, STACK_PREVIEW_LINES_COUNT)
  const stackHiddenCount = Math.max(
    0,
    stackTraceLines.length - STACK_PREVIEW_LINES_COUNT,
  )

  return (
    <div className='space-y-3'>
      <div className='flex flex-col gap-3'>
        <div className='flex items-start justify-between gap-3'>
          <div className='space-y-1.5'>
            <div className='flex items-center gap-3'>
              <Badge label={status.label} colour={status.colour} />
              <div className='flex items-center gap-1.5'>
                <Text size='xs' className='font-mono text-gray-400'>
                  {details.eid}
                </Text>
                <button
                  type='button'
                  onClick={handleCopyEid}
                  className='rounded-md p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-700 dark:hover:text-gray-200'
                  aria-label={t('project.copy')}
                >
                  {isCopiedEid ? (
                    <CheckIcon className='size-3.5 text-green-500' />
                  ) : (
                    <ClipboardIcon className='size-3.5' />
                  )}
                </button>
              </div>
            </div>

            <div>
              <h2 className='text-2xl font-bold wrap-break-word text-gray-900 dark:text-white'>
                {details.name}
              </h2>
              {details.message ? (
                <p className='mt-1 font-mono text-sm wrap-break-word text-gray-600 dark:text-gray-400'>
                  {details.message}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {details.filename ? (
          <div className='flex items-center gap-2'>
            <div className='flex items-center gap-2 rounded-md bg-gray-100 px-3 py-1.5 font-mono text-xs text-gray-600 dark:bg-slate-900 dark:text-gray-300'>
              <FileCodeIcon className='size-3.5 text-gray-500' />
              <span className='break-all'>{fileLocation}</span>
              <button
                type='button'
                onClick={handleCopyFile}
                className='ml-1 rounded-md p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-slate-700 dark:hover:text-gray-200'
                aria-label={t('project.copy')}
              >
                {isCopiedFile ? (
                  <CheckIcon className='size-3.5 text-green-500' />
                ) : (
                  <ClipboardIcon className='size-3.5' />
                )}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
        <StatItem
          icon={<HashIcon className='size-4' />}
          label={t('project.occurrences')}
          value={details.count || 0}
        />
        <StatItem
          icon={<UsersIcon className='size-4' />}
          label={t('dashboard.users')}
          value={details.users || 0}
        />
        <StatItem
          icon={<CalendarDotsIcon className='size-4' />}
          label={t('dashboard.firstSeen')}
          value={firstSeen || '-'}
        />
        <StatItem
          icon={<PulseIcon className='size-4' />}
          label={t('dashboard.lastSeen')}
          value={lastSeen || '-'}
        />
      </div>

      <div className='space-y-3'>
        {details.stackTrace ? (
          <div className='rounded-lg border border-gray-200 bg-white p-5 dark:border-slate-800/60 dark:bg-slate-900/25'>
            <div className='mb-3 flex items-center justify-between gap-3'>
              <Text
                as='h3'
                size='xs'
                weight='semibold'
                colour='primary'
                className='mb-2 uppercase'
                tracking='wide'
              >
                {t('project.stackTraceXFrames', { x: stackTraceLines.length })}
              </Text>
              <div className='flex items-center gap-2'>
                <button
                  type='button'
                  onClick={handleCopyStackTrace}
                  className='flex items-center rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700'
                  aria-label={t('project.copy')}
                >
                  {isCopiedStack ? (
                    <>
                      <CheckIcon className='mr-1 size-3.5 text-green-500' />
                      {t('project.copied')}
                    </>
                  ) : (
                    <>
                      <ClipboardIcon className='mr-1 size-3.5' />
                      {t('project.copy')}
                    </>
                  )}
                </button>
                <button
                  type='button'
                  onClick={() => setIsStackTraceExpanded((v) => !v)}
                  className='flex items-center rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700'
                  aria-expanded={isStackTraceExpanded}
                >
                  {isStackTraceExpanded ? (
                    <>
                      <CaretUpIcon className='mr-1 size-4' />
                      {t('project.showLess')}
                    </>
                  ) : (
                    <>
                      <CaretDownIcon className='mr-1 size-4' />
                      {stackHiddenCount > 0
                        ? t('project.showMore', { count: stackHiddenCount })
                        : t('project.showMore', { count: 0 })}
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className='rounded-lg border border-gray-100 bg-gray-50 dark:border-slate-700 dark:bg-slate-950/50'>
              <div
                className={
                  isStackTraceExpanded ? 'max-h-80 overflow-auto p-3' : 'p-3'
                }
              >
                <div className='space-y-0.5 font-mono text-xs leading-relaxed'>
                  {(isStackTraceExpanded
                    ? stackTraceLines
                    : stackPreviewLines
                  ).map((line, index) => (
                    <div key={index} className='flex'>
                      <span className='mr-3 inline-block w-6 text-right text-gray-400 select-none dark:text-slate-500'>
                        {index + 1}
                      </span>
                      <div className='min-w-0 flex-1'>
                        {formatStackTraceLine(line)}
                      </div>
                    </div>
                  ))}
                  {!isStackTraceExpanded && stackHiddenCount > 0 ? (
                    <div className='pt-2 text-center text-[11px] text-gray-400 dark:text-slate-500'>
                      +{stackHiddenCount}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className='rounded-lg border border-gray-200 bg-white p-5 dark:border-slate-800/60 dark:bg-slate-900/25'>
          <Text
            as='h3'
            size='xs'
            weight='semibold'
            colour='primary'
            className='mb-2 uppercase'
            tracking='wide'
          >
            {t('project.affectedSessionsList')}{' '}
            {sessionsTotal > 0 ? `(${sessionsTotal})` : ''}
          </Text>

          {sessionsLoading && sessions.length === 0 ? (
            <Loader />
          ) : sessions.length === 0 ? (
            <Text as='p' size='sm' colour='muted' className='py-4 text-center'>
              {t('project.noAffectedSessions')}
            </Text>
          ) : (
            <div className='space-y-2'>
              {_map(sessions, (session) => (
                <SessionRow key={session.psid} session={session} />
              ))}

              {canLoadMoreSessions ? (
                <Button
                  onClick={() => loadSessions()}
                  disabled={!!sessionsLoading}
                  loading={!!sessionsLoading}
                  className='mt-3 w-full'
                  secondary
                  regular
                >
                  {t('project.loadMore')}
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

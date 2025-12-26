import { ChevronDownIcon, ChevronUpIcon, ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline'
import _map from 'lodash/map'
import { BugIcon, FileCodeIcon, CalendarIcon, HashIcon, ExternalLinkIcon } from 'lucide-react'
import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'

import { getErrorSessions, type ErrorAffectedSession } from '~/api'
import { BROWSER_LOGO_MAP, OS_LOGO_MAP, OS_LOGO_MAP_DARK } from '~/lib/constants'
import { SwetrixErrorDetails } from '~/lib/models/Project'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import { useTheme } from '~/providers/ThemeProvider'
import { Badge } from '~/ui/Badge'
import Button from '~/ui/Button'
import Flag from '~/ui/Flag'
import Loader from '~/ui/Loader'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'
import { getRelativeDateIfPossible } from '~/utils/date'

interface ErrorDetailsProps {
  details: SwetrixErrorDetails
  period?: string
  from?: string
  to?: string
  timeBucket?: string
  projectPassword?: string
}

const InfoRow = ({ label, value }: { label: React.ReactNode; value: React.ReactNode }) => (
  <div className='flex items-center justify-between gap-3 border-b border-gray-100 py-2 last:border-0 dark:border-slate-700/50'>
    <Text size='sm' colour='muted' className='shrink-0'>
      {label}
    </Text>
    <Text size='sm' weight='medium' colour='primary' className='min-w-0 text-right' truncate>
      {value}
    </Text>
  </div>
)

const StatItem = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) => (
  <div>
    <Text size='xxs' weight='medium' colour='muted' className='mb-0.5 flex items-center gap-1.5 uppercase'>
      {icon}
      {label}
    </Text>
    <Text size='lg' weight='semibold' colour='primary'>
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
      className='flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 transition-colors hover:border-gray-200 hover:bg-gray-100 dark:border-slate-700/50 dark:bg-slate-800/50 dark:hover:border-slate-600 dark:hover:bg-slate-700/50'
    >
      <div className='flex min-w-0 items-center gap-3'>
        <div className='flex items-center gap-2'>
          {session.cc ? <Flag className='rounded-xs' country={session.cc} size={16} alt='' aria-hidden='true' /> : null}
          <BrowserIcon browser={session.br} />
          <OSIcon os={session.os} theme={theme} />
        </div>
        <div className='min-w-0 gap-1'>
          <Text size='xs' weight='medium' truncate>
            {session.profileId || t('project.unknownUser')}
          </Text>
          <Text size='xs' colour='muted'>
            {' · '}
            {lastErrorAt} · {session.errorCount} {t('project.occurrences').toLowerCase()}
          </Text>
        </div>
      </div>
      <ExternalLinkIcon className='size-4 shrink-0 text-gray-400' strokeWidth={1.5} />
    </Link>
  )
}

export const ErrorDetails = ({
  details,
  period = '7d',
  from = '',
  to = '',
  timeBucket = 'hour',
  projectPassword,
}: ErrorDetailsProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const { id } = useCurrentProject()

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

  const status: { label: string; colour: 'red' | 'yellow' | 'slate' } = useMemo(() => {
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
    const shouldExpand = stackTraceLines.length > 0 && stackTraceLines.length <= 8
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
        const result = await getErrorSessions(
          id,
          details.eid,
          timeBucket,
          period,
          from,
          to,
          SESSIONS_TAKE,
          skip,
          projectPassword,
        )

        if (!isMountedRef.current) return

        if (reset) {
          setSessions(result.sessions)
        } else {
          setSessions((prev) => [...prev, ...result.sessions])
        }
        setSessionsTotal(result.total)
        setSessionsSkip(skip + SESSIONS_TAKE)
      } catch (reason) {
        console.error('[ErrorDetails] Failed to load sessions:', reason)
      } finally {
        if (isMountedRef.current) {
          setSessionsLoading(false)
        }
      }
    },
    [id, details.eid, timeBucket, period, from, to, projectPassword, sessionsLoading, sessionsSkip],
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
          <span className='font-medium text-slate-700 dark:text-slate-300'>{funcName}</span>
          {location ? (
            <>
              <span className='text-slate-600 dark:text-slate-400'> (</span>
              <span className='text-slate-800 dark:text-slate-300'>{location}</span>
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

  const errorTitle = details.message ? `${details.name}: ${details.message}` : details.name
  const shouldTruncate = errorTitle.length > 120
  const displayTitle = shouldTruncate ? `${errorTitle.slice(0, 120)}...` : errorTitle

  const stackPreviewCount = 6
  const stackPreviewLines = stackTraceLines.slice(0, stackPreviewCount)
  const stackHiddenCount = Math.max(0, stackTraceLines.length - stackPreviewCount)

  return (
    <div className='space-y-6'>
      <div className='flex items-start gap-3'>
        <div className='flex size-14 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30'>
          <BugIcon className='size-7 text-red-600 dark:text-red-400' strokeWidth={1.5} />
        </div>
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-2'>
            {shouldTruncate ? (
              <Tooltip
                text={errorTitle}
                tooltipNode={<h2 className='text-xl font-bold text-gray-900 dark:text-white'>{displayTitle}</h2>}
              />
            ) : (
              <h2 className='text-xl font-bold text-gray-900 dark:text-white'>{displayTitle}</h2>
            )}
            <Badge label={status.label} colour={status.colour} />
          </div>
          <div className='mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1'>
            {details.filename ? (
              <div className='flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400'>
                <FileCodeIcon className='size-3.5' strokeWidth={1.5} />
                <span className='font-mono text-xs'>
                  {details.filename}
                  {details.lineno ? `:${details.lineno}` : ''}
                  {details.colno ? `:${details.colno}` : ''}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className='flex flex-col gap-3 lg:flex-row'>
        <div className='space-y-3 lg:w-[380px]'>
          <div className='rounded-lg border border-gray-200 bg-white p-5 dark:border-slate-800/60 dark:bg-slate-800/25'>
            <div className='grid grid-cols-2 gap-y-5 sm:grid-cols-3 lg:grid-cols-2'>
              <StatItem
                icon={<HashIcon className='h-3.5 w-3.5' />}
                label={t('project.occurrences')}
                value={details.count || 0}
              />
              <StatItem
                icon={<CalendarIcon className='h-3.5 w-3.5' />}
                label={t('dashboard.firstSeen')}
                value={firstSeen || '-'}
              />
              <StatItem
                icon={<CalendarIcon className='h-3.5 w-3.5' />}
                label={t('dashboard.lastSeen')}
                value={lastSeen || '-'}
              />
            </div>
          </div>

          <div className='rounded-lg border border-gray-200 bg-white p-5 dark:border-slate-800/60 dark:bg-slate-800/25'>
            <Text as='h3' size='xs' weight='semibold' colour='primary' className='mb-2 uppercase' tracking='wide'>
              {t('project.metadata')}
            </Text>
            <div>
              {details.filename ? (
                <InfoRow
                  label={
                    <span className='flex items-center gap-1.5'>
                      <FileCodeIcon className='size-4' strokeWidth={1.5} />
                      File
                    </span>
                  }
                  value={
                    <span className='flex min-w-0 items-center justify-end gap-1.5'>
                      <Tooltip
                        text={fileLocation}
                        tooltipNode={
                          <span className='min-w-0 truncate font-mono text-xs text-gray-700 dark:text-gray-200'>
                            {fileLocation}
                          </span>
                        }
                        delay={0}
                      />
                      <button
                        type='button'
                        onClick={handleCopyFile}
                        className='shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-700 dark:hover:text-gray-200'
                        aria-label={t('project.copy')}
                      >
                        {isCopiedFile ? (
                          <CheckIcon className='size-4 text-green-500' />
                        ) : (
                          <ClipboardIcon className='size-4' />
                        )}
                      </button>
                    </span>
                  }
                />
              ) : null}
              <InfoRow
                label={
                  <span className='flex items-center gap-1.5'>
                    <HashIcon className='size-4' strokeWidth={1.5} />
                    ID
                  </span>
                }
                value={
                  <span className='flex items-center justify-end gap-1.5'>
                    <code className='text-xs text-gray-400'>{details.eid}</code>
                    <button
                      type='button'
                      onClick={handleCopyEid}
                      className='rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-700 dark:hover:text-gray-200'
                      aria-label={t('project.copy')}
                    >
                      {isCopiedEid ? (
                        <CheckIcon className='size-4 text-green-500' />
                      ) : (
                        <ClipboardIcon className='size-4' />
                      )}
                    </button>
                  </span>
                }
              />
            </div>
          </div>
        </div>

        <div className='flex-1 space-y-3'>
          {details.stackTrace ? (
            <div className='rounded-lg border border-gray-200 bg-white p-5 dark:border-slate-800/60 dark:bg-slate-800/25'>
              <div className='mb-3 flex items-center justify-between gap-3'>
                <Text as='h3' size='xs' weight='semibold' colour='primary' className='mb-2 uppercase' tracking='wide'>
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
                        <ChevronUpIcon className='mr-1 size-4' />
                        {t('project.showLess')}
                      </>
                    ) : (
                      <>
                        <ChevronDownIcon className='mr-1 size-4' />
                        {stackHiddenCount > 0
                          ? t('project.showMore', { count: stackHiddenCount })
                          : t('project.showMore', { count: 0 })}
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className='rounded-lg border border-gray-100 bg-gray-50 dark:border-slate-700 dark:bg-slate-900/50'>
                <div className={isStackTraceExpanded ? 'max-h-80 overflow-auto p-3' : 'p-3'}>
                  <div className='space-y-0.5 font-mono text-xs leading-relaxed'>
                    {(isStackTraceExpanded ? stackTraceLines : stackPreviewLines).map((line, index) => (
                      <div key={index} className='flex'>
                        <span className='mr-3 inline-block w-6 text-right text-gray-400 select-none dark:text-slate-500'>
                          {index + 1}
                        </span>
                        <div className='min-w-0 flex-1'>{formatStackTraceLine(line)}</div>
                      </div>
                    ))}
                    {!isStackTraceExpanded && stackHiddenCount > 0 ? (
                      <div className='pt-2 text-center text-[11px] text-gray-400 dark:text-slate-500'>
                        +{stackHiddenCount}{' '}
                        {t('project.showMore', { count: stackHiddenCount })
                          .toLowerCase()
                          .replace(/^\+?\d+\s+/, '')}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className='rounded-lg border border-gray-200 bg-white p-5 dark:border-slate-800/60 dark:bg-slate-800/25'>
            <Text as='h3' size='xs' weight='semibold' colour='primary' className='mb-2 uppercase' tracking='wide'>
              {t('project.affectedSessionsList')} {sessionsTotal > 0 ? `(${sessionsTotal})` : ''}
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
    </div>
  )
}

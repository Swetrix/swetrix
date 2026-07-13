import {
  XIcon,
  UsersIcon,
  WarningCircleIcon,
  CaretRightIcon,
} from '@phosphor-icons/react'
import _map from 'lodash/map'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'

import * as v2api from '~/api/v2/endpoints'
import type { V2Filter } from '~/api/v2/types'
import type { Session as SessionType } from '~/lib/models/Project'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '~/ui/Drawer'
import Loader from '~/ui/Loader'
import Spin from '~/ui/icons/Spin'
import { Switch } from '~/ui/Switch'
import { Link } from '~/ui/Link'
import { Text } from '~/ui/Text'
import Flag from '~/ui/Flag'
import { useTheme } from '~/providers/ThemeProvider'
import { getRelativeDateIfPossible } from '~/utils/date'

import { Session } from '../Sessions/Sessions'
import { BrowserIcon, OSIcon } from '../SharedIcons'

const SESSIONS_TAKE = 30

type SessionEventType = 'traffic' | 'performance' | 'error'

interface ErrorAffectedSession {
  psid: string
  profileId?: string | null
  country: string | null
  os: string | null
  browser: string | null
  firstErrorAt: string
  lastErrorAt: string
  errorCount: number
}

type DrawerSession = SessionType | ErrorAffectedSession

/**
 * Goal and journey sessions have no v2 endpoint yet, so they still go through
 * the v1 analytics proxy. The response uses v1 short keys - map them to the v2
 * readable keys the shared <Session /> renderer expects.
 */
const mapV1SessionKeys = (session: Record<string, any>): SessionType =>
  ({
    ...session,
    country: session.country ?? session.cc ?? null,
    browser: session.browser ?? session.br ?? null,
    duration: session.duration ?? session.sdur,
  }) as SessionType

async function fetchProxySessionsPage(
  action: 'getGoalSessions' | 'getJourneySessions',
  projectId: string,
  params: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<SessionType[]> {
  const response = await fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action,
      projectId,
      params,
    }),
    signal,
  })

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  const result = (await response.json()) as {
    data: { sessions?: Record<string, any>[] } | null
    error: string | null
  }

  if (result.error) {
    throw new Error(result.error)
  }

  return (result.data?.sessions || []).map(mapV1SessionKeys)
}

const isErrorAffectedSession = (
  session: DrawerSession,
): session is ErrorAffectedSession => 'errorCount' in session

const ErrorSession = ({ session }: { session: ErrorAffectedSession }) => {
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

  return (
    <li className='mb-2'>
      <Link
        to={{ search: params.toString() }}
        className='block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-300'
      >
        <div className='relative flex cursor-pointer items-center justify-between gap-x-4 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 transition-colors hover:bg-gray-200/70 sm:px-5 dark:border-slate-800/60 dark:bg-slate-900/25 dark:hover:bg-slate-900/60'>
          <div className='flex min-w-0 flex-1 items-center gap-x-3.5'>
            <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 ring-1 ring-gray-200/50 dark:bg-slate-800 dark:ring-slate-700/50'>
              <Text size='xs' weight='medium' colour='secondary'>
                ?
              </Text>
            </div>
            <div className='flex min-w-0 flex-1 flex-col justify-center gap-2'>
              <div className='flex min-w-0 items-center gap-2'>
                <Text size='sm' weight='semibold' truncate>
                  {session.profileId || t('project.unknownUser')}
                </Text>
              </div>
              <div className='flex flex-wrap items-center gap-x-3 gap-y-2'>
                <div className='flex items-center gap-1.5'>
                  <div className='flex h-[22px] w-[22px] items-center justify-center rounded bg-gray-100/80 ring-1 ring-gray-200/50 dark:bg-slate-800/80 dark:ring-slate-700/50'>
                    {session.country ? (
                      <Flag
                        country={session.country}
                        size={14}
                        className='rounded-[2px]'
                        aria-hidden='true'
                      />
                    ) : (
                      <span className='inline-block h-3.5 w-3.5 rounded-[2px] bg-gray-200 dark:bg-slate-700' />
                    )}
                  </div>
                  <div className='flex h-[22px] w-[22px] items-center justify-center rounded bg-gray-100/80 ring-1 ring-gray-200/50 dark:bg-slate-800/80 dark:ring-slate-700/50'>
                    <OSIcon
                      os={session.os}
                      theme={theme}
                      className='size-3.5'
                    />
                  </div>
                  <div className='flex h-[22px] w-[22px] items-center justify-center rounded bg-gray-100/80 ring-1 ring-gray-200/50 dark:bg-slate-800/80 dark:ring-slate-700/50'>
                    <BrowserIcon
                      browser={session.browser}
                      className='size-3.5'
                    />
                  </div>
                </div>
                <div className='h-3 w-px bg-gray-200 dark:bg-slate-700' />
                <Text
                  as='span'
                  size='xs'
                  colour='secondary'
                  weight='medium'
                  className='tabular-nums'
                >
                  {lastErrorAt || t('project.unknown')} · {session.errorCount}{' '}
                  {t('project.occurrences').toLowerCase()}
                </Text>
              </div>
            </div>
          </div>
          <CaretRightIcon
            className='size-4 shrink-0 text-gray-400'
            aria-hidden='true'
          />
        </div>
      </Link>
    </li>
  )
}

interface SessionsDrawerProps {
  isOpen: boolean
  onClose: () => void
  from?: string
  to?: string
  label: string
  projectId: string
  timezone: string
  timeFormat: '12-hour' | '24-hour'
  filters?: V2Filter[]
  period?: string
  funnelId?: string
  funnelStep?: number
  dropoff?: boolean
  showDropoffToggle?: boolean
  onDropoffChange?: (checked: boolean) => void
  journeyStep?: number
  journeyPage?: string
  goalId?: string
  errorId?: string
  sessionEvent?: SessionEventType
  title?: string
  totalCount?: number
}

export const SessionsDrawer = ({
  isOpen,
  onClose,
  from,
  to,
  label,
  projectId,
  timezone,
  timeFormat,
  filters,
  period = 'custom',
  funnelId,
  funnelStep,
  dropoff,
  showDropoffToggle,
  onDropoffChange,
  journeyStep,
  journeyPage,
  goalId,
  errorId,
  sessionEvent,
  title,
  totalCount,
}: SessionsDrawerProps) => {
  const { t } = useTranslation('common')
  const stableFilters = useMemo(() => filters ?? [], [filters])
  const isFunnelMode = !!(funnelId && funnelStep)
  const isJourneyMode = !!(journeyStep && journeyPage)
  const isGoalMode = !!goalId
  const isErrorMode = !!errorId
  const [sessions, setSessions] = useState<DrawerSession[]>([])
  const [skip, setSkip] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const loadSessions = useCallback(
    async (
      currentSkip: number,
      append: boolean,
      signal?: AbortSignal,
    ): Promise<boolean> => {
      let newSessions: DrawerSession[] = []

      // v2 accepts ISO datetimes for from/to; fall back to the period
      // otherwise (backend defaults 'custom' without a range)
      const commonParams = {
        ...(from && to ? { from, to } : { period }),
        timezone,
        filters: stableFilters,
      }

      try {
        if (isFunnelMode) {
          const result = await v2api.getFunnelSessions(
            projectId,
            {
              ...commonParams,
              funnelId,
              step: funnelStep!,
              dropoff,
              limit: SESSIONS_TAKE,
              offset: currentSkip,
            },
            signal,
          )
          newSessions = result.data as unknown as SessionType[]
        } else if (isErrorMode) {
          const result = await v2api.getErrorSessions(
            projectId,
            errorId!,
            {
              ...commonParams,
              limit: SESSIONS_TAKE,
              offset: currentSkip,
            },
            signal,
          )
          newSessions = result.data as unknown as ErrorAffectedSession[]
        } else if (isJourneyMode) {
          newSessions = await fetchProxySessionsPage(
            'getJourneySessions',
            projectId,
            {
              period,
              from,
              to,
              timezone,
              step: journeyStep,
              page: journeyPage,
              filters: stableFilters,
              take: SESSIONS_TAKE,
              skip: currentSkip,
            },
            signal,
          )
        } else if (isGoalMode) {
          newSessions = await fetchProxySessionsPage(
            'getGoalSessions',
            projectId,
            {
              period,
              from,
              to,
              timezone,
              goalId,
              take: SESSIONS_TAKE,
              skip: currentSkip,
            },
            signal,
          )
        } else {
          const result = await v2api.getSessionsList(
            projectId,
            {
              ...commonParams,
              event_type: sessionEvent,
              limit: SESSIONS_TAKE,
              offset: currentSkip,
            },
            signal,
          )
          newSessions = result.data as unknown as SessionType[]
        }
      } catch (e) {
        if (signal?.aborted) return false
        setError(
          e instanceof Error
            ? e.message
            : t('apiNotifications.somethingWentWrong'),
        )
        return false
      }

      if (signal?.aborted) return false

      setError(null)

      if (append) {
        setSessions((prev) => [...prev, ...newSessions])
      } else {
        setSessions(newSessions)
      }

      setHasMore(newSessions.length >= SESSIONS_TAKE)

      return true
    },
    [
      projectId,
      period,
      from,
      to,
      timezone,
      isFunnelMode,
      isJourneyMode,
      isGoalMode,
      isErrorMode,
      funnelId,
      funnelStep,
      dropoff,
      journeyStep,
      journeyPage,
      goalId,
      errorId,
      sessionEvent,
      stableFilters,
      t,
    ],
  )

  useEffect(() => {
    if (!isOpen) return

    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    setInitialLoading(true)
    setSessions([])
    setSkip(0)
    setHasMore(true)
    setError(null)

    const timer = setTimeout(() => {
      loadSessions(0, false, controller.signal).finally(() => {
        if (!controller.signal.aborted) {
          setInitialLoading(false)
        }
      })
    }, 200)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [isOpen, period, from, to, loadSessions])

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return
    loadingRef.current = true
    setLoadingMore(true)

    try {
      const nextSkip = skip + SESSIONS_TAKE
      const success = await loadSessions(
        nextSkip,
        true,
        abortControllerRef.current?.signal,
      )
      if (success) {
        setSkip(nextSkip)
      }
    } finally {
      loadingRef.current = false
      setLoadingMore(false)
    }
  }, [skip, hasMore, loadSessions])

  useEffect(() => {
    if (!isOpen || initialLoading || !hasMore) return

    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore()
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '200px',
      },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [isOpen, initialLoading, hasMore, loadMore])

  return (
    <Drawer
      direction='right'
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DrawerContent>
        <DrawerHeader>
          <div className='flex items-start justify-between'>
            <div className='min-w-0'>
              <DrawerTitle>{title || t('project.sessions')}</DrawerTitle>
              <DrawerDescription>{label}</DrawerDescription>
              {isFunnelMode && showDropoffToggle ? (
                <Switch
                  checked={Boolean(dropoff)}
                  onChange={onDropoffChange}
                  label={t('project.dropoffSessionsOnly')}
                  className='mt-3'
                />
              ) : null}
            </div>
            <div className='ml-3 flex shrink-0 items-center gap-2'>
              {!initialLoading &&
              (totalCount != null || sessions.length > 0) ? (
                <Text
                  as='span'
                  size='xs'
                  weight='medium'
                  colour='muted'
                  className='inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 dark:bg-slate-800'
                >
                  <UsersIcon className='size-3.5' />
                  {totalCount != null ? (
                    totalCount
                  ) : (
                    <>
                      {sessions.length}
                      {hasMore ? '+' : ''}
                    </>
                  )}
                </Text>
              ) : null}
              <DrawerClose asChild>
                <button
                  type='button'
                  className='rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-gray-300'
                >
                  <Text as='span' className='sr-only'>
                    {t('common.close')}
                  </Text>
                  <XIcon className='size-5' />
                </button>
              </DrawerClose>
            </div>
          </div>
        </DrawerHeader>

        <div
          ref={scrollContainerRef}
          className='no-scrollbar flex-1 overflow-y-auto px-4 py-3 sm:px-5'
        >
          {initialLoading ? (
            <div className='flex items-center justify-center py-16'>
              <Loader />
            </div>
          ) : error && sessions.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-16 text-center'>
              <WarningCircleIcon
                className='size-10 text-red-400 dark:text-red-500'
                weight='duotone'
              />
              <Text as='p' size='sm' colour='muted' className='mt-3'>
                {error}
              </Text>
            </div>
          ) : sessions.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-16 text-center'>
              <UsersIcon
                className='size-10 text-gray-300 dark:text-slate-600'
                weight='duotone'
              />
              <Text as='p' size='sm' colour='muted' className='mt-3'>
                {t('project.noSessionsFound')}
              </Text>
            </div>
          ) : (
            <>
              <ul>
                {_map(sessions, (session) =>
                  isErrorAffectedSession(session) ? (
                    <ErrorSession key={session.psid} session={session} />
                  ) : (
                    <Session
                      key={session.psid}
                      session={session}
                      timeFormat={timeFormat}
                      timezone={timezone}
                    />
                  ),
                )}
              </ul>
              {hasMore ? (
                <div
                  ref={sentinelRef}
                  className='flex items-center justify-center py-4'
                >
                  {loadingMore ? (
                    <Spin className='text-gray-400 dark:text-slate-500' />
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

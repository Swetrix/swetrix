import { XIcon, UsersIcon, WarningCircleIcon } from '@phosphor-icons/react'
import _map from 'lodash/map'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { SessionsResponse } from '~/api/api.server'
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

import { Session } from '../Sessions/Sessions'

const SESSIONS_TAKE = 30

async function fetchSessionsPage(
  projectId: string,
  params: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<SessionsResponse | null> {
  const response = await fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'getSessions',
      projectId,
      params,
    }),
    signal,
  })

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  const result = (await response.json()) as {
    data: SessionsResponse | null
    error: string | null
  }

  if (result.error) {
    throw new Error(result.error)
  }

  return result.data
}

interface SessionsDrawerProps {
  isOpen: boolean
  onClose: () => void
  from: string
  to: string
  label: string
  projectId: string
  timezone: string
  timeFormat: '12-hour' | '24-hour'
  filters?: any[]
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
}: SessionsDrawerProps) => {
  const { t } = useTranslation('common')
  const stableFilters = useMemo(() => filters ?? [], [filters])
  const [sessions, setSessions] = useState<SessionType[]>([])
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
      let result: SessionsResponse | null = null

      try {
        result = await fetchSessionsPage(
          projectId,
          {
            period: 'custom',
            from,
            to,
            timezone,
            filters: stableFilters,
            take: SESSIONS_TAKE,
            skip: currentSkip,
          },
          signal,
        )
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

      if (result) {
        const newSessions = result.sessions ?? []
        if (append) {
          setSessions((prev) => [...prev, ...newSessions])
        } else {
          setSessions(newSessions)
        }
        setHasMore(newSessions.length >= SESSIONS_TAKE)
      }

      return true
    },
    [projectId, from, to, timezone, stableFilters, t],
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

    // Delay fetching slightly to allow the drawer animation to run smoothly without layout shifts
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
  }, [isOpen, from, to, loadSessions])

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
              <DrawerTitle>{t('project.sessions')}</DrawerTitle>
              <DrawerDescription>{label}</DrawerDescription>
            </div>
            <div className='ml-3 flex shrink-0 items-center gap-2'>
              {!initialLoading && sessions.length > 0 ? (
                <span className='inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-slate-800 dark:text-gray-300'>
                  <UsersIcon className='size-3.5' />
                  {sessions.length}
                  {hasMore ? '+' : ''}
                </span>
              ) : null}
              <DrawerClose asChild>
                <button
                  type='button'
                  className='rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-gray-300'
                >
                  <span className='sr-only'>{t('common.close')}</span>
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
              <span className='mt-3 text-sm text-gray-500 dark:text-gray-400'>
                {error}
              </span>
            </div>
          ) : sessions.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-16 text-center'>
              <UsersIcon
                className='size-10 text-gray-300 dark:text-slate-600'
                weight='duotone'
              />
              <span className='mt-3 text-sm text-gray-500 dark:text-gray-400'>
                {t('project.noSessionsFound')}
              </span>
            </div>
          ) : (
            <>
              <ul>
                {_map(sessions, (session) => (
                  <Session
                    key={session.psid}
                    session={session}
                    timeFormat={timeFormat}
                  />
                ))}
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

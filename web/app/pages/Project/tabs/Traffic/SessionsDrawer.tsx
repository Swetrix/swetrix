import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react'
import { XIcon, UsersIcon } from '@phosphor-icons/react'
import _map from 'lodash/map'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { SessionsResponse } from '~/api/api.server'
import type { Session as SessionType } from '~/lib/models/Project'
import Loader from '~/ui/Loader'
import Spin from '~/ui/icons/Spin'
import { Text } from '~/ui/Text'

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

  if (!response.ok) return null

  const result = (await response.json()) as {
    data: SessionsResponse | null
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
  const sentinelRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const loadSessions = useCallback(
    async (currentSkip: number, append: boolean, signal?: AbortSignal) => {
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
      } catch {
        return
      }

      if (signal?.aborted) return

      if (result) {
        const newSessions = result.sessions ?? []
        if (append) {
          setSessions((prev) => [...prev, ...newSessions])
        } else {
          setSessions(newSessions)
        }
        setHasMore(newSessions.length >= SESSIONS_TAKE)
      }
    },
    [projectId, from, to, timezone, stableFilters],
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

    loadSessions(0, false, controller.signal).finally(() => {
      if (!controller.signal.aborted) {
        setInitialLoading(false)
      }
    })

    return () => {
      controller.abort()
    }
  }, [isOpen, from, to, loadSessions])

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return
    loadingRef.current = true
    setLoadingMore(true)

    try {
      const nextSkip = skip + SESSIONS_TAKE
      setSkip(nextSkip)
      await loadSessions(nextSkip, true, abortControllerRef.current?.signal)
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
    <Dialog className='relative z-50' open={isOpen} onClose={onClose}>
      <DialogBackdrop
        transition
        className='fixed inset-0 bg-gray-500/50 transition-opacity duration-300 ease-out data-closed:opacity-0 dark:bg-black/60'
      />

      <div className='fixed inset-0 overflow-hidden'>
        <div className='absolute inset-0 overflow-hidden'>
          <div className='pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10'>
            <DialogPanel
              transition
              className='pointer-events-auto w-screen max-w-lg transform-gpu transition-transform duration-300 ease-out data-closed:translate-x-full data-closed:duration-200'
            >
              <div className='flex h-full flex-col bg-white shadow-xl dark:bg-slate-900'>
                {/* Header */}
                <div className='border-b border-gray-200 px-4 py-4 sm:px-5 dark:border-slate-700/80'>
                  <div className='flex items-start justify-between'>
                    <div className='min-w-0'>
                      <DialogTitle className='text-base font-semibold text-gray-900 dark:text-gray-50'>
                        {t('project.sessions')}
                      </DialogTitle>
                      <Text className='mt-0.5 truncate text-sm'>{label}</Text>
                    </div>
                    <div className='ml-3 flex shrink-0 items-center gap-2'>
                      {!initialLoading && sessions.length > 0 ? (
                        <span className='inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-slate-800 dark:text-gray-300'>
                          <UsersIcon className='size-3.5' />
                          {sessions.length}
                          {hasMore ? '+' : ''}
                        </span>
                      ) : null}
                      <button
                        type='button'
                        onClick={onClose}
                        className='rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-gray-300'
                      >
                        <span className='sr-only'>{t('common.close')}</span>
                        <XIcon className='size-5' />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div
                  ref={scrollContainerRef}
                  className='flex-1 overflow-y-auto px-4 py-3 sm:px-5'
                >
                  {initialLoading ? (
                    <div className='flex items-center justify-center py-16'>
                      <Loader />
                    </div>
                  ) : sessions.length === 0 ? (
                    <div className='flex flex-col items-center justify-center py-16 text-center'>
                      <UsersIcon
                        className='size-10 text-gray-300 dark:text-slate-600'
                        weight='duotone'
                      />
                      <Text className='mt-3 text-sm'>
                        {t('project.noSessionsFound')}
                      </Text>
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
              </div>
            </DialogPanel>
          </div>
        </div>
      </div>
    </Dialog>
  )
}

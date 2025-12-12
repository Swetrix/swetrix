import { XCircleIcon } from '@heroicons/react/24/outline'
import cx from 'clsx'
import _isEmpty from 'lodash/isEmpty'
import { DownloadIcon } from 'lucide-react'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'

import { getSessions, getSession } from '~/api'
import { Session, SessionDetails as SessionDetailsType } from '~/lib/models/Project'
import DashboardHeader from '~/pages/Project/View/components/DashboardHeader'
import Filters from '~/pages/Project/View/components/Filters'
import NoEvents from '~/pages/Project/View/components/NoEvents'
import { SessionDetailView } from '~/pages/Project/View/components/SessionDetailView'
import { Sessions } from '~/pages/Project/View/components/Sessions'
import { useViewProjectContext } from '~/pages/Project/View/ViewProject'
import { getFormatDate } from '~/pages/Project/View/ViewProject.helpers'
import { useCurrentProject, useProjectPassword } from '~/providers/CurrentProjectProvider'
import Spin from '~/ui/icons/Spin'
import Loader from '~/ui/Loader'
import routes from '~/utils/routes'

const SESSIONS_TAKE = 30

interface PageflowItem {
  type: 'pageview' | 'event' | 'error'
  value: string
  created: string
  metadata?: { key: string; value: string }[]
}

interface ActiveSession {
  details: SessionDetailsType
  chart?: {
    x: string[]
    pageviews?: number[]
    customEvents?: number[]
    errors?: number[]
  }
  pages?: PageflowItem[]
  timeBucket?: string
}

interface SessionsViewProps {
  tnMapping: Record<string, string>
  chartType: string
  rotateXAxis: boolean
}

const SessionsView = ({ tnMapping, chartType, rotateXAxis }: SessionsViewProps) => {
  const { id, project } = useCurrentProject()
  const projectPassword = useProjectPassword(id)
  const { sessionsRefreshTrigger, timezone, period, dateRange, filters, timeFormat } = useViewProjectContext()
  const { t } = useTranslation('common')
  const [searchParams] = useSearchParams()

  // Session list state
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionsLoading, setSessionsLoading] = useState<boolean | null>(null)
  const [sessionsSkip, setSessionsSkip] = useState(0)
  const [canLoadMoreSessions, setCanLoadMoreSessions] = useState(false)
  const sessionsRequestIdRef = useRef(0)

  // Session detail state
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null)
  const [sessionLoading, setSessionLoading] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const isMountedRef = useRef(true)
  const prevActivePSIDRef = useRef<string | null>(null)
  const skipNextSessionsAutoLoadRef = useRef(false)

  const activePSID = useMemo(() => {
    return searchParams.get('psid')
  }, [searchParams])

  // Search params without the session id. Needed for the back button.
  const pureSearchParams = useMemo(() => {
    const newSearchParams = new URLSearchParams(searchParams.toString())
    newSearchParams.delete('psid')
    return newSearchParams.toString()
  }, [searchParams])

  const dataNames = useMemo(
    () => ({
      pageviews: t('dashboard.pageviews'),
      customEvents: t('dashboard.events'),
      errors: t('dashboard.errors'),
    }),
    [t],
  )

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Reset sessions when filters change
  useEffect(() => {
    sessionsRequestIdRef.current += 1
    setSessionsSkip(0)
    setSessions([])
    setSessionsLoading(null)
  }, [filters])

  const loadSessions = async (forcedSkip?: number, override?: boolean) => {
    if (sessionsLoading) {
      return
    }

    const requestId = sessionsRequestIdRef.current
    setSessionsLoading(true)

    try {
      const skip = typeof forcedSkip === 'number' ? forcedSkip : sessionsSkip
      let dataSessions: { sessions: Session[] }
      let from
      let to

      if (dateRange) {
        from = getFormatDate(dateRange[0])
        to = getFormatDate(dateRange[1])
      }

      if (period === 'custom' && dateRange) {
        dataSessions = await getSessions(id, '', filters, from, to, SESSIONS_TAKE, skip, timezone, projectPassword)
      } else {
        dataSessions = await getSessions(id, period, filters, '', '', SESSIONS_TAKE, skip, timezone, projectPassword)
      }

      if (requestId === sessionsRequestIdRef.current && isMountedRef.current) {
        if (override) {
          setSessions(dataSessions?.sessions || [])
        } else {
          setSessions((prev) => [...prev, ...(dataSessions?.sessions || [])])
        }
        setSessionsSkip((prev) => {
          if (typeof forcedSkip === 'number') {
            return SESSIONS_TAKE + forcedSkip
          }

          return SESSIONS_TAKE + prev
        })

        if (dataSessions?.sessions?.length < SESSIONS_TAKE) {
          setCanLoadMoreSessions(false)
        } else {
          setCanLoadMoreSessions(true)
        }
      }
    } catch (reason: any) {
      console.error('[ERROR](loadSessions) Loading sessions data failed:', reason)
      if (isMountedRef.current) {
        setError(reason?.message || reason?.toString() || 'Unknown error')
      }
    } finally {
      if (requestId === sessionsRequestIdRef.current && isMountedRef.current) {
        setSessionsLoading(false)
      }
    }
  }

  const loadSession = async (psid: string) => {
    if (sessionLoading) {
      return
    }

    setSessionLoading(true)

    try {
      const session = await getSession(id, psid, timezone, projectPassword)
      if (isMountedRef.current) {
        setActiveSession(session)
      }
    } catch (reason: any) {
      console.error('[ERROR] (loadSession)(getSession)', reason)
      if (isMountedRef.current) {
        setError(reason?.message || reason?.toString() || 'Unknown error')
      }
    } finally {
      if (isMountedRef.current) {
        setSessionLoading(false)
      }
    }
  }

  // Handle session detail loading
  useEffect(() => {
    if (!activePSID) {
      setActiveSession(null)
      // Coming back from a session detail to the list: reset pagination and reload first page
      if (prevActivePSIDRef.current) {
        skipNextSessionsAutoLoadRef.current = true
        setSessionsSkip(0)
        loadSessions(0, true)
      }
      prevActivePSIDRef.current = null
      return
    }

    loadSession(activePSID)
    prevActivePSIDRef.current = activePSID
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, dateRange, activePSID])

  // Load sessions list
  useEffect(() => {
    if (!project || activePSID) {
      return
    }

    if (skipNextSessionsAutoLoadRef.current) {
      skipNextSessionsAutoLoadRef.current = false
      return
    }

    loadSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, filters, id, period, timezone, project, activePSID])

  // Handle refresh trigger
  useEffect(() => {
    if (sessionsRefreshTrigger > 0) {
      if (activePSID) {
        loadSession(activePSID)
      } else {
        setSessionsSkip(0)
        loadSessions(0, true)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionsRefreshTrigger])

  const refreshStats = () => {
    if (activePSID) {
      loadSession(activePSID)
    } else {
      setSessionsSkip(0)
      loadSessions(0, true)
    }
  }

  if (error && sessionsLoading === false) {
    return (
      <div className='bg-gray-50 px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8 dark:bg-slate-900'>
        <div className='mx-auto max-w-max'>
          <main className='sm:flex'>
            <XCircleIcon className='h-12 w-12 text-red-400' aria-hidden='true' />
            <div className='sm:ml-6'>
              <div className='max-w-prose sm:border-l sm:border-gray-200 sm:pl-6'>
                <h1 className='text-4xl font-extrabold text-gray-900 sm:text-5xl dark:text-gray-50'>
                  {t('apiNotifications.somethingWentWrong')}
                </h1>
                <p className='mt-4 text-2xl font-medium text-gray-700 dark:text-gray-200'>
                  {t('apiNotifications.errorCode', { error })}
                </p>
              </div>
              <div className='mt-8 flex space-x-3 sm:border-l sm:border-transparent sm:pl-6'>
                <button
                  type='button'
                  onClick={() => window.location.reload()}
                  className='inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-hidden'
                >
                  {t('dashboard.reloadPage')}
                </button>
                <Link
                  to={routes.contact}
                  className='inline-flex items-center rounded-md border border-transparent bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-hidden dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700 dark:focus:ring-gray-50'
                >
                  {t('notFoundPage.support')}
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // Session Detail View
  if (activePSID) {
    return (
      <>
        <DashboardHeader backLink={`?${pureSearchParams}`} showLiveVisitors={false} />
        <SessionDetailView
          activeSession={activeSession}
          sessionLoading={sessionLoading}
          timeFormat={timeFormat}
          chartType={chartType}
          rotateXAxis={rotateXAxis}
          dataNames={dataNames}
        />
      </>
    )
  }

  // Sessions List View
  return (
    <>
      <DashboardHeader showLiveVisitors />
      <div className='mt-4'>
        {!_isEmpty(sessions) ? <Filters tnMapping={tnMapping} /> : null}
        {(sessionsLoading === null || sessionsLoading) && _isEmpty(sessions) ? <Loader /> : null}
        {typeof sessionsLoading === 'boolean' && !sessionsLoading && _isEmpty(sessions) ? (
          <NoEvents filters={filters} />
        ) : null}
        <Sessions sessions={sessions} timeFormat={timeFormat} />
        {canLoadMoreSessions ? (
          <button
            type='button'
            title={t('project.loadMore')}
            onClick={() => loadSessions()}
            className={cx(
              'relative mx-auto mt-2 flex items-center rounded-md border border-transparent p-2 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:bg-slate-900 dark:text-gray-50 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200',
              {
                'cursor-not-allowed opacity-50': sessionsLoading || sessionsLoading === null,
                hidden: sessionsLoading && _isEmpty(sessions),
              },
            )}
          >
            {sessionsLoading ? (
              <Spin className='mr-2 size-5' />
            ) : (
              <DownloadIcon className='mr-2 h-5 w-5' strokeWidth={1.5} />
            )}
            {t('project.loadMore')}
          </button>
        ) : null}
      </div>
    </>
  )
}

export default SessionsView

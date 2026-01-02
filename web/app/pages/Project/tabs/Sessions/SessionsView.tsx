import cx from 'clsx'
import _isEmpty from 'lodash/isEmpty'
import { DownloadIcon } from 'lucide-react'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import { getSessions, getSession } from '~/api'
import { Session, SessionDetails as SessionDetailsType } from '~/lib/models/Project'
import { SessionDetailView } from '~/pages/Project/tabs/Sessions/SessionDetailView'
import { Sessions } from '~/pages/Project/tabs/Sessions/Sessions'
import DashboardHeader from '~/pages/Project/View/components/DashboardHeader'
import Filters from '~/pages/Project/View/components/Filters'
import NoEvents from '~/pages/Project/View/components/NoEvents'
import { useViewProjectContext } from '~/pages/Project/View/ViewProject'
import { getFormatDate } from '~/pages/Project/View/ViewProject.helpers'
import { useCurrentProject, useProjectPassword } from '~/providers/CurrentProjectProvider'
import Spin from '~/ui/icons/Spin'
import Loader from '~/ui/Loader'
import LoadingBar from '~/ui/LoadingBar'
import StatusPage from '~/ui/StatusPage'
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
  rotateXAxis: boolean
}

const SessionsView = ({ tnMapping, rotateXAxis }: SessionsViewProps) => {
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

  if (error && sessionsLoading === false) {
    return (
      <StatusPage
        type='error'
        title={t('apiNotifications.somethingWentWrong')}
        description={t('apiNotifications.errorCode', { error })}
        actions={[
          { label: t('dashboard.reloadPage'), onClick: () => window.location.reload(), primary: true },
          { label: t('notFoundPage.support'), to: routes.contact },
        ]}
      />
    )
  }

  // Session Detail View
  if (activePSID) {
    return (
      <>
        <DashboardHeader
          backLink={`?${pureSearchParams}`}
          backButtonLabel={t('project.backToSessions')}
          showLiveVisitors={false}
        />
        <SessionDetailView
          activeSession={activeSession}
          sessionLoading={sessionLoading}
          timeFormat={timeFormat}
          rotateXAxis={rotateXAxis}
          dataNames={dataNames}
          websiteUrl={project?.websiteUrl}
        />
      </>
    )
  }

  // Sessions List View
  return (
    <>
      <DashboardHeader showLiveVisitors />
      {sessionsLoading && !_isEmpty(sessions) ? <LoadingBar /> : null}
      <div>
        {!_isEmpty(sessions) ? <Filters className='mb-3' tnMapping={tnMapping} /> : null}
        {(sessionsLoading === null || sessionsLoading) && _isEmpty(sessions) ? <Loader /> : null}
        {typeof sessionsLoading === 'boolean' && !sessionsLoading && _isEmpty(sessions) ? (
          <NoEvents filters={filters} />
        ) : null}
        <Sessions sessions={sessions} timeFormat={timeFormat} currency={project?.revenueCurrency} />
        {canLoadMoreSessions ? (
          <button
            type='button'
            title={t('project.loadMore')}
            onClick={() => loadSessions()}
            className={cx(
              'relative mx-auto mt-2 flex items-center rounded-md border border-transparent p-2 text-sm font-medium text-gray-700 ring-inset hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:bg-slate-900 dark:text-gray-50 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200',
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

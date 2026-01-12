import cx from 'clsx'
import _isEmpty from 'lodash/isEmpty'
import { DownloadIcon } from 'lucide-react'
import { Component, useState, useEffect, useMemo, useRef, Suspense, use } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams, useLoaderData, useRevalidator } from 'react-router'

import type { SessionsResponse, SessionDetailsResponse } from '~/api/api.server'
import { useSessionsProxy } from '~/hooks/useAnalyticsProxy'
import { Session, SessionDetails as SessionDetailsType } from '~/lib/models/Project'
import NoSessions from '~/pages/Project/tabs/Sessions/components/NoSessions'
import { SessionDetailView } from '~/pages/Project/tabs/Sessions/SessionDetailView'
import { Sessions } from '~/pages/Project/tabs/Sessions/Sessions'
import DashboardHeader from '~/pages/Project/View/components/DashboardHeader'
import Filters from '~/pages/Project/View/components/Filters'
import { useViewProjectContext, useRefreshTriggers } from '~/pages/Project/View/ViewProject'
import { getFormatDate } from '~/pages/Project/View/ViewProject.helpers'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import type { ProjectLoaderData } from '~/routes/projects.$id'
import Spin from '~/ui/icons/Spin'
import Loader from '~/ui/Loader'
import LoadingBar from '~/ui/LoadingBar'
import StatusPage from '~/ui/StatusPage'
import routes from '~/utils/routes'

interface SessionsErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class SessionsErrorBoundary extends Component<{ children: ReactNode }, SessionsErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): SessionsErrorBoundaryState {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <StatusPage
          type='error'
          title='Failed to load sessions'
          description={this.state.error?.message || 'An unexpected error occurred'}
          actions={[
            { label: 'Reload page', onClick: () => window.location.reload(), primary: true },
            { label: 'Support', to: routes.contact },
          ]}
        />
      )
    }

    return this.props.children
  }
}

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

interface DeferredSessionsData {
  sessionsData: SessionsResponse | null
  sessionDetails: SessionDetailsResponse | null
}

function SessionsDataResolver({ children }: { children: (data: DeferredSessionsData) => React.ReactNode }) {
  const { sessionsData: sessionsDataPromise, sessionDetails: sessionDetailsPromise } =
    useLoaderData<ProjectLoaderData>()

  const sessionsData = sessionsDataPromise ? use(sessionsDataPromise) : null
  const sessionDetails = sessionDetailsPromise ? use(sessionDetailsPromise) : null

  return <>{children({ sessionsData, sessionDetails })}</>
}

function SessionsViewWrapper(props: SessionsViewProps) {
  return (
    <SessionsErrorBoundary>
      <Suspense fallback={<Loader />}>
        <SessionsDataResolver>
          {(deferredData) => <SessionsViewInner {...props} deferredData={deferredData} />}
        </SessionsDataResolver>
      </Suspense>
    </SessionsErrorBoundary>
  )
}

interface SessionsViewInnerProps extends SessionsViewProps {
  deferredData: DeferredSessionsData
}

const SessionsViewInner = ({ tnMapping, rotateXAxis, deferredData }: SessionsViewInnerProps) => {
  const { id, project } = useCurrentProject()
  const revalidator = useRevalidator()
  const { sessionsRefreshTrigger } = useRefreshTriggers()
  const { timezone, period, dateRange, filters, timeFormat } = useViewProjectContext()
  const { t } = useTranslation('common')
  const [searchParams] = useSearchParams()

  // Proxy for pagination
  const sessionsProxy = useSessionsProxy()

  // Session list state - derived from loader
  const [sessions, setSessions] = useState<Session[]>(() => deferredData.sessionsData?.sessions || [])
  const [sessionsSkip, setSessionsSkip] = useState(SESSIONS_TAKE)
  const [canLoadMoreSessions, setCanLoadMoreSessions] = useState(
    () => (deferredData.sessionsData?.sessions?.length || 0) >= SESSIONS_TAKE,
  )

  // Session detail - derived from loader when available
  const activeSession: ActiveSession | null = useMemo(() => {
    if (deferredData.sessionDetails) {
      const apiDetails = deferredData.sessionDetails.details
      const details: SessionDetailsType = {
        cc: apiDetails.cc,
        os: apiDetails.os,
        osv: null,
        br: apiDetails.br,
        brv: null,
        lc: null,
        ref: null,
        so: null,
        me: null,
        ca: null,
        te: null,
        co: null,
        rg: null,
        ct: null,
        dv: apiDetails.dv,
        profileId: apiDetails.profileId,
        sdur: apiDetails.sdur,
        isLive: false,
      }
      return {
        details,
        chart: deferredData.sessionDetails.chart,
        pages: deferredData.sessionDetails.pages,
        timeBucket: deferredData.sessionDetails.timeBucket,
      }
    }
    return null
  }, [deferredData.sessionDetails])

  const sessionsLoading = revalidator.state === 'loading' || sessionsProxy.isLoading

  const [error, setError] = useState<string | null>(null)

  const isMountedRef = useRef(true)

  // Track when loader data was last applied to detect stale proxy responses
  const loaderUpdateCounterRef = useRef(0)
  const proxyRequestCounterRef = useRef(0)

  // Track if we've shown content in the current data set to prevent NoSessions flash during exit animation
  const hasShownContentRef = useRef(false)

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

  // Sync sessions state when loader provides new data
  useEffect(() => {
    if (deferredData.sessionsData && revalidator.state === 'idle') {
      const sessionsList = deferredData.sessionsData.sessions || []
      setSessions(sessionsList)
      setSessionsSkip(SESSIONS_TAKE)
      setCanLoadMoreSessions(sessionsList.length >= SESSIONS_TAKE)
      // Increment counter to invalidate any in-flight proxy responses
      loaderUpdateCounterRef.current += 1
      // Reset content tracking when loader provides empty results (e.g., after filter change)
      if (_isEmpty(sessionsList)) {
        hasShownContentRef.current = false
      } else {
        hasShownContentRef.current = true
      }
    }
  }, [revalidator.state, deferredData.sessionsData])

  // Handle proxy response for pagination
  useEffect(() => {
    if (revalidator.state === 'loading') return

    if (sessionsProxy.data && !sessionsProxy.isLoading) {
      // Ignore stale proxy responses that were initiated before the last loader update
      if (proxyRequestCounterRef.current < loaderUpdateCounterRef.current) {
        return
      }

      const newSessions = sessionsProxy.data.sessions || []
      setSessions((prev) => {
        // Deduplicate: only add sessions whose psid is not already present
        const existingIds = new Set(prev.map((s) => s.psid))
        const uniqueNewSessions = newSessions.filter((s) => !existingIds.has(s.psid))
        return [...prev, ...uniqueNewSessions]
      })
      setSessionsSkip((prev) => prev + SESSIONS_TAKE)
      setCanLoadMoreSessions(newSessions.length >= SESSIONS_TAKE)
    }
    if (sessionsProxy.error) {
      setError(sessionsProxy.error)
    }
  }, [sessionsProxy.data, sessionsProxy.error, sessionsProxy.isLoading, revalidator.state])

  // Load more sessions via proxy
  const loadMoreSessions = () => {
    if (sessionsLoading) return

    let from: string | undefined
    let to: string | undefined

    if (dateRange) {
      from = getFormatDate(dateRange[0])
      to = getFormatDate(dateRange[1])
    }

    // Track when this proxy request was initiated relative to loader updates
    proxyRequestCounterRef.current = loaderUpdateCounterRef.current

    sessionsProxy.fetchSessions(id, {
      timeBucket: 'day',
      period: period === 'custom' ? '' : period,
      from,
      to,
      timezone,
      filters,
      take: SESSIONS_TAKE,
      skip: sessionsSkip,
    })
  }

  // Handle refresh trigger - use revalidator for URL-based data
  useEffect(() => {
    if (sessionsRefreshTrigger > 0) {
      revalidator.revalidate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionsRefreshTrigger])

  // Session detail loading state
  const sessionLoading = activePSID ? revalidator.state === 'loading' : false

  if (error && !sessionsLoading) {
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
        {sessionsLoading && _isEmpty(sessions) ? <Loader /> : null}
        {!sessionsLoading && _isEmpty(sessions) && !hasShownContentRef.current ? (
          <NoSessions filters={filters} />
        ) : null}
        <Sessions sessions={sessions} timeFormat={timeFormat} currency={project?.revenueCurrency} />
        {canLoadMoreSessions ? (
          <button
            type='button'
            title={t('project.loadMore')}
            onClick={loadMoreSessions}
            className={cx(
              'relative mx-auto mt-2 flex items-center rounded-md border border-transparent p-2 text-sm font-medium text-gray-700 ring-inset hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:bg-slate-900 dark:text-gray-50 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200',
              {
                'cursor-not-allowed opacity-50': sessionsLoading,
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

const SessionsView = SessionsViewWrapper

export default SessionsView

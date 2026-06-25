import _isEmpty from 'lodash/isEmpty'
import { useState, useEffect, useMemo, useRef, Suspense, use } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams, useLoaderData, useRevalidator } from 'react-router'

import type { SessionsResponse, SessionDetailsResponse } from '~/api/api.server'
import { useSessionsProxy } from '~/hooks/useAnalyticsProxy'
import {
  Session,
  SessionDetails as SessionDetailsType,
  SessionReplayMetadata,
} from '~/lib/models/Project'
import NoSessions from '~/pages/Project/tabs/Sessions/components/NoSessions'
import { SessionDetailView } from '~/pages/Project/tabs/Sessions/SessionDetailView'
import { Sessions } from '~/pages/Project/tabs/Sessions/Sessions'
import DashboardHeader from '~/pages/Project/View/components/DashboardHeader'
import Filters from '~/pages/Project/View/components/Filters'
import ProjectViewHeaderActions from '~/pages/Project/View/components/ProjectViewHeaderActions'
import TabErrorBoundary from '~/pages/Project/View/components/TabErrorBoundary'
import {
  useViewProjectContext,
  useRefreshTriggers,
} from '~/pages/Project/View/ViewProject'
import { getFormatDate } from '~/pages/Project/View/ViewProject.helpers'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import type { ProjectLoaderData } from '~/routes/projects.$id'
import InfiniteScrollTrigger from '~/ui/InfiniteScrollTrigger'
import Loader from '~/ui/Loader'
import LoadingBar from '~/ui/LoadingBar'
import StatusPage from '~/ui/StatusPage'
import routes from '~/utils/routes'
import { LoaderView } from '../../View/components/LoaderView'

const SESSIONS_TAKE = 30

interface PageflowItem {
  type: 'pageview' | 'event' | 'error' | 'sale' | 'refund'
  value: string
  created: string
  metadata?: { key: string; value: string }[]
  amount?: number
  currency?: string
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
  sessionStart?: string
  lastActivity?: string
  replay?: SessionReplayMetadata | null
}

interface SessionsViewProps {
  tnMapping: Record<string, string>
  rotateXAxis: boolean
}

interface DeferredSessionsData {
  sessionsData: SessionsResponse | null
  sessionDetails: SessionDetailsResponse | null
}

function SessionsDataResolver({
  children,
}: {
  children: (data: DeferredSessionsData) => React.ReactNode
}) {
  const {
    sessionsData: sessionsDataPromise,
    sessionDetails: sessionDetailsPromise,
  } = useLoaderData<ProjectLoaderData>()

  const sessionsData = sessionsDataPromise ? use(sessionsDataPromise) : null
  const sessionDetails = sessionDetailsPromise
    ? use(sessionDetailsPromise)
    : null

  return <>{children({ sessionsData, sessionDetails })}</>
}

function SessionsViewWrapper(props: SessionsViewProps) {
  return (
    <TabErrorBoundary
      titleKey='dashboard.failedToLoadSessions'
      resetKey='sessions'
    >
      <Suspense fallback={<LoaderView />}>
        <SessionsDataResolver>
          {(deferredData) => (
            <SessionsViewInner {...props} deferredData={deferredData} />
          )}
        </SessionsDataResolver>
      </Suspense>
    </TabErrorBoundary>
  )
}

interface SessionsViewInnerProps extends SessionsViewProps {
  deferredData: DeferredSessionsData
}

const SessionsViewInner = ({
  tnMapping,
  rotateXAxis,
  deferredData,
}: SessionsViewInnerProps) => {
  const { id, project } = useCurrentProject()
  const revalidator = useRevalidator()
  const { sessionsRefreshTrigger } = useRefreshTriggers()
  const { timezone, period, dateRange, filters, timeFormat } =
    useViewProjectContext()
  const { t } = useTranslation('common')
  const [searchParams] = useSearchParams()

  // Proxy for pagination
  const sessionsProxy = useSessionsProxy()

  // Session list state - derived from loader
  const [sessions, setSessions] = useState<Session[]>(
    () => deferredData.sessionsData?.sessions || [],
  )
  const [sessionsSkip, setSessionsSkip] = useState(SESSIONS_TAKE)
  const [canLoadMoreSessions, setCanLoadMoreSessions] = useState(
    () => (deferredData.sessionsData?.sessions?.length || 0) >= SESSIONS_TAKE,
  )

  const activePSID = useMemo(() => {
    return searchParams.get('psid')
  }, [searchParams])

  // Session detail - derived from loader when available
  const activeSession: ActiveSession | null = useMemo(() => {
    if (deferredData.sessionDetails) {
      const apiDetails = deferredData.sessionDetails.details
      const matchingSession = sessions.find((s) => s.psid === activePSID)
      const pages = deferredData.sessionDetails.pages
      const lastPage =
        pages && pages.length > 0 ? pages[pages.length - 1] : null
      const details: SessionDetailsType = {
        cc: apiDetails.cc,
        os: apiDetails.os,
        osv: apiDetails.osv || null,
        br: apiDetails.br,
        brv: apiDetails.brv || null,
        lc: apiDetails.lc || null,
        ref: apiDetails.ref || null,
        so: apiDetails.so || null,
        me: apiDetails.me || null,
        ca: apiDetails.ca || null,
        te: apiDetails.te || null,
        co: apiDetails.co || null,
        rg: apiDetails.rg || null,
        ct: apiDetails.ct || null,
        dv: apiDetails.dv,
        profileId: apiDetails.profileId,
        sdur: apiDetails.sdur,
        isLive: matchingSession
          ? matchingSession.isLive === 1
          : apiDetails.isLive,
        revenue: apiDetails.revenue ?? matchingSession?.revenue,
        refunds: apiDetails.refunds ?? matchingSession?.refunds,
      }
      return {
        details,
        chart: deferredData.sessionDetails.chart,
        pages,
        timeBucket: deferredData.sessionDetails.timeBucket,
        sessionStart: matchingSession?.sessionStart || apiDetails.created,
        lastActivity:
          matchingSession?.lastActivity ||
          lastPage?.created ||
          apiDetails.created,
        replay: deferredData.sessionDetails.replay,
      }
    }
    return null
  }, [deferredData.sessionDetails, sessions, activePSID])

  const sessionsLoading =
    revalidator.state === 'loading' || sessionsProxy.isLoading

  const [error, setError] = useState<string | null>(null)

  const isMountedRef = useRef(true)

  // Track when loader data was last applied to detect stale proxy responses
  const loaderUpdateCounterRef = useRef(0)
  const proxyRequestRef = useRef<{
    mode: 'append' | 'replace'
    loaderUpdateCounter: number
    limit?: number
  } | null>(null)

  // Track if we've shown content in the current data set to prevent NoSessions flash during exit animation
  const hasShownContentRef = useRef(false)

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
      proxyRequestRef.current = null
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
      const proxyRequest = proxyRequestRef.current
      if (!proxyRequest) {
        return
      }

      // Ignore stale proxy responses that were initiated before the last loader update
      if (proxyRequest.loaderUpdateCounter < loaderUpdateCounterRef.current) {
        return
      }

      const newSessions = sessionsProxy.data.sessions || []
      setError(null)

      if (proxyRequest.mode === 'replace') {
        const visibleSessions = newSessions.slice(0, proxyRequest.limit)
        setSessions(visibleSessions)
        setSessionsSkip(visibleSessions.length)
        setCanLoadMoreSessions(newSessions.length > (proxyRequest.limit || 0))
        hasShownContentRef.current = !_isEmpty(visibleSessions)
      } else {
        setSessions((prev) => {
          // Deduplicate: only add sessions whose psid is not already present
          const existingIds = new Set(prev.map((s) => s.psid))
          const uniqueNewSessions = newSessions.filter(
            (s) => !existingIds.has(s.psid),
          )
          return [...prev, ...uniqueNewSessions]
        })
        setSessionsSkip((prev) => prev + newSessions.length)
        setCanLoadMoreSessions(newSessions.length >= SESSIONS_TAKE)
      }

      proxyRequestRef.current = null
    }
    if (sessionsProxy.error) {
      setError(sessionsProxy.error)
      proxyRequestRef.current = null
    }
  }, [
    sessionsProxy.data,
    sessionsProxy.error,
    sessionsProxy.isLoading,
    revalidator.state,
  ])

  const getSessionsParams = (take: number, skip: number) => {
    let from: string | undefined
    let to: string | undefined

    if (dateRange) {
      from = getFormatDate(dateRange[0])
      to = getFormatDate(dateRange[1])
    }

    return {
      timeBucket: 'day',
      period: period === 'custom' ? '' : period,
      from,
      to,
      timezone,
      filters,
      take,
      skip,
    }
  }

  // Load more sessions via proxy
  const loadMoreSessions = () => {
    if (sessionsLoading) return

    // Track when this proxy request was initiated relative to loader updates
    proxyRequestRef.current = {
      mode: 'append',
      loaderUpdateCounter: loaderUpdateCounterRef.current,
    }

    sessionsProxy.fetchSessions(
      id,
      getSessionsParams(SESSIONS_TAKE, sessionsSkip),
    )
  }

  useEffect(() => {
    if (sessionsRefreshTrigger > 0) {
      if (!activePSID && !sessionsLoading) {
        const limit = Math.max(sessions.length, SESSIONS_TAKE)
        proxyRequestRef.current = {
          mode: 'replace',
          loaderUpdateCounter: loaderUpdateCounterRef.current,
          limit,
        }
        sessionsProxy.fetchSessions(id, getSessionsParams(limit + 1, 0))
        return
      }

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
          {
            label: t('dashboard.reloadPage'),
            onClick: () => window.location.reload(),
            primary: true,
          },
          { label: t('notFoundPage.support'), to: routes.contact },
        ]}
      />
    )
  }

  // Session Detail View
  if (activePSID) {
    return (
      <SessionDetailView
        activeSession={activeSession}
        sessionId={activePSID}
        sessionLoading={sessionLoading}
        timeFormat={timeFormat}
        rotateXAxis={rotateXAxis}
        dataNames={dataNames}
        currency={project?.revenueCurrency}
        websiteUrl={project?.websiteUrl}
        backLink={`?${pureSearchParams}`}
        backButtonLabel={t('project.backToSessions')}
      />
    )
  }

  // Sessions List View
  return (
    <>
      <DashboardHeader
        showLiveVisitors
        rightContent={<ProjectViewHeaderActions tnMapping={tnMapping} />}
      />
      {sessionsLoading && !_isEmpty(sessions) ? <LoadingBar /> : null}
      <div>
        {!_isEmpty(sessions) ? (
          <Filters className='mb-3' tnMapping={tnMapping} />
        ) : null}
        {sessionsLoading && _isEmpty(sessions) ? <Loader /> : null}
        {!sessionsLoading &&
        _isEmpty(sessions) &&
        !hasShownContentRef.current ? (
          <NoSessions filters={filters} />
        ) : null}
        <Sessions
          sessions={sessions}
          timeFormat={timeFormat}
          timezone={timezone}
          currency={project?.revenueCurrency}
        />
        <InfiniteScrollTrigger
          hasMore={canLoadMoreSessions}
          isLoading={sessionsLoading}
          onLoadMore={loadMoreSessions}
          disabled={sessionsLoading}
          className={sessionsLoading && _isEmpty(sessions) ? 'hidden' : ''}
          spinnerClassName='mr-0! ml-0!'
        />
      </div>
    </>
  )
}

const SessionsView = SessionsViewWrapper

export default SessionsView

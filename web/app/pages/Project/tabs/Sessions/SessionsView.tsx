import _isEmpty from 'lodash/isEmpty'
import { useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import {
  useSessionDetailsQuery,
  useSessionsListQuery,
} from '~/hooks/v2/useV2Queries'
import {
  Session as SessionType,
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
import { RefetchIndicator } from '~/pages/Project/View/v2/loading'
import { useViewProjectContext } from '~/pages/Project/View/ViewProject'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import InfiniteScrollTrigger from '~/ui/InfiniteScrollTrigger'
import Loader from '~/ui/Loader'
import StatusPage from '~/ui/StatusPage'
import routes from '~/utils/routes'

import type { PageflowEvent } from './Pageflow'

interface SessionDetailsData {
  psid?: string
  pages?: PageflowEvent[]
  details?: SessionDetailsType
  chart?: {
    x: string[]
    pageviews?: number[]
    customEvents?: number[]
    errors?: number[]
  }
  timeBucket?: string | null
  replay?: SessionReplayMetadata | null
}

interface SessionsViewProps {
  tnMapping: Record<string, string>
  rotateXAxis: boolean
}

function SessionsViewWrapper(props: SessionsViewProps) {
  const [searchParams] = useSearchParams()
  const resetKey = `sessions:${searchParams.toString()}`

  return (
    <TabErrorBoundary
      titleKey='dashboard.failedToLoadSessions'
      resetKey={resetKey}
    >
      <SessionsViewInner {...props} />
    </TabErrorBoundary>
  )
}

const SessionsViewInner = ({ tnMapping, rotateXAxis }: SessionsViewProps) => {
  const { project } = useCurrentProject()
  const { timezone, filters, timeFormat } = useViewProjectContext()
  const { t } = useTranslation('common')
  const [searchParams] = useSearchParams()

  const activePSID = useMemo(() => {
    return searchParams.get('psid')
  }, [searchParams])

  const listQuery = useSessionsListQuery({ enabled: !activePSID })
  const detailsQuery = useSessionDetailsQuery(activePSID)

  const sessions = useMemo(() => {
    const rows = (listQuery.data?.pages || []).flatMap(
      (page) => page.data,
    ) as unknown as SessionType[]

    const seen = new Set<string>()
    return rows.filter((session) => {
      if (seen.has(session.psid)) {
        return false
      }
      seen.add(session.psid)
      return true
    })
  }, [listQuery.data])

  const hasShownContentRef = useRef(false)

  if (listQuery.data) {
    hasShownContentRef.current = !_isEmpty(sessions)
  }

  const activeSession = useMemo(() => {
    const data = detailsQuery.data?.data as SessionDetailsData | undefined
    if (!data) {
      return null
    }

    const matchingSession = sessions.find((s) => s.psid === activePSID)
    const pages = data.pages || []
    const lastPage = pages.length > 0 ? pages[pages.length - 1] : null
    const apiDetails = (data.details || {}) as SessionDetailsType

    const details: SessionDetailsType = {
      ...apiDetails,
      isLive: matchingSession
        ? matchingSession.isLive === 1
        : apiDetails.isLive,
      revenue: apiDetails.revenue ?? matchingSession?.revenue,
      refunds: apiDetails.refunds ?? matchingSession?.refunds,
    }

    return {
      details,
      chart: data.chart,
      pages,
      timeBucket: data.timeBucket || undefined,
      sessionStart: matchingSession?.sessionStart || pages[0]?.created,
      lastActivity: matchingSession?.lastActivity || lastPage?.created,
      replay: data.replay,
    }
  }, [detailsQuery.data, sessions, activePSID])

  const sessionsLoading = listQuery.isLoading
  const sessionsRefetching =
    listQuery.isFetching &&
    !listQuery.isLoading &&
    !listQuery.isFetchingNextPage

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

  const queryError = activePSID ? detailsQuery.error : listQuery.error

  if (queryError) {
    return (
      <StatusPage
        type='error'
        title={t('apiNotifications.somethingWentWrong')}
        description={t('apiNotifications.errorCode', {
          error: queryError.message,
        })}
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
        sessionLoading={detailsQuery.isLoading}
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
      <div className='relative'>
        {sessionsRefetching && !_isEmpty(sessions) ? (
          <RefetchIndicator />
        ) : null}
        {!_isEmpty(sessions) ? (
          <Filters className='mb-3' tnMapping={tnMapping} />
        ) : null}
        {sessionsLoading && _isEmpty(sessions) ? <Loader /> : null}
        {!listQuery.isFetching &&
        listQuery.data &&
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
          hasMore={Boolean(listQuery.hasNextPage)}
          isLoading={listQuery.isFetchingNextPage}
          onLoadMore={() => listQuery.fetchNextPage()}
          disabled={listQuery.isFetching}
          className={sessionsLoading && _isEmpty(sessions) ? 'hidden' : ''}
          spinnerClassName='mr-0! ml-0!'
        />
      </div>
    </>
  )
}

const SessionsView = SessionsViewWrapper

export default SessionsView

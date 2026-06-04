import _isEmpty from 'lodash/isEmpty'
import {
  Component,
  lazy,
  Suspense,
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useLoaderData, useRevalidator, useSearchParams } from 'react-router'

import type {
  SessionReplayListItem,
  SessionReplayMetadata,
  SessionReplaysResponse,
} from '~/api/api.server'
import { useSessionReplaysProxy } from '~/hooks/useAnalyticsProxy'
import DashboardHeader from '~/pages/Project/View/components/DashboardHeader'
import Filters from '~/pages/Project/View/components/Filters'
import ProjectViewHeaderActions from '~/pages/Project/View/components/ProjectViewHeaderActions'
import {
  useRefreshTriggers,
  useViewProjectContext,
} from '~/pages/Project/View/ViewProject'
import { getFormatDate } from '~/pages/Project/View/ViewProject.helpers'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import type { ProjectLoaderData } from '~/routes/projects.$id'
import InfiniteScrollTrigger from '~/ui/InfiniteScrollTrigger'
import LoadingBar from '~/ui/LoadingBar'
import StatusPage from '~/ui/StatusPage'
import routes from '~/utils/routes'

import { LoaderView } from '../../View/components/LoaderView'
import NoReplays from './NoReplays'
import { Replays } from './Replays'

const SessionReplayModal = lazy(() => import('../Sessions/SessionReplayModal'))

const REPLAYS_TAKE = 30

interface ReplaysErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ReplaysErrorBoundary extends Component<
  { children: ReactNode },
  ReplaysErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ReplaysErrorBoundaryState {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <StatusPage
          type='error'
          title='Failed to load replays'
          description={
            this.state.error?.message || 'An unexpected error occurred'
          }
          actions={[
            {
              label: 'Reload page',
              onClick: () => window.location.reload(),
              primary: true,
            },
            { label: 'Support', to: routes.contact },
          ]}
        />
      )
    }

    return this.props.children
  }
}

interface ReplaysViewProps {
  tnMapping: Record<string, string>
}

interface DeferredReplaysData {
  replaysData: SessionReplaysResponse | null
}

function ReplaysDataResolver({
  children,
}: {
  children: (data: DeferredReplaysData) => React.ReactNode
}) {
  const { replaysData: replaysDataPromise } = useLoaderData<ProjectLoaderData>()

  const replaysData = replaysDataPromise ? use(replaysDataPromise) : null

  return <>{children({ replaysData })}</>
}

const getReplayMetadata = (
  replay: SessionReplayListItem | null,
  replayId: string,
): SessionReplayMetadata => ({
  hasReplay: true,
  replayId: replay?.replayId || replayId,
  privacyMode: replay?.privacyMode || 'normal',
  chunkCount: replay?.chunkCount || 0,
  eventCount: replay?.eventCount || 0,
  replayDuration: replay?.replayDuration || 0,
  replayExpiresAt: replay?.replayExpiresAt || '',
})

function ReplaysViewWrapper(props: ReplaysViewProps) {
  return (
    <ReplaysErrorBoundary>
      <Suspense fallback={<LoaderView />}>
        <ReplaysDataResolver>
          {(deferredData) => (
            <ReplaysViewInner {...props} deferredData={deferredData} />
          )}
        </ReplaysDataResolver>
      </Suspense>
    </ReplaysErrorBoundary>
  )
}

interface ReplaysViewInnerProps extends ReplaysViewProps {
  deferredData: DeferredReplaysData
}

const ReplaysViewInner = ({
  tnMapping,
  deferredData,
}: ReplaysViewInnerProps) => {
  const { id, project } = useCurrentProject()
  const revalidator = useRevalidator()
  const { replaysRefreshTrigger } = useRefreshTriggers()
  const { timezone, period, dateRange, filters, timeFormat } =
    useViewProjectContext()
  const { t } = useTranslation('common')
  const [searchParams, setSearchParams] = useSearchParams()
  const replaysProxy = useSessionReplaysProxy()

  const [replays, setReplays] = useState<SessionReplayListItem[]>(
    () => deferredData.replaysData?.replays || [],
  )
  const [replaysSkip, setReplaysSkip] = useState(REPLAYS_TAKE)
  const [canLoadMoreReplays, setCanLoadMoreReplays] = useState(
    () => (deferredData.replaysData?.replays?.length || 0) >= REPLAYS_TAKE,
  )
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)
  const requestIdRef = useRef(0)
  const hasShownContentRef = useRef(
    !_isEmpty(deferredData.replaysData?.replays || []),
  )

  const activePSID = searchParams.get('psid')
  const activeReplayId = searchParams.get('replayId')
  const activeReplay = useMemo(() => {
    if (!activePSID || !activeReplayId) return null

    return (
      replays.find(
        (replay) =>
          replay.psid === activePSID && replay.replayId === activeReplayId,
      ) || null
    )
  }, [activePSID, activeReplayId, replays])

  const replaysLoading =
    revalidator.state === 'loading' || replaysProxy.isLoading

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (deferredData.replaysData && revalidator.state === 'idle') {
      const replaysList = deferredData.replaysData.replays || []
      setReplays(replaysList)
      setReplaysSkip(REPLAYS_TAKE)
      setCanLoadMoreReplays(replaysList.length >= REPLAYS_TAKE)
      hasShownContentRef.current = !_isEmpty(replaysList)
      setError(null)
    }
  }, [deferredData.replaysData, revalidator.state])

  const getReplaysParams = (take: number, skip: number) => {
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

  const loadReplays = async (
    forcedSkip?: number,
    override?: boolean,
    options: { take?: number; limit?: number } = {},
  ) => {
    if (replaysLoading) return

    const requestId = ++requestIdRef.current
    const skip = typeof forcedSkip === 'number' ? forcedSkip : replaysSkip
    const take = options.take || REPLAYS_TAKE

    const data = await replaysProxy.fetchSessionReplays(
      id,
      getReplaysParams(take, skip),
    )

    if (requestId !== requestIdRef.current || !isMountedRef.current) {
      return
    }

    if (!data) {
      setError(replaysProxy.error || t('apiNotifications.somethingWentWrong'))
      return
    }

    const newReplays = data.replays || []
    const visibleReplays =
      typeof options.limit === 'number'
        ? newReplays.slice(0, options.limit)
        : newReplays

    setError(null)

    if (override) {
      setReplays(visibleReplays)
      setReplaysSkip(visibleReplays.length)
      hasShownContentRef.current = !_isEmpty(visibleReplays)
    } else {
      setReplays((prev) => {
        const existingIds = new Set(
          prev.map((replay) => `${replay.psid}:${replay.replayId}`),
        )
        const uniqueNewReplays = visibleReplays.filter(
          (replay) => !existingIds.has(`${replay.psid}:${replay.replayId}`),
        )
        return [...prev, ...uniqueNewReplays]
      })
      setReplaysSkip((prev) => prev + visibleReplays.length)
    }

    if (typeof options.limit === 'number') {
      setCanLoadMoreReplays(newReplays.length > options.limit)
    } else {
      setCanLoadMoreReplays(newReplays.length >= take)
    }
  }

  useEffect(() => {
    if (replaysRefreshTrigger > 0) {
      const limit = Math.max(replays.length, REPLAYS_TAKE)
      loadReplays(0, true, { take: limit + 1, limit })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replaysRefreshTrigger])

  const openReplay = (replay: SessionReplayListItem) => {
    const params = new URLSearchParams(searchParams)
    params.set('psid', replay.psid)
    params.set('replayId', replay.replayId)
    setSearchParams(params)
  }

  const closeReplay = () => {
    const params = new URLSearchParams(searchParams)
    params.delete('psid')
    params.delete('replayId')
    setSearchParams(params)
  }

  if (error && !replaysLoading) {
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

  return (
    <>
      <DashboardHeader
        showLiveVisitors
        rightContent={<ProjectViewHeaderActions tnMapping={tnMapping} />}
      />
      {replaysLoading && !_isEmpty(replays) ? <LoadingBar /> : null}
      {!_isEmpty(replays) ? (
        <Filters className='mb-3' tnMapping={tnMapping} />
      ) : null}
      {replaysLoading && _isEmpty(replays) ? <LoaderView /> : null}
      {!replaysLoading && _isEmpty(replays) && !hasShownContentRef.current ? (
        <NoReplays filters={filters} />
      ) : null}
      <Replays
        replays={replays}
        timeFormat={timeFormat}
        timezone={timezone}
        currency={project?.revenueCurrency}
        onWatchReplay={openReplay}
      />
      <InfiniteScrollTrigger
        hasMore={canLoadMoreReplays}
        isLoading={replaysLoading}
        onLoadMore={() => loadReplays()}
        disabled={replaysLoading}
        className={replaysLoading && _isEmpty(replays) ? 'hidden' : ''}
        spinnerClassName='mr-0! ml-0!'
      />
      {activePSID && activeReplayId ? (
        <Suspense fallback={null}>
          <SessionReplayModal
            isOpen
            onClose={closeReplay}
            projectId={id}
            psid={activePSID}
            replay={getReplayMetadata(activeReplay, activeReplayId)}
            replayId={activeReplayId}
            timeFormat={timeFormat}
          />
        </Suspense>
      ) : null}
    </>
  )
}

const ReplaysView = ReplaysViewWrapper

export default ReplaysView

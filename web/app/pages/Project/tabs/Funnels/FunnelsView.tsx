import cx from 'clsx'
import _filter from 'lodash/filter'
import _find from 'lodash/find'
import _includes from 'lodash/includes'
import _isEmpty from 'lodash/isEmpty'
import { FilterIcon } from 'lucide-react'
import { useState, useEffect, useMemo, useRef, Suspense, use } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams, useFetcher, useLoaderData, useRevalidator } from 'react-router'
import { toast } from 'sonner'

import type { FunnelDataResponse } from '~/api/api.server'
import { FUNNELS_PERIOD_PAIRS } from '~/lib/constants'
import { Funnel, AnalyticsFunnel } from '~/lib/models/Project'
import NewFunnel from '~/modals/NewFunnel'
import { FunnelChart } from '~/pages/Project/tabs/Funnels/FunnelChart'
import FunnelsList from '~/pages/Project/tabs/Funnels/FunnelsList'
import DashboardHeader from '~/pages/Project/View/components/DashboardHeader'
import { useViewProjectContext } from '~/pages/Project/View/ViewProject'
import { useAuth } from '~/providers/AuthProvider'
import { useCurrentProject, useProjectPassword } from '~/providers/CurrentProjectProvider'
import type { ProjectLoaderData, ProjectViewActionData } from '~/routes/projects.$id'
import Loader from '~/ui/Loader'
import LoadingBar from '~/ui/LoadingBar'
import { Text } from '~/ui/Text'
import { nLocaleFormatter } from '~/utils/generic'
import routes from '~/utils/routes'

interface DeferredFunnelData {
  funnelData: FunnelDataResponse | null
}

function FunnelDataResolver({ children }: { children: (data: DeferredFunnelData) => React.ReactNode }) {
  const { funnelData: funnelDataPromise } = useLoaderData<ProjectLoaderData>()
  const funnelData = funnelDataPromise ? use(funnelDataPromise) : null
  return <>{children({ funnelData })}</>
}

function FunnelsViewWrapper() {
  return (
    <Suspense fallback={<Loader />}>
      <FunnelDataResolver>{(deferredData) => <FunnelsViewInner deferredData={deferredData} />}</FunnelDataResolver>
    </Suspense>
  )
}

interface FunnelsViewInnerProps {
  deferredData: DeferredFunnelData
}

const FunnelsViewInner = ({ deferredData }: FunnelsViewInnerProps) => {
  const { id, project, mergeProject, allowedToManage } = useCurrentProject()
  const projectPassword = useProjectPassword(id)
  const revalidator = useRevalidator()
  const { isAuthenticated } = useAuth()
  const { periodPairs, funnelsRefreshTrigger } = useViewProjectContext()

  // Filter periods to only include those valid for funnels
  const timeBucketSelectorItems = useMemo(() => {
    return _filter(periodPairs, (el) => {
      return _includes(FUNNELS_PERIOD_PAIRS, el.period)
    })
  }, [periodPairs])
  const { t } = useTranslation('common')
  const [searchParams] = useSearchParams()
  const isEmbedded = searchParams.get('embedded') === 'true'

  const isMountedRef = useRef(true)
  const fetcher = useFetcher<ProjectViewActionData>()
  const lastHandledData = useRef<ProjectViewActionData | null>(null)

  // Funnels state
  const [isNewFunnelOpened, setIsNewFunnelOpened] = useState(false)
  const [funnelToEdit, setFunnelToEdit] = useState<Funnel | undefined>(undefined)
  const [dataLoading, setDataLoading] = useState(false)
  
  // Initialize funnelAnalytics from loader data
  const [funnelAnalytics, setFunnelAnalytics] = useState<{
    funnel: AnalyticsFunnel[]
    totalPageviews: number
  } | null>(() => {
    if (deferredData.funnelData) {
      return {
        funnel: deferredData.funnelData.funnel as AnalyticsFunnel[],
        totalPageviews: deferredData.funnelData.totalPageviews,
      }
    }
    return null
  })

  const funnelActionLoading = fetcher.state !== 'idle'
  const analyticsLoading = revalidator.state === 'loading'

  // Search params without the funnel id. Needed for the back button.
  const pureSearchParams = useMemo(() => {
    const newSearchParams = new URLSearchParams(searchParams.toString())
    newSearchParams.delete('funnelId')
    return newSearchParams.toString()
  }, [searchParams])

  // Get active funnel from URL
  const activeFunnel = useMemo(() => {
    if (!project) {
      return null
    }

    const funnelId = searchParams.get('funnelId')

    if (!funnelId) {
      return null
    }

    return _find(project.funnels, (funnel) => funnel.id === funnelId) || null
  }, [searchParams, project])

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Handle fetcher responses
  useEffect(() => {
    if (fetcher.state !== 'idle' || !fetcher.data) return
    if (lastHandledData.current === fetcher.data) return
    lastHandledData.current = fetcher.data

    const { intent, success, error } = fetcher.data

    if (success) {
      if (intent === 'create-funnel') {
        toast.success(t('apiNotifications.funnelCreated'))
        setIsNewFunnelOpened(false)
        setFunnelToEdit(undefined)
        // Reload funnels list
        fetcher.submit(
          { intent: 'get-funnels', password: projectPassword },
          { method: 'POST', action: `/projects/${id}` },
        )
      } else if (intent === 'update-funnel') {
        toast.success(t('apiNotifications.funnelUpdated'))
        setIsNewFunnelOpened(false)
        setFunnelToEdit(undefined)
        fetcher.submit(
          { intent: 'get-funnels', password: projectPassword },
          { method: 'POST', action: `/projects/${id}` },
        )
      } else if (intent === 'delete-funnel') {
        toast.success(t('apiNotifications.funnelDeleted'))
        fetcher.submit(
          { intent: 'get-funnels', password: projectPassword },
          { method: 'POST', action: `/projects/${id}` },
        )
      } else if (intent === 'get-funnels' && fetcher.data.data) {
        mergeProject({ funnels: fetcher.data.data as Funnel[] })
      }
    } else if (error) {
      toast.error(error)
    }
  }, [fetcher.state, fetcher.data, t, id, projectPassword, fetcher, mergeProject])

  const onFunnelCreate = (name: string, steps: string[]) => {
    if (funnelActionLoading) return

    fetcher.submit(
      { intent: 'create-funnel', name, steps: JSON.stringify(steps) },
      { method: 'POST', action: `/projects/${id}` },
    )
  }

  const onFunnelEdit = (funnelId: string, name: string, steps: string[]) => {
    if (funnelActionLoading) return

    fetcher.submit(
      { intent: 'update-funnel', funnelId, name, steps: JSON.stringify(steps) },
      { method: 'POST', action: `/projects/${id}` },
    )
  }

  const onFunnelDelete = (funnelId: string) => {
    if (funnelActionLoading) return

    fetcher.submit({ intent: 'delete-funnel', funnelId }, { method: 'POST', action: `/projects/${id}` })
  }

  // Sync funnelAnalytics when loader data changes
  useEffect(() => {
    if (deferredData.funnelData && revalidator.state === 'idle') {
      setFunnelAnalytics({
        funnel: deferredData.funnelData.funnel as AnalyticsFunnel[],
        totalPageviews: deferredData.funnelData.totalPageviews,
      })
      setDataLoading(false)
    }
  }, [deferredData.funnelData, revalidator.state])

  const funnelSummary = useMemo(() => {
    if (!funnelAnalytics || _isEmpty(funnelAnalytics.funnel)) {
      return null
    }

    const stepsCount = funnelAnalytics.funnel.length
    const startVisitors = funnelAnalytics.funnel[0]?.events || 0
    const endVisitors = funnelAnalytics.funnel[stepsCount - 1]?.events || 0
    const conversionRate = Number(((endVisitors / Math.max(startVisitors, 1)) * 100).toFixed(2))

    return {
      stepsCount,
      startVisitors,
      endVisitors,
      conversionRate,
    }
  }, [funnelAnalytics])

  // When activeFunnel changes (URL params) and we have loader data, sync it
  // The actual data fetching happens via the loader when URL changes
  useEffect(() => {
    if (!project || !activeFunnel) return
    
    // If we have loader data for this funnel, use it
    if (deferredData.funnelData) {
      setFunnelAnalytics({
        funnel: deferredData.funnelData.funnel as AnalyticsFunnel[],
        totalPageviews: deferredData.funnelData.totalPageviews,
      })
    } else {
      // No loader data yet, trigger revalidation
      setDataLoading(true)
      revalidator.revalidate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFunnel?.id])

  // Handle refresh trigger from parent
  useEffect(() => {
    if (funnelsRefreshTrigger > 0) {
      if (activeFunnel?.id) {
        setDataLoading(true)
      }
      revalidator.revalidate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funnelsRefreshTrigger])

  // Show loader during initial load when viewing a specific funnel (only when no data yet)
  if (activeFunnel && analyticsLoading && !funnelAnalytics) {
    return (
      <div
        className={cx('flex flex-col bg-gray-50 dark:bg-slate-900', {
          'min-h-including-header': !isEmbedded,
          'min-h-screen': isEmbedded,
        })}
      >
        <Loader />
      </div>
    )
  }

  // Render funnel detail view
  if (activeFunnel) {
    return (
      <>
        <DashboardHeader
          backLink={`?${pureSearchParams}`}
          backButtonLabel={t('project.backToFunnels')}
          showLiveVisitors={false}
          showSearchButton={false}
          hideTimeBucket
          timeBucketSelectorItems={timeBucketSelectorItems}
          leftContent={
            <Text as='h2' size='xl' weight='bold' className='wrap-break-word break-all'>
              {activeFunnel?.name}
            </Text>
          }
        />
        {dataLoading && funnelAnalytics ? <LoadingBar /> : null}

        {/* Funnel Chart */}
        <div
          className={cx(
            'relative overflow-hidden rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-800/25',
            { hidden: analyticsLoading },
          )}
        >
          {funnelSummary ? (
            <>
              <p className='font-medium text-gray-900 lg:text-left dark:text-gray-50'>
                {t('project.funnelSummary.xStepFunnel', { x: funnelSummary.stepsCount })}
                <span className='mx-2 text-gray-400'>•</span>
                {t('project.funnelSummary.conversionRateShort', { x: funnelSummary.conversionRate })}
              </p>
              <p className='text-center text-gray-900 lg:text-left dark:text-gray-50'>
                {t('project.funnelSummary.startShort')}: {nLocaleFormatter(funnelSummary.startVisitors)}
                <span className='mx-1'>→</span>
                {t('project.funnelSummary.endShort')}: {nLocaleFormatter(funnelSummary.endVisitors)}
              </p>
            </>
          ) : null}
          {funnelAnalytics?.funnel ? (
            <FunnelChart
              funnel={funnelAnalytics.funnel}
              totalPageviews={funnelAnalytics.totalPageviews}
              t={t}
              className='mt-5 h-80 [&_svg]:!overflow-visible'
            />
          ) : null}
        </div>

        {/* New Funnel Modal */}
        <NewFunnel
          funnel={funnelToEdit}
          isOpened={isNewFunnelOpened}
          onClose={() => {
            setIsNewFunnelOpened(false)
            setFunnelToEdit(undefined)
          }}
          onSubmit={async (name: string, steps: string[]) => {
            if (funnelToEdit) {
              await onFunnelEdit(funnelToEdit.id, name, steps)
              return
            }

            await onFunnelCreate(name, steps)
          }}
          loading={funnelActionLoading}
        />
      </>
    )
  }

  // Render funnels list view
  if (!_isEmpty(project?.funnels)) {
    return (
      <>
        <FunnelsList
          openFunnelSettings={(funnel?: Funnel) => {
            if (funnel) {
              setFunnelToEdit(funnel)
              setIsNewFunnelOpened(true)
              return
            }

            setIsNewFunnelOpened(true)
          }}
          funnels={project?.funnels}
          deleteFunnel={onFunnelDelete}
          loading={funnelActionLoading}
          allowedToManage={allowedToManage}
        />
        <NewFunnel
          funnel={funnelToEdit}
          isOpened={isNewFunnelOpened}
          onClose={() => {
            setIsNewFunnelOpened(false)
            setFunnelToEdit(undefined)
          }}
          onSubmit={async (name: string, steps: string[]) => {
            if (funnelToEdit) {
              await onFunnelEdit(funnelToEdit.id, name, steps)
              return
            }

            await onFunnelCreate(name, steps)
          }}
          loading={funnelActionLoading}
        />
      </>
    )
  }

  // Render empty state
  return (
    <>
      <div className='mt-5 rounded-xl bg-gray-700 p-5'>
        <div className='flex items-center text-gray-50'>
          <FilterIcon className='mr-2 h-8 w-8' strokeWidth={1.5} />
          <p className='text-3xl font-bold'>{t('dashboard.funnels')}</p>
        </div>
        <p className='mt-2 text-sm whitespace-pre-wrap text-gray-100'>{t('dashboard.funnelsDesc')}</p>
        {isAuthenticated ? (
          <button
            type='button'
            onClick={() => setIsNewFunnelOpened(true)}
            className='mt-6 block max-w-max rounded-md border border-transparent bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-indigo-50 md:px-4'
          >
            {t('dashboard.newFunnel')}
          </button>
        ) : (
          <Link
            to={routes.signup}
            className='mt-6 block max-w-max rounded-md border border-transparent bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-indigo-50 md:px-4'
            aria-label={t('titles.signup')}
          >
            {t('header.startForFree')}
          </Link>
        )}
      </div>
      <NewFunnel
        funnel={funnelToEdit}
        isOpened={isNewFunnelOpened}
        onClose={() => {
          setIsNewFunnelOpened(false)
          setFunnelToEdit(undefined)
        }}
        onSubmit={async (name: string, steps: string[]) => {
          if (funnelToEdit) {
            await onFunnelEdit(funnelToEdit.id, name, steps)
            return
          }

          await onFunnelCreate(name, steps)
        }}
        loading={funnelActionLoading}
      />
    </>
  )
}

const FunnelsView = FunnelsViewWrapper

export default FunnelsView

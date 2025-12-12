import cx from 'clsx'
import _filter from 'lodash/filter'
import _find from 'lodash/find'
import _includes from 'lodash/includes'
import _isEmpty from 'lodash/isEmpty'
import { FilterIcon } from 'lucide-react'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { addFunnel, updateFunnel, deleteFunnel, getFunnelData, getFunnels } from '~/api'
import { FUNNELS_PERIOD_PAIRS } from '~/lib/constants'
import { Funnel, AnalyticsFunnel } from '~/lib/models/Project'
import NewFunnel from '~/modals/NewFunnel'
import DashboardHeader from '~/pages/Project/View/components/DashboardHeader'
import { FunnelChart } from '~/pages/Project/View/components/FunnelChart'
import FunnelsList from '~/pages/Project/View/components/FunnelsList'
import { useViewProjectContext } from '~/pages/Project/View/ViewProject'
import { getFormatDate } from '~/pages/Project/View/ViewProject.helpers'
import { useAuth } from '~/providers/AuthProvider'
import { useCurrentProject, useProjectPassword } from '~/providers/CurrentProjectProvider'
import Loader from '~/ui/Loader'
import { Text } from '~/ui/Text'
import { nLocaleFormatter } from '~/utils/generic'
import routes from '~/utils/routes'

const FunnelsView = () => {
  const { id, project, mergeProject, allowedToManage } = useCurrentProject()
  const projectPassword = useProjectPassword(id)
  const { isAuthenticated } = useAuth()
  const { timezone, period, dateRange, activePeriod, periodPairs, updatePeriod, refCalendar, funnelsRefreshTrigger } =
    useViewProjectContext()

  // Filter periods to only include those valid for funnels
  const timeBucketSelectorItems = useMemo(() => {
    return _filter(periodPairs, (el) => {
      return _includes(FUNNELS_PERIOD_PAIRS, el.period)
    })
  }, [periodPairs])
  const { t } = useTranslation('common')
  const [searchParams, setSearchParams] = useSearchParams()

  const isMountedRef = useRef(true)

  // Funnels state
  const [isNewFunnelOpened, setIsNewFunnelOpened] = useState(false)
  const [funnelToEdit, setFunnelToEdit] = useState<Funnel | undefined>(undefined)
  const [funnelActionLoading, setFunnelActionLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(false)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [funnelAnalytics, setFunnelAnalytics] = useState<{
    funnel: AnalyticsFunnel[]
    totalPageviews: number
  } | null>(null)

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

  const onFunnelCreate = async (name: string, steps: string[]) => {
    if (funnelActionLoading) {
      return
    }

    setFunnelActionLoading(true)

    try {
      await addFunnel(id, name, steps)
    } catch (reason: any) {
      console.error('[ERROR] (onFunnelCreate)(addFunnel)', reason)
      toast.error(reason)
    }

    try {
      const funnels = await getFunnels(id, projectPassword)
      mergeProject({ funnels })
    } catch (reason: any) {
      console.error('[ERROR] (onFunnelCreate)(getFunnels)', reason)
    }

    toast.success(t('apiNotifications.funnelCreated'))
    setFunnelActionLoading(false)
  }

  const onFunnelEdit = async (funnelId: string, name: string, steps: string[]) => {
    if (funnelActionLoading) {
      return
    }

    setFunnelActionLoading(true)

    try {
      await updateFunnel(funnelId, id, name, steps)
    } catch (reason: any) {
      console.error('[ERROR] (onFunnelEdit)(updateFunnel)', reason)
      toast.error(reason)
    }

    try {
      const funnels = await getFunnels(id, projectPassword)
      mergeProject({ funnels })
    } catch (reason: any) {
      console.error('[ERROR] (onFunnelEdit)(getFunnels)', reason)
    }

    toast.success(t('apiNotifications.funnelUpdated'))
    setFunnelActionLoading(false)
  }

  const onFunnelDelete = async (funnelId: string) => {
    if (funnelActionLoading) {
      return
    }

    setFunnelActionLoading(true)

    try {
      await deleteFunnel(funnelId, id)
    } catch (reason: any) {
      console.error('[ERROR] (onFunnelDelete)(deleteFunnel)', reason)
      toast.error(reason)
    }

    try {
      const funnels = await getFunnels(id, projectPassword)
      mergeProject({ funnels })
    } catch (reason: any) {
      console.error('[ERROR] (onFunnelDelete)(getFunnels)', reason)
    }

    toast.success(t('apiNotifications.funnelDeleted'))
    setFunnelActionLoading(false)
  }

  const loadFunnelsData = async () => {
    if (!activeFunnel?.id) {
      return
    }

    setDataLoading(true)

    try {
      let dataFunnel: { funnel: AnalyticsFunnel[]; totalPageviews: number }
      let from
      let to

      if (dateRange) {
        from = getFormatDate(dateRange[0])
        to = getFormatDate(dateRange[1])
      }

      if (period === 'custom' && dateRange) {
        dataFunnel = await getFunnelData(id, '', from, to, timezone, activeFunnel.id, projectPassword)
      } else {
        dataFunnel = await getFunnelData(id, period, '', '', timezone, activeFunnel.id, projectPassword)
      }

      const { funnel, totalPageviews } = dataFunnel

      if (isMountedRef.current) {
        setFunnelAnalytics({ funnel, totalPageviews })
        setAnalyticsLoading(false)
        setDataLoading(false)
      }
    } catch (reason) {
      if (isMountedRef.current) {
        setAnalyticsLoading(false)
        setDataLoading(false)
        console.error('[ERROR](loadFunnelsData) Loading funnels data failed:', reason)
      }
    }
  }

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

  const refreshStats = async (_isManual: boolean = true) => {
    if (!dataLoading) {
      await loadFunnelsData()
    }
  }

  const resetDateRange = () => {
    const newSearchParams = new URLSearchParams(searchParams.toString())
    newSearchParams.delete('from')
    newSearchParams.delete('to')
    setSearchParams(newSearchParams)
  }

  // Load funnels data when activeFunnel changes
  useEffect(() => {
    if (!project) return

    loadFunnelsData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFunnel, project, dateRange, period])

  // Handle refresh trigger from parent
  useEffect(() => {
    if (funnelsRefreshTrigger > 0) {
      loadFunnelsData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funnelsRefreshTrigger])

  // Show loader during initial load when viewing a specific funnel
  if (activeFunnel && analyticsLoading) {
    return <Loader />
  }

  // Render funnel detail view
  if (activeFunnel) {
    return (
      <>
        <DashboardHeader
          backLink={`?${pureSearchParams}`}
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

        {/* Funnel Chart */}
        <div
          className={cx(
            'relative overflow-hidden rounded-lg border border-gray-300 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-800/25',
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

export default FunnelsView

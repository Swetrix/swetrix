import cx from 'clsx'
import _filter from 'lodash/filter'
import _find from 'lodash/find'
import _includes from 'lodash/includes'
import _isEmpty from 'lodash/isEmpty'
import { ChevronLeftIcon, FilterIcon } from 'lucide-react'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { addFunnel, updateFunnel, deleteFunnel, getFunnelData, getFunnels } from '~/api'
import { MAX_MONTHS_IN_PAST, FUNNELS_PERIOD_PAIRS } from '~/lib/constants'
import { Funnel, AnalyticsFunnel } from '~/lib/models/Project'
import NewFunnel from '~/modals/NewFunnel'
import { FunnelChart } from '~/pages/Project/View/components/FunnelChart'
import FunnelsList from '~/pages/Project/View/components/FunnelsList'
import { RefreshStatsButton } from '~/pages/Project/View/components/RefreshStatsButton'
import TBPeriodSelector from '~/pages/Project/View/components/TBPeriodSelector'
import { useViewProjectContext } from '~/pages/Project/View/ViewProject'
import { getFormatDate } from '~/pages/Project/View/ViewProject.helpers'
import { useAuth } from '~/providers/AuthProvider'
import { useCurrentProject, useProjectPassword } from '~/providers/CurrentProjectProvider'
import DatePicker from '~/ui/Datepicker'
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
        {/* Funnel Header */}
        <div className='relative top-0 z-20 -mt-2 flex flex-col items-center justify-between bg-gray-50/50 py-2 backdrop-blur-md lg:sticky lg:flex-row dark:bg-slate-900/50'>
          <div className='flex flex-wrap items-center justify-center gap-2'>
            <Text as='h2' size='xl' weight='bold' className='break-words break-all'>
              {activeFunnel?.name}
            </Text>
          </div>
          <div className='mx-auto mt-3 flex w-full max-w-[420px] flex-wrap items-center justify-center gap-x-2 gap-y-1 sm:mx-0 sm:w-auto sm:max-w-none sm:flex-nowrap sm:justify-between lg:mt-0'>
            <RefreshStatsButton onRefresh={refreshStats} />
            <div className='flex items-center'>
              <TBPeriodSelector
                activePeriod={activePeriod}
                items={timeBucketSelectorItems}
                title={activePeriod?.label}
                onSelect={(pair) => {
                  if (dataLoading) {
                    return
                  }

                  if (pair.isCustomDate) {
                    setTimeout(() => {
                      refCalendar.current?.openCalendar?.()
                    }, 100)
                  } else {
                    resetDateRange()
                    updatePeriod(pair)
                  }
                }}
              />
              <DatePicker
                ref={refCalendar}
                onChange={([from, to]) => {
                  const newSearchParams = new URLSearchParams(searchParams.toString())
                  newSearchParams.set('from', from.toISOString())
                  newSearchParams.set('to', to.toISOString())
                  newSearchParams.set('period', 'custom')
                  setSearchParams(newSearchParams)
                }}
                value={dateRange || []}
                maxDateMonths={MAX_MONTHS_IN_PAST}
                maxRange={0}
              />
            </div>
          </div>
        </div>

        {/* Back to funnels link */}
        <div className='mx-auto mt-2 mb-4 flex max-w-max items-center space-x-4 lg:mx-0'>
          <Link
            to={{
              search: pureSearchParams,
            }}
            className='flex items-center text-sm text-gray-900 underline decoration-dashed hover:decoration-solid dark:text-gray-100'
          >
            <ChevronLeftIcon className='mr-1 size-3' />
            {t('project.backToFunnels')}
          </Link>
        </div>

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

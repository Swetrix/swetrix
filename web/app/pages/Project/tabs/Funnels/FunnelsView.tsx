import _filter from 'lodash/filter'
import _find from 'lodash/find'
import _includes from 'lodash/includes'
import _isEmpty from 'lodash/isEmpty'
import { FunnelIcon, PlusIcon } from '@phosphor-icons/react'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useSearchParams,
  useFetcher,
  useLoaderData,
  useRevalidator,
} from 'react-router'
import { toast } from 'sonner'

import type { FunnelDataResponse } from '~/api/api.server'
import { FUNNELS_PERIOD_PAIRS } from '~/lib/constants'
import type { Funnel } from '~/lib/models/Project'
import NewFunnel from '~/modals/NewFunnel'
import FunnelsList from '~/pages/Project/tabs/Funnels/FunnelsList'
import DashboardHeader from '~/pages/Project/View/components/DashboardHeader'
import Filters from '~/pages/Project/View/components/Filters'
import ProjectViewHeaderActions from '~/pages/Project/View/components/ProjectViewHeaderActions'
import {
  useViewProjectContext,
  useRefreshTriggers,
} from '~/pages/Project/View/ViewProject'
import { useAuth } from '~/providers/AuthProvider'
import {
  useCurrentProject,
  useProjectPassword,
} from '~/providers/CurrentProjectProvider'
import type {
  ProjectLoaderData,
  ProjectViewActionData,
} from '~/routes/projects.$id'
import Button from '~/ui/Button'
import { Link } from '~/ui/Link'
import LoadingBar from '~/ui/LoadingBar'
import { Text } from '~/ui/Text'
import routes from '~/utils/routes'

import { SessionsDrawer } from '../Traffic/SessionsDrawer'

interface FunnelsViewProps {
  tnMapping: Record<string, string>
}

const FunnelsView = ({ tnMapping }: FunnelsViewProps) => {
  const { funnelData: funnelDataPromise } = useLoaderData<ProjectLoaderData>()
  const { id, project, mergeProject, allowedToManage } = useCurrentProject()
  const projectPassword = useProjectPassword(id)
  const revalidator = useRevalidator()
  const { isAuthenticated } = useAuth()
  const { funnelsRefreshTrigger } = useRefreshTriggers()
  const { periodPairs, period, timezone, timeFormat, filters } =
    useViewProjectContext()
  const { t } = useTranslation('common')
  const [searchParams, setSearchParams] = useSearchParams()
  const fetcher = useFetcher<ProjectViewActionData>()
  const lastHandledData = useRef<ProjectViewActionData | null>(null)
  const deletedFunnelId = useRef<string | null>(null)
  const lastRefreshTrigger = useRef(funnelsRefreshTrigger)

  const [isNewFunnelOpened, setIsNewFunnelOpened] = useState(false)
  const [funnelToEdit, setFunnelToEdit] = useState<Funnel | undefined>()
  const [funnelAnalytics, setFunnelAnalytics] =
    useState<FunnelDataResponse | null>(null)
  const [sessionsDrawer, setSessionsDrawer] = useState<{
    stepIndex: number
    label: string
    dropoff?: boolean
  } | null>(null)

  const timeBucketSelectorItems = useMemo(() => {
    return _filter(periodPairs, (el) => {
      return _includes(FUNNELS_PERIOD_PAIRS, el.period)
    })
  }, [periodPairs])

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

  const funnelActionLoading = fetcher.state !== 'idle'
  const analyticsLoading = revalidator.state === 'loading'
  const hasFunnels = !_isEmpty(project?.funnels)

  const clearActiveFunnel = useCallback(() => {
    const nextSearchParams = new URLSearchParams(searchParams.toString())
    nextSearchParams.delete('funnelId')
    setFunnelAnalytics(null)
    setSessionsDrawer(null)
    setSearchParams(nextSearchParams)
  }, [searchParams, setSearchParams])

  const handleToggleFunnel = useCallback(
    (funnelId: string) => {
      const nextSearchParams = new URLSearchParams(searchParams.toString())

      if (nextSearchParams.get('funnelId') === funnelId) {
        nextSearchParams.delete('funnelId')
      } else {
        nextSearchParams.set('funnelId', funnelId)
      }

      setFunnelAnalytics(null)
      setSessionsDrawer(null)
      setSearchParams(nextSearchParams)
    },
    [searchParams, setSearchParams],
  )

  const openFunnelSettings = useCallback((funnel?: Funnel) => {
    setFunnelToEdit(funnel)
    setIsNewFunnelOpened(true)
  }, [])

  const closeFunnelSettings = useCallback(() => {
    setIsNewFunnelOpened(false)
    setFunnelToEdit(undefined)
  }, [])

  const handleFunnelDataResolved = useCallback(
    (funnelId: string, funnelData: FunnelDataResponse | null) => {
      if (activeFunnel?.id === funnelId) {
        setFunnelAnalytics(funnelData)
      }
    },
    [activeFunnel?.id],
  )

  useEffect(() => {
    setFunnelAnalytics(null)
    setSessionsDrawer(null)
  }, [activeFunnel?.id])

  useEffect(() => {
    if (fetcher.state !== 'idle' || !fetcher.data) return
    if (lastHandledData.current === fetcher.data) return
    lastHandledData.current = fetcher.data

    const { intent, success, error } = fetcher.data

    if (success) {
      if (intent === 'create-funnel') {
        toast.success(t('apiNotifications.funnelCreated'))
        closeFunnelSettings()
        fetcher.submit(
          { intent: 'get-funnels', password: projectPassword },
          { method: 'POST', action: `/projects/${id}` },
        )
      } else if (intent === 'update-funnel') {
        toast.success(t('apiNotifications.funnelUpdated'))
        closeFunnelSettings()
        fetcher.submit(
          { intent: 'get-funnels', password: projectPassword },
          { method: 'POST', action: `/projects/${id}` },
        )

        const updatedFunnelId = (fetcher.data.data as { id?: string })?.id
        if (updatedFunnelId && activeFunnel?.id === updatedFunnelId) {
          revalidator.revalidate()
        }
      } else if (intent === 'delete-funnel') {
        toast.success(t('apiNotifications.funnelDeleted'))
        fetcher.submit(
          { intent: 'get-funnels', password: projectPassword },
          { method: 'POST', action: `/projects/${id}` },
        )

        if (deletedFunnelId.current === activeFunnel?.id) {
          clearActiveFunnel()
        }
        deletedFunnelId.current = null
      } else if (intent === 'get-funnels' && fetcher.data.data) {
        mergeProject({ funnels: fetcher.data.data as Funnel[] })
      }
    } else if (error) {
      toast.error(error)
      deletedFunnelId.current = null
    }
  }, [
    fetcher.state,
    fetcher.data,
    t,
    closeFunnelSettings,
    projectPassword,
    id,
    fetcher,
    activeFunnel?.id,
    revalidator,
    clearActiveFunnel,
    mergeProject,
  ])

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

    deletedFunnelId.current = funnelId
    fetcher.submit(
      { intent: 'delete-funnel', funnelId },
      { method: 'POST', action: `/projects/${id}` },
    )
  }

  const handleBarClick = useCallback(
    (stepIndex: number) => {
      if (!funnelAnalytics?.funnel?.[stepIndex]) return

      const step = funnelAnalytics.funnel[stepIndex]
      setSessionsDrawer({
        stepIndex,
        label: step.value,
      })
    },
    [funnelAnalytics],
  )

  useEffect(() => {
    if (funnelsRefreshTrigger > lastRefreshTrigger.current) {
      lastRefreshTrigger.current = funnelsRefreshTrigger
      revalidator.revalidate()
    }
  }, [funnelsRefreshTrigger, revalidator])

  return (
    <>
      <DashboardHeader
        showLiveVisitors
        hideTimeBucket
        timeBucketSelectorItems={timeBucketSelectorItems}
        rightContent={<ProjectViewHeaderActions tnMapping={tnMapping} />}
      />
      <Filters className='mb-3' tnMapping={tnMapping} />
      {activeFunnel && analyticsLoading && funnelAnalytics ? (
        <LoadingBar />
      ) : null}

      {hasFunnels ? (
        <FunnelsList
          funnels={project?.funnels}
          activeFunnelId={activeFunnel?.id || null}
          funnelDataPromise={funnelDataPromise}
          onToggleFunnel={handleToggleFunnel}
          onFunnelDataResolved={handleFunnelDataResolved}
          onBarClick={handleBarClick}
          openFunnelSettings={openFunnelSettings}
          deleteFunnel={onFunnelDelete}
          loading={funnelActionLoading}
          allowedToManage={allowedToManage}
        />
      ) : (
        <div className='mx-auto w-full max-w-2xl py-16 text-center'>
          <div className='mx-auto mb-6 flex size-14 items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-900'>
            <FunnelIcon className='size-7 text-gray-700 dark:text-gray-200' />
          </div>
          <Text as='h3' size='xl' weight='medium' className='tracking-tight'>
            {t('dashboard.funnels')}
          </Text>
          <Text
            as='p'
            size='sm'
            colour='secondary'
            className='mx-auto mt-2 max-w-md whitespace-pre-wrap'
          >
            {t('dashboard.funnelsDesc')}
          </Text>
          <div className='mt-6'>
            {isAuthenticated && allowedToManage ? (
              <Button size='lg' onClick={() => setIsNewFunnelOpened(true)}>
                <PlusIcon className='mr-1.5 size-4' />
                {t('dashboard.newFunnel')}
              </Button>
            ) : (
              <Link
                to={routes.signup}
                aria-label={t('titles.signup')}
                className='inline-flex items-center justify-center rounded-md border border-transparent bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-xs transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white'
              >
                {t('header.startForFree')}
              </Link>
            )}
          </div>
        </div>
      )}

      <NewFunnel
        funnel={funnelToEdit}
        isOpened={isNewFunnelOpened}
        onClose={closeFunnelSettings}
        onSubmit={async (name: string, steps: string[]) => {
          if (funnelToEdit) {
            await onFunnelEdit(funnelToEdit.id, name, steps)
            return
          }

          await onFunnelCreate(name, steps)
        }}
        loading={funnelActionLoading}
      />

      <SessionsDrawer
        isOpen={!!sessionsDrawer}
        onClose={() => setSessionsDrawer(null)}
        label={sessionsDrawer?.label || ''}
        projectId={id}
        timezone={timezone}
        timeFormat={timeFormat}
        period={period}
        from={searchParams.get('from') || undefined}
        to={searchParams.get('to') || undefined}
        filters={filters}
        funnelId={activeFunnel?.id}
        funnelStep={sessionsDrawer ? sessionsDrawer.stepIndex + 1 : undefined}
        dropoff={Boolean(sessionsDrawer?.dropoff)}
        showDropoffToggle={
          !!sessionsDrawer &&
          sessionsDrawer.stepIndex < (funnelAnalytics?.funnel?.length || 0) - 1
        }
        onDropoffChange={(dropoff) =>
          setSessionsDrawer((current) =>
            current ? { ...current, dropoff } : current,
          )
        }
        totalCount={
          sessionsDrawer
            ? sessionsDrawer.dropoff
              ? funnelAnalytics?.funnel?.[sessionsDrawer.stepIndex + 1]?.dropoff
              : funnelAnalytics?.funnel?.[sessionsDrawer.stepIndex]?.events
            : undefined
        }
      />
    </>
  )
}

export default FunnelsView

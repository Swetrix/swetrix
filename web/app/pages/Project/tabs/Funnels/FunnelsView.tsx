import { useQueryClient } from '@tanstack/react-query'
import _filter from 'lodash/filter'
import _find from 'lodash/find'
import _includes from 'lodash/includes'
import _isEmpty from 'lodash/isEmpty'
import { FunnelIcon, PlusIcon } from '@phosphor-icons/react'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useSearchParams, useFetcher } from 'react-router'
import { toast } from 'sonner'

import { useFunnelQuery } from '~/hooks/v2/useV2Queries'
import { DOCS_URL, FUNNELS_PERIOD_PAIRS } from '~/lib/constants'
import type { AnalyticsFunnel, Funnel } from '~/lib/models/Project'
import NewFunnel from '~/modals/NewFunnel'
import FunnelsList, {
  type FunnelData,
} from '~/pages/Project/tabs/Funnels/FunnelsList'
import DashboardHeader from '~/pages/Project/View/components/DashboardHeader'
import Filters from '~/pages/Project/View/components/Filters'
import ProjectViewHeaderActions from '~/pages/Project/View/components/ProjectViewHeaderActions'
import TabErrorBoundary from '~/pages/Project/View/components/TabErrorBoundary'
import { useViewProjectContext } from '~/pages/Project/View/ViewProject'
import { useAuth } from '~/providers/AuthProvider'
import {
  useCurrentProject,
  useProjectPassword,
} from '~/providers/CurrentProjectProvider'
import type { ProjectViewActionData } from '~/routes/projects.$id'
import Button from '~/ui/Button'
import { Link } from '~/ui/Link'
import { Text } from '~/ui/Text'
import routes from '~/utils/routes'

import { SessionsDrawer } from '../Traffic/SessionsDrawer'

interface FunnelsViewProps {
  tnMapping: Record<string, string>
}

const FUNNELS_DOCS_URL = `${DOCS_URL}/analytics-dashboard/funnels`

const FunnelsView = ({ tnMapping }: FunnelsViewProps) => {
  const { id, projectPath, project, mergeProject, allowedToManage } =
    useCurrentProject()
  const projectPassword = useProjectPassword(id)
  const { isAuthenticated } = useAuth()
  const { periodPairs, period, timezone, timeFormat, filters } =
    useViewProjectContext()
  const { t } = useTranslation('common')
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const fetcher = useFetcher<ProjectViewActionData>()
  const lastHandledData = useRef<ProjectViewActionData | null>(null)
  const deletedFunnelId = useRef<string | null>(null)

  const [isNewFunnelOpened, setIsNewFunnelOpened] = useState(false)
  const [funnelToEdit, setFunnelToEdit] = useState<Funnel | undefined>()
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

  const funnelQuery = useFunnelQuery(activeFunnel?.id ?? null)

  const displayedFunnelIdRef = useRef<string | null>(null)
  if (funnelQuery.data && !funnelQuery.isPlaceholderData) {
    displayedFunnelIdRef.current = activeFunnel?.id ?? null
  }
  const isStaleFunnelData =
    funnelQuery.isPlaceholderData &&
    displayedFunnelIdRef.current !== (activeFunnel?.id ?? null)

  const funnelAnalytics = useMemo<FunnelData | null>(() => {
    const data = funnelQuery.data?.data

    if (!data) {
      return null
    }

    return {
      funnel: (data.steps || []) as AnalyticsFunnel[],
      totalPageviews: Number(data.totalPageviews || 0),
    }
  }, [funnelQuery.data])

  const displayedFunnelAnalytics = isStaleFunnelData ? null : funnelAnalytics
  const funnelDataLoading = funnelQuery.isLoading || isStaleFunnelData
  const funnelDataRefetching =
    funnelQuery.isFetching && !funnelDataLoading && Boolean(funnelQuery.data)

  const funnelActionLoading = fetcher.state !== 'idle'
  const hasFunnels = !_isEmpty(project?.funnels)
  const resetKey = `funnels:${searchParams.toString()}`

  const clearActiveFunnel = useCallback(() => {
    const nextSearchParams = new URLSearchParams(searchParams.toString())
    nextSearchParams.delete('funnelId')
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

  useEffect(() => {
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
          { method: 'POST', action: projectPath },
        )
      } else if (intent === 'update-funnel') {
        toast.success(t('apiNotifications.funnelUpdated'))
        closeFunnelSettings()
        fetcher.submit(
          { intent: 'get-funnels', password: projectPassword },
          { method: 'POST', action: projectPath },
        )

        queryClient.invalidateQueries({ queryKey: ['v2', id, 'funnel'] })
      } else if (intent === 'delete-funnel') {
        toast.success(t('apiNotifications.funnelDeleted'))
        fetcher.submit(
          { intent: 'get-funnels', password: projectPassword },
          { method: 'POST', action: projectPath },
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
    projectPath,
    fetcher,
    activeFunnel?.id,
    clearActiveFunnel,
    mergeProject,
    queryClient,
  ])

  const onFunnelCreate = (name: string, steps: string[]) => {
    if (funnelActionLoading) return

    fetcher.submit(
      { intent: 'create-funnel', name, steps: JSON.stringify(steps) },
      { method: 'POST', action: projectPath },
    )
  }

  const onFunnelEdit = (funnelId: string, name: string, steps: string[]) => {
    if (funnelActionLoading) return

    fetcher.submit(
      { intent: 'update-funnel', funnelId, name, steps: JSON.stringify(steps) },
      { method: 'POST', action: projectPath },
    )
  }

  const onFunnelDelete = (funnelId: string) => {
    if (funnelActionLoading) return

    deletedFunnelId.current = funnelId
    fetcher.submit(
      { intent: 'delete-funnel', funnelId },
      { method: 'POST', action: projectPath },
    )
  }

  const handleBarClick = useCallback(
    (stepIndex: number) => {
      if (!displayedFunnelAnalytics?.funnel?.[stepIndex]) return

      const step = displayedFunnelAnalytics.funnel[stepIndex]
      setSessionsDrawer({
        stepIndex,
        label: step.value,
      })
    },
    [displayedFunnelAnalytics],
  )

  return (
    <TabErrorBoundary
      titleKey='dashboard.failedToLoadFunnels'
      resetKey={resetKey}
    >
      <DashboardHeader
        showLiveVisitors
        hideTimeBucket
        timeBucketSelectorItems={timeBucketSelectorItems}
        rightContent={<ProjectViewHeaderActions tnMapping={tnMapping} />}
      />
      <Filters className='mb-3' tnMapping={tnMapping} />

      {hasFunnels ? (
        <FunnelsList
          funnels={project?.funnels}
          activeFunnelId={activeFunnel?.id || null}
          funnelData={displayedFunnelAnalytics}
          funnelDataLoading={funnelDataLoading}
          funnelDataRefetching={funnelDataRefetching}
          onToggleFunnel={handleToggleFunnel}
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
            <Trans
              t={t}
              i18nKey='dashboard.funnelsDesc'
              components={{
                docs: (
                  <a
                    href={FUNNELS_DOCS_URL}
                    aria-label={t('ariaLabels.openFunnelsGuide')}
                    className='font-medium underline decoration-dashed hover:decoration-solid'
                    target='_blank'
                    rel='noreferrer noopener'
                  />
                ),
              }}
            />
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
          sessionsDrawer.stepIndex <
            (displayedFunnelAnalytics?.funnel?.length || 0) - 1
        }
        onDropoffChange={(dropoff) =>
          setSessionsDrawer((current) =>
            current ? { ...current, dropoff } : current,
          )
        }
        totalCount={
          sessionsDrawer
            ? sessionsDrawer.dropoff
              ? displayedFunnelAnalytics?.funnel?.[sessionsDrawer.stepIndex + 1]
                  ?.dropoff
              : displayedFunnelAnalytics?.funnel?.[sessionsDrawer.stepIndex]
                  ?.events
            : undefined
        }
      />
    </TabErrorBoundary>
  )
}

export default FunnelsView

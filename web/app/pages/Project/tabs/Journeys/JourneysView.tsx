import { ResponsiveSankey } from '@nivo/sankey'
import { PathIcon } from '@phosphor-icons/react'
import _isEmpty from 'lodash/isEmpty'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { JourneysResponse } from '~/api/api.server'
import { useJourneysProxy } from '~/hooks/useAnalyticsProxy'
import DashboardHeader from '~/pages/Project/View/components/DashboardHeader'
import Filters from '~/pages/Project/View/components/Filters'
import ProjectViewHeaderActions from '~/pages/Project/View/components/ProjectViewHeaderActions'
import TabErrorBoundary from '~/pages/Project/View/components/TabErrorBoundary'
import {
  useViewProjectContext,
  useRefreshTriggers,
} from '~/pages/Project/View/ViewProject'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import { useTheme } from '~/providers/ThemeProvider'
import Loader from '~/ui/Loader'
import LoadingBar from '~/ui/LoadingBar'
import { Text } from '~/ui/Text'

import { SessionsDrawer } from '../Traffic/SessionsDrawer'
import { getFormatDate } from '../../View/ViewProject.helpers'

const MIN_STEPS = 2
const MAX_STEPS = 10
const MIN_JOURNEYS = 5
const MAX_JOURNEYS = 100
const DEFAULT_STEPS = 3
const DEFAULT_JOURNEYS = 20

const NODE_COLOURS = [
  '#2563eb',
  '#0d9488',
  '#7c3aed',
  '#db2777',
  '#ea580c',
  '#65a30d',
  '#0891b2',
  '#c026d3',
  '#4f46e5',
  '#b45309',
]

interface SankeyNodeMeta {
  page: string
  step: number
  sessions: number
}

interface JourneysViewProps {
  tnMapping: Record<string, string>
}

const truncatePath = (path: string, maxLength = 24) => {
  if (path.length <= maxLength) {
    return path
  }

  return `${path.slice(0, maxLength - 1)}…`
}

const JourneysView = ({ tnMapping }: JourneysViewProps) => {
  const { dateRange, period, timezone, timeFormat, filters } =
    useViewProjectContext()
  const { journeysRefreshTrigger } = useRefreshTriggers()
  const { id } = useCurrentProject()
  const { theme } = useTheme()
  const { t } = useTranslation('common')

  const [steps, setSteps] = useState(DEFAULT_STEPS)
  const [journeysCount, setJourneysCount] = useState(DEFAULT_JOURNEYS)
  const [debouncedParams, setDebouncedParams] = useState({
    steps: DEFAULT_STEPS,
    journeys: DEFAULT_JOURNEYS,
  })
  const [isLoading, setIsLoading] = useState<boolean | null>(null)
  const [journeysData, setJourneysData] = useState<JourneysResponse | null>(
    null,
  )
  const [sessionsDrawer, setSessionsDrawer] = useState<{
    step: number
    page: string
    sessions: number
  } | null>(null)
  const loadingRef = useRef(false)

  const { fetchJourneys } = useJourneysProxy()

  const [from, to] = useMemo(() => {
    if (!dateRange) {
      return [undefined, undefined]
    }

    return [getFormatDate(dateRange[0]), getFormatDate(dateRange[1])]
  }, [dateRange])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedParams({ steps, journeys: journeysCount })
    }, 300)

    return () => clearTimeout(timer)
  }, [steps, journeysCount])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (loadingRef.current) {
        return
      }

      loadingRef.current = true
      setIsLoading(true)

      try {
        const result = await fetchJourneys(id, {
          period,
          filters,
          from,
          to,
          timezone,
          steps: debouncedParams.steps,
          journeys: debouncedParams.journeys,
        })

        if (!cancelled && result) {
          setJourneysData(result)
        }
      } catch (error: any) {
        if (!cancelled) {
          toast.error(
            typeof error === 'string'
              ? error
              : t('apiNotifications.somethingWentWrong'),
          )
        }
      } finally {
        loadingRef.current = false

        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    id,
    period,
    from,
    to,
    timezone,
    filters,
    debouncedParams,
    journeysRefreshTrigger,
  ])

  const { sankeyData, nodeMeta, maxColumnNodes } = useMemo(() => {
    const meta = new Map<string, SankeyNodeMeta>()

    if (_isEmpty(journeysData?.journeys)) {
      return { sankeyData: null, nodeMeta: meta, maxColumnNodes: 0 }
    }

    const nodeSessions = new Map<string, SankeyNodeMeta>()
    const links = new Map<
      string,
      { source: string; target: string; value: number }
    >()

    for (const { path, value } of journeysData!.journeys) {
      path.forEach((page, index) => {
        const nodeId = `${index}:${page}`
        const node = nodeSessions.get(nodeId)

        if (node) {
          node.sessions += value
        } else {
          nodeSessions.set(nodeId, { page, step: index, sessions: value })
        }

        if (index < path.length - 1) {
          const target = `${index + 1}:${path[index + 1]}`
          const linkId = `${nodeId}→${target}`
          const link = links.get(linkId)

          if (link) {
            link.value += value
          } else {
            links.set(linkId, { source: nodeId, target, value })
          }
        }
      })
    }

    if (links.size === 0) {
      return { sankeyData: null, nodeMeta: meta, maxColumnNodes: 0 }
    }

    // Nivo requires every node to participate in at least one link,
    // so nodes are derived from links (journeys that end early simply taper off)
    const linkedNodeIds = new Set<string>()

    for (const link of links.values()) {
      linkedNodeIds.add(link.source)
      linkedNodeIds.add(link.target)
    }

    const columnCounts = new Map<number, number>()
    const nodes: { id: string }[] = []

    for (const nodeId of linkedNodeIds) {
      const node = nodeSessions.get(nodeId)!
      meta.set(nodeId, node)
      nodes.push({ id: nodeId })
      columnCounts.set(node.step, (columnCounts.get(node.step) || 0) + 1)
    }

    return {
      sankeyData: { nodes, links: Array.from(links.values()) },
      nodeMeta: meta,
      maxColumnNodes: Math.max(...columnCounts.values()),
    }
  }, [journeysData])

  const chartHeight = useMemo(
    () => Math.min(1000, Math.max(440, maxColumnNodes * 56)),
    [maxColumnNodes],
  )

  const totalSessions = journeysData?.totalSessions || 0

  const nodeColour = (nodeId: string) => {
    const node = nodeMeta.get(nodeId)
    return NODE_COLOURS[(node?.step ?? 0) % NODE_COLOURS.length]
  }

  const renderNodeTooltip = (nodeId: string) => {
    const node = nodeMeta.get(nodeId)

    if (!node) {
      return null
    }

    const percentage =
      totalSessions > 0
        ? Math.round((node.sessions / totalSessions) * 10000) / 100
        : 0

    return (
      <div className='w-max max-w-xs rounded-lg bg-gray-50 px-3 py-2.5 text-xs shadow-lg ring-1 ring-black/10 md:max-w-md md:text-sm dark:bg-slate-900 dark:ring-white/10'>
        <p className='font-semibold break-all text-gray-900 dark:text-gray-50'>
          {node.page}
        </p>
        <p className='mt-1 text-gray-700 dark:text-gray-300'>
          {t('project.journeys.stepX', { x: node.step + 1 })} ·{' '}
          {t('project.journeys.xSessions', {
            x: node.sessions.toLocaleString(),
          })}
        </p>
        <p className='text-gray-700 dark:text-gray-300'>
          {t('project.journeys.percentOfSessions', { x: percentage })}
        </p>
        <p className='mt-1.5 text-gray-500 dark:text-gray-400'>
          {t('project.journeys.clickToInspect')}
        </p>
      </div>
    )
  }

  const renderLinkTooltip = (
    sourceId: string,
    targetId: string,
    value: number,
  ) => {
    const source = nodeMeta.get(sourceId)
    const target = nodeMeta.get(targetId)

    if (!source || !target) {
      return null
    }

    const percentage =
      source.sessions > 0
        ? Math.round((value / source.sessions) * 10000) / 100
        : 0

    return (
      <div className='w-max max-w-xs rounded-lg bg-gray-50 px-3 py-2.5 text-xs shadow-lg ring-1 ring-black/10 md:max-w-md md:text-sm dark:bg-slate-900 dark:ring-white/10'>
        <p className='font-semibold break-all text-gray-900 dark:text-gray-50'>
          {source.page} → {target.page}
        </p>
        <p className='mt-1 text-gray-700 dark:text-gray-300'>
          {t('project.journeys.xSessions', { x: value.toLocaleString() })}
        </p>
        <p className='text-gray-700 dark:text-gray-300'>
          {t('project.journeys.percentContinued', { x: percentage })}
        </p>
      </div>
    )
  }

  const sliders = (
    <div className='mb-3 flex flex-wrap items-center gap-x-8 gap-y-3'>
      <div className='flex items-center gap-3'>
        <Text
          as='span'
          size='sm'
          weight='medium'
          className='whitespace-nowrap tabular-nums'
        >
          {t('project.journeys.xSteps', { x: steps })}
        </Text>
        <input
          type='range'
          aria-label={t('project.journeys.stepsSliderLabel')}
          min={MIN_STEPS}
          max={MAX_STEPS}
          value={steps}
          onChange={(e) => setSteps(Number(e.target.value))}
          className='w-36 sm:w-44'
        />
      </div>
      <div className='flex items-center gap-3'>
        <Text
          as='span'
          size='sm'
          weight='medium'
          className='whitespace-nowrap tabular-nums'
        >
          {t('project.journeys.xJourneys', { x: journeysCount })}
        </Text>
        <input
          type='range'
          aria-label={t('project.journeys.journeysSliderLabel')}
          min={MIN_JOURNEYS}
          max={MAX_JOURNEYS}
          step={5}
          value={journeysCount}
          onChange={(e) => setJourneysCount(Number(e.target.value))}
          className='w-36 sm:w-44'
        />
      </div>
    </div>
  )

  return (
    <TabErrorBoundary
      titleKey='dashboard.failedToLoadJourneys'
      resetKey={`journeys:${journeysRefreshTrigger}`}
    >
      <DashboardHeader
        showLiveVisitors
        hideTimeBucket
        rightContent={<ProjectViewHeaderActions tnMapping={tnMapping} />}
      />
      <Filters className='mb-3' tnMapping={tnMapping} />
      {isLoading && journeysData ? <LoadingBar /> : null}

      {isLoading === null || (isLoading && !journeysData) ? (
        <Loader />
      ) : (
        <>
          {sliders}
          {sankeyData ? (
            <div style={{ height: chartHeight }}>
              <ResponsiveSankey
                data={sankeyData}
                margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
                align='start'
                colors={(node: any) => nodeColour(node.id)}
                nodeOpacity={1}
                nodeHoverOthersOpacity={0.35}
                nodeThickness={14}
                nodeSpacing={22}
                nodeBorderWidth={0}
                nodeBorderRadius={3}
                linkOpacity={theme === 'dark' ? 0.35 : 0.25}
                linkHoverOpacity={0.6}
                linkHoverOthersOpacity={0.1}
                linkContract={2}
                enableLinkGradient
                label={(node: any) => {
                  const meta = nodeMeta.get(node.id)

                  if (!meta) {
                    return node.id
                  }

                  // hide labels of tiny nodes to reduce clutter, they are still hoverable
                  if (
                    totalSessions > 0 &&
                    meta.sessions / totalSessions < 0.015
                  ) {
                    return ''
                  }

                  return truncatePath(meta.page)
                }}
                labelPosition='inside'
                labelOrientation='horizontal'
                labelPadding={10}
                labelTextColor={theme === 'dark' ? '#e2e8f0' : '#334155'}
                theme={{
                  labels: {
                    text: {
                      fontSize: 13,
                      fontWeight: 500,
                      fontFamily: 'inherit',
                    },
                  },
                }}
                nodeTooltip={({ node }: any) => renderNodeTooltip(node.id)}
                linkTooltip={({ link }: any) =>
                  renderLinkTooltip(link.source.id, link.target.id, link.value)
                }
                onClick={(data: any) => {
                  // links (source/target present) are not clickable, only nodes are
                  if (data?.source || !data?.id) {
                    return
                  }

                  const node = nodeMeta.get(data.id)

                  if (!node) {
                    return
                  }

                  setSessionsDrawer({
                    step: node.step + 1,
                    page: node.page,
                    sessions: node.sessions,
                  })
                }}
              />
            </div>
          ) : (
            <div className='mx-auto w-full max-w-2xl py-16 text-center'>
              <div className='mx-auto mb-6 flex size-14 items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-900'>
                <PathIcon className='size-7 text-gray-700 dark:text-gray-200' />
              </div>
              <Text
                as='h3'
                size='xl'
                weight='medium'
                className='tracking-tight'
              >
                {t('dashboard.journeys')}
              </Text>
              <Text
                as='p'
                size='sm'
                colour='secondary'
                className='mx-auto mt-2 max-w-md whitespace-pre-wrap'
              >
                {t('project.journeys.noData')}
              </Text>
            </div>
          )}
        </>
      )}

      <SessionsDrawer
        isOpen={!!sessionsDrawer}
        onClose={() => setSessionsDrawer(null)}
        label={
          sessionsDrawer
            ? `${sessionsDrawer.page} · ${t('project.journeys.stepX', {
                x: sessionsDrawer.step,
              })}`
            : ''
        }
        projectId={id}
        timezone={timezone}
        timeFormat={timeFormat}
        period={period}
        from={from}
        to={to}
        filters={filters}
        journeyStep={sessionsDrawer?.step}
        journeyPage={sessionsDrawer?.page}
        totalCount={sessionsDrawer?.sessions}
      />
    </TabErrorBoundary>
  )
}

export default JourneysView

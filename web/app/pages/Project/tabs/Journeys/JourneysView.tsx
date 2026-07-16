import { ResponsiveSankey } from '@nivo/sankey'
import { FlowArrowIcon, PathIcon, TableIcon } from '@phosphor-icons/react'
import cx from 'clsx'
import _isEmpty from 'lodash/isEmpty'
import { useEffect, useMemo, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'

import type {
  JourneyLinkDetails,
  JourneyNodeDetails,
  JourneysResponse,
} from '~/api/api.server'
import { useJourneysProxy } from '~/hooks/useAnalyticsProxy'
import { DOCS_URL } from '~/lib/constants'
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
import countries from '~/utils/isoCountries'

import { SessionsDrawer } from '../Traffic/SessionsDrawer'
import { getFormatDate } from '../../View/ViewProject.helpers'

const JOURNEYS_DOCS_URL = `${DOCS_URL}/analytics-dashboard/journeys`

const MIN_STEPS = 2
const MAX_STEPS = 10
const MIN_JOURNEYS = 5
const MAX_JOURNEYS = 100
const DEFAULT_STEPS = 3
const DEFAULT_JOURNEYS = 20

const TOOLTIP_BREAKDOWN_LIMIT = 3

// Colours are assigned to PAGES (by traffic volume), not to steps -- the same
// page keeps the same colour in every column so it can be traced across the
// diagram. Position already encodes the step.
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

const NEUTRAL_PAGE_COLOUR = '#64748b'

const OTHER_PAGE = '__other__'
const EXIT_PAGE = '__exit__'

const otherId = (step: number) => `${step}:${OTHER_PAGE}`
const exitId = (step: number) => `${step}:${EXIT_PAGE}`

type NodeKind = 'page' | 'other' | 'exit'

interface SankeyNodeMeta {
  page: string
  step: number
  kind: NodeKind
  sessions: number
  // sessions whose journey ended at this node
  exited: number
  // sessions that continued past the last drawn column at this node
  continuedPast: number
}

interface JourneysViewProps {
  tnMapping: Record<string, string>
}

// Middle truncation: for real routes the distinguishing token is usually at
// the END of the path (/docs/selfhosting/how-to-install vs ...-update), so
// keep both the prefix and the tail.
const truncatePath = (path: string, maxLength = 24) => {
  if (path.length <= maxLength) {
    return path
  }

  const head = Math.ceil((maxLength - 1) * 0.45)
  const tail = maxLength - 1 - head

  return `${path.slice(0, head)}…${path.slice(-tail)}`
}

const clampSteps = (value: number) =>
  Math.min(MAX_STEPS, Math.max(MIN_STEPS, Math.floor(value)))

const clampJourneys = (value: number) =>
  Math.min(MAX_JOURNEYS, Math.max(MIN_JOURNEYS, Math.floor(value)))

const SLIDER_CLASSNAME =
  'h-2 w-36 cursor-pointer appearance-none rounded-full accent-blue-600 sm:w-44 [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-blue-600 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-sm active:[&::-moz-range-thumb]:cursor-grabbing [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-600 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-sm active:[&::-webkit-slider-thumb]:cursor-grabbing'

// Filled-track gradient, same treatment as the pricing page slider
// (MarketingPricing.tsx). Track colour is theme-dependent because the inline
// background overrides any Tailwind bg-* class.
const sliderTrackStyle = (
  value: number,
  min: number,
  max: number,
  theme: string,
) => {
  const percent = max > min ? ((value - min) / (max - min)) * 100 : 0
  const track = theme === 'dark' ? 'rgb(51 65 85)' : 'rgb(209 213 219)'

  return {
    background: `linear-gradient(to right, rgb(37 99 235) 0%, rgb(37 99 235) ${percent}%, ${track} ${percent}%, ${track} 100%)`,
  }
}

interface BreakdownDetails {
  total: number
  sources: Record<string, number>
  countries: Record<string, number>
}

interface TooltipBreakdownsProps {
  details: BreakdownDetails | undefined
}

// Same presentation as the goals / funnels tooltip breakdowns: top sources
// and top countries side by side, percentages relative to every session
// passing through the node (or making the transition, for links).
const TooltipBreakdowns = ({ details }: TooltipBreakdownsProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')

  if (!details) {
    return null
  }

  const getTopEntries = (items?: Record<string, number>) =>
    Object.entries(items || {})
      .filter(([, count]) => Number.isFinite(count) && count > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, TOOLTIP_BREAKDOWN_LIMIT)

  const topSources = getTopEntries(details.sources)
  const topCountries = getTopEntries(details.countries)

  if (topSources.length === 0 && topCountries.length === 0) {
    return null
  }

  const denominator = Math.max(details.total, 1)

  return (
    <div className='mt-2 flex gap-5 border-t border-gray-200 pt-2 dark:border-slate-700/80'>
      {topSources.length > 0 ? (
        <div className='min-w-0 flex-1'>
          <p className='mb-1.5 text-[10px] font-semibold tracking-wider text-gray-700 uppercase dark:text-gray-200'>
            {t('project.topSources')}
          </p>
          {topSources.map(([domain, count]) => {
            const perc = Math.round((count / denominator) * 100)
            const isDirect = domain === 'Direct / None'

            return (
              <div
                key={domain}
                className='mt-1 flex items-center justify-between gap-2'
              >
                <div className='flex min-w-0 items-center gap-1.5'>
                  {isDirect ? (
                    <>
                      <img
                        src='/assets/icons/chain.svg'
                        className='size-3.5 shrink-0 dark:hidden'
                        alt=''
                      />
                      <img
                        src='/assets/icons/chain-light.svg'
                        className='hidden size-3.5 shrink-0 dark:inline'
                        alt=''
                      />
                    </>
                  ) : (
                    <img
                      src={`/api/favicon?domain=${encodeURIComponent(domain)}`}
                      className='size-3.5 shrink-0 rounded-sm'
                      loading='lazy'
                      alt=''
                    />
                  )}
                  <span className='truncate text-gray-900 dark:text-gray-50'>
                    {domain}
                  </span>
                </div>
                <span className='shrink-0 font-mono text-gray-900 tabular-nums dark:text-gray-50'>
                  {perc}%
                </span>
              </div>
            )
          })}
        </div>
      ) : null}
      {topCountries.length > 0 ? (
        <div className='min-w-0 flex-1'>
          <p className='mb-1.5 text-[10px] font-semibold tracking-wider text-gray-700 uppercase dark:text-gray-200'>
            {t('project.topCountries')}
          </p>
          {topCountries.map(([cc, count]) => {
            const perc = Math.round((count / denominator) * 100)

            return (
              <div
                key={cc}
                className='mt-1 flex items-center justify-between gap-2'
              >
                <div className='flex min-w-0 items-center gap-1.5'>
                  <img
                    src={`/assets/flags/${encodeURIComponent(cc.toLowerCase())}.svg`}
                    width='16'
                    height='12'
                    className='shrink-0 rounded-[2px]'
                    loading='lazy'
                    alt=''
                  />
                  <span className='truncate text-gray-900 dark:text-gray-50'>
                    {countries.getName(cc, language) || cc}
                  </span>
                </div>
                <span className='shrink-0 font-mono text-gray-900 tabular-nums dark:text-gray-50'>
                  {perc}%
                </span>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

const JourneysView = ({ tnMapping }: JourneysViewProps) => {
  const { dateRange, period, timezone, timeFormat, filters } =
    useViewProjectContext()
  const { journeysRefreshTrigger } = useRefreshTriggers()
  const { id } = useCurrentProject()
  const { theme } = useTheme()
  const { t } = useTranslation('common')
  const [searchParams, setSearchParams] = useSearchParams()

  const [steps, setSteps] = useState(() => {
    const value = Number(searchParams.get('steps'))
    return Number.isFinite(value) && value ? clampSteps(value) : DEFAULT_STEPS
  })
  const [journeysCount, setJourneysCount] = useState(() => {
    const value = Number(searchParams.get('journeys'))
    return Number.isFinite(value) && value
      ? clampJourneys(value)
      : DEFAULT_JOURNEYS
  })
  const [view, setView] = useState<'chart' | 'table'>(() =>
    searchParams.get('view') === 'table' ? 'table' : 'chart',
  )
  const [debouncedParams, setDebouncedParams] = useState({
    steps,
    journeys: journeysCount,
  })
  const [isLoading, setIsLoading] = useState<boolean | null>(null)
  const [journeysData, setJourneysData] = useState<JourneysResponse | null>(
    null,
  )
  const [sessionsDrawer, setSessionsDrawer] = useState<{
    step: number
    page: string
    totalSessions?: number
  } | null>(null)

  const { fetchJourneys } = useJourneysProxy()

  const [from, to] = useMemo(() => {
    if (!dateRange) {
      return [undefined, undefined]
    }

    return [getFormatDate(dateRange[0]), getFormatDate(dateRange[1])]
  }, [dateRange])

  const syncSearchParams = (updates: Record<string, string>) => {
    const next = new URLSearchParams(searchParams.toString())

    for (const [key, value] of Object.entries(updates)) {
      next.set(key, value)
    }

    setSearchParams(next, { replace: true, preventScrollReset: true })
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedParams({ steps, journeys: journeysCount })
    }, 300)

    return () => clearTimeout(timer)
  }, [steps, journeysCount])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
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

  const nodeDetailsMap = useMemo(() => {
    const map = new Map<string, JourneyNodeDetails>()

    for (const details of journeysData?.nodeDetails || []) {
      map.set(`${details.step}:${details.page}`, details)
    }

    return map
  }, [journeysData])

  const linkDetailsMap = useMemo(() => {
    const map = new Map<string, JourneyLinkDetails>()

    for (const details of journeysData?.linkDetails || []) {
      map.set(`${details.step}:${details.source}→${details.target}`, details)
    }

    return map
  }, [journeysData])

  const {
    sankeyData,
    nodeMeta,
    pageColours,
    maxColumnNodes,
    columns,
    coverage,
  } = useMemo(() => {
    const meta = new Map<string, SankeyNodeMeta>()
    const colours = new Map<string, string>()

    const empty = {
      sankeyData: null,
      nodeMeta: meta,
      pageColours: colours,
      maxColumnNodes: 0,
      columns: 0,
      coverage: null,
    }

    if (_isEmpty(journeysData?.journeys)) {
      return empty
    }

    const {
      journeys,
      totalSessions,
      totalPaths,
      lengthHistogram = [],
    } = journeysData!

    const nodeSessions = new Map<string, SankeyNodeMeta>()
    const links = new Map<
      string,
      { source: string; target: string; value: number }
    >()

    for (const { path, value, continuedPast = 0 } of journeys) {
      path.forEach((page, index) => {
        const nodeId = `${index}:${page}`
        const node = nodeSessions.get(nodeId)

        if (node) {
          node.sessions += value
        } else {
          nodeSessions.set(nodeId, {
            page,
            step: index,
            kind: 'page',
            sessions: value,
            exited: 0,
            continuedPast: 0,
          })
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

      // Terminal accounting: sessions on this path either ended at its last
      // node or (only possible at the steps limit) continued past it.
      const lastNode = nodeSessions.get(
        `${path.length - 1}:${path[path.length - 1]}`,
      )!
      lastNode.exited += value - continuedPast
      lastNode.continuedPast += continuedPast
    }

    if (links.size === 0) {
      return empty
    }

    // Sessions whose (sliced) path is at least `step + 1` pages long, i.e.
    // every session that reached this column -- drawn or not.
    const reachedStep = (step: number) =>
      lengthHistogram.reduce(
        (sum, bucket) => (bucket.len > step ? sum + bucket.sessions : sum),
        0,
      )

    const lastColumn =
      Math.max(...lengthHistogram.map((bucket) => bucket.len), 2) - 1

    const drawnAt = new Map<number, number>()
    for (const node of nodeSessions.values()) {
      drawnAt.set(node.step, (drawnAt.get(node.step) || 0) + node.sessions)
    }

    // "Other paths": sessions that reached this column on a path that is
    // not drawn. Queried population minus drawn -- NOT a residual of the
    // ribbons, so top-N truncation cannot masquerade as drop-off.
    const otherAt = (step: number) =>
      Math.max(reachedStep(step) - (drawnAt.get(step) || 0), 0)

    // Exits from drawn pages: node@step -> Exited@(step + 1). Exits at the
    // last column stay in the node itself (there is no next column) and are
    // explained in its tooltip instead.
    const exitInflow = new Map<number, number>()

    for (const node of nodeSessions.values()) {
      if (node.exited > 0 && node.step < lastColumn) {
        const linkId = `${node.step}:${node.page}→${exitId(node.step + 1)}`
        links.set(linkId, {
          source: `${node.step}:${node.page}`,
          target: exitId(node.step + 1),
          value: node.exited,
        })
        exitInflow.set(
          node.step + 1,
          (exitInflow.get(node.step + 1) || 0) + node.exited,
        )
      }
    }

    // "Other paths" chain. A path is drawn or not drawn wholly, so undrawn
    // sessions reaching step + 1 also reached step: the chain is monotone
    // and mass-conserving (other[i] = other[i + 1] + exits between them).
    const lastColumnBucket = lengthHistogram.find(
      (bucket) => bucket.len === lastColumn + 1,
    )
    const drawnContinuedAtLast = Array.from(nodeSessions.values()).reduce(
      (sum, node) =>
        node.step === lastColumn ? sum + node.continuedPast : sum,
      0,
    )

    for (let step = 0; step <= lastColumn; step++) {
      const sessions = otherAt(step)

      if (sessions <= 0) {
        continue
      }

      const isLast = step === lastColumn
      const continuedPast = isLast
        ? Math.max((lastColumnBucket?.truncated || 0) - drawnContinuedAtLast, 0)
        : 0
      const nextOther = isLast ? 0 : otherAt(step + 1)
      const exited = isLast ? sessions - continuedPast : sessions - nextOther

      nodeSessions.set(otherId(step), {
        page: OTHER_PAGE,
        step,
        kind: 'other',
        sessions,
        exited: Math.max(exited, 0),
        continuedPast,
      })

      if (!isLast && nextOther > 0) {
        links.set(`${otherId(step)}→${otherId(step + 1)}`, {
          source: otherId(step),
          target: otherId(step + 1),
          value: nextOther,
        })
      }

      if (!isLast && exited > 0) {
        links.set(`${otherId(step)}→${exitId(step + 1)}`, {
          source: otherId(step),
          target: exitId(step + 1),
          value: exited,
        })
        exitInflow.set(step + 1, (exitInflow.get(step + 1) || 0) + exited)
      }
    }

    for (const [step, sessions] of exitInflow) {
      nodeSessions.set(exitId(step), {
        page: EXIT_PAGE,
        step,
        kind: 'exit',
        sessions,
        exited: sessions,
        continuedPast: 0,
      })
    }

    // Stable colour per page (ranked by total traffic across all steps),
    // so the same page can be traced across columns.
    const pageTotals = new Map<string, number>()

    for (const node of nodeSessions.values()) {
      if (node.kind !== 'page') {
        continue
      }

      pageTotals.set(
        node.page,
        (pageTotals.get(node.page) || 0) + node.sessions,
      )
    }

    Array.from(pageTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([page], index) => {
        colours.set(
          page,
          index < NODE_COLOURS.length
            ? NODE_COLOURS[index]
            : NEUTRAL_PAGE_COLOUR,
        )
      })

    // Nivo requires every node to participate in at least one link,
    // so nodes are derived from links
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

    const coveredSessions = journeys.reduce(
      (sum, journey) => sum + journey.value,
      0,
    )

    return {
      sankeyData: { nodes, links: Array.from(links.values()) },
      nodeMeta: meta,
      pageColours: colours,
      maxColumnNodes: Math.max(...columnCounts.values()),
      columns: lastColumn + 1,
      coverage: {
        drawnPaths: journeys.length,
        totalPaths,
        coveredSessions,
        totalSessions,
        percent:
          totalSessions > 0
            ? Math.round((coveredSessions / totalSessions) * 100)
            : 0,
      },
    }
  }, [journeysData])

  const chartHeight = useMemo(
    () => Math.min(1000, Math.max(440, maxColumnNodes * 56)),
    [maxColumnNodes],
  )

  const totalSessions = journeysData?.totalSessions || 0

  const nodeColour = (nodeId: string) => {
    const node = nodeMeta.get(nodeId)

    if (node?.kind === 'exit') {
      return theme === 'dark' ? '#4b5563' : '#9ca3af'
    }

    if (node?.kind === 'other') {
      return theme === 'dark' ? '#64748b' : '#94a3b8'
    }

    return (node && pageColours.get(node.page)) || NEUTRAL_PAGE_COLOUR
  }

  const formatPercent = (value: number, of: number) =>
    of > 0 ? Math.round((value / of) * 10000) / 100 : 0

  // Same container and row grammar as the funnel / goals billboard.js
  // tooltips: label on the left, mono value on the right, bordered sections.
  const tooltipContainerClassName =
    'w-max max-w-sm rounded-lg bg-gray-50 px-3 py-2.5 text-xs shadow-lg ring-1 ring-black/10 md:max-w-md md:text-sm dark:bg-slate-900 dark:ring-white/10'
  const tooltipRowClassName = 'mt-1 flex items-center justify-between gap-6'
  const tooltipLabelClassName = 'text-gray-700 dark:text-gray-200'

  const renderNodeTooltip = (nodeId: string) => {
    const node = nodeMeta.get(nodeId)

    if (!node) {
      return null
    }

    if (node.kind === 'exit') {
      return (
        <div className={tooltipContainerClassName}>
          <div className='flex items-center justify-between gap-6'>
            <span className='font-semibold text-gray-900 dark:text-gray-50'>
              {t('project.journeys.exited')}
            </span>
            <span className='shrink-0 font-mono font-semibold text-red-600 tabular-nums dark:text-red-400'>
              -{node.sessions.toLocaleString()}
            </span>
          </div>
          <div className={tooltipRowClassName}>
            <span className={tooltipLabelClassName}>
              {t('project.journeys.afterStepX', { x: node.step })}
            </span>
          </div>
        </div>
      )
    }

    if (node.kind === 'other') {
      const hiddenPaths = Math.max(
        (coverage?.totalPaths || 0) - (coverage?.drawnPaths || 0),
        0,
      )

      return (
        <div className={tooltipContainerClassName}>
          <div className='flex items-center justify-between gap-6'>
            <div className='flex min-w-0 items-center gap-1.5'>
              <span className='truncate font-semibold text-gray-900 dark:text-gray-50'>
                {t('project.journeys.otherPaths')}
              </span>
              <span className='shrink-0 text-gray-700 dark:text-gray-200'>
                · {t('project.journeys.stepX', { x: node.step + 1 })}
              </span>
            </div>
            <span className='shrink-0 font-mono font-semibold text-gray-900 tabular-nums dark:text-gray-50'>
              {node.sessions.toLocaleString()}
            </span>
          </div>
          <p className={`mt-1 ${tooltipLabelClassName}`}>
            {t('project.journeys.hiddenPathsCount', { count: hiddenPaths })}
          </p>
          {node.continuedPast > 0 ? (
            <div className={tooltipRowClassName}>
              <span className={tooltipLabelClassName}>
                {t('project.journeys.continuedFurther')}
              </span>
              <span className='font-mono text-gray-900 tabular-nums dark:text-gray-50'>
                {node.continuedPast.toLocaleString()}
              </span>
            </div>
          ) : null}
        </div>
      )
    }

    const details = nodeDetailsMap.get(nodeId)

    return (
      <div className={tooltipContainerClassName}>
        <div className='flex items-center justify-between gap-6'>
          <div className='flex min-w-0 items-center gap-1.5'>
            <span className='truncate font-semibold text-gray-900 dark:text-gray-50'>
              {node.page}
            </span>
            <span className='shrink-0 text-gray-700 dark:text-gray-200'>
              · {t('project.journeys.stepX', { x: node.step + 1 })}
            </span>
          </div>
          <span className='shrink-0 font-mono font-semibold text-gray-900 tabular-nums dark:text-gray-50'>
            {node.sessions.toLocaleString()}
          </span>
        </div>
        <div className={tooltipRowClassName}>
          <span className={tooltipLabelClassName}>
            {t('project.journeys.ofMultiPageSessions')}
          </span>
          <span className='font-mono text-green-600 tabular-nums dark:text-green-400'>
            {formatPercent(node.sessions, totalSessions)}%
          </span>
        </div>
        {node.exited > 0 ? (
          <div className={tooltipRowClassName}>
            <span className={tooltipLabelClassName}>
              {t('project.journeys.tableEndedHere')}
            </span>
            <span className='font-mono text-red-600 tabular-nums dark:text-red-400'>
              -{node.exited.toLocaleString()}
            </span>
          </div>
        ) : null}
        {node.continuedPast > 0 ? (
          <div className={tooltipRowClassName}>
            <span className={tooltipLabelClassName}>
              {t('project.journeys.continuedFurther')}
            </span>
            <span className='font-mono text-gray-900 tabular-nums dark:text-gray-50'>
              {node.continuedPast.toLocaleString()}
            </span>
          </div>
        ) : null}
        <TooltipBreakdowns details={details} />
        <p className='mt-2 border-t border-gray-200 pt-2 text-gray-500 dark:border-slate-700/80 dark:text-gray-400'>
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

    const percentage = formatPercent(value, source.sessions)
    const isExit = target.kind === 'exit'
    const sourceLabel =
      source.kind === 'other' ? t('project.journeys.otherPaths') : source.page
    const targetLabel = isExit
      ? t('project.journeys.exited')
      : target.kind === 'other'
        ? t('project.journeys.otherPaths')
        : target.page

    // breakdowns exist for page -> page transitions and page -> exit;
    // "Other paths" links aggregate many transitions and have none
    const details =
      source.kind === 'page' && (isExit || target.kind === 'page')
        ? linkDetailsMap.get(
            `${source.step}:${source.page}→${isExit ? EXIT_PAGE : target.page}`,
          )
        : undefined

    return (
      <div className={tooltipContainerClassName}>
        <div className='flex items-center justify-between gap-6'>
          <div className='flex min-w-0 items-center gap-1.5'>
            <span className='truncate font-semibold text-gray-900 dark:text-gray-50'>
              {sourceLabel}
            </span>
            <span className='shrink-0 text-gray-700 dark:text-gray-200'>→</span>
            <span className='truncate font-semibold text-gray-900 dark:text-gray-50'>
              {targetLabel}
            </span>
          </div>
          <span className='shrink-0 font-mono font-semibold text-gray-900 tabular-nums dark:text-gray-50'>
            {value.toLocaleString()}
          </span>
        </div>
        <div className={tooltipRowClassName}>
          <span className={tooltipLabelClassName}>
            {isExit
              ? t('project.journeys.exitedHere')
              : t('project.journeys.continuedThisWay')}
          </span>
          <span
            className={cx(
              'font-mono tabular-nums',
              isExit
                ? 'text-red-600 dark:text-red-400'
                : 'text-green-600 dark:text-green-400',
            )}
          >
            {percentage}%
          </span>
        </div>
        <TooltipBreakdowns details={details} />
      </div>
    )
  }

  const controls = (
    <div className='mb-3 flex flex-wrap items-center gap-x-8 gap-y-3'>
      <div className='flex items-center gap-3'>
        <Text
          as='span'
          size='sm'
          weight='medium'
          className='whitespace-nowrap tabular-nums'
        >
          {t('project.journeys.depthLabel', { x: steps })}
        </Text>
        <input
          type='range'
          aria-label={t('project.journeys.stepsSliderLabel')}
          min={MIN_STEPS}
          max={MAX_STEPS}
          value={steps}
          onChange={(e) => {
            const value = clampSteps(Number(e.target.value))
            setSteps(value)
            syncSearchParams({ steps: String(value) })
          }}
          className={SLIDER_CLASSNAME}
          style={sliderTrackStyle(steps, MIN_STEPS, MAX_STEPS, theme)}
        />
      </div>
      <div className='flex items-center gap-3'>
        <Text
          as='span'
          size='sm'
          weight='medium'
          className='whitespace-nowrap tabular-nums'
        >
          {t('project.journeys.topPathsLabel', { x: journeysCount })}
        </Text>
        <input
          type='range'
          aria-label={t('project.journeys.journeysSliderLabel')}
          min={MIN_JOURNEYS}
          max={MAX_JOURNEYS}
          step={5}
          value={journeysCount}
          onChange={(e) => {
            const value = clampJourneys(Number(e.target.value))
            setJourneysCount(value)
            syncSearchParams({ journeys: String(value) })
          }}
          className={SLIDER_CLASSNAME}
          style={sliderTrackStyle(
            journeysCount,
            MIN_JOURNEYS,
            MAX_JOURNEYS,
            theme,
          )}
        />
      </div>
      <div className='flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-slate-800'>
        <button
          type='button'
          aria-pressed={view === 'chart'}
          aria-label={t('project.journeys.chartView')}
          title={t('project.journeys.chartView')}
          onClick={() => {
            setView('chart')
            syncSearchParams({ view: 'chart' })
          }}
          className={cx(
            'rounded-md p-1.5 transition-colors',
            view === 'chart'
              ? 'bg-white text-gray-900 shadow-xs dark:bg-slate-700 dark:text-gray-50'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
          )}
        >
          <FlowArrowIcon className='size-4' />
        </button>
        <button
          type='button'
          aria-pressed={view === 'table'}
          aria-label={t('project.journeys.tableView')}
          title={t('project.journeys.tableView')}
          onClick={() => {
            setView('table')
            syncSearchParams({ view: 'table' })
          }}
          className={cx(
            'rounded-md p-1.5 transition-colors',
            view === 'table'
              ? 'bg-white text-gray-900 shadow-xs dark:bg-slate-700 dark:text-gray-50'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
          )}
        >
          <TableIcon className='size-4' />
        </button>
      </div>
      {coverage ? (
        <Text
          as='p'
          size='sm'
          colour='secondary'
          className='w-full tabular-nums'
          id='journeys-coverage'
        >
          {t('project.journeys.coverage', {
            paths: coverage.drawnPaths.toLocaleString(),
            totalPaths: coverage.totalPaths.toLocaleString(),
            covered: coverage.coveredSessions.toLocaleString(),
            total: coverage.totalSessions.toLocaleString(),
            percent: coverage.percent,
          })}
        </Text>
      ) : null}
    </div>
  )

  const openDrawerForNode = (node: SankeyNodeMeta) => {
    const details = nodeDetailsMap.get(`${node.step}:${node.page}`)

    setSessionsDrawer({
      step: node.step + 1,
      page: node.page,
      totalSessions: details?.total,
    })
  }

  const journeysTable =
    journeysData && !_isEmpty(journeysData.journeys) ? (
      <div className='overflow-x-auto'>
        <table className='w-full border-separate border-spacing-0 text-sm'>
          <thead>
            <tr>
              <th className='border-b border-gray-200 py-2 pr-4 text-left font-medium text-gray-500 dark:border-slate-800 dark:text-gray-400'>
                {t('project.journeys.tablePath')}
              </th>
              <th className='border-b border-gray-200 px-4 py-2 text-right font-medium text-gray-500 dark:border-slate-800 dark:text-gray-400'>
                {t('project.journeys.tableSessions')}
              </th>
              <th className='border-b border-gray-200 px-4 py-2 text-right font-medium text-gray-500 dark:border-slate-800 dark:text-gray-400'>
                %
              </th>
              <th className='border-b border-gray-200 py-2 pl-4 text-right font-medium text-gray-500 dark:border-slate-800 dark:text-gray-400'>
                {t('project.journeys.tableEndedHere')}
              </th>
            </tr>
          </thead>
          <tbody>
            {journeysData.journeys.map(({ path, value, continuedPast = 0 }) => {
              const key = path.join('→')
              const ended = value - continuedPast
              const lastStep = path.length
              const lastPage = path[path.length - 1]

              const openRow = () =>
                openDrawerForNode({
                  page: lastPage,
                  step: lastStep - 1,
                  kind: 'page',
                  sessions: value,
                  exited: 0,
                  continuedPast: 0,
                })

              return (
                <tr
                  key={key}
                  onClick={openRow}
                  className='group cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/60'
                >
                  <td className='border-b border-gray-100 py-2 pr-4 dark:border-slate-800/60'>
                    <button
                      type='button'
                      aria-label={`${path.join(' → ')} · ${t('project.journeys.xSessions', { x: value.toLocaleString() })} · ${t('project.journeys.clickToInspect')}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        openRow()
                      }}
                      className='flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-left focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500'
                    >
                      {path.map((page, index) => (
                        <span
                          key={`${index}:${page}`}
                          className='flex items-center gap-x-1.5'
                        >
                          {index > 0 ? (
                            <span className='text-gray-400 dark:text-gray-500'>
                              →
                            </span>
                          ) : null}
                          <span
                            className='inline-flex items-center gap-1.5 text-gray-900 dark:text-gray-50'
                            title={page}
                          >
                            <span
                              aria-hidden='true'
                              className='size-2 shrink-0 rounded-full'
                              style={{
                                backgroundColor:
                                  pageColours.get(page) || NEUTRAL_PAGE_COLOUR,
                              }}
                            />
                            {truncatePath(page, 32)}
                          </span>
                        </span>
                      ))}
                      {continuedPast > 0 ? (
                        <span className='text-gray-400 dark:text-gray-500'>
                          → …
                        </span>
                      ) : null}
                    </button>
                  </td>
                  <td className='border-b border-gray-100 px-4 py-2 text-right font-mono text-gray-900 tabular-nums dark:border-slate-800/60 dark:text-gray-50'>
                    {value.toLocaleString()}
                  </td>
                  <td className='border-b border-gray-100 px-4 py-2 text-right font-mono text-gray-700 tabular-nums dark:border-slate-800/60 dark:text-gray-300'>
                    {formatPercent(value, totalSessions)}%
                  </td>
                  <td className='border-b border-gray-100 py-2 pl-4 text-right font-mono text-gray-700 tabular-nums dark:border-slate-800/60 dark:text-gray-300'>
                    {ended.toLocaleString()}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    ) : null

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
          {controls}
          {sankeyData ? (
            view === 'table' ? (
              journeysTable
            ) : (
              <div>
                {columns > 1 ? (
                  <div aria-hidden='true' className='relative mb-1 h-5'>
                    {Array.from({ length: columns }, (_, index) => (
                      <span
                        key={index}
                        className={cx(
                          'absolute text-xs font-medium whitespace-nowrap text-gray-500 dark:text-gray-400',
                          index === 0
                            ? ''
                            : index === columns - 1
                              ? '-translate-x-full'
                              : '-translate-x-1/2',
                        )}
                        style={{
                          left: `${(index / (columns - 1)) * 100}%`,
                        }}
                      >
                        {t('project.journeys.stepX', { x: index + 1 })}
                      </span>
                    ))}
                  </div>
                ) : null}
                {/* nivo hardcodes z-index 10 on its tooltip wrapper, while the sticky
                    sidebar and dashboard header sit at z-20 — lift just the tooltip above them */}
                <div
                  style={{ height: chartHeight }}
                  className="[&_div[style*='z-index']]:z-30!"
                >
                  <ResponsiveSankey
                    data={sankeyData}
                    margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
                    align='start'
                    sort={(a: any, b: any) => {
                      // page nodes by traffic desc; Other paths, then Exited
                      // pinned to the bottom of every column
                      const rank = (node: any) => {
                        const kind = nodeMeta.get(node.id)?.kind
                        return kind === 'exit' ? 2 : kind === 'other' ? 1 : 0
                      }

                      return rank(a) - rank(b) || b.value - a.value
                    }}
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
                    linkBlendMode='normal'
                    // no springs: the tooltip must track the cursor instantly,
                    // like the billboard.js charts elsewhere in the dashboard
                    animate={false}
                    ariaLabel={t('dashboard.journeys')}
                    ariaDescribedBy='journeys-coverage'
                    label={(node: any) => {
                      const meta = nodeMeta.get(node.id)

                      if (!meta) {
                        return node.id
                      }

                      if (meta.kind === 'other') {
                        return t('project.journeys.otherPaths')
                      }

                      if (meta.kind === 'exit') {
                        return t('project.journeys.exited')
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
                      renderLinkTooltip(
                        link.source.id,
                        link.target.id,
                        link.value,
                      )
                    }
                    onClick={(data: any) => {
                      // links (source/target present) are not clickable, only nodes are
                      if (data?.source || !data?.id) {
                        return
                      }

                      const node = nodeMeta.get(data.id)

                      // synthetic nodes have no session list to inspect
                      if (!node || node.kind !== 'page') {
                        return
                      }

                      openDrawerForNode(node)
                    }}
                  />
                </div>
              </div>
            )
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
              <Text
                as='p'
                size='sm'
                colour='secondary'
                className='mx-auto mt-2 max-w-md'
              >
                <Trans
                  t={t}
                  i18nKey='project.journeys.learnMore'
                  components={{
                    url: (
                      <a
                        href={JOURNEYS_DOCS_URL}
                        aria-label={t('project.journeys.learnMoreAriaLabel')}
                        className='font-medium text-blue-600 hover:underline dark:text-blue-400'
                        target='_blank'
                        rel='noreferrer noopener'
                      />
                    ),
                  }}
                />
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
        totalCount={sessionsDrawer?.totalSessions}
      />
    </TabErrorBoundary>
  )
}

export default JourneysView

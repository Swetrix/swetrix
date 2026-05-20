import type { ChartOptions } from 'billboard.js'
import { area, bar } from 'billboard.js'
import cx from 'clsx'
import * as d3 from 'd3'
import dayjs from 'dayjs'
import type { TFunction } from 'i18next'
import _debounce from 'lodash/debounce'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import _size from 'lodash/size'
import {
  TargetIcon,
  TrashIcon,
  PencilIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FileTextIcon,
  CursorClickIcon,
  CaretDownIcon,
  QuestionIcon,
} from '@phosphor-icons/react'
import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  Suspense,
  use,
  type MouseEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import { useFetcher, useLoaderData, useRevalidator } from 'react-router'
import { toast } from 'sonner'

import type {
  GoalsResponse,
  Goal,
  GoalStats,
  GoalChartData,
  ConversionBreakdowns,
} from '~/api/api.server'
import { useGoalStatsProxy, useGoalChartProxy } from '~/hooks/useAnalyticsProxy'
import {
  TimeFormat,
  tbsFormatMapper,
  tbsFormatMapper24h,
  tbsFormatMapperTooltip,
  tbsFormatMapperTooltip24h,
  chartTypes,
} from '~/lib/constants'
import DashboardHeader from '~/pages/Project/View/components/DashboardHeader'
import Filters from '~/pages/Project/View/components/Filters'
import ProjectViewHeaderActions from '~/pages/Project/View/components/ProjectViewHeaderActions'
import {
  useViewProjectContext,
  useRefreshTriggers,
} from '~/pages/Project/View/ViewProject'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import type {
  ProjectLoaderData,
  ProjectViewActionData,
} from '~/routes/projects.$id'
import BillboardChart from '~/ui/BillboardChart'
import Button from '~/ui/Button'
import Input from '~/ui/Input'
import Spin from '~/ui/icons/Spin'
import LoadingBar from '~/ui/LoadingBar'
import Modal from '~/ui/Modal'
import Pagination from '~/ui/Pagination'
import ProgressRing from '~/ui/ProgressRing'
import StatusPage from '~/ui/StatusPage'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'
import { escapeHtml, nFormatter } from '~/utils/generic'
import countries from '~/utils/isoCountries'
import routes from '~/utils/routes'

import GoalSettingsModal from './GoalSettingsModal'
import { LoaderView } from '../../View/components/LoaderView'

const DEFAULT_GOALS_TAKE = 20
const GOAL_TOOLTIP_BREAKDOWN_LIMIT = 3

const isDurationValue = (seconds?: number | null): seconds is number =>
  seconds != null && Number.isFinite(seconds)

const formatDuration = (seconds?: number | null) => {
  if (!isDurationValue(seconds)) {
    return 'N/A'
  }

  if (seconds < 60) {
    return `${Math.round(seconds)}s`
  }

  if (seconds < 3600) {
    return `${Math.round(seconds / 60)}m`
  }

  return `${Math.round(seconds / 3600)}h`
}

const TIME_TO_CONVERT_METRICS = [
  {
    labelKey: 'goals.fromSessionStart',
    tooltipKey: 'goals.fromSessionStartTooltip',
    getValue: (stats: GoalStats) => stats.timeToConvert?.fromSessionStart,
  },
  {
    labelKey: 'goals.fromFirstPage',
    tooltipKey: 'goals.fromFirstPageTooltip',
    getValue: (stats: GoalStats) => stats.timeToConvert?.fromFirstPage,
  },
]

const getTopBreakdownEntries = (items?: Record<string, number>) => {
  return Object.entries(items || {})
    .filter(([, count]) => Number.isFinite(count) && count > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, GOAL_TOOLTIP_BREAKDOWN_LIMIT)
}

const renderGoalTooltipBreakdowns = (
  breakdowns: ConversionBreakdowns | undefined,
  conversions: number,
  t: TFunction,
  language: string,
) => {
  const topSourcesEntries = getTopBreakdownEntries(breakdowns?.sources)
  const topCountriesEntries = getTopBreakdownEntries(breakdowns?.countries)

  if (topSourcesEntries.length === 0 && topCountriesEntries.length === 0) {
    return ''
  }

  const primary = 'text-gray-900 dark:text-gray-50'
  const secondary = 'text-gray-700 dark:text-gray-200'
  const denominator = Math.max(conversions, 1)

  const sourcesHtml =
    topSourcesEntries.length > 0
      ? `
        <div class='flex-1 min-w-0'>
          <p class='text-[10px] font-semibold uppercase tracking-wider ${secondary} mb-1.5'>
            ${t('project.topSources')}
          </p>
          ${topSourcesEntries
            .map(([domain, count]) => {
              const perc = Math.round((count / denominator) * 100)
              const isDirect = domain === 'Direct / None'
              const safeDomain = escapeHtml(domain)
              const iconHtml = isDirect
                ? `
                  <img src='/assets/icons/chain.svg' class='size-3.5 shrink-0 dark:hidden' alt='' />
                  <img src='/assets/icons/chain-light.svg' class='size-3.5 shrink-0 hidden dark:inline' alt='' />
                `
                : `<img src='/api/favicon?domain=${encodeURIComponent(domain)}' class='size-3.5 rounded-sm shrink-0' loading='lazy' alt='' />`

              return `
                <div class='flex items-center justify-between gap-2 mt-1'>
                  <div class='flex items-center gap-1.5 min-w-0'>
                    ${iconHtml}
                    <span class='truncate ${primary}'>${safeDomain}</span>
                  </div>
                  <span class='font-mono tabular-nums shrink-0 ${primary}'>${perc}%</span>
                </div>
              `
            })
            .join('')}
        </div>
      `
      : ''

  const countriesHtml =
    topCountriesEntries.length > 0
      ? `
        <div class='flex-1 min-w-0'>
          <p class='text-[10px] font-semibold uppercase tracking-wider ${secondary} mb-1.5'>
            ${t('project.topCountries')}
          </p>
          ${topCountriesEntries
            .map(([cc, count]) => {
              const perc = Math.round((count / denominator) * 100)
              const safeName = escapeHtml(countries.getName(cc, language) || cc)
              const safeCC = encodeURIComponent(cc.toLowerCase())

              return `
                <div class='flex items-center justify-between gap-2 mt-1'>
                  <div class='flex items-center gap-1.5 min-w-0'>
                    <img src='/assets/flags/${safeCC}.svg' width='16' height='12' class='shrink-0 rounded-[2px]' loading='lazy' alt='' />
                    <span class='truncate ${primary}'>${safeName}</span>
                  </div>
                  <span class='font-mono tabular-nums shrink-0 ${primary}'>${perc}%</span>
                </div>
              `
            })
            .join('')}
        </div>
      `
      : ''

  return `
    <div class='border-t border-gray-200 dark:border-slate-700/80 mt-2 pt-2 flex gap-5'>
      ${sourcesHtml}
      ${countriesHtml}
    </div>
  `
}

// Calculate optimal Y axis ticks
const calculateOptimalTicks = (
  data: number[],
  targetCount: number = 6,
): number[] => {
  const validData = data.filter(
    (n) => n !== undefined && n !== null && Number.isFinite(n),
  )

  if (validData.length === 0) {
    return [0, 1]
  }

  const min = Math.min(...validData)
  const max = Math.max(...validData)

  if (min === max) {
    return max === 0 ? [0, 1] : [0, max * 1.2]
  }

  const upperBound = Math.ceil(max * 1.2)
  const roughStep = upperBound / (targetCount - 1)

  let niceStep: number
  if (roughStep <= 1) niceStep = 1
  else if (roughStep <= 2) niceStep = 2
  else if (roughStep <= 5) niceStep = 5
  else if (roughStep <= 10) niceStep = 10
  else if (roughStep <= 20) niceStep = 20
  else if (roughStep <= 25) niceStep = 25
  else if (roughStep <= 50) niceStep = 50
  else {
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)))
    const normalized = roughStep / magnitude
    if (normalized <= 2) niceStep = 2 * magnitude
    else if (normalized <= 5) niceStep = 5 * magnitude
    else niceStep = 10 * magnitude
  }

  const ticks: number[] = []
  for (let i = 0; i <= upperBound; i += niceStep) {
    ticks.push(i)
  }

  if (ticks[ticks.length - 1] < max) {
    ticks.push(ticks[ticks.length - 1] + niceStep)
  }

  return ticks
}

// Chart settings for goal chart
const getGoalChartSettings = (
  chartData: GoalChartData,
  timeBucket: string,
  timeFormat: string,
  chartType: string,
  dataNames: Record<string, string>,
  t: TFunction,
  language: string,
  stats: GoalStats | null,
): ChartOptions => {
  const xAxisSize = _size(chartData.x)

  const columns: any[] = [
    ['x', ..._map(chartData.x, (el) => dayjs(el).toDate())],
    ['conversions', ...chartData.conversions],
    ['sessions', ...chartData.uniqueSessions],
  ]

  // Calculate optimal Y axis ticks
  const allYValues: number[] = [
    ...chartData.conversions,
    ...chartData.uniqueSessions,
  ].filter((n) => n !== undefined && n !== null)

  const optimalTicks =
    allYValues.length > 0 ? calculateOptimalTicks(allYValues) : undefined

  return {
    data: {
      x: 'x',
      columns,
      types: {
        conversions: chartType === chartTypes.line ? area() : bar(),
        sessions: chartType === chartTypes.line ? area() : bar(),
      },
      colors: {
        conversions: '#16a34a', // green-600
        sessions: '#2563EB', // blue-600
      },
      names: dataNames,
    },
    grid: {
      y: {
        show: true,
      },
    },
    transition: {
      duration: 200,
    },
    resize: {
      auto: true,
      timer: true,
    },
    axis: {
      x: {
        clipPath: false,
        tick: {
          fit: true,
          rotate: 0,
          format:
            // @ts-expect-error
            timeFormat === TimeFormat['24-hour']
              ? (x: string) =>
                  d3.timeFormat(tbsFormatMapper24h[timeBucket])(
                    x as unknown as Date,
                  )
              : (x: string) =>
                  d3.timeFormat(tbsFormatMapper[timeBucket])(
                    x as unknown as Date,
                  ),
        },
        localtime: timeFormat === TimeFormat['24-hour'],
        type: 'timeseries',
      },
      y: {
        tick: {
          format: (d: number) => nFormatter(d, 1),
          values: optimalTicks,
        },
        show: true,
        inner: true,
      },
    },
    tooltip: {
      contents: (item: any, _: any, __: any, color: any) => {
        if (!item || _isEmpty(item) || !item[0]) {
          return ''
        }
        const breakdownsHtml = renderGoalTooltipBreakdowns(
          stats?.breakdowns,
          stats?.conversions || 0,
          t,
          language,
        )

        return `<div class='bg-gray-50 dark:bg-slate-900 rounded-lg ring-1 ring-black/10 dark:ring-white/10 px-3 py-2.5 text-xs md:text-sm max-w-sm md:max-w-md shadow-lg z-50'>
          <div class='font-semibold pb-1 mb-1 border-b border-gray-200 dark:border-slate-800 text-gray-900 dark:text-gray-50'>${
            timeFormat === TimeFormat['24-hour']
              ? d3.timeFormat(tbsFormatMapperTooltip24h[timeBucket])(item[0].x)
              : d3.timeFormat(tbsFormatMapperTooltip[timeBucket])(item[0].x)
          }</div>
          ${_map(item, (el: { id: string; name: string; value: string }) => {
            return `
            <div class='flex justify-between items-center py-px leading-snug'>
              <div class='flex items-center min-w-0 mr-4'>
                <div class='w-2.5 h-2.5 rounded-xs mr-1.5 shrink-0' style=background-color:${color(el.id)}></div>
                <span class='truncate text-gray-900 dark:text-gray-50'>${escapeHtml(el.name)}</span>
              </div>
              <span class='font-mono whitespace-nowrap text-gray-900 dark:text-gray-50'>${el.value}</span>
            </div>
            `
          }).join('')}
          ${breakdownsHtml}
        </div>`
      },
    },
    point:
      chartType === chartTypes.bar
        ? {}
        : {
            focus: {
              only: xAxisSize > 1,
            },
            pattern: ['circle'],
            r: 2,
          },
    legend: {
      item: {
        tile: {
          type: 'circle',
          width: 10,
          r: 3,
        },
      },
    },
    area: {
      linearGradient: true,
    },
    bar: {
      linearGradient: true,
    },
  }
}

interface GoalRowProps {
  goal: Goal
  stats: GoalStats | null
  statsLoading: boolean
  isExpanded: boolean
  chartData: GoalChartData | null
  chartLoading: boolean
  timeBucket: string
  timeFormat: string
  onDelete: (id: string) => void
  onEdit: (id: string) => void
  onToggleExpand: (id: string) => void
}

const GoalRow = ({
  goal,
  stats,
  statsLoading,
  isExpanded,
  chartData,
  chartLoading,
  timeBucket,
  timeFormat,
  onDelete,
  onEdit,
  onToggleExpand,
}: GoalRowProps) => {
  const { t, i18n } = useTranslation()
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const patternDisplay = useMemo(() => {
    if (goal.conditions?.conditions?.length) {
      return t('goals.conditionsSummary', {
        count: goal.conditions.conditions.length,
        relation: goal.conditions.relation,
      })
    }

    if (!goal.value) return null
    const matchPrefix =
      goal.matchType === 'exact'
        ? '= '
        : goal.matchType === 'contains'
          ? '~ '
          : ''
    return `${matchPrefix}${goal.value}`
  }, [goal.conditions, goal.value, goal.matchType, t])

  const chartOptions = useMemo(() => {
    if (!chartData || !chartData.x || chartData.x.length === 0) return null
    return getGoalChartSettings(
      chartData,
      timeBucket,
      timeFormat,
      chartTypes.line,
      {
        conversions: t('goals.conversions'),
        sessions: t('project.sessions'),
      },
      t,
      i18n.language,
      stats,
    )
  }, [chartData, timeBucket, timeFormat, t, i18n.language, stats])

  return (
    <>
      <li className='relative mb-3 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 transition-colors dark:border-slate-800/60 dark:bg-slate-900/25'>
        {/* Main row - clickable to expand */}
        <div
          onClick={() => onToggleExpand(goal.id)}
          onKeyDown={(e) => {
            if (e.target !== e.currentTarget) return
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onToggleExpand(goal.id)
            }
          }}
          // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- contains nested interactive elements
          role='button'
          tabIndex={0}
          className='flex cursor-pointer justify-between gap-x-6 px-4 py-4 transition-colors hover:bg-gray-200/70 sm:px-6 dark:hover:bg-slate-900/60'
        >
          <div className='flex min-w-0 gap-x-4'>
            <div className='min-w-0 flex-auto'>
              <Text
                as='p'
                weight='semibold'
                truncate
                className='flex items-center gap-x-1.5'
              >
                {goal.type === 'pageview' ? (
                  <FileTextIcon className='size-4 text-blue-500' />
                ) : (
                  <CursorClickIcon className='size-4 text-amber-500' />
                )}
                <span>{goal.name}</span>
              </Text>
              {patternDisplay ? (
                <Text
                  className='mt-1 max-w-max'
                  as='p'
                  size='xs'
                  colour='secondary'
                  code
                >
                  {patternDisplay}
                </Text>
              ) : null}
              {/* Mobile stats */}
              <div className='mt-2 flex h-9 items-center gap-x-3 text-xs leading-5 text-gray-500 sm:hidden dark:text-gray-300'>
                {statsLoading ? (
                  <div className='flex size-9 items-center justify-center'>
                    <Spin className='m-0 size-5' />
                  </div>
                ) : stats ? (
                  <>
                    <span>
                      <Text as='span' size='xs' weight='semibold'>
                        {stats.conversions.toLocaleString()}
                      </Text>{' '}
                      <Text as='span' size='xs' colour='secondary'>
                        {t('goals.conversions').toLowerCase()}
                      </Text>
                    </span>
                    <ProgressRing
                      value={stats.conversionRate}
                      size={36}
                      strokeWidth={3}
                    />
                  </>
                ) : (
                  <Text as='p' size='xs' colour='muted'>
                    {t('goals.noData')}
                  </Text>
                )}
              </div>
            </div>
          </div>
          <div className='flex shrink-0 items-center gap-x-4'>
            <div className='hidden h-11 sm:flex sm:items-center sm:gap-x-3'>
              {statsLoading ? (
                <div className='flex size-11 items-center justify-center'>
                  <Spin className='m-0 size-5' />
                </div>
              ) : stats ? (
                <>
                  <Text as='p' size='sm' className='leading-6'>
                    <Text as='span' size='sm' weight='semibold'>
                      {stats.conversions.toLocaleString()}
                    </Text>{' '}
                    <Text as='span' size='sm' colour='secondary'>
                      {t('goals.conversions').toLowerCase()}
                    </Text>
                  </Text>
                  <ProgressRing
                    value={stats.conversionRate}
                    size={44}
                    strokeWidth={3.5}
                  />
                </>
              ) : (
                <Text as='p' size='sm' colour='muted'>
                  {t('goals.noData')}
                </Text>
              )}
            </div>
            {/* Action buttons */}
            <div className='flex items-center gap-1'>
              <Button
                variant='icon'
                type='button'
                onClick={(e: MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onEdit(goal.id)
                }}
                aria-label={t('common.edit')}
                className='p-1.5 text-gray-800 dark:text-slate-400 dark:hover:text-slate-300'
              >
                <PencilIcon className='size-4' />
              </Button>
              <Button
                variant='icon'
                type='button'
                onClick={(e: MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowDeleteModal(true)
                }}
                aria-label={t('common.delete')}
                className='p-1.5 text-gray-800 dark:text-slate-400 dark:hover:text-slate-300'
              >
                <TrashIcon className='size-4' />
              </Button>
              <CaretDownIcon
                className={cx(
                  'size-5 text-gray-500 transition-transform dark:text-gray-400',
                  {
                    'rotate-180': isExpanded,
                  },
                )}
              />
            </div>
          </div>
        </div>

        {/* Expanded chart section */}
        {isExpanded ? (
          <div className='space-y-4 border-t border-gray-200 px-4 py-4 sm:px-6 dark:border-slate-700'>
            {stats?.timeToConvert ? (
              <div className='flex flex-wrap gap-x-10 gap-y-4 border-b border-gray-200 pb-4 dark:border-slate-800'>
                {TIME_TO_CONVERT_METRICS.map(
                  ({ labelKey, tooltipKey, getValue }) => {
                    const metric = getValue(stats)
                    const hasTiming = isDurationValue(metric?.median)

                    return (
                      <div key={labelKey} className='min-w-44'>
                        <Text
                          as='p'
                          size='4xl'
                          weight='bold'
                          className='leading-none whitespace-nowrap'
                        >
                          {formatDuration(metric?.median)}
                        </Text>
                        <div className='mt-1 flex items-center gap-1.5'>
                          <Text as='p' size='sm' weight='semibold'>
                            {t(labelKey)}
                          </Text>
                          <Tooltip
                            ariaLabel={t(labelKey)}
                            text={t(tooltipKey)}
                            tooltipNode={
                              <span className='inline-flex size-4 items-center justify-center rounded-full text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'>
                                <QuestionIcon className='size-3.5' />
                              </span>
                            }
                            contentClassName='max-w-72'
                          />
                        </div>
                        <Text
                          as='p'
                          size='xs'
                          colour='secondary'
                          className='mt-0.5'
                        >
                          {hasTiming
                            ? t('goals.avgP75', {
                                avg: formatDuration(metric?.average),
                                p75: formatDuration(metric?.p75),
                              })
                            : stats.conversions > 0
                              ? t('goals.timeToConvertInsufficient')
                              : t('goals.timeToConvertNoConversions')}
                        </Text>
                      </div>
                    )
                  },
                )}
              </div>
            ) : null}
            {chartLoading ? (
              <div className='flex h-[200px] items-center justify-center'>
                <Spin className='size-8' />
              </div>
            ) : chartData &&
              chartData.x &&
              chartData.x.length > 0 &&
              chartOptions ? (
              <BillboardChart options={chartOptions} className='h-[200px]' />
            ) : (
              <div className='flex h-[200px] items-center justify-center'>
                <Text as='p' colour='muted'>
                  {t('goals.noChartData')}
                </Text>
              </div>
            )}
          </div>
        ) : null}
      </li>
      <Modal
        onClose={() => setShowDeleteModal(false)}
        onSubmit={() => {
          onDelete(goal.id)
          setShowDeleteModal(false)
        }}
        submitText={t('goals.delete')}
        closeText={t('common.close')}
        title={t('goals.deleteConfirmTitle')}
        message={t('goals.deleteConfirmMessage')}
        submitType='danger'
        type='error'
        isOpened={showDeleteModal}
      />
    </>
  )
}

interface GoalsViewProps {
  tnMapping: Record<string, string>
  period: string
  from?: string
  to?: string
  timezone?: string
}

interface DeferredGoalsData {
  goalsData: GoalsResponse | null
}

function GoalsDataResolver({
  children,
}: {
  children: (data: DeferredGoalsData) => React.ReactNode
}) {
  const { goalsData: goalsDataPromise } = useLoaderData<ProjectLoaderData>()
  const goalsData = goalsDataPromise ? use(goalsDataPromise) : null
  return <>{children({ goalsData })}</>
}

function GoalsViewWrapper(props: GoalsViewProps) {
  return (
    <Suspense fallback={<LoaderView />}>
      <GoalsDataResolver>
        {(deferredData) => (
          <GoalsViewInner {...props} deferredData={deferredData} />
        )}
      </GoalsDataResolver>
    </Suspense>
  )
}

interface GoalsViewInnerProps extends GoalsViewProps {
  deferredData: DeferredGoalsData
}

const GoalsViewInner = ({
  tnMapping,
  period,
  from = '',
  to = '',
  timezone,
  deferredData,
}: GoalsViewInnerProps) => {
  const { id } = useCurrentProject()
  const revalidator = useRevalidator()
  const { goalsRefreshTrigger } = useRefreshTriggers()
  const { timeBucket, timeFormat, filters } = useViewProjectContext()
  const { t } = useTranslation()
  const fetcher = useFetcher<ProjectViewActionData>()

  // Track if we're in search/pagination mode
  const [isSearchMode, setIsSearchMode] = useState(false)
  const isMountedRef = useRef(true)
  const [total, setTotal] = useState(() => deferredData.goalsData?.total || 0)
  const [goals, setGoals] = useState<Goal[]>(
    () => deferredData.goalsData?.results || [],
  )
  const [goalStats, setGoalStats] = useState<Record<string, GoalStats | null>>(
    {},
  )
  const [statsLoading, setStatsLoading] = useState<Record<string, boolean>>({})
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [filterQuery, setFilterQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters])

  // Expanded goal state
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null)
  const [goalChartData, setGoalChartData] = useState<
    Record<string, GoalChartData | null>
  >({})
  const [chartLoading, setChartLoading] = useState<Record<string, boolean>>({})

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)

  const isLoading = revalidator.state === 'loading' || fetcher.state !== 'idle'

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Sync state when loader provides new data
  useEffect(() => {
    if (
      deferredData.goalsData &&
      revalidator.state === 'idle' &&
      !isSearchMode
    ) {
      setGoals(deferredData.goalsData.results || [])
      setTotal(deferredData.goalsData.total || 0)
    }
  }, [revalidator.state, deferredData.goalsData, isSearchMode])

  const pageAmount = Math.ceil(total / DEFAULT_GOALS_TAKE)

  // Debounced search handler
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSetSearch = useCallback(
    _debounce((value: string) => {
      setDebouncedSearch(value)
      setPage(1) // Reset to first page when search changes
    }, 300),
    [],
  )

  // Update debounced search when filterQuery changes
  useEffect(() => {
    debouncedSetSearch(filterQuery)
    return () => {
      debouncedSetSearch.cancel()
    }
  }, [filterQuery, debouncedSetSearch])

  const loadGoals = useCallback(
    (take: number, skip: number, search?: string) => {
      if (fetcher.state !== 'idle') return
      setIsSearchMode(true)
      setError(null)

      fetcher.submit(
        {
          intent: 'get-project-goals',
          take: String(take),
          skip: String(skip),
          search: search || '',
        },
        { method: 'POST' },
      )
    },
    [fetcher],
  )

  // Handle fetcher response for goals list
  useEffect(() => {
    if (
      fetcher.data?.intent === 'get-project-goals' &&
      fetcher.state === 'idle'
    ) {
      if (isMountedRef.current) {
        if (fetcher.data.success && fetcher.data.data) {
          const result = fetcher.data.data as {
            results: Goal[]
            total: number
          }
          setGoals(result.results)
          setTotal(result.total)
          setError(null)
        } else if (fetcher.data.error) {
          setError(fetcher.data.error)
        }
      }
    }
  }, [fetcher.data, fetcher.state])

  // Proxy hooks for stats and chart
  const statsProxy = useGoalStatsProxy()
  const chartProxy = useGoalChartProxy()

  const loadGoalStats = async (goalId: string) => {
    setStatsLoading((prev) => ({ ...prev, [goalId]: true }))
    try {
      const stats = await statsProxy.fetchStats(goalId, {
        period,
        from,
        to,
        timezone,
        filters,
      })
      if (isMountedRef.current) {
        setGoalStats((prev) => ({ ...prev, [goalId]: stats }))
      }
    } catch (err) {
      console.error('Failed to load goal stats:', err)
      if (isMountedRef.current) {
        setGoalStats((prev) => ({ ...prev, [goalId]: null }))
      }
    } finally {
      if (isMountedRef.current) {
        setStatsLoading((prev) => ({ ...prev, [goalId]: false }))
      }
    }
  }

  const loadGoalChartData = async (goalId: string, showLoading = true) => {
    setChartLoading((prev) => ({
      ...prev,
      [goalId]: showLoading ? true : prev[goalId],
    }))
    try {
      const result = await chartProxy.fetchChart(goalId, {
        period,
        from,
        to,
        timeBucket,
        timezone,
        filters,
      })
      if (isMountedRef.current && result) {
        setGoalChartData((prev) => ({ ...prev, [goalId]: result.chart }))
      }
    } catch (err) {
      console.error('Failed to load goal chart:', err)
      if (isMountedRef.current) {
        setGoalChartData((prev) => ({ ...prev, [goalId]: null }))
      }
    } finally {
      if (isMountedRef.current) {
        setChartLoading((prev) => ({ ...prev, [goalId]: false }))
      }
    }
  }

  const handleToggleExpand = (goalId: string) => {
    if (expandedGoalId === goalId) {
      // Collapse if already expanded
      setExpandedGoalId(null)
    } else {
      // Expand and load chart data if not already loaded
      setExpandedGoalId(goalId)
      if (!goalChartData[goalId] && !chartLoading[goalId]) {
        loadGoalChartData(goalId)
      }
    }
  }

  // Handle page/search changes - use fetcher for pagination
  useEffect(() => {
    if (page > 1 || debouncedSearch || isSearchMode) {
      loadGoals(
        DEFAULT_GOALS_TAKE,
        (page - 1) * DEFAULT_GOALS_TAKE,
        debouncedSearch || undefined,
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch])

  useEffect(() => {
    // Load stats for all goals when goals change or date range changes
    goals.forEach((goal) => {
      loadGoalStats(goal.id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goals, period, from, to, timezone, filtersKey])

  // Reload chart data when period changes for expanded goal
  useEffect(() => {
    if (expandedGoalId && goalChartData[expandedGoalId]) {
      // Silently refresh if we already have data, otherwise show loading
      const hasExistingData = !!goalChartData[expandedGoalId]
      loadGoalChartData(expandedGoalId, !hasExistingData)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, from, to, timezone, timeBucket, filtersKey])

  // Refresh goals data when refresh button is clicked
  useEffect(() => {
    if (goalsRefreshTrigger > 0) {
      if (page === 1 && !debouncedSearch) {
        setIsSearchMode(false)
        revalidator.revalidate()
      } else {
        loadGoals(
          DEFAULT_GOALS_TAKE,
          (page - 1) * DEFAULT_GOALS_TAKE,
          debouncedSearch || undefined,
        )
      }
      // Clear cached chart data for non-expanded goals, silently refresh expanded goal
      if (expandedGoalId) {
        setGoalChartData((prev) => ({
          [expandedGoalId]: prev[expandedGoalId],
        }))
        loadGoalChartData(expandedGoalId, false)
      } else {
        setGoalChartData({})
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalsRefreshTrigger])

  const handleNewGoal = () => {
    setEditingGoalId(null)
    setIsModalOpen(true)
  }

  const handleEditGoal = (goalId: string) => {
    setEditingGoalId(goalId)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingGoalId(null)
  }

  const handleModalSuccess = () => {
    if (page === 1 && !debouncedSearch) {
      setIsSearchMode(false)
      revalidator.revalidate()
    } else {
      loadGoals(
        DEFAULT_GOALS_TAKE,
        (page - 1) * DEFAULT_GOALS_TAKE,
        debouncedSearch || undefined,
      )
    }
  }

  // Handle fetcher responses for delete
  useEffect(() => {
    if (fetcher.data?.success && fetcher.data?.intent === 'delete-goal') {
      toast.success(t('goals.deleted'))
      if (page === 1 && !debouncedSearch) {
        setIsSearchMode(false)
        revalidator.revalidate()
      } else {
        loadGoals(
          DEFAULT_GOALS_TAKE,
          (page - 1) * DEFAULT_GOALS_TAKE,
          debouncedSearch || undefined,
        )
      }
    } else if (fetcher.data?.error && fetcher.data?.intent === 'delete-goal') {
      toast.error(fetcher.data.error)
    }
  }, [fetcher.data, t, page, debouncedSearch, revalidator]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeleteGoal = (goalId: string) => {
    const formData = new FormData()
    formData.set('intent', 'delete-goal')
    formData.set('goalId', goalId)
    fetcher.submit(formData, { method: 'post' })
  }

  if (error && !isLoading) {
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
      <div>
        <Filters className='mb-3' tnMapping={tnMapping} />
        {isLoading && !_isEmpty(goals) ? <LoadingBar /> : null}
        {_isEmpty(goals) && !filterQuery ? (
          <div className='mx-auto w-full max-w-2xl py-16 text-center'>
            <div className='mx-auto mb-6 flex size-14 items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-900'>
              <TargetIcon className='size-7 text-gray-700 dark:text-gray-200' />
            </div>
            <Text as='h3' size='xl' weight='medium' className='tracking-tight'>
              {t('goals.title')}
            </Text>
            <Text
              as='p'
              size='sm'
              colour='secondary'
              className='mx-auto mt-2 max-w-md whitespace-pre-wrap'
            >
              {t('goals.description')}
            </Text>
            <div className='mt-6'>
              <Button size='lg' onClick={handleNewGoal}>
                <PlusIcon className='mr-1.5 size-4' />
                {t('goals.add')}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Header with filter and add button */}
            <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <Input
                type='search'
                aria-label={t('goals.filterGoals')}
                placeholder={t('goals.filterGoals')}
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className='sm:w-64'
                leadingIcon={<MagnifyingGlassIcon className='size-4' />}
              />
              <Button onClick={handleNewGoal}>
                <PlusIcon className='mr-1.5 size-4' />
                {t('goals.addGoal')}
              </Button>
            </div>

            {/* Goals list */}
            <ul className='mt-4'>
              {_map(goals, (goal) => (
                <GoalRow
                  key={goal.id}
                  goal={goal}
                  stats={goalStats[goal.id] || null}
                  statsLoading={statsLoading[goal.id] || false}
                  isExpanded={expandedGoalId === goal.id}
                  chartData={goalChartData[goal.id] || null}
                  chartLoading={chartLoading[goal.id] || false}
                  timeBucket={timeBucket}
                  timeFormat={timeFormat}
                  onDelete={handleDeleteGoal}
                  onEdit={handleEditGoal}
                  onToggleExpand={handleToggleExpand}
                />
              ))}
            </ul>

            {_isEmpty(goals) && filterQuery ? (
              <Text
                as='p'
                size='sm'
                colour='muted'
                className='py-8 text-center'
              >
                {t('goals.noGoalsMatchFilter')}
              </Text>
            ) : null}
          </>
        )}
        {pageAmount > 1 ? (
          <Pagination
            className='mt-4'
            page={page}
            pageAmount={pageAmount}
            setPage={setPage}
            total={total}
            pageSize={DEFAULT_GOALS_TAKE}
          />
        ) : null}

        <GoalSettingsModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSuccess={handleModalSuccess}
          projectId={id}
          goalId={editingGoalId}
          tnMapping={tnMapping}
        />
      </div>
    </>
  )
}

const GoalsView = GoalsViewWrapper

export default GoalsView

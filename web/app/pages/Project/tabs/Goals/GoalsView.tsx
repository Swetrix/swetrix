import { XCircleIcon } from '@heroicons/react/24/outline'
import type { ChartOptions } from 'billboard.js'
import { area, bar } from 'billboard.js'
import cx from 'clsx'
import * as d3 from 'd3'
import dayjs from 'dayjs'
import _debounce from 'lodash/debounce'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import _size from 'lodash/size'
import {
  TargetIcon,
  Trash2Icon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  FileTextIcon,
  MousePointerClickIcon,
  ChevronDownIcon,
} from 'lucide-react'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { toast } from 'sonner'

import {
  deleteGoal as deleteGoalApi,
  getProjectGoals,
  getGoalStats,
  getGoalChart,
  DEFAULT_GOALS_TAKE,
  type Goal,
  type GoalStats,
  type GoalChartData,
} from '~/api'
import {
  TimeFormat,
  tbsFormatMapper,
  tbsFormatMapper24h,
  tbsFormatMapperTooltip,
  tbsFormatMapperTooltip24h,
  chartTypes,
} from '~/lib/constants'
import DashboardHeader from '~/pages/Project/View/components/DashboardHeader'
import { useViewProjectContext } from '~/pages/Project/View/ViewProject'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import BillboardChart from '~/ui/BillboardChart'
import Button from '~/ui/Button'
import Spin from '~/ui/icons/Spin'
import Loader from '~/ui/Loader'
import LoadingBar from '~/ui/LoadingBar'
import Modal from '~/ui/Modal'
import Pagination from '~/ui/Pagination'
import ProgressRing from '~/ui/ProgressRing'
import { Text } from '~/ui/Text'
import { nFormatter } from '~/utils/generic'
import routes from '~/utils/routes'

import GoalSettingsModal from './GoalSettingsModal'

// Calculate optimal Y axis ticks
const calculateOptimalTicks = (data: number[], targetCount: number = 6): number[] => {
  const validData = data.filter((n) => n !== undefined && n !== null && Number.isFinite(n))

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
): ChartOptions => {
  const xAxisSize = _size(chartData.x)

  const columns: any[] = [
    ['x', ..._map(chartData.x, (el) => dayjs(el).toDate())],
    ['conversions', ...chartData.conversions],
    ['sessions', ...chartData.uniqueSessions],
  ]

  // Calculate optimal Y axis ticks
  const allYValues: number[] = [...chartData.conversions, ...chartData.uniqueSessions].filter(
    (n) => n !== undefined && n !== null,
  )

  const optimalTicks = allYValues.length > 0 ? calculateOptimalTicks(allYValues) : undefined

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
      timer: false,
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
              ? (x: string) => d3.timeFormat(tbsFormatMapper24h[timeBucket])(x as unknown as Date)
              : (x: string) => d3.timeFormat(tbsFormatMapper[timeBucket])(x as unknown as Date),
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
        return `<ul class='bg-gray-50 dark:text-gray-50 dark:bg-slate-800 rounded-md ring-1 ring-black/10 px-3 py-1'>
          <li class='font-semibold'>${
            timeFormat === TimeFormat['24-hour']
              ? d3.timeFormat(tbsFormatMapperTooltip24h[timeBucket])(item[0].x)
              : d3.timeFormat(tbsFormatMapperTooltip[timeBucket])(item[0].x)
          }</li>
          <hr class='border-gray-200 dark:border-gray-600' />
          ${_map(item, (el: { id: string; name: string; value: string }) => {
            return `
            <li class='flex justify-between'>
              <div class='flex justify-items-start'>
                <div class='w-3 h-3 rounded-xs mt-1.5 mr-2' style=background-color:${color(el.id)}></div>
                <span>${el.name}</span>
              </div>
              <span class='pl-4'>${el.value}</span>
            </li>
            `
          }).join('')}</ul>`
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
  const { t } = useTranslation()
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const patternDisplay = useMemo(() => {
    if (!goal.value) return null
    const matchPrefix = goal.matchType === 'exact' ? '= ' : goal.matchType === 'contains' ? '~ ' : ''
    return `${matchPrefix}${goal.value}`
  }, [goal.value, goal.matchType])

  const chartOptions = useMemo(() => {
    if (!chartData || !chartData.x || chartData.x.length === 0) return null
    return getGoalChartSettings(chartData, timeBucket, timeFormat, chartTypes.line, {
      conversions: t('goals.conversions'),
      sessions: t('project.sessions'),
    })
  }, [chartData, timeBucket, timeFormat, t])

  return (
    <>
      <li className='relative mb-3 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 transition-colors dark:border-slate-800/25 dark:bg-slate-800/70'>
        {/* Main row - clickable to expand */}
        <div
          onClick={() => onToggleExpand(goal.id)}
          className='flex cursor-pointer justify-between gap-x-6 px-4 py-4 transition-colors hover:bg-gray-200/70 sm:px-6 dark:hover:bg-slate-700/60'
        >
          <div className='flex min-w-0 gap-x-4'>
            <div className='min-w-0 flex-auto'>
              <Text as='p' weight='semibold' truncate className='flex items-center gap-x-1.5'>
                {goal.type === 'pageview' ? (
                  <FileTextIcon className='size-4 text-blue-500' strokeWidth={1.5} />
                ) : (
                  <MousePointerClickIcon className='size-4 text-amber-500' strokeWidth={1.5} />
                )}
                <span>{goal.name}</span>
              </Text>
              {patternDisplay ? (
                <Text className='mt-1 max-w-max' as='p' size='xs' colour='secondary' code>
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
                    <ProgressRing value={stats.conversionRate} size={36} strokeWidth={3} />
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
                  <p className='text-sm leading-6'>
                    <Text as='span' size='sm' weight='semibold'>
                      {stats.conversions.toLocaleString()}
                    </Text>{' '}
                    <Text as='span' size='sm' colour='secondary'>
                      {t('goals.conversions').toLowerCase()}
                    </Text>
                  </p>
                  <ProgressRing value={stats.conversionRate} size={44} strokeWidth={3.5} />
                </>
              ) : (
                <Text as='p' size='sm' colour='muted'>
                  {t('goals.noData')}
                </Text>
              )}
            </div>
            {/* Action buttons */}
            <div className='flex items-center gap-1'>
              <button
                type='button'
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onEdit(goal.id)
                }}
                aria-label={t('common.edit')}
                className='rounded-md border border-transparent p-1.5 text-gray-800 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 dark:hover:text-slate-300'
              >
                <PencilIcon className='size-4' strokeWidth={1.5} />
              </button>
              <button
                type='button'
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowDeleteModal(true)
                }}
                aria-label={t('common.delete')}
                className='rounded-md border border-transparent p-1.5 text-gray-800 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 dark:hover:text-slate-300'
              >
                <Trash2Icon className='size-4' strokeWidth={1.5} />
              </button>
              <ChevronDownIcon
                className={cx('size-5 text-gray-500 transition-transform dark:text-gray-400', {
                  'rotate-180': isExpanded,
                })}
                strokeWidth={1.5}
              />
            </div>
          </div>
        </div>

        {/* Expanded chart section */}
        {isExpanded ? (
          <div className='border-t border-gray-200 px-4 py-4 sm:px-6 dark:border-slate-700'>
            {chartLoading ? (
              <div className='flex h-[200px] items-center justify-center'>
                <Spin className='size-8' />
              </div>
            ) : chartData && chartData.x && chartData.x.length > 0 && chartOptions ? (
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
  period: string
  from?: string
  to?: string
  timezone?: string
}

const GoalsView = ({ period, from = '', to = '', timezone }: GoalsViewProps) => {
  const { id } = useCurrentProject()
  const { goalsRefreshTrigger, timeBucket, timeFormat } = useViewProjectContext()
  const { t } = useTranslation()

  const [isLoading, setIsLoading] = useState<boolean | null>(null)
  const isLoadingRef = useRef(false) // Use ref to avoid stale closure issues in loadGoals
  const isMountedRef = useRef(true) // Track if component is mounted to prevent memory leaks
  const [total, setTotal] = useState(0)
  const [goals, setGoals] = useState<Goal[]>([])
  const [goalStats, setGoalStats] = useState<Record<string, GoalStats | null>>({})
  const [statsLoading, setStatsLoading] = useState<Record<string, boolean>>({})
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [filterQuery, setFilterQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Expanded goal state
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null)
  const [goalChartData, setGoalChartData] = useState<Record<string, GoalChartData | null>>({})
  const [chartLoading, setChartLoading] = useState<Record<string, boolean>>({})

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

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

  const loadGoals = async (take: number, skip: number, search?: string) => {
    if (isLoadingRef.current) {
      return
    }
    isLoadingRef.current = true
    setIsLoading(true)

    try {
      const result = await getProjectGoals(id, take, skip, search)
      if (isMountedRef.current) {
        setGoals(result.results)
        setTotal(result.total)
      }
    } catch (reason: any) {
      if (isMountedRef.current) {
        setError(reason?.message || reason?.toString() || 'Unknown error')
      }
    } finally {
      isLoadingRef.current = false
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }

  const loadGoalStats = async (goalId: string) => {
    setStatsLoading((prev) => ({ ...prev, [goalId]: true }))
    try {
      const stats = await getGoalStats(goalId, period, from, to, timezone)
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
    setChartLoading((prev) => ({ ...prev, [goalId]: showLoading ? true : prev[goalId] }))
    try {
      const result = await getGoalChart(goalId, period, from, to, timeBucket, timezone)
      if (isMountedRef.current) {
        setGoalChartData((prev) => ({ ...prev, [goalId]: result.chart }))
      }
    } catch (err) {
      console.error('Failed to load goal chart:', err)
      if (isMountedRef.current) {
        setGoalChartData((prev) => ({ ...prev, [goalId]: null }))
      }
    } finally {
      // Always clear loading state
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

  useEffect(() => {
    loadGoals(DEFAULT_GOALS_TAKE, (page - 1) * DEFAULT_GOALS_TAKE, debouncedSearch || undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch])

  useEffect(() => {
    // Load stats for all goals when goals change or date range changes
    goals.forEach((goal) => {
      loadGoalStats(goal.id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goals, period, from, to, timezone])

  // Reload chart data when period changes for expanded goal
  useEffect(() => {
    if (expandedGoalId && goalChartData[expandedGoalId]) {
      // Silently refresh if we already have data, otherwise show loading
      const hasExistingData = !!goalChartData[expandedGoalId]
      loadGoalChartData(expandedGoalId, !hasExistingData)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, from, to, timezone, timeBucket])

  // Refresh goals data when refresh button is clicked
  useEffect(() => {
    if (goalsRefreshTrigger > 0) {
      loadGoals(DEFAULT_GOALS_TAKE, (page - 1) * DEFAULT_GOALS_TAKE, debouncedSearch || undefined)
      // Clear cached chart data for non-expanded goals, silently refresh expanded goal
      if (expandedGoalId) {
        // Keep only the expanded goal's data while we fetch fresh data
        setGoalChartData((prev) => ({ [expandedGoalId]: prev[expandedGoalId] }))
        // Silently fetch new data without showing loading indicator
        loadGoalChartData(expandedGoalId, false)
      } else {
        // No expanded goal, just clear all cached data
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
    loadGoals(DEFAULT_GOALS_TAKE, (page - 1) * DEFAULT_GOALS_TAKE, debouncedSearch || undefined)
  }

  const handleDeleteGoal = async (goalId: string) => {
    try {
      await deleteGoalApi(goalId)
      toast.success(t('goals.deleted'))
      // Reload goals
      loadGoals(DEFAULT_GOALS_TAKE, (page - 1) * DEFAULT_GOALS_TAKE, debouncedSearch || undefined)
    } catch (reason: any) {
      toast.error(reason?.response?.data?.message || reason?.message || t('apiNotifications.somethingWentWrong'))
    }
  }

  if (error && isLoading === false) {
    return (
      <div className='bg-gray-50 px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8 dark:bg-slate-900'>
        <div className='mx-auto max-w-max'>
          <main className='sm:flex'>
            <XCircleIcon className='h-12 w-12 text-red-400' aria-hidden='true' />
            <div className='sm:ml-6'>
              <div className='max-w-prose sm:border-l sm:border-gray-200 sm:pl-6'>
                <h1 className='text-4xl font-extrabold text-gray-900 sm:text-5xl dark:text-gray-50'>
                  {t('apiNotifications.somethingWentWrong')}
                </h1>
                <p className='mt-4 text-2xl font-medium text-gray-700 dark:text-gray-200'>
                  {t('apiNotifications.errorCode', { error })}
                </p>
              </div>
              <div className='mt-8 flex space-x-3 sm:border-l sm:border-transparent sm:pl-6'>
                <button
                  type='button'
                  onClick={() => window.location.reload()}
                  className='inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-hidden'
                >
                  {t('dashboard.reloadPage')}
                </button>
                <Link
                  to={routes.contact}
                  className='inline-flex items-center rounded-md border border-transparent bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-hidden dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700 dark:focus:ring-gray-50'
                >
                  {t('notFoundPage.support')}
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // Show Loader only on initial load (no existing data)
  if ((isLoading || isLoading === null) && _isEmpty(goals)) {
    return (
      <div className='mt-4'>
        <Loader />
      </div>
    )
  }

  return (
    <>
      <DashboardHeader showLiveVisitors />
      <div>
        {isLoading && !_isEmpty(goals) ? <LoadingBar /> : null}
        {_isEmpty(goals) ? (
          <div className='mt-5 rounded-lg bg-gray-700 p-5'>
            <div className='flex items-center text-gray-50'>
              <TargetIcon className='mr-2 h-8 w-8' strokeWidth={1.5} />
              <p className='text-3xl font-bold'>{t('goals.title')}</p>
            </div>
            <p className='mt-2 text-sm whitespace-pre-wrap text-gray-100'>{t('goals.description')}</p>
            <Button
              onClick={handleNewGoal}
              className='mt-6 block max-w-max rounded-md border border-transparent bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-indigo-50 md:px-4'
              secondary
              large
            >
              {t('goals.add')}
            </Button>
          </div>
        ) : (
          <>
            {/* Header with filter and add button */}
            <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <div className='relative'>
                <SearchIcon
                  className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400'
                  strokeWidth={1.5}
                />
                <input
                  type='text'
                  placeholder={t('goals.filterGoals')}
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className='w-full rounded-lg border border-gray-300 bg-white py-2 pr-4 pl-9 text-sm text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none sm:w-64 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 dark:placeholder-gray-400 dark:focus:border-indigo-400 dark:focus:ring-indigo-400'
                />
              </div>
              <Button onClick={handleNewGoal} primary regular>
                <PlusIcon className='mr-1.5 size-4' strokeWidth={2} />
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

            {goals.length === 0 && debouncedSearch ? (
              <p className='py-8 text-center text-sm text-gray-500 dark:text-gray-400'>
                {t('goals.noGoalsMatchFilter')}
              </p>
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
        />
      </div>
    </>
  )
}

export default GoalsView

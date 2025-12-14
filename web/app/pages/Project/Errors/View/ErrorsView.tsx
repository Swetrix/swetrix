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
  BugIcon,
  PercentIcon,
  UsersIcon,
  MonitorIcon,
  ChevronRightIcon,
  AlertTriangleIcon,
  UserIcon,
} from 'lucide-react'
import { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useSearchParams, useNavigate, type LinkProps } from 'react-router'
import { ClientOnly } from 'remix-utils/client-only'
import { toast } from 'sonner'

import { getErrors, getErrorOverview, getError, updateErrorStatus, type ErrorOverviewResponse } from '~/api'
import {
  TimeFormat,
  tbsFormatMapper,
  tbsFormatMapper24h,
  tbsFormatMapperTooltip,
  tbsFormatMapperTooltip24h,
  chartTypes,
  ERROR_PANELS_ORDER,
} from '~/lib/constants'
import { CountryEntry, Entry } from '~/lib/models/Entry'
import { SwetrixError, SwetrixErrorDetails } from '~/lib/models/Project'
import { useViewProjectContext } from '~/pages/Project/View/ViewProject'
import {
  getFormatDate,
  typeNameMapping,
  panelIconMapping,
  getDeviceRowMapper,
} from '~/pages/Project/View/ViewProject.helpers'
import { useCurrentProject, useProjectPassword } from '~/providers/CurrentProjectProvider'
import { useTheme } from '~/providers/ThemeProvider'
import { Badge } from '~/ui/Badge'
import BillboardChart from '~/ui/BillboardChart'
import Checkbox from '~/ui/Checkbox'
import Dropdown from '~/ui/Dropdown'
import Loader from '~/ui/Loader'
import LoadingBar from '~/ui/LoadingBar'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'
import { getRelativeDateIfPossible } from '~/utils/date'
import { getLocaleDisplayName, nFormatter } from '~/utils/generic'

import CCRow from '../../View/components/CCRow'
import DashboardHeader from '../../View/components/DashboardHeader'
import { ErrorChart } from '../../View/components/ErrorChart'
import { ErrorDetails } from '../../View/components/ErrorDetails'
import Filters from '../../View/components/Filters'
import NoErrorDetails from '../../View/components/NoErrorDetails'
import NoEvents from '../../View/components/NoEvents'
import WaitingForAnError from '../../View/components/WaitingForAnError'
import { Panel, MetadataPanel } from '../../View/Panels'
import { ERROR_FILTERS_MAPPING } from '../../View/utils/filters'

const InteractiveMap = lazy(() => import('../../View/components/InteractiveMap'))

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

// Chart settings for error trends chart
const getErrorTrendsChartSettings = (
  chartData: { x: string[]; occurrences: number[]; affectedUsers: number[] },
  timeBucket: string,
  timeFormat: string,
  chartType: string,
  dataNames: Record<string, string>,
): ChartOptions => {
  const xAxisSize = _size(chartData.x)

  const columns: any[] = [
    ['x', ..._map(chartData.x, (el) => dayjs(el).toDate())],
    ['occurrences', ...chartData.occurrences],
    ['affectedUsers', ...chartData.affectedUsers],
  ]

  const allYValues: number[] = [...chartData.occurrences, ...chartData.affectedUsers].filter(
    (n) => n !== undefined && n !== null,
  )

  const optimalTicks = allYValues.length > 0 ? calculateOptimalTicks(allYValues) : undefined

  return {
    data: {
      x: 'x',
      columns,
      types: {
        occurrences: chartType === chartTypes.line ? area() : bar(),
        affectedUsers: chartType === chartTypes.line ? area() : bar(),
      },
      colors: {
        occurrences: '#f97316', // orange-500
        affectedUsers: '#dc2626', // red-600
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

// Stat Card Component
interface StatCardProps {
  icon: React.ReactNode
  value: string | number
  label: string
}

const StatCard = ({ icon, value, label }: StatCardProps) => (
  <div className='relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800'>
    <div className='pointer-events-none absolute -bottom-5 -left-5 opacity-10 [&>svg]:size-24'>{icon}</div>
    <div className='relative'>
      <Text as='p' size='3xl' weight='bold' className='leading-tight'>
        {value}
      </Text>
      <Text as='p' size='sm' colour='secondary' className='leading-tight'>
        {label}
      </Text>
    </div>
  </div>
)

// Error Item Component
interface ErrorItemProps {
  error: SwetrixError
}

const ErrorItem = ({ error }: ErrorItemProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const location = useLocation()

  const lastSeen = useMemo(() => {
    return getRelativeDateIfPossible(error.last_seen, language)
  }, [error.last_seen, language])

  const status: {
    label: string
    colour: 'red' | 'yellow' | 'slate'
  } = useMemo(() => {
    if (error.status === 'active') {
      return {
        label: t('error.status.active'),
        colour: 'red',
      }
    }

    if (error.status === 'regressed') {
      return {
        label: t('error.status.regressed'),
        colour: 'yellow',
      }
    }

    return {
      label: t('error.status.resolved'),
      colour: 'slate',
    }
  }, [error.status, t])

  const params = new URLSearchParams(location.search)
  params.set('eid', error.eid)

  // Truncate long error names/messages
  const maxNameLength = 80
  const maxMessageLength = 150
  const displayName = error.name.length > maxNameLength ? `${error.name.slice(0, maxNameLength)}...` : error.name
  const displayMessage =
    error.message && error.message.length > maxMessageLength
      ? `${error.message.slice(0, maxMessageLength)}...`
      : error.message

  return (
    <Link to={{ search: params.toString() }}>
      <li className='relative mb-3 flex cursor-pointer justify-between gap-x-6 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 transition-colors hover:bg-gray-200/70 sm:px-6 dark:border-slate-800/25 dark:bg-slate-800/70 dark:hover:bg-slate-700/60'>
        <div className='flex min-w-0 gap-x-4'>
          <div className='min-w-0 flex-auto'>
            <div className='flex items-center gap-x-2 leading-6'>
              <Tooltip
                text={error.name}
                tooltipNode={
                  <Text size='sm' weight='bold' className='pb-0.5'>
                    {displayName}
                  </Text>
                }
              />
              {error.filename ? (
                <>
                  <svg viewBox='0 0 2 2' className='h-0.5 w-0.5 flex-none self-center fill-gray-400'>
                    <circle cx={1} cy={1} r={1} />
                  </svg>
                  <Text size='xs' weight='normal' colour='muted' className='mx-1 max-w-[200px] truncate'>
                    {error.filename}
                  </Text>
                </>
              ) : null}
            </div>
            {displayMessage ? (
              <Tooltip
                text={error.message}
                tooltipNode={
                  <Text as='p' size='sm' colour='muted' className='mt-1 flex leading-5'>
                    {displayMessage}
                  </Text>
                }
              />
            ) : null}
            <p className='mt-1 flex items-center gap-x-2 text-sm leading-5 text-gray-500 dark:text-gray-300'>
              <Badge className='mr-2 sm:hidden' label={status.label} colour={status.colour} />
              {lastSeen}
              <svg viewBox='0 0 2 2' className='h-0.5 w-0.5 flex-none fill-gray-400 sm:hidden'>
                <circle cx={1} cy={1} r={1} />
              </svg>
              <span className='sm:hidden'>
                {t('dashboard.xOccurrences', {
                  x: error.count,
                })}
              </span>
            </p>
            <p className='mt-2 flex text-xs leading-5 text-gray-500 sm:hidden dark:text-gray-300'>
              <span className='mr-3 flex items-center' title={t('project.affectedUsers')}>
                <UserIcon className='mr-1 size-4' strokeWidth={1.5} /> {error.users}
              </span>
              <span className='flex items-center' title={t('project.affectedSessions')}>
                <MonitorIcon className='mr-1 size-4' strokeWidth={1.5} /> {error.sessions}
              </span>
            </p>
          </div>
        </div>
        <div className='flex shrink-0 items-center gap-x-4'>
          <div className='hidden gap-1 sm:flex sm:flex-col sm:items-end'>
            <div className='flex items-center gap-x-3 text-sm leading-6 text-gray-900 dark:text-gray-50'>
              <span className='flex items-center' title={t('dashboard.xOccurrences', { x: error.count })}>
                <AlertTriangleIcon className='mr-1 size-4' strokeWidth={1.5} /> {error.count}
              </span>
              <span className='flex items-center' title={t('project.xAffectedUsers', { x: error.users })}>
                <UserIcon className='mr-1 size-4' strokeWidth={1.5} /> {error.users}
              </span>
              <span className='flex items-center' title={t('project.xAffectedSessions', { x: error.sessions })}>
                <MonitorIcon className='mr-1 size-4' strokeWidth={1.5} /> {error.sessions}
              </span>
            </div>
            <Badge label={status.label} colour={status.colour} />
          </div>
          <ChevronRightIcon className='h-5 w-5 flex-none text-gray-400' />
        </div>
      </li>
    </Link>
  )
}

const ERRORS_TAKE = 30

const ErrorsView = () => {
  const { id, allowedToManage, project } = useCurrentProject()
  const projectPassword = useProjectPassword(id)
  const { timeBucket, timeFormat, period, dateRange, timezone, filters, size } = useViewProjectContext()
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const { theme } = useTheme()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const from = dateRange ? getFormatDate(dateRange[0]) : ''
  const to = dateRange ? getFormatDate(dateRange[1]) : ''
  const tnMapping = typeNameMapping(t)
  const rotateXAxis = useMemo(() => size.width > 0 && size.width < 500, [size])

  // Error filters state
  const [errorOptions, setErrorOptions] = useState<Record<string, boolean>>({
    [ERROR_FILTERS_MAPPING.showResolved]: false,
  })

  // Overview state
  const [overviewLoading, setOverviewLoading] = useState<boolean | null>(null)
  const [overview, setOverview] = useState<ErrorOverviewResponse | null>(null)
  const isMountedRef = useRef(true)

  // Errors list state
  const [errorsLoading, setErrorsLoading] = useState<boolean | null>(null)
  const [errors, setErrors] = useState<SwetrixError[]>([])
  const [errorsSkip, setErrorsSkip] = useState(0)
  const [canLoadMoreErrors, setCanLoadMoreErrors] = useState(false)
  const errorsRequestIdRef = useRef(0)

  // Error detail state
  const activeEID = useMemo(() => searchParams.get('eid'), [searchParams])
  const prevActiveEIDRef = useRef<string | null>(activeEID)
  const [activeError, setActiveError] = useState<{ details: SwetrixErrorDetails; [key: string]: any } | null>(null)
  const [errorLoading, setErrorLoading] = useState(false)
  const [errorStatusUpdating, setErrorStatusUpdating] = useState(false)

  // Error detail panel tabs
  const [errorsActiveTabs, setErrorsActiveTabs] = useState<{
    location: 'cc' | 'rg' | 'ct' | 'lc' | 'map'
    page: 'pg' | 'host'
    device: 'br' | 'os' | 'dv'
  }>({
    location: 'cc',
    page: 'pg',
    device: 'br',
  })

  // Pure search params (without eid) for back navigation
  const pureSearchParams = useMemo(() => {
    const newSearchParams = new URLSearchParams(searchParams.toString())
    newSearchParams.delete('eid')
    return newSearchParams.toString()
  }, [searchParams])

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const loadOverview = useCallback(async () => {
    if (overviewLoading) return

    setOverviewLoading(true)
    try {
      const result = await getErrorOverview(
        id,
        timeBucket,
        period,
        filters,
        errorOptions,
        from,
        to,
        timezone || '',
        projectPassword,
      )
      if (isMountedRef.current) {
        setOverview(result)
      }
    } catch (reason: any) {
      console.error('[ErrorsView] Failed to load overview:', reason)
      if (isMountedRef.current) {
        toast.error(reason?.message || t('apiNotifications.somethingWentWrong'))
      }
    } finally {
      if (isMountedRef.current) {
        setOverviewLoading(false)
      }
    }
  }, [id, timeBucket, period, filters, errorOptions, from, to, timezone, projectPassword, overviewLoading, t])

  const loadErrors = useCallback(
    async (forcedSkip?: number, override?: boolean) => {
      if (errorsLoading && !override) return

      const currentRequestId = ++errorsRequestIdRef.current
      setErrorsLoading(true)

      const skip = forcedSkip !== undefined ? forcedSkip : errorsSkip

      try {
        const { errors: newErrors } = await getErrors(
          id,
          timeBucket,
          period === 'custom' ? '' : period,
          filters,
          errorOptions,
          from,
          to,
          ERRORS_TAKE,
          skip,
          timezone || '',
          projectPassword,
        )

        if (!isMountedRef.current || currentRequestId !== errorsRequestIdRef.current) return

        if (skip === 0) {
          setErrors(newErrors)
        } else {
          setErrors((prev) => [...prev, ...newErrors])
        }

        setErrorsSkip(skip + ERRORS_TAKE)
        setCanLoadMoreErrors(newErrors.length >= ERRORS_TAKE)
      } catch (reason: any) {
        console.error('[ErrorsView] Failed to load errors:', reason)
        if (isMountedRef.current && currentRequestId === errorsRequestIdRef.current) {
          toast.error(reason?.message || t('apiNotifications.somethingWentWrong'))
        }
      } finally {
        if (isMountedRef.current && currentRequestId === errorsRequestIdRef.current) {
          setErrorsLoading(false)
        }
      }
    },
    [id, timeBucket, period, filters, errorOptions, from, to, timezone, projectPassword, errorsLoading, errorsSkip, t],
  )

  const loadError = useCallback(
    async (eid: string) => {
      setErrorLoading(true)

      try {
        let error
        if (period === 'custom' && dateRange) {
          error = await getError(id, eid, timeBucket, '', filters, from, to, timezone, projectPassword)
        } else {
          error = await getError(id, eid, timeBucket, period, filters, '', '', timezone, projectPassword)
        }

        setActiveError(error)
      } catch (reason: any) {
        if (reason?.status === 400) {
          setErrorLoading(false)
          setActiveError(null)
          return
        }

        const message = _isEmpty(reason.data?.message) ? reason.data : reason.data.message
        console.error('[ErrorsView] Failed to load error:', message)
        toast.error(message)
      }
      setErrorLoading(false)
    },
    [dateRange, id, period, timeBucket, projectPassword, timezone, filters, from, to],
  )

  const updateStatusInErrors = useCallback(
    (status: 'active' | 'resolved') => {
      if (!activeError?.details?.eid) return

      setErrors((prevErrors) => {
        return prevErrors.map((error) => {
          if (error.eid === activeError.details.eid) {
            return { ...error, status }
          }
          return error
        })
      })
    },
    [activeError?.details?.eid],
  )

  const markErrorAsResolved = async () => {
    if (errorStatusUpdating || !activeEID || !activeError?.details?.eid) return

    setErrorStatusUpdating(true)

    try {
      await updateErrorStatus(id, 'resolved', activeEID)
      await loadError(activeEID)
      updateStatusInErrors('resolved')
    } catch (reason) {
      console.error('[markErrorAsResolved]', reason)
      toast.error(t('apiNotifications.updateErrorStatusFailed'))
      setErrorStatusUpdating(false)
      return
    }

    toast.success(t('apiNotifications.errorStatusUpdated'))
    setErrorStatusUpdating(false)
  }

  const markErrorAsActive = async () => {
    if (errorStatusUpdating || !activeEID || !activeError?.details?.eid) return

    setErrorStatusUpdating(true)

    try {
      await updateErrorStatus(id, 'active', activeEID)
      await loadError(activeEID)
      updateStatusInErrors('active')
    } catch (reason) {
      console.error('[markErrorAsActive]', reason)
      toast.error(t('apiNotifications.updateErrorStatusFailed'))
      setErrorStatusUpdating(false)
      return
    }

    toast.success(t('apiNotifications.errorStatusUpdated'))
    setErrorStatusUpdating(false)
  }

  const switchActiveErrorFilter = useMemo(
    () =>
      _debounce((pairID: string) => {
        setErrorOptions((prev) => ({ ...prev, [pairID]: !prev[pairID] }))
        setErrorsSkip(0)
      }, 0),
    [],
  )

  // Error filters dropdown items
  const errorFilters = useMemo(() => {
    return [
      {
        id: ERROR_FILTERS_MAPPING.showResolved,
        label: t('project.showResolved'),
        active: errorOptions[ERROR_FILTERS_MAPPING.showResolved],
      },
    ]
  }, [t, errorOptions])

  // Load data on mount and when params change (only for list view)
  useEffect(() => {
    if (!id || !timeBucket || !period || activeEID) return

    loadOverview()
    setErrorsSkip(0)
    loadErrors(0, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, period, from, to, timeBucket, timezone, filters, errorOptions])

  // Handle activeEID changes
  useEffect(() => {
    if (!activeEID) {
      setActiveError(null)
      // Coming back from error detail to list: reset and reload
      if (prevActiveEIDRef.current) {
        setErrorsSkip(0)
        loadErrors(0, true)
        loadOverview()
      }
      prevActiveEIDRef.current = null
      return
    }

    loadError(activeEID)
    prevActiveEIDRef.current = activeEID
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, dateRange, timeBucket, activeEID, filters])

  const chartOptions = useMemo(() => {
    if (!overview?.chart || !overview.chart.x || overview.chart.x.length === 0) return null
    return getErrorTrendsChartSettings(overview.chart, timeBucket, timeFormat, chartTypes.line, {
      occurrences: t('project.totalErrors'),
      affectedUsers: t('project.affectedUsers'),
    })
  }, [overview?.chart, timeBucket, timeFormat, t])

  const hasErrors = !_isEmpty(errors) || overview?.stats?.totalErrors

  // Filter link helper
  const getFilterLink = useCallback(
    (column: string, value: string | null): LinkProps['to'] => {
      const isFilterActive = filters.findIndex((filter) => filter.column === column && filter.filter === value) >= 0
      const newSearchParams = new URLSearchParams(searchParams.toString())

      if (isFilterActive) {
        newSearchParams.delete(column)
      } else {
        if (value === null) {
          newSearchParams.set(column, 'null')
        } else {
          newSearchParams.set(column, value)
        }
      }

      return { search: newSearchParams.toString() }
    },
    [filters, searchParams],
  )

  const getVersionFilterLink = useCallback(
    (parent: string | null, version: string | null, panelType: 'br' | 'os') => {
      const filterParams = new URLSearchParams(searchParams.toString())

      if (panelType === 'br') {
        filterParams.set('br', parent ?? 'null')
        filterParams.set('brv', version ?? 'null')
      } else if (panelType === 'os') {
        filterParams.set('os', parent ?? 'null')
        filterParams.set('osv', version ?? 'null')
      }

      return `?${filterParams.toString()}`
    },
    [searchParams],
  )

  // Version data mapping for browser/OS versions
  const createVersionDataMapping = useMemo(() => {
    const browserDataSource = activeError?.params?.brv
    const osDataSource = activeError?.params?.osv

    const browserVersions: { [key: string]: Entry[] } = {}
    const osVersions: { [key: string]: Entry[] } = {}

    if (browserDataSource) {
      browserDataSource.forEach((entry: any) => {
        const { br, name, count } = entry
        if (!browserVersions[br]) {
          browserVersions[br] = []
        }
        browserVersions[br].push({ name, count })
      })
    }

    if (osDataSource) {
      osDataSource.forEach((entry: any) => {
        const { os, name, count } = entry
        if (!osVersions[os]) {
          osVersions[os] = []
        }
        osVersions[os].push({ name, count })
      })
    }

    return { browserVersions, osVersions }
  }, [activeError?.params?.brv, activeError?.params?.osv])

  // Data names for chart
  const dataNames = useMemo(
    () => ({
      occurrences: t('project.totalErrors'),
      affectedUsers: t('project.affectedUsers'),
    }),
    [t],
  )

  // Show waiting for error data state
  if (typeof project?.isErrorDataExists === 'boolean' && !project.isErrorDataExists) {
    return <WaitingForAnError />
  }

  // If viewing error detail
  if (activeEID) {
    const resolveButton =
      allowedToManage && activeError && activeError?.details?.status !== 'resolved' ? (
        <button
          type='button'
          disabled={errorStatusUpdating}
          onClick={markErrorAsResolved}
          className={cx(
            'group relative rounded-md border border-transparent bg-transparent px-3 py-1.5 text-sm font-medium text-gray-700 transition-all hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:text-gray-50 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200',
            {
              'cursor-not-allowed opacity-50': errorLoading && !errorStatusUpdating,
              'animate-pulse cursor-not-allowed': errorStatusUpdating,
            },
          )}
        >
          {t('project.resolve')}
        </button>
      ) : allowedToManage && activeError && activeError?.details?.status === 'resolved' ? (
        <button
          type='button'
          disabled={errorStatusUpdating}
          onClick={markErrorAsActive}
          className={cx(
            'group relative rounded-md border border-transparent bg-transparent px-3 py-1.5 text-sm font-medium text-gray-700 transition-all hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:text-gray-50 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200',
            {
              'cursor-not-allowed opacity-50': errorLoading && !errorStatusUpdating,
              'animate-pulse cursor-not-allowed': errorStatusUpdating,
            },
          )}
        >
          {t('project.markAsActive')}
        </button>
      ) : null

    return (
      <div>
        {/* Loading bar for refreshes */}
        {errorLoading && activeError ? <LoadingBar /> : null}

        <DashboardHeader
          backLink={`?${pureSearchParams}`}
          showLiveVisitors={false}
          showSearchButton={false}
          hideTimeBucket
          rightContent={resolveButton}
        />

        {/* Error details */}
        {activeError?.details ? (
          <ErrorDetails
            details={activeError.details}
            period={period}
            from={dateRange ? getFormatDate(dateRange[0]) : undefined}
            to={dateRange ? getFormatDate(dateRange[1]) : undefined}
            timeBucket={timeBucket}
            projectPassword={projectPassword}
          />
        ) : null}

        {/* Error chart */}
        {activeError?.chart ? (
          <div className='mt-4'>
            <ErrorChart
              chart={activeError?.chart}
              timeBucket={activeError?.timeBucket}
              timeFormat={timeFormat}
              rotateXAxis={rotateXAxis}
              chartType={chartTypes.line}
              dataNames={dataNames}
            />
          </div>
        ) : null}

        {/* Filters */}
        <Filters tnMapping={tnMapping} />

        {/* Panels */}
        <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
          {!_isEmpty(activeError?.params)
            ? _map(ERROR_PANELS_ORDER, (type: keyof typeof tnMapping) => {
                if (type === 'location') {
                  const locationTabs = [
                    { id: 'cc', label: t('project.mapping.cc') },
                    { id: 'rg', label: t('project.mapping.rg') },
                    { id: 'ct', label: t('project.mapping.ct') },
                    { id: 'lc', label: t('project.mapping.lc') },
                    { id: 'map', label: 'Map' },
                  ]

                  const rowMapper = (entry: CountryEntry) => {
                    const { name: entryName, cc } = entry

                    if (errorsActiveTabs.location === 'lc') {
                      if (entryName === null) {
                        return <CCRow cc={null} language={language} />
                      }
                      const entryNameArray = entryName.split('-')
                      const displayName = getLocaleDisplayName(entryName, language)

                      return (
                        <CCRow cc={entryNameArray[entryNameArray.length - 1]} name={displayName} language={language} />
                      )
                    }

                    if (cc !== undefined) {
                      return <CCRow cc={cc} name={entryName || undefined} language={language} />
                    }

                    return <CCRow cc={entryName} language={language} />
                  }

                  return (
                    <Panel
                      key={errorsActiveTabs.location}
                      icon={panelIconMapping.cc}
                      id={errorsActiveTabs.location}
                      getFilterLink={getFilterLink}
                      name={t('project.location')}
                      tabs={locationTabs}
                      onTabChange={(tab) =>
                        setErrorsActiveTabs({
                          ...errorsActiveTabs,
                          location: tab as 'cc' | 'rg' | 'ct' | 'lc' | 'map',
                        })
                      }
                      activeTabId={errorsActiveTabs.location}
                      data={activeError?.params?.[errorsActiveTabs.location] || []}
                      rowMapper={rowMapper}
                      customRenderer={
                        errorsActiveTabs.location === 'map'
                          ? () => {
                              const countryData = activeError?.params?.cc || []
                              const regionData = activeError?.params?.rg || []
                              // @ts-expect-error
                              const total = countryData.reduce((acc, curr) => acc + curr.count, 0)

                              return (
                                <Suspense
                                  fallback={
                                    <div className='flex h-full items-center justify-center'>
                                      <div className='flex flex-col items-center gap-2'>
                                        <div className='h-8 w-8 animate-spin rounded-full border-2 border-blue-400 border-t-transparent'></div>
                                        <span className='text-sm text-neutral-600 dark:text-neutral-300'>
                                          Loading map...
                                        </span>
                                      </div>
                                    </div>
                                  }
                                >
                                  <InteractiveMap
                                    data={countryData}
                                    regionData={regionData}
                                    total={total}
                                    onClick={(type, key) => {
                                      const link = getFilterLink(type, key)
                                      navigate(link)
                                    }}
                                  />
                                </Suspense>
                              )
                            }
                          : undefined
                      }
                      valuesHeaderName={t('project.occurrences')}
                      highlightColour='red'
                    />
                  )
                }

                if (type === 'devices') {
                  const deviceTabs = [
                    { id: 'br', label: t('project.mapping.br') },
                    { id: 'os', label: t('project.mapping.os') },
                    { id: 'dv', label: t('project.mapping.dv') },
                  ]

                  return (
                    <Panel
                      key={errorsActiveTabs.device}
                      icon={panelIconMapping.os}
                      id={errorsActiveTabs.device}
                      getFilterLink={getFilterLink}
                      name={t('project.devices')}
                      tabs={deviceTabs}
                      onTabChange={(tab) =>
                        setErrorsActiveTabs({ ...errorsActiveTabs, device: tab as 'br' | 'os' | 'dv' })
                      }
                      activeTabId={errorsActiveTabs.device}
                      data={activeError?.params?.[errorsActiveTabs.device] || []}
                      rowMapper={getDeviceRowMapper(errorsActiveTabs.device, theme, t)}
                      capitalize={errorsActiveTabs.device === 'dv'}
                      versionData={
                        errorsActiveTabs.device === 'br'
                          ? createVersionDataMapping.browserVersions
                          : errorsActiveTabs.device === 'os'
                            ? createVersionDataMapping.osVersions
                            : undefined
                      }
                      getVersionFilterLink={(parent, version) =>
                        getVersionFilterLink(parent, version, errorsActiveTabs.device === 'br' ? 'br' : 'os')
                      }
                      valuesHeaderName={t('project.occurrences')}
                      highlightColour='red'
                    />
                  )
                }

                if (type === 'pg') {
                  const pageTabs = [
                    { id: 'pg', label: t('project.mapping.pg') },
                    { id: 'host', label: t('project.mapping.host') },
                  ]

                  return (
                    <Panel
                      key={errorsActiveTabs.page}
                      icon={panelIconMapping.pg}
                      id={errorsActiveTabs.page}
                      getFilterLink={getFilterLink}
                      rowMapper={({ name: entryName }) => {
                        if (!entryName) {
                          return (
                            <span className='italic'>
                              {errorsActiveTabs.page === 'pg' ? t('common.notSet') : t('project.unknownHost')}
                            </span>
                          )
                        }

                        let decodedUri = entryName as string

                        try {
                          decodedUri = decodeURIComponent(entryName)
                        } catch {
                          // do nothing
                        }

                        return decodedUri
                      }}
                      name={t('project.pages')}
                      tabs={pageTabs}
                      onTabChange={(tab) => setErrorsActiveTabs({ ...errorsActiveTabs, page: tab as 'pg' | 'host' })}
                      activeTabId={errorsActiveTabs.page}
                      data={activeError?.params?.[errorsActiveTabs.page] || []}
                      valuesHeaderName={t('project.occurrences')}
                      highlightColour='red'
                    />
                  )
                }

                return null
              })
            : null}
          {activeError?.metadata ? <MetadataPanel metadata={activeError.metadata} /> : null}
        </div>

        {/* Loading state */}
        {_isEmpty(activeError) && errorLoading ? <Loader /> : null}

        {/* No error details */}
        {!errorLoading && _isEmpty(activeError) ? <NoErrorDetails /> : null}
      </div>
    )
  }

  // List view - Initial loading state
  if ((overviewLoading === null || overviewLoading) && !overview && _isEmpty(errors)) {
    return <Loader />
  }

  return (
    <div>
      <DashboardHeader showLiveVisitors showSearchButton={false} hideTimeBucket />

      {/* Loading bar for refreshes */}
      {(overviewLoading || errorsLoading) && (overview || !_isEmpty(errors)) ? <LoadingBar /> : null}

      {/* Controls row - Filters dropdown */}
      {hasErrors ? (
        <div className='mb-4 flex items-center justify-between'>
          <Filters className='mt-0 mb-0' tnMapping={tnMapping} />
          <Dropdown
            items={errorFilters}
            title={t('project.filters')}
            labelExtractor={(pair) => {
              const { label, active, id: pairID } = pair

              return (
                <Checkbox
                  classes={{
                    label: 'px-4 py-2',
                  }}
                  label={label}
                  checked={active}
                  onChange={() => switchActiveErrorFilter(pairID)}
                />
              )
            }}
            buttonClassName='!px-2.5'
            selectItemClassName='p-0'
            keyExtractor={(pair) => pair.id}
            onSelect={({ id: pairID }) => {
              switchActiveErrorFilter(pairID)
            }}
            chevron='mini'
            headless
          />
        </div>
      ) : null}

      {/* No errors state */}
      {!hasErrors && errorsLoading === false && overviewLoading === false ? <NoEvents filters={filters} /> : null}

      {hasErrors ? (
        <>
          {/* Chart and Stats Row */}
          <div className='flex flex-col gap-2 lg:flex-row'>
            {/* Error Trends Chart - Left side */}
            {chartOptions && overview?.chart ? (
              <div className='w-full rounded-xl border border-gray-200 bg-white p-4 lg:w-[65%] dark:border-slate-700 dark:bg-slate-800'>
                <BillboardChart options={chartOptions} className='h-[220px]' />
              </div>
            ) : null}

            {/* Stats Grid - Right side as 2x2 */}
            <div className='grid w-full grid-cols-2 gap-2 lg:w-[35%]'>
              <StatCard
                icon={<BugIcon className='text-red-600' strokeWidth={1.5} />}
                value={nFormatter(overview?.stats?.totalErrors || 0, 1)}
                label={t('project.totalErrors')}
              />
              <StatCard
                icon={<PercentIcon className='text-orange-600' strokeWidth={1.5} />}
                value={`${overview?.stats?.errorRate || 0}%`}
                label={t('project.errorRate')}
              />
              <StatCard
                icon={<UsersIcon className='text-blue-600' strokeWidth={1.5} />}
                value={nFormatter(overview?.stats?.affectedUsers || 0, 1)}
                label={t('project.affectedUsers')}
              />
              <StatCard
                icon={<MonitorIcon className='text-purple-600' strokeWidth={1.5} />}
                value={nFormatter(overview?.stats?.affectedSessions || 0, 1)}
                label={t('project.affectedSessions')}
              />
            </div>
          </div>

          {/* Recent Errors List */}
          <div className='mt-4'>
            <Text as='h3' weight='semibold' className='mb-3'>
              {t('project.recentErrors')}
            </Text>
            <ClientOnly
              fallback={
                <div className='bg-gray-50 dark:bg-slate-900'>
                  <Loader />
                </div>
              }
            >
              {() => (
                <ul>
                  {_map(errors, (error) => (
                    <ErrorItem key={error.eid} error={error} />
                  ))}
                </ul>
              )}
            </ClientOnly>

            {/* Load more button */}
            {canLoadMoreErrors ? (
              <button
                type='button'
                title={t('project.loadMore')}
                onClick={() => loadErrors()}
                className={cx(
                  'relative mx-auto mt-2 flex items-center rounded-md border border-transparent p-2 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:bg-slate-900 dark:text-gray-50 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200',
                  {
                    'cursor-not-allowed opacity-50': errorsLoading,
                  },
                )}
              >
                {t('project.loadMore')}
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  )
}

export default ErrorsView

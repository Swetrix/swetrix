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
  PercentIcon,
  UsersIcon,
  MonitorIcon,
  CaretRightIcon,
  WarningIcon,
  UserIcon,
} from '@phosphor-icons/react'
import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  lazy,
  Suspense,
  use,
} from 'react'
import { useTranslation } from 'react-i18next'
import {
  Link,
  useLocation,
  useSearchParams,
  useNavigate,
  useFetcher,
  useLoaderData,
  useRevalidator,
  type LinkProps,
} from 'react-router'
import { ClientOnly } from 'remix-utils/client-only'

import { MapLoader } from '~/pages/Project/View/components/MapLoader'
import { toast } from 'sonner'

import type {
  ErrorsResponse,
  ErrorDetailsResponse,
  ErrorOverviewResponse,
} from '~/api/api.server'
import { useErrorsProxy } from '~/hooks/useAnalyticsProxy'
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
import { SwetrixError } from '~/lib/models/Project'
import { ErrorChart } from '~/pages/Project/tabs/Errors/ErrorChart'
import { ErrorDetails } from '~/pages/Project/tabs/Errors/ErrorDetails'
import NoErrorDetails from '~/pages/Project/tabs/Errors/NoErrorDetails'
import WaitingForAnError from '~/pages/Project/tabs/Errors/WaitingForAnError'
import CCRow from '~/pages/Project/View/components/CCRow'
import DashboardHeader from '~/pages/Project/View/components/DashboardHeader'
import Filters from '~/pages/Project/View/components/Filters'
import NoEvents from '~/pages/Project/View/components/NoEvents'
import { Panel, MetadataPanel } from '~/pages/Project/View/Panels'
import { ERROR_FILTERS_MAPPING } from '~/pages/Project/View/utils/filters'
import {
  useViewProjectContext,
  useRefreshTriggers,
} from '~/pages/Project/View/ViewProject'
import {
  getFormatDate,
  typeNameMapping,
  panelIconMapping,
  getDeviceRowMapper,
} from '~/pages/Project/View/ViewProject.helpers'
import {
  useCurrentProject,
  useProjectPassword,
} from '~/providers/CurrentProjectProvider'
import { useTheme } from '~/providers/ThemeProvider'
import type {
  ProjectViewActionData,
  ProjectLoaderData,
} from '~/routes/projects.$id'
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
import { LoaderView } from '../../View/components/LoaderView'

const InteractiveMap = lazy(
  () => import('~/pages/Project/View/components/InteractiveMap'),
)

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

  const allYValues: number[] = [
    ...chartData.occurrences,
    ...chartData.affectedUsers,
  ].filter((n) => n !== undefined && n !== null)

  const optimalTicks =
    allYValues.length > 0 ? calculateOptimalTicks(allYValues) : undefined

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

interface StatCardProps {
  icon: React.ReactNode
  value: string | number
  label: string
}

const StatCard = ({ icon, value, label }: StatCardProps) => (
  <div className='relative overflow-hidden rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-800/25'>
    <div className='pointer-events-none absolute -bottom-5 -left-5 opacity-10 [&>svg]:size-24'>
      {icon}
    </div>
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

  const maxNameLength = 80
  const maxMessageLength = 150
  const displayName =
    error.name.length > maxNameLength
      ? `${error.name.slice(0, maxNameLength)}...`
      : error.name
  const displayMessage =
    error.message && error.message.length > maxMessageLength
      ? `${error.message.slice(0, maxMessageLength)}...`
      : error.message

  return (
    <Link to={{ search: params.toString() }}>
      <li className='relative mb-3 flex cursor-pointer justify-between gap-x-6 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 px-4 py-4 transition-colors hover:bg-gray-200/70 sm:px-6 dark:border-slate-800/60 dark:bg-slate-800/25 dark:hover:bg-slate-800/60'>
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
                  <svg
                    viewBox='0 0 2 2'
                    className='h-0.5 w-0.5 flex-none self-center fill-gray-400'
                  >
                    <circle cx={1} cy={1} r={1} />
                  </svg>
                  <Text
                    size='xs'
                    weight='normal'
                    colour='muted'
                    className='mx-1 max-w-[200px] truncate'
                  >
                    {error.filename}
                  </Text>
                </>
              ) : null}
            </div>
            {displayMessage ? (
              <Tooltip
                text={error.message}
                tooltipNode={
                  <Text
                    as='p'
                    size='sm'
                    colour='muted'
                    className='mt-1 flex text-left leading-5'
                  >
                    {displayMessage}
                  </Text>
                }
              />
            ) : null}
            <p className='mt-1 flex items-center gap-x-2 text-sm leading-5 text-gray-500 dark:text-gray-300'>
              <Badge
                className='mr-2 sm:hidden'
                label={status.label}
                colour={status.colour}
              />
              {lastSeen}
              <svg
                viewBox='0 0 2 2'
                className='h-0.5 w-0.5 flex-none fill-gray-400 sm:hidden'
              >
                <circle cx={1} cy={1} r={1} />
              </svg>
              <span className='sm:hidden'>
                {t('dashboard.xOccurrences', {
                  x: error.count,
                })}
              </span>
            </p>
            <p className='mt-2 flex text-xs leading-5 text-gray-500 sm:hidden dark:text-gray-300'>
              <span
                className='mr-3 flex items-center'
                title={t('project.affectedUsers')}
              >
                <UserIcon className='mr-1 size-4' /> {error.users}
              </span>
              <span
                className='flex items-center'
                title={t('project.affectedSessions')}
              >
                <MonitorIcon className='mr-1 size-4' /> {error.sessions}
              </span>
            </p>
          </div>
        </div>
        <div className='flex shrink-0 items-center gap-x-4'>
          <div className='hidden gap-1 sm:flex sm:flex-col sm:items-end'>
            <div className='flex items-center gap-x-3 text-sm leading-6 text-gray-900 dark:text-gray-50'>
              <span
                className='flex items-center'
                title={t('dashboard.xOccurrences', { x: error.count })}
              >
                <WarningIcon className='mr-1 size-4' /> {error.count}
              </span>
              <span
                className='flex items-center'
                title={t('project.xAffectedUsers', { x: error.users })}
              >
                <UserIcon className='mr-1 size-4' /> {error.users}
              </span>
              <span
                className='flex items-center'
                title={t('project.xAffectedSessions', { x: error.sessions })}
              >
                <MonitorIcon className='mr-1 size-4' /> {error.sessions}
              </span>
            </div>
            <Badge label={status.label} colour={status.colour} />
          </div>
          <CaretRightIcon className='h-5 w-5 flex-none text-gray-400' />
        </div>
      </li>
    </Link>
  )
}

const ERRORS_TAKE = 30

interface DeferredErrorsData {
  errorsData: ErrorsResponse | null
  errorDetails: ErrorDetailsResponse | null
  errorOverview: ErrorOverviewResponse | null
}

function ErrorsDataResolver({
  children,
}: {
  children: (data: DeferredErrorsData) => React.ReactNode
}) {
  const {
    errorsData: errorsDataPromise,
    errorDetails: errorDetailsPromise,
    errorOverview: errorOverviewPromise,
  } = useLoaderData<ProjectLoaderData>()

  const errorsData = errorsDataPromise ? use(errorsDataPromise) : null
  const errorDetails = errorDetailsPromise ? use(errorDetailsPromise) : null
  const errorOverview = errorOverviewPromise ? use(errorOverviewPromise) : null

  // Memoize deferredData so object identity only changes when contained data changes
  const deferredData = useMemo(
    () => ({ errorsData, errorDetails, errorOverview }),
    [errorsData, errorDetails, errorOverview],
  )

  return <>{children(deferredData)}</>
}

function ErrorsViewWrapper() {
  return (
    <Suspense fallback={<LoaderView />}>
      <ErrorsDataResolver>
        {(deferredData) => <ErrorsViewInner deferredData={deferredData} />}
      </ErrorsDataResolver>
    </Suspense>
  )
}

interface ErrorsViewInnerProps {
  deferredData: DeferredErrorsData
}

const ErrorsViewInner = ({ deferredData }: ErrorsViewInnerProps) => {
  const { id, allowedToManage, project } = useCurrentProject()
  const projectPassword = useProjectPassword(id)
  const revalidator = useRevalidator()
  const errorsProxy = useErrorsProxy()
  const { errorsRefreshTrigger } = useRefreshTriggers()
  const { timeBucket, timeFormat, period, dateRange, timezone, filters, size } =
    useViewProjectContext()
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const { theme } = useTheme()
  const [searchParams] = useSearchParams()
  const isEmbedded = searchParams.get('embedded') === 'true'
  const navigate = useNavigate()
  const errorStatusFetcher = useFetcher<ProjectViewActionData>()
  const lastHandledStatusData = useRef<ProjectViewActionData | null>(null)
  const pendingStatusUpdate = useRef<'resolved' | 'active' | null>(null)

  const from = dateRange ? getFormatDate(dateRange[0]) : ''
  const to = dateRange ? getFormatDate(dateRange[1]) : ''
  const tnMapping = typeNameMapping(t)
  const rotateXAxis = useMemo(() => size.width > 0 && size.width < 500, [size])

  // Initialize state from deferred data
  const initialDataProcessed = useRef(false)

  const [errorOptions, setErrorOptions] = useState<Record<string, boolean>>({
    [ERROR_FILTERS_MAPPING.showResolved]: false,
  })

  // Overview from loader
  const overview = deferredData.errorOverview
  const overviewLoading = revalidator.state === 'loading'

  const isMountedRef = useRef(true)

  const [errorsLoading, setErrorsLoading] = useState<boolean | null>(() =>
    deferredData.errorsData ? false : null,
  )
  const [errors, setErrors] = useState<SwetrixError[]>(
    () => deferredData.errorsData?.errors || [],
  )
  const [errorsSkip, setErrorsSkip] = useState(
    () => deferredData.errorsData?.errors?.length || 0,
  )
  const [canLoadMoreErrors, setCanLoadMoreErrors] = useState(
    () => (deferredData.errorsData?.errors?.length || 0) >= ERRORS_TAKE,
  )

  const activeEID = useMemo(() => searchParams.get('eid'), [searchParams])

  // Error details from loader
  const activeError = useMemo(() => {
    if (deferredData.errorDetails) {
      return {
        details: deferredData.errorDetails.details,
        chart: deferredData.errorDetails.chart,
        params: deferredData.errorDetails.params,
        metadata: deferredData.errorDetails.metadata,
        timeBucket: deferredData.errorDetails.timeBucket,
      }
    }
    return null
  }, [deferredData.errorDetails])

  const errorLoading = activeEID ? revalidator.state === 'loading' : false

  const errorStatusUpdating = errorStatusFetcher.state !== 'idle'

  const [errorsActiveTabs, setErrorsActiveTabs] = useState<{
    location: 'cc' | 'rg' | 'ct' | 'lc' | 'map'
    page: 'pg' | 'host'
    device: 'br' | 'os' | 'dv'
  }>({
    location: 'cc',
    page: 'pg',
    device: 'br',
  })

  const pureSearchParams = useMemo(() => {
    const newSearchParams = new URLSearchParams(searchParams.toString())
    newSearchParams.delete('eid')
    return newSearchParams.toString()
  }, [searchParams])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Process deferred data on mount
  useEffect(() => {
    if (initialDataProcessed.current) return
    initialDataProcessed.current = true

    if (deferredData.errorsData) {
      const errorsList = deferredData.errorsData.errors || []
      setErrors(errorsList)
      setErrorsSkip(ERRORS_TAKE)
      setCanLoadMoreErrors(errorsList.length >= ERRORS_TAKE)
    } else {
      setErrors([])
      setCanLoadMoreErrors(false)
    }
    setErrorsLoading(false)
  }, [deferredData])

  // Sync state when revalidation completes with new data
  useEffect(() => {
    if (!initialDataProcessed.current) return
    if (revalidator.state === 'idle') {
      if (deferredData.errorsData) {
        const errorsList = deferredData.errorsData.errors || []
        setErrors(errorsList)
        setErrorsSkip(ERRORS_TAKE)
        setCanLoadMoreErrors(errorsList.length >= ERRORS_TAKE)
      } else {
        setErrors([])
        setCanLoadMoreErrors(false)
      }
      setErrorsLoading(false)
    } else if (revalidator.state === 'loading') {
      setErrorsLoading(true)
    }
  }, [revalidator.state, deferredData])

  // Load more errors via proxy
  const loadMoreErrors = useCallback(() => {
    if (errorsLoading) return

    errorsProxy.fetchErrors(id, {
      timeBucket,
      period: period === 'custom' ? '' : period,
      from: from || undefined,
      to: to || undefined,
      timezone: timezone || '',
      filters,
      take: ERRORS_TAKE,
      skip: errorsSkip,
      options: errorOptions,
    })
  }, [
    id,
    timeBucket,
    period,
    from,
    to,
    timezone,
    filters,
    errorsSkip,
    errorOptions,
    errorsLoading,
    errorsProxy,
  ])

  // Handle proxy response for pagination
  useEffect(() => {
    if (revalidator.state === 'loading') return

    if (errorsProxy.data && !errorsProxy.isLoading) {
      const newErrors = errorsProxy.data.errors || []
      setErrors((prev) => [...prev, ...newErrors])
      setErrorsSkip((prev) => prev + ERRORS_TAKE)
      setCanLoadMoreErrors(newErrors.length >= ERRORS_TAKE)
    }
    if (errorsProxy.error) {
      toast.error(errorsProxy.error)
    }
  }, [
    errorsProxy.data,
    errorsProxy.error,
    errorsProxy.isLoading,
    revalidator.state,
  ])

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

  // Handle error status update response
  useEffect(() => {
    if (errorStatusFetcher.state !== 'idle' || !errorStatusFetcher.data) return
    if (lastHandledStatusData.current === errorStatusFetcher.data) return
    lastHandledStatusData.current = errorStatusFetcher.data

    const { intent, success, error } = errorStatusFetcher.data

    if (intent === 'update-error-status') {
      if (success && pendingStatusUpdate.current) {
        updateStatusInErrors(pendingStatusUpdate.current)
        if (activeEID) {
          revalidator.revalidate()
        }
        toast.success(t('apiNotifications.errorStatusUpdated'))
        pendingStatusUpdate.current = null
      } else if (error) {
        toast.error(error)
        pendingStatusUpdate.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorStatusFetcher.state, errorStatusFetcher.data, t, activeEID])

  const markErrorAsResolved = () => {
    if (errorStatusUpdating || !activeEID || !activeError?.details?.eid) return

    pendingStatusUpdate.current = 'resolved'
    errorStatusFetcher.submit(
      { intent: 'update-error-status', eid: activeEID, status: 'resolved' },
      { method: 'POST', action: `/projects/${id}` },
    )
  }

  const markErrorAsActive = () => {
    if (errorStatusUpdating || !activeEID || !activeError?.details?.eid) return

    pendingStatusUpdate.current = 'active'
    errorStatusFetcher.submit(
      { intent: 'update-error-status', eid: activeEID, status: 'active' },
      { method: 'POST', action: `/projects/${id}` },
    )
  }

  const switchActiveErrorFilter = useMemo(
    () =>
      _debounce((pairID: string) => {
        setErrorOptions((prev) => ({ ...prev, [pairID]: !prev[pairID] }))
        setErrorsSkip(0)
      }, 0),
    [],
  )

  const errorFilters = useMemo(() => {
    return [
      {
        id: ERROR_FILTERS_MAPPING.showResolved,
        label: t('project.showResolved'),
        active: errorOptions[ERROR_FILTERS_MAPPING.showResolved],
      },
    ]
  }, [t, errorOptions])

  // Handle refresh trigger - use revalidator for URL-based data
  useEffect(() => {
    if (errorsRefreshTrigger > 0) {
      revalidator.revalidate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorsRefreshTrigger])

  const chartOptions = useMemo(() => {
    if (!overview?.chart || !overview.chart.x || overview.chart.x.length === 0)
      return null
    return getErrorTrendsChartSettings(
      overview.chart,
      timeBucket,
      timeFormat,
      chartTypes.line,
      {
        occurrences: t('project.totalErrors'),
        affectedUsers: t('project.affectedUsers'),
      },
    )
  }, [overview?.chart, timeBucket, timeFormat, t])

  const hasErrorsRaw = !_isEmpty(errors) || overview?.stats?.totalErrors

  // Track if we've ever shown actual content to prevent NoEvents flash during exit animation
  const hasShownContentRef = useRef(false)

  if (hasErrorsRaw) {
    hasShownContentRef.current = true
  }

  // Don't show NoEvents if we've previously shown content (prevents flash during tab switch)
  const hasErrors = hasErrorsRaw || hasShownContentRef.current

  const getFilterLink = useCallback(
    (column: string, value: string | null): LinkProps['to'] => {
      const isFilterActive =
        filters.findIndex(
          (filter) => filter.column === column && filter.filter === value,
        ) >= 0
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

  const dataNames = useMemo(
    () => ({
      occurrences: t('project.totalErrors'),
      affectedUsers: t('project.affectedUsers'),
    }),
    [t],
  )

  if (
    typeof project?.isErrorDataExists === 'boolean' &&
    !project.isErrorDataExists
  ) {
    return <WaitingForAnError />
  }

  if (activeEID) {
    const resolveButton =
      allowedToManage &&
      activeError &&
      activeError?.details?.status !== 'resolved' ? (
        <button
          type='button'
          disabled={errorStatusUpdating}
          onClick={markErrorAsResolved}
          className={cx(
            'group relative rounded-md border border-transparent bg-transparent px-3 py-1.5 text-sm font-medium text-gray-700 transition-all ring-inset hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:text-gray-50 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200',
            {
              'cursor-not-allowed opacity-50':
                errorLoading && !errorStatusUpdating,
              'animate-pulse cursor-not-allowed': errorStatusUpdating,
            },
          )}
        >
          {t('project.resolve')}
        </button>
      ) : allowedToManage &&
        activeError &&
        activeError?.details?.status === 'resolved' ? (
        <button
          type='button'
          disabled={errorStatusUpdating}
          onClick={markErrorAsActive}
          className={cx(
            'group relative rounded-md border border-transparent bg-transparent px-3 py-1.5 text-sm font-medium text-gray-700 transition-all ring-inset hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:text-gray-50 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200',
            {
              'cursor-not-allowed opacity-50':
                errorLoading && !errorStatusUpdating,
              'animate-pulse cursor-not-allowed': errorStatusUpdating,
            },
          )}
        >
          {t('project.markAsActive')}
        </button>
      ) : null

    return (
      <div>
        {errorLoading && activeError ? <LoadingBar /> : null}
        {errorsLoading && !_isEmpty(errors) ? <LoadingBar /> : null}

        <DashboardHeader
          backLink={`?${pureSearchParams}`}
          showLiveVisitors={false}
          showSearchButton={false}
          hideTimeBucket
          rightContent={resolveButton}
        />

        <Filters className='mb-3' tnMapping={tnMapping} />

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

        {activeError?.chart ? (
          <div className='mt-3'>
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
                      const displayName = getLocaleDisplayName(
                        entryName,
                        language,
                      )

                      return (
                        <CCRow
                          cc={entryNameArray[entryNameArray.length - 1]}
                          name={displayName}
                          language={language}
                        />
                      )
                    }

                    if (cc !== undefined) {
                      return (
                        <CCRow
                          cc={cc}
                          name={entryName || undefined}
                          language={language}
                        />
                      )
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
                      data={
                        activeError?.params?.[errorsActiveTabs.location] || []
                      }
                      rowMapper={rowMapper}
                      customRenderer={
                        errorsActiveTabs.location === 'map'
                          ? () => {
                              const countryData = activeError?.params?.cc || []
                              const regionData = activeError?.params?.rg || []
                              const total = countryData.reduce(
                                (acc, curr) => acc + curr.count,
                                0,
                              )

                              return (
                                <Suspense fallback={<MapLoader />}>
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
                        setErrorsActiveTabs({
                          ...errorsActiveTabs,
                          device: tab as 'br' | 'os' | 'dv',
                        })
                      }
                      activeTabId={errorsActiveTabs.device}
                      data={
                        activeError?.params?.[errorsActiveTabs.device] || []
                      }
                      rowMapper={getDeviceRowMapper(
                        errorsActiveTabs.device,
                        theme,
                        t,
                      )}
                      capitalize={errorsActiveTabs.device === 'dv'}
                      versionData={
                        errorsActiveTabs.device === 'br'
                          ? createVersionDataMapping.browserVersions
                          : errorsActiveTabs.device === 'os'
                            ? createVersionDataMapping.osVersions
                            : undefined
                      }
                      getVersionFilterLink={(parent, version) =>
                        getVersionFilterLink(
                          parent,
                          version,
                          errorsActiveTabs.device === 'br' ? 'br' : 'os',
                        )
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
                              {errorsActiveTabs.page === 'pg'
                                ? t('common.notSet')
                                : t('project.unknownHost')}
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
                      onTabChange={(tab) =>
                        setErrorsActiveTabs({
                          ...errorsActiveTabs,
                          page: tab as 'pg' | 'host',
                        })
                      }
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
          {activeError?.metadata ? (
            <MetadataPanel metadata={activeError.metadata} />
          ) : null}
        </div>

        {_isEmpty(activeError) && errorLoading ? <Loader /> : null}

        {!errorLoading && _isEmpty(activeError) ? <NoErrorDetails /> : null}
      </div>
    )
  }

  // List view - Initial loading state
  if (
    (overviewLoading === null || overviewLoading) &&
    !overview &&
    _isEmpty(errors)
  ) {
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

  const filtersDropdown = hasErrors ? (
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
      buttonClassName='rounded-md border border-transparent p-2 transition-all hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden ring-inset hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200'
      selectItemClassName='p-0'
      keyExtractor={(pair) => pair.id}
      onSelect={({ id: pairID }) => {
        switchActiveErrorFilter(pairID)
      }}
      chevron='mini'
      headless
    />
  ) : null

  return (
    <div>
      <DashboardHeader
        showLiveVisitors
        showSearchButton={false}
        hideTimeBucket
        rightContent={filtersDropdown}
      />

      {(overviewLoading || errorsLoading) && (overview || !_isEmpty(errors)) ? (
        <LoadingBar />
      ) : null}

      {hasErrors ? <Filters className='mb-3' tnMapping={tnMapping} /> : null}

      {!hasErrors && errorsLoading === false && overviewLoading === false ? (
        <NoEvents filters={filters} />
      ) : null}

      {hasErrors ? (
        <>
          <div className='flex flex-col gap-2 lg:flex-row'>
            {chartOptions && overview?.chart ? (
              <div className='w-full rounded-lg border border-gray-200 bg-white p-4 lg:w-[65%] dark:border-slate-800/60 dark:bg-slate-800/25'>
                <BillboardChart options={chartOptions} className='h-[220px]' />
              </div>
            ) : null}

            <div className='grid w-full grid-cols-2 gap-2 lg:w-[35%]'>
              <StatCard
                icon={<WarningIcon className='text-red-600' />}
                value={nFormatter(overview?.stats?.totalErrors || 0, 1)}
                label={t('project.totalErrors')}
              />
              <StatCard
                icon={<PercentIcon className='text-orange-600' />}
                value={`${overview?.stats?.errorRate || 0}%`}
                label={t('project.errorRate')}
              />
              <StatCard
                icon={<UsersIcon className='text-blue-600' />}
                value={nFormatter(overview?.stats?.affectedUsers || 0, 1)}
                label={t('project.affectedUsers')}
              />
              <StatCard
                icon={<MonitorIcon className='text-purple-600' />}
                value={nFormatter(overview?.stats?.affectedSessions || 0, 1)}
                label={t('project.affectedSessions')}
              />
            </div>
          </div>

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

            {canLoadMoreErrors ? (
              <button
                type='button'
                title={t('project.loadMore')}
                onClick={loadMoreErrors}
                className={cx(
                  'relative mx-auto mt-2 flex items-center rounded-md border border-transparent p-2 text-sm font-medium text-gray-700 ring-inset hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:bg-slate-900 dark:text-gray-50 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200',
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

const ErrorsView = ErrorsViewWrapper

export default ErrorsView

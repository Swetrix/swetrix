import { useQueryClient } from '@tanstack/react-query'
import type { ChartOptions } from 'billboard.js'
import { area, bar } from 'billboard.js'
import cx from 'clsx'
import * as d3 from 'd3'
import dayjs from 'dayjs'
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
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from '~/ui/Link'
import { useLocation, useSearchParams, useFetcher } from 'react-router'
import { ClientOnly } from 'remix-utils/client-only'

import { toast } from 'sonner'

import type { ErrorListItem } from '~/api/v2/types'
import {
  useErrorDetailsQuery,
  useErrorsListQuery,
  useErrorsOverviewQuery,
} from '~/hooks/v2/useV2Queries'
import {
  TimeFormat,
  tbsFormatMapper,
  tbsFormatMapper24h,
  tbsFormatMapperTooltip,
  tbsFormatMapperTooltip24h,
  chartTypes,
} from '~/lib/constants'
import { Entry } from '~/lib/models/Entry'
import { ErrorChart } from '~/pages/Project/tabs/Errors/ErrorChart'
import { ErrorDetails } from '~/pages/Project/tabs/Errors/ErrorDetails'
import { ErrorsMap } from '~/pages/Project/tabs/Errors/ErrorsMap'
import NoErrorDetails from '~/pages/Project/tabs/Errors/NoErrorDetails'
import type {
  ErrorDetailsData,
  ErrorsOverviewData,
} from '~/pages/Project/tabs/Errors/types'
import WaitingForAnError from '~/pages/Project/tabs/Errors/WaitingForAnError'
import PageLinkRow from '~/pages/Project/tabs/Traffic/PageLinkRow'
import { SessionsDrawer } from '~/pages/Project/tabs/Traffic/SessionsDrawer'
import CCRow from '~/pages/Project/View/components/CCRow'
import DashboardHeader from '~/pages/Project/View/components/DashboardHeader'
import Filters from '~/pages/Project/View/components/Filters'
import NoEvents from '~/pages/Project/View/components/NoEvents'
import ProjectViewHeaderActions from '~/pages/Project/View/components/ProjectViewHeaderActions'
import TabErrorBoundary from '~/pages/Project/View/components/TabErrorBoundary'
import { MetadataPanel, Panel } from '~/pages/Project/View/Panels'
import { ERROR_FILTERS_MAPPING } from '~/pages/Project/View/utils/filters'
import { BreakdownSubTab } from '~/pages/Project/View/v2/BreakdownPanel'
import { RefetchIndicator } from '~/pages/Project/View/v2/loading'
import { useViewProjectContext } from '~/pages/Project/View/ViewProject'
import {
  typeNameMapping,
  panelIconMapping,
  getDeviceRowMapper,
  getUsageTypeLabel,
  getConnectionTypeLabel,
} from '~/pages/Project/View/ViewProject.helpers'
import {
  attachDataPointClickHandlers,
  getChartPointWindow,
  type ChartDataPointClick,
} from '~/pages/Project/View/utils/chartPoint'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import { useTheme } from '~/providers/ThemeProvider'
import type { ProjectViewActionData } from '~/routes/projects.$id'
import { Badge } from '~/ui/Badge'
import BillboardChart from '~/ui/BillboardChart'
import Checkbox from '~/ui/Checkbox'
import Dropdown from '~/ui/Dropdown'
import InfiniteScrollTrigger from '~/ui/InfiniteScrollTrigger'
import Loader from '~/ui/Loader'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'
import { getRelativeDateIfPossible } from '~/utils/date'
import { CompactNumberFlow, PercentFlow } from '~/ui/NumberFlow'
import { getLocaleDisplayName, nFormatter } from '~/utils/generic'

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
  onDataPointClick?: ChartDataPointClick,
  dataPointClickLabel?: string,
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
      onclick: onDataPointClick
        ? (d: any) => {
            if (d?.x) {
              onDataPointClick({
                x: d.x,
                index: d.index,
                xValue: chartData.x?.[d.index],
              })
            }
          }
        : undefined,
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
        return `<ul class='bg-gray-50 dark:text-gray-50 dark:bg-slate-900 rounded-md ring-1 ring-black/10 px-2 py-1 text-xs md:text-sm max-h-[250px] md:max-h-[350px] overflow-y-auto shadow-md z-50'>
          <li class='font-semibold pb-1 mb-1 border-b border-gray-200 dark:border-slate-800 sticky top-0 bg-gray-50 dark:bg-slate-900'>${
            timeFormat === TimeFormat['24-hour']
              ? d3.timeFormat(tbsFormatMapperTooltip24h[timeBucket])(item[0].x)
              : d3.timeFormat(tbsFormatMapperTooltip[timeBucket])(item[0].x)
          }</li>
          ${_map(item, (el: { id: string; name: string; value: string }) => {
            return `
            <li class='flex justify-between items-center py-px leading-snug'>
              <div class='flex items-center min-w-0 mr-4'>
                <div class='w-2.5 h-2.5 rounded-xs mr-1.5 shrink-0' style=background-color:${color(el.id)}></div>
                <span class="truncate">${el.name}</span>
              </div>
              <span class='font-mono whitespace-nowrap'>${el.value}</span>
            </li>
            `
          }).join(
            '',
          )}${onDataPointClick ? `<li class='pt-1 mt-1 border-t border-gray-200 dark:border-slate-700/80 text-[10px] text-gray-400 dark:text-slate-500'>${dataPointClickLabel}</li>` : ''}</ul>`
      },
    },
    point:
      chartType === chartTypes.bar
        ? {}
        : {
            focus: {
              only: xAxisSize > 1,
              expand: onDataPointClick ? { enabled: true, r: 4 } : undefined,
            },
            pattern: ['circle'],
            r: 2,
            sensitivity: onDataPointClick ? 50 : undefined,
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
    onrendered: onDataPointClick
      ? function (this: any) {
          attachDataPointClickHandlers(
            this,
            columns,
            onDataPointClick,
            chartData.x,
          )
        }
      : undefined,
  }
}

const PER_ERROR_SUBTAB_TO_V1: Record<string, string> = {
  country: 'cc',
  region: 'rg',
  city: 'ct',
  locale: 'lc',
  page: 'pg',
  host: 'host',
  browser: 'br',
  os: 'os',
  device: 'dv',
  isp: 'isp',
  organization: 'og',
  user_type: 'ut',
  connection_type: 'ctp',
}

interface PerErrorPanelsProps {
  params: ErrorDetailsData['params']
  locationSubTabs: BreakdownSubTab[]
  pagesSubTabs: BreakdownSubTab[]
  devicesSubTabs: BreakdownSubTab[]
  networkSubTabs: BreakdownSubTab[]
  locationRowMapper: (entry: Entry, subTabId: string) => React.ReactNode
  pagesRowMapper: (entry: Entry, subTabId: string) => React.ReactNode
  devicesRowMapper: (entry: Entry, subTabId: string) => React.ReactNode
  networkRowMapper: (entry: Entry, subTabId: string) => React.ReactNode
  isRefetching: boolean
}

const PerErrorPanels = ({
  params,
  locationSubTabs,
  pagesSubTabs,
  devicesSubTabs,
  networkSubTabs,
  locationRowMapper,
  pagesRowMapper,
  devicesRowMapper,
  networkRowMapper,
  isRefetching,
}: PerErrorPanelsProps) => {
  const { t } = useTranslation('common')
  const { getFilterLink, getVersionFilterLink } = useViewProjectContext()

  const [activeTabs, setActiveTabs] = useState({
    location: 'country',
    pages: 'page',
    devices: 'browser',
    network: 'isp',
  })

  const setPanelTab = (panel: keyof typeof activeTabs, tab: string) =>
    setActiveTabs((prev) => ({ ...prev, [panel]: tab }))

  const toEntries = (subTabId: string): Entry[] =>
    (params?.[PER_ERROR_SUBTAB_TO_V1[subTabId]] || []) as Entry[]

  const versionData = useMemo(() => {
    const browserVersions: Record<string, Entry[]> = {}
    const osVersions: Record<string, Entry[]> = {}

    for (const entry of (params?.brv || []) as any[]) {
      const { br, name, count } = entry
      if (!br) continue
      ;(browserVersions[br] ||= []).push({ name, count })
    }
    for (const entry of (params?.osv || []) as any[]) {
      const { os, name, count } = entry
      if (!os) continue
      ;(osVersions[os] ||= []).push({ name, count })
    }

    return { browserVersions, osVersions }
  }, [params])

  const panels: {
    panelKey: keyof typeof activeTabs
    name: string
    icon: React.ReactNode
    subTabs: BreakdownSubTab[]
    rowMapper: (entry: Entry, subTabId: string) => React.ReactNode
  }[] = [
    {
      panelKey: 'location',
      name: t('project.location'),
      icon: panelIconMapping.country,
      subTabs: locationSubTabs,
      rowMapper: locationRowMapper,
    },
    {
      panelKey: 'pages',
      name: t('project.pages'),
      icon: panelIconMapping.page,
      subTabs: pagesSubTabs,
      rowMapper: pagesRowMapper,
    },
    {
      panelKey: 'devices',
      name: t('project.devices'),
      icon: panelIconMapping.os,
      subTabs: devicesSubTabs,
      rowMapper: devicesRowMapper,
    },
    {
      panelKey: 'network',
      name: t('project.network'),
      icon: panelIconMapping.isp,
      subTabs: networkSubTabs,
      rowMapper: networkRowMapper,
    },
  ]

  return (
    <>
      {panels.map(({ panelKey, name, icon, subTabs, rowMapper }) => {
        const activeTabId = activeTabs[panelKey]

        return (
          <Panel
            key={`${panelKey}-${activeTabId}`}
            id={activeTabId}
            name={name}
            icon={icon}
            tabs={subTabs.map(({ id, label }) => ({ id, label }))}
            onTabChange={(tab) => setPanelTab(panelKey, tab)}
            activeTabId={activeTabId}
            data={toEntries(activeTabId)}
            rowMapper={(entry) => rowMapper(entry, activeTabId)}
            getFilterLink={getFilterLink}
            highlightColour='red'
            valuesHeaderName={t('project.occurrences')}
            isRefetching={isRefetching}
            customRenderer={
              activeTabId === 'map'
                ? () => (
                    <ErrorsMap
                      staticCountryData={toEntries('country')}
                      staticRegionData={toEntries('region')}
                    />
                  )
                : undefined
            }
            capitalize={activeTabId === 'device'}
            versionData={
              activeTabId === 'browser'
                ? versionData.browserVersions
                : activeTabId === 'os'
                  ? versionData.osVersions
                  : undefined
            }
            getVersionFilterLink={(parent, version) =>
              getVersionFilterLink(
                parent,
                version,
                activeTabId === 'browser' ? 'browser' : 'os',
              )
            }
          />
        )
      })}
    </>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  value: React.ReactNode
  label: string
}

const StatCard = ({ icon, value, label }: StatCardProps) => (
  <div className='relative overflow-hidden rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-900/25'>
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
  error: ErrorListItem
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
    <li className='mb-2'>
      <Link
        to={{ search: params.toString() }}
        className='block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-300'
      >
        <div className='relative flex cursor-pointer items-center justify-between gap-x-4 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 transition-colors hover:bg-gray-200/70 sm:px-5 dark:border-slate-800/60 dark:bg-slate-900/25 dark:hover:bg-slate-900/60'>
          <div className='flex min-w-0 flex-1 items-center gap-x-3.5'>
            <div className='flex min-w-0 flex-1 flex-col justify-center gap-1.5'>
              <div className='flex flex-wrap items-start justify-between gap-2 sm:gap-4'>
                <div className='flex min-w-0 items-center gap-2'>
                  <Text size='sm' weight='semibold' truncate>
                    {displayName}
                  </Text>
                  <Badge
                    label={status.label}
                    colour={status.colour}
                    className='text-[0.625rem] leading-3'
                  />
                </div>

                {/* Mobile Date */}
                <div className='mt-0.5 flex shrink-0 items-center sm:hidden'>
                  <Text size='xs' colour='secondary' className='text-[11px]'>
                    {lastSeen}
                  </Text>
                </div>
              </div>

              {displayMessage ? (
                <Text
                  as='p'
                  size='xs'
                  colour='secondary'
                  className='max-w-[90%] truncate'
                >
                  {displayMessage}
                </Text>
              ) : null}

              <div className='flex items-center justify-between gap-4'>
                <div className='flex flex-wrap items-center gap-x-3 gap-y-2'>
                  <div className='flex items-center gap-3'>
                    <Tooltip
                      text={t('dashboard.xOccurrences', { x: error.count })}
                      tooltipNode={
                        <Text
                          as='span'
                          size='xs'
                          colour='secondary'
                          weight='medium'
                          className='flex items-center gap-1'
                        >
                          <WarningIcon className='size-3.5 text-red-500' />
                          {error.count}
                        </Text>
                      }
                    />

                    <Tooltip
                      text={t('project.affectedUsers')}
                      tooltipNode={
                        <Text
                          as='span'
                          size='xs'
                          colour='secondary'
                          weight='medium'
                          className='flex items-center gap-1'
                        >
                          <UserIcon className='size-3.5' />
                          {error.users}
                        </Text>
                      }
                    />

                    <Tooltip
                      text={t('project.affectedSessions')}
                      tooltipNode={
                        <Text
                          as='span'
                          size='xs'
                          colour='secondary'
                          weight='medium'
                          className='flex items-center gap-1'
                        >
                          <MonitorIcon className='size-3.5' />
                          {error.sessions}
                        </Text>
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className='hidden shrink-0 items-center gap-x-3 sm:flex'>
            <div className='flex flex-col items-end'>
              <Text as='p' size='xs' colour='secondary' className='text-[11px]'>
                {lastSeen}
              </Text>
            </div>
            <CaretRightIcon
              className='size-4 text-gray-400'
              aria-hidden='true'
            />
          </div>
          <div className='flex shrink-0 items-center sm:hidden'>
            <CaretRightIcon
              className='size-4 text-gray-400'
              aria-hidden='true'
            />
          </div>
        </div>
      </Link>
    </li>
  )
}

function ErrorsViewWrapper() {
  const [searchParams] = useSearchParams()
  const resetKey = `errors:${searchParams.toString()}`

  return (
    <TabErrorBoundary
      titleKey='dashboard.failedToLoadErrors'
      resetKey={resetKey}
    >
      <ErrorsViewInner />
    </TabErrorBoundary>
  )
}

const ErrorsViewInner = () => {
  const { id, projectPath, allowedToManage, project } = useCurrentProject()
  const queryClient = useQueryClient()
  const { timeBucket, timeFormat, timezone, filters, size } =
    useViewProjectContext()
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const { theme } = useTheme()
  const [searchParams] = useSearchParams()
  const errorStatusFetcher = useFetcher<ProjectViewActionData>()
  const lastHandledStatusData = useRef<ProjectViewActionData | null>(null)

  const tnMapping = typeNameMapping(t)
  const rotateXAxis = useMemo(() => size.width > 0 && size.width < 500, [size])

  const [errorOptions, setErrorOptions] = useState<Record<string, boolean>>({
    [ERROR_FILTERS_MAPPING.showResolved]: false,
  })
  const showResolved = errorOptions[ERROR_FILTERS_MAPPING.showResolved]

  const [sessionsDrawer, setSessionsDrawer] = useState<{
    from: string
    to: string
    label: string
    errorId?: string
  } | null>(null)

  const activeEID = useMemo(() => searchParams.get('eid'), [searchParams])

  const errorsListQuery = useErrorsListQuery({
    showResolved,
    enabled: !activeEID,
  })
  const overviewQuery = useErrorsOverviewQuery({ enabled: !activeEID })
  const detailsQuery = useErrorDetailsQuery(activeEID)

  const errors = useMemo(
    () =>
      (errorsListQuery.data?.pages.flatMap((page) => page.data) ||
        []) as ErrorListItem[],
    [errorsListQuery.data],
  )
  const overview = overviewQuery.data?.data as ErrorsOverviewData | undefined
  const activeError = activeEID
    ? (detailsQuery.data?.data as ErrorDetailsData | undefined)
    : undefined

  const pureSearchParams = useMemo(() => {
    const newSearchParams = new URLSearchParams(searchParams.toString())
    newSearchParams.delete('eid')
    return newSearchParams.toString()
  }, [searchParams])

  const errorStatusUpdating = errorStatusFetcher.state !== 'idle'

  // Handle error status update response
  useEffect(() => {
    if (errorStatusFetcher.state !== 'idle' || !errorStatusFetcher.data) return
    if (lastHandledStatusData.current === errorStatusFetcher.data) return
    lastHandledStatusData.current = errorStatusFetcher.data

    const { intent, success, error } = errorStatusFetcher.data

    if (intent === 'update-error-status') {
      if (success) {
        queryClient.invalidateQueries({ queryKey: ['v2'] })
        toast.success(t('apiNotifications.errorStatusUpdated'))
      } else if (error) {
        toast.error(error)
      }
    }
  }, [errorStatusFetcher.state, errorStatusFetcher.data, t, queryClient])

  const markErrorAsResolved = () => {
    if (errorStatusUpdating || !activeEID || !activeError?.details?.eid) return

    errorStatusFetcher.submit(
      { intent: 'update-error-status', eid: activeEID, status: 'resolved' },
      { method: 'POST', action: projectPath },
    )
  }

  const markErrorAsActive = () => {
    if (errorStatusUpdating || !activeEID || !activeError?.details?.eid) return

    errorStatusFetcher.submit(
      { intent: 'update-error-status', eid: activeEID, status: 'active' },
      { method: 'POST', action: projectPath },
    )
  }

  const switchActiveErrorFilter = useCallback((pairID: string) => {
    setErrorOptions((prev) => ({ ...prev, [pairID]: !prev[pairID] }))
  }, [])

  const errorFilters = useMemo(() => {
    return [
      {
        id: ERROR_FILTERS_MAPPING.showResolved,
        label: t('project.showResolved'),
        active: errorOptions[ERROR_FILTERS_MAPPING.showResolved],
      },
    ]
  }, [t, errorOptions])

  const overviewTimeBucket = overview?.timeBucket || timeBucket

  const handleOverviewDataPointClick = useCallback(
    (d: { x: Date; index: number; xValue?: string }) => {
      setSessionsDrawer(
        getChartPointWindow({
          x: d.x,
          xValue: d.xValue,
          timeBucket: overviewTimeBucket,
          timezone,
          timeFormat,
        }),
      )
    },
    [overviewTimeBucket, timeFormat, timezone],
  )

  const handleActiveErrorDataPointClick = useCallback(
    (d: { x: Date; index: number; xValue?: string }) => {
      if (!activeError?.details.eid) return

      setSessionsDrawer({
        ...getChartPointWindow({
          x: d.x,
          xValue: d.xValue,
          timeBucket: activeError.timeBucket || timeBucket,
          timezone,
          timeFormat,
        }),
        errorId: activeError.details.eid,
      })
    },
    [
      activeError?.details.eid,
      activeError?.timeBucket,
      timeBucket,
      timeFormat,
      timezone,
    ],
  )

  const chartOptions = useMemo(() => {
    if (!overview?.chart || !overview.chart.x || overview.chart.x.length === 0)
      return null
    return getErrorTrendsChartSettings(
      overview.chart,
      overviewTimeBucket,
      timeFormat,
      chartTypes.line,
      {
        occurrences: t('project.totalErrors'),
        affectedUsers: t('project.affectedUsers'),
      },
      handleOverviewDataPointClick,
      t('project.exploreSessions'),
    )
  }, [
    overview?.chart,
    overviewTimeBucket,
    timeFormat,
    handleOverviewDataPointClick,
    t,
  ])

  const hasErrorsRaw =
    !_isEmpty(errors) || Boolean(overview?.stats?.totalErrors)

  // Track if we've ever shown actual content to prevent NoEvents flash during exit animation
  const hasShownContentRef = useRef(false)

  if (hasErrorsRaw) {
    hasShownContentRef.current = true
  }

  // Don't show NoEvents if we've previously shown content (prevents flash during tab switch)
  const hasErrors = hasErrorsRaw || hasShownContentRef.current

  const isInitialLoading =
    (overviewQuery.isLoading || errorsListQuery.isLoading) &&
    !hasShownContentRef.current

  const isRefetching =
    (overviewQuery.isFetching && !overviewQuery.isLoading) ||
    (errorsListQuery.isFetching &&
      !errorsListQuery.isLoading &&
      !errorsListQuery.isFetchingNextPage)

  const dataNames = useMemo(
    () => ({
      occurrences: t('project.totalErrors'),
      affectedUsers: t('project.affectedUsers'),
    }),
    [t],
  )

  const locationSubTabs = useMemo<BreakdownSubTab[]>(
    () => [
      { id: 'country', label: t('project.mapping.cc'), dimension: 'country' },
      { id: 'region', label: t('project.mapping.rg'), dimension: 'region' },
      { id: 'city', label: t('project.mapping.ct'), dimension: 'city' },
      { id: 'locale', label: t('project.mapping.lc'), dimension: 'locale' },
      {
        id: 'map',
        label: t('project.mapping.map'),
        render: () => <ErrorsMap />,
      },
    ],
    [t],
  )

  const pagesSubTabs = useMemo<BreakdownSubTab[]>(
    () => [
      { id: 'page', label: t('project.mapping.pg'), dimension: 'page' },
      { id: 'host', label: t('project.mapping.host'), dimension: 'host' },
    ],
    [t],
  )

  const devicesSubTabs = useMemo<BreakdownSubTab[]>(
    () => [
      {
        id: 'browser',
        label: t('project.mapping.br'),
        dimension: 'browser',
        versionsDimension: 'browser_version' as const,
        versionsParentField: 'browser' as const,
      },
      {
        id: 'os',
        label: t('project.mapping.os'),
        dimension: 'os',
        versionsDimension: 'os_version' as const,
        versionsParentField: 'os' as const,
      },
      { id: 'device', label: t('project.mapping.dv'), dimension: 'device' },
    ],
    [t],
  )

  const networkSubTabs = useMemo<BreakdownSubTab[]>(
    () => [
      { id: 'isp', label: t('project.mapping.isp'), dimension: 'isp' },
      {
        id: 'organization',
        label: t('project.mapping.og'),
        dimension: 'organization',
      },
      {
        id: 'user_type',
        label: t('project.mapping.ut'),
        dimension: 'user_type',
      },
      {
        id: 'connection_type',
        label: t('project.mapping.ctp'),
        dimension: 'connection_type',
      },
    ],
    [t],
  )

  const locationRowMapper = useCallback(
    (entry: Entry, subTabId: string) => {
      const { name: entryName, cc } = entry

      if (subTabId === 'locale') {
        if (entryName === null) {
          return <CCRow cc={null} language={language} />
        }

        const entryNameArray = entryName.split('-')
        const displayName = getLocaleDisplayName(entryName, language)

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
          <CCRow cc={cc} name={entryName || undefined} language={language} />
        )
      }

      return <CCRow cc={entryName} language={language} />
    },
    [language],
  )

  const pagesRowMapper = useCallback(
    (entry: Entry, subTabId: string) => {
      const { name: entryName } = entry

      if (!entryName) {
        return (
          <span className='italic'>
            {subTabId === 'host'
              ? t('project.unknownHost')
              : t('common.notSet')}
          </span>
        )
      }

      let decodedUri = entryName

      try {
        decodedUri = decodeURIComponent(entryName)
      } catch {
        // ignore
      }

      if (subTabId === 'page' && project?.websiteUrl) {
        return (
          <PageLinkRow pagePath={decodedUri} websiteUrl={project.websiteUrl} />
        )
      }

      return decodedUri
    },
    [t, project?.websiteUrl],
  )

  const devicesRowMapper = useCallback(
    (entry: Entry, subTabId: string) => {
      const v1Tab =
        subTabId === 'browser' ? 'br' : subTabId === 'os' ? 'os' : 'dv'
      const mapper = getDeviceRowMapper(v1Tab, theme, t) as
        | ((entry: Entry) => React.ReactNode)
        | undefined
      return mapper ? mapper(entry) : entry.name
    },
    [theme, t],
  )

  const networkRowMapper = useCallback(
    (entry: Entry, subTabId: string) => {
      const { name: entryName } = entry
      if (!entryName) {
        return <span className='italic'>{t('common.notSet')}</span>
      }
      if (subTabId === 'user_type') {
        return getUsageTypeLabel(entryName, t)
      }
      if (subTabId === 'connection_type') {
        return getConnectionTypeLabel(entryName, t)
      }
      return entryName
    },
    [t],
  )

  if (
    typeof project?.isErrorDataExists === 'boolean' &&
    !project.isErrorDataExists
  ) {
    return (
      <div>
        <DashboardHeader
          showLiveVisitors
          showSearchButton={false}
          hideTimeBucket
          rightContent={<ProjectViewHeaderActions tnMapping={tnMapping} />}
        />
        <WaitingForAnError />
      </div>
    )
  }

  if (activeEID) {
    const detailsLoading = detailsQuery.isLoading
    const detailsRefetching = detailsQuery.isFetching && !detailsQuery.isLoading

    const resolveButton =
      allowedToManage &&
      activeError &&
      activeError?.details?.status !== 'resolved' ? (
        <button
          type='button'
          disabled={errorStatusUpdating}
          onClick={markErrorAsResolved}
          className={cx(
            'group relative rounded-md border border-transparent bg-transparent px-3 py-1.5 text-sm font-medium text-gray-700 transition-all ring-inset hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-slate-900 focus:outline-hidden dark:text-gray-50 hover:dark:border-slate-700/80 dark:hover:bg-slate-900 dark:focus:ring-slate-300',
            {
              'cursor-not-allowed opacity-50':
                detailsRefetching && !errorStatusUpdating,
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
            'group relative rounded-md border border-transparent bg-transparent px-3 py-1.5 text-sm font-medium text-gray-700 transition-all ring-inset hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-slate-900 focus:outline-hidden dark:text-gray-50 hover:dark:border-slate-700/80 dark:hover:bg-slate-900 dark:focus:ring-slate-300',
            {
              'cursor-not-allowed opacity-50':
                detailsRefetching && !errorStatusUpdating,
              'animate-pulse cursor-not-allowed': errorStatusUpdating,
            },
          )}
        >
          {t('project.markAsActive')}
        </button>
      ) : null

    return (
      <div>
        <DashboardHeader
          backLink={`?${pureSearchParams}`}
          showLiveVisitors={false}
          showSearchButton={false}
          hideTimeBucket
          rightContent={resolveButton}
        />

        <Filters className='mb-3' tnMapping={tnMapping} />

        {detailsLoading ? (
          <Loader className='min-h-including-header items-start' />
        ) : null}

        {activeError?.details ? (
          <div>
            <ErrorDetails
              details={activeError.details}
              chart={
                <ErrorChart
                  chart={activeError.chart}
                  timeBucket={activeError.timeBucket}
                  timeFormat={timeFormat}
                  rotateXAxis={rotateXAxis}
                  chartType={chartTypes.line}
                  dataNames={dataNames}
                  onDataPointClick={handleActiveErrorDataPointClick}
                  isRefetching={detailsRefetching}
                  stats={[
                    {
                      key: 'occurrences',
                      label: t('project.occurrences'),
                      value: (
                        <CompactNumberFlow
                          value={activeError.details.count || 0}
                        />
                      ),
                      valueClassName: 'text-xl sm:text-2xl',
                    },
                    {
                      key: 'users',
                      label: t('dashboard.users'),
                      value: (
                        <CompactNumberFlow
                          value={activeError.details.users || 0}
                        />
                      ),
                      valueClassName: 'text-xl sm:text-2xl',
                    },
                    {
                      key: 'firstSeen',
                      label: t('dashboard.firstSeen'),
                      value:
                        getRelativeDateIfPossible(
                          activeError.details.first_seen,
                          language,
                        ) || '-',
                      // A relative date is a sentence, not a figure — at the
                      // default card size it dwarfs the row, so all four stats
                      // share this smaller size.
                      valueClassName: 'text-xl sm:text-2xl',
                    },
                    {
                      key: 'lastSeen',
                      label: t('dashboard.lastSeen'),
                      value:
                        getRelativeDateIfPossible(
                          activeError.details.last_seen,
                          language,
                        ) || '-',
                      valueClassName: 'text-xl sm:text-2xl',
                    },
                  ]}
                />
              }
            />
          </div>
        ) : null}

        {activeError?.details ? (
          <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
            <PerErrorPanels
              params={activeError.params}
              locationSubTabs={locationSubTabs}
              pagesSubTabs={pagesSubTabs}
              devicesSubTabs={devicesSubTabs}
              networkSubTabs={networkSubTabs}
              locationRowMapper={locationRowMapper}
              pagesRowMapper={pagesRowMapper}
              devicesRowMapper={devicesRowMapper}
              networkRowMapper={networkRowMapper}
              isRefetching={detailsRefetching}
            />
            {activeError?.metadata ? (
              <MetadataPanel metadata={activeError.metadata} />
            ) : null}
          </div>
        ) : null}

        {!detailsLoading && !activeError?.details ? <NoErrorDetails /> : null}
        <SessionsDrawer
          isOpen={!!sessionsDrawer}
          onClose={() => setSessionsDrawer(null)}
          from={sessionsDrawer?.from || ''}
          to={sessionsDrawer?.to || ''}
          label={sessionsDrawer?.label || ''}
          projectId={id}
          timezone={timezone}
          timeFormat={timeFormat as '12-hour' | '24-hour'}
          filters={filters}
          sessionEvent={sessionsDrawer?.errorId ? undefined : 'error'}
          errorId={sessionsDrawer?.errorId}
          title={t('project.affectedSessions')}
        />
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
      buttonClassName='rounded-md border border-transparent p-2 transition-all hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-slate-900 focus:outline-hidden ring-inset hover:dark:border-slate-700/80 dark:hover:bg-slate-900 dark:focus:ring-slate-300'
      selectItemClassName='p-0'
      keyExtractor={(pair) => pair.id}
      onSelect={({ id: pairID }) => {
        switchActiveErrorFilter(pairID)
      }}
      chevron='mini'
      headless
    />
  ) : null

  if (isInitialLoading) {
    return (
      <div>
        <DashboardHeader
          showLiveVisitors
          showSearchButton={false}
          hideTimeBucket
          rightContent={
            <ProjectViewHeaderActions
              tnMapping={tnMapping}
              extraActions={filtersDropdown}
            />
          }
        />
        <Loader className='min-h-including-header items-start' />
      </div>
    )
  }

  return (
    <div>
      <DashboardHeader
        showLiveVisitors
        showSearchButton={false}
        hideTimeBucket
        rightContent={
          <ProjectViewHeaderActions
            tnMapping={tnMapping}
            extraActions={filtersDropdown}
          />
        }
      />

      {hasErrors ? <Filters className='mb-3' tnMapping={tnMapping} /> : null}

      {!hasErrors && !overviewQuery.isLoading && !errorsListQuery.isLoading ? (
        <NoEvents filters={filters} />
      ) : null}

      {hasErrors ? (
        <>
          <div className='flex flex-col gap-2 lg:flex-row'>
            {chartOptions && overview?.chart ? (
              <div className='relative w-full overflow-hidden rounded-lg border border-gray-200 bg-white p-4 lg:w-[65%] dark:border-slate-800/60 dark:bg-slate-900/25'>
                {isRefetching ? <RefetchIndicator /> : null}
                <BillboardChart options={chartOptions} className='h-[220px]' />
              </div>
            ) : null}

            <div className='grid w-full grid-cols-2 gap-2 lg:w-[35%]'>
              <StatCard
                icon={<WarningIcon className='text-red-600' />}
                value={
                  <CompactNumberFlow
                    value={overview?.stats?.totalErrors || 0}
                  />
                }
                label={t('project.totalErrors')}
              />
              <StatCard
                icon={<PercentIcon className='text-orange-600' />}
                value={<PercentFlow value={overview?.stats?.errorRate || 0} />}
                label={t('project.errorRate')}
              />
              <StatCard
                icon={<UsersIcon className='text-blue-600' />}
                value={
                  <CompactNumberFlow
                    value={overview?.stats?.affectedUsers || 0}
                  />
                }
                label={t('project.affectedUsers')}
              />
              <StatCard
                icon={<MonitorIcon className='text-purple-600' />}
                value={
                  <CompactNumberFlow
                    value={overview?.stats?.affectedSessions || 0}
                  />
                }
                label={t('project.affectedSessions')}
              />
            </div>
          </div>

          <div className='relative mt-4'>
            {isRefetching ? <RefetchIndicator /> : null}
            <Text as='h3' weight='semibold' className='mb-3'>
              {t('project.recentErrors')}
            </Text>
            <ClientOnly
              fallback={
                <div className='bg-gray-50 dark:bg-slate-950'>
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

            <InfiniteScrollTrigger
              hasMore={Boolean(errorsListQuery.hasNextPage)}
              isLoading={errorsListQuery.isFetchingNextPage}
              onLoadMore={() => errorsListQuery.fetchNextPage()}
              disabled={errorsListQuery.isFetching}
            />
          </div>
        </>
      ) : null}
      <SessionsDrawer
        isOpen={!!sessionsDrawer}
        onClose={() => setSessionsDrawer(null)}
        from={sessionsDrawer?.from || ''}
        to={sessionsDrawer?.to || ''}
        label={sessionsDrawer?.label || ''}
        projectId={id}
        timezone={timezone}
        timeFormat={timeFormat as '12-hour' | '24-hour'}
        filters={filters}
        sessionEvent={sessionsDrawer?.errorId ? undefined : 'error'}
        errorId={sessionsDrawer?.errorId}
        title={t('project.affectedSessions')}
      />
    </div>
  )
}

const ErrorsView = ErrorsViewWrapper

export default ErrorsView

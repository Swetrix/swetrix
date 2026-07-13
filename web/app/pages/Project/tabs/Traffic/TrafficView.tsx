import cx from 'clsx'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezonePlugin from 'dayjs/plugin/timezone'
import _filter from 'lodash/filter'
import _includes from 'lodash/includes'
import _isEmpty from 'lodash/isEmpty'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import _some from 'lodash/some'
import { ProhibitIcon, EyeIcon, DownloadIcon } from '@phosphor-icons/react'
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  use,
  Suspense,
} from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useSearchParams, useLoaderData } from 'react-router'
import { toast } from 'sonner'

import * as v2api from '~/api/v2/endpoints'
import { useRevenueProxy } from '~/hooks/useAnalyticsProxy'
import { useAnnotations } from '~/hooks/useAnnotations'
import {
  useCompareSummaryQuery,
  useCompareTimeseriesQuery,
  useCustomEventsQuery,
  useCustomEventsTimeseriesQuery,
  useCustomMetricsQuery,
  usePagePropertiesQuery,
  useSummaryQuery,
  useTimeseriesQuery,
  useV2CommonParams,
} from '~/hooks/v2/useV2Queries'
import { isSelfhosted } from '~/lib/constants'
import { Entry } from '~/lib/models/Entry'
import AnnotationModal from '~/modals/AnnotationModal'
import CustomEventsSubmenu from '~/pages/Project/tabs/Traffic/CustomEventsSubmenu'
import CustomMetrics from '~/pages/Project/tabs/Traffic/CustomMetrics'
import {
  MetricCard,
  MetricCards,
  metricCardsContainerVariants,
} from '~/pages/Project/tabs/Traffic/MetricCards'
import PageLinkRow from '~/pages/Project/tabs/Traffic/PageLinkRow'
import RefRow from '~/pages/Project/tabs/Traffic/RefRow'
import { SessionsDrawer } from '~/pages/Project/tabs/Traffic/SessionsDrawer'
import { TrafficChart } from '~/pages/Project/tabs/Traffic/TrafficChart'
import UserFlow from '~/pages/Project/tabs/Traffic/UserFlow'
import { getChartPointWindow } from '~/pages/Project/View/utils/chartPoint'
import CCRow from '~/pages/Project/View/components/CCRow'
import { ChartContextMenu } from '~/pages/Project/View/components/ChartContextMenu'
import DashboardHeader from '~/pages/Project/View/components/DashboardHeader'
import Filters from '~/pages/Project/View/components/Filters'
import NoEvents from '~/pages/Project/View/components/NoEvents'
import ProjectViewHeaderActions from '~/pages/Project/View/components/ProjectViewHeaderActions'
import TabErrorBoundary from '~/pages/Project/View/components/TabErrorBoundary'
import WaitingForAnEvent from '~/pages/Project/View/components/WaitingForAnEvent'
import { ProjectViewCustomEvent } from '~/pages/Project/View/interfaces/traffic'
import {
  CustomEvents,
  CombinedMetadataPanel,
} from '~/pages/Project/View/Panels'
import { FILTER_CHART_METRICS_MAPPING_FOR_COMPARE } from '~/pages/Project/View/utils/filters'
import {
  BreakdownPanel,
  BreakdownSubTab,
} from '~/pages/Project/View/v2/BreakdownPanel'
import {
  hasCustomEventFilter,
  mapBreakdownRows,
  metadataToResult,
  pivotCustomEventsTimeseries,
  pivotTrafficTimeseries,
  summaryToOverall,
} from '~/pages/Project/View/v2/adapters'
import { TrafficMap } from '~/pages/Project/View/v2/TrafficMap'
import { useViewProjectContext } from '~/pages/Project/View/ViewProject'
import {
  panelIconMapping,
  noRegionPeriods,
  CHART_METRICS_MAPPING,
  getDeviceRowMapper,
  onCSVExportClick,
  getUsageTypeLabel,
  getConnectionTypeLabel,
} from '~/pages/Project/View/ViewProject.helpers'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import { useTheme } from '~/providers/ThemeProvider'
import type { ProjectLoaderData } from '~/routes/projects.$id'
import Checkbox from '~/ui/Checkbox'
import Loader from '~/ui/Loader'
import Dropdown from '~/ui/Dropdown'
import Tooltip from '~/ui/Tooltip'
import { getLocaleDisplayName, nLocaleFormatter } from '~/utils/generic'
import { groupRefEntries } from '~/utils/referrers'
import { ChartTypeSwitcher } from '../../View/components/ChartTypeSwitcher'

dayjs.extend(utc)
dayjs.extend(timezonePlugin)

interface TrafficViewProps {
  tnMapping: Record<string, string>
  customMetrics: ProjectViewCustomEvent[]
  onRemoveCustomMetric: (metricId: string) => void
  resetCustomMetrics: () => void
}

function HasImportedIndicator() {
  const { t } = useTranslation('common')
  const { hasImportedData: hasImportedDataPromise } =
    useLoaderData<ProjectLoaderData>()

  const hasImportedData = hasImportedDataPromise
    ? use(hasImportedDataPromise)
    : false

  if (!hasImportedData) return null

  return (
    <Tooltip
      text={t('project.settings.dataImport.statsIncludeImported')}
      tooltipNode={
        <span className='inline-flex rounded-md border border-transparent p-1.5'>
          <DownloadIcon className='size-5 text-gray-700 dark:text-gray-50' />
        </span>
      }
    />
  )
}

function TrafficViewWrapper(props: TrafficViewProps) {
  const [searchParams] = useSearchParams()
  const resetKey = `traffic:${searchParams.toString()}`

  return (
    <TabErrorBoundary
      titleKey='dashboard.failedToLoadTraffic'
      resetKey={resetKey}
    >
      <TrafficViewInner {...props} />
    </TabErrorBoundary>
  )
}

const TrafficViewInner = ({
  tnMapping,
  customMetrics,
  onRemoveCustomMetric,
  resetCustomMetrics,
}: TrafficViewProps) => {
  const { id, project, allowedToManage } = useCurrentProject()
  const { fetchRevenueStatus, fetchRevenueData } = useRevenueProxy()
  const {
    timezone,
    period,
    filters,
    timeFormat,
    timeBucket,
    activePeriod,
    isActiveCompare,
    activePeriodCompare,
    chartType,
    setChartTypeOnClick,
    rotateXAxis,
    onMainChartZoom,
    shouldEnableZoom,
    getFilterLink,
    getVersionFilterLink,
    isMapFullscreen,
    fullscreenMapRef,
  } = useViewProjectContext()
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const { theme } = useTheme()
  const [searchParams, setSearchParams] = useSearchParams()
  const { pid, common } = useV2CommonParams('traffic')

  // Track if we've ever shown actual content to prevent NoEvents flash
  const hasShownContentRef = useRef(false)

  const {
    annotations,
    isAnnotationModalOpen,
    annotationToEdit,
    annotationModalDate,
    annotationActionLoading,
    contextMenu,
    onAnnotationCreate,
    onAnnotationUpdate,
    onAnnotationDelete,
    openAnnotationModal,
    closeAnnotationModal,
    handleChartContextMenu,
    closeContextMenu,
  } = useAnnotations()

  const [sessionsDrawer, setSessionsDrawer] = useState<{
    from: string
    to: string
    label: string
  } | null>(null)

  const [metadataActiveKeys, setMetadataActiveKeys] = useState({
    property: '',
    customEvent: '',
  })

  const handleDataPointClick = useCallback(
    (d: { x: Date; index: number; xValue?: string }) => {
      setSessionsDrawer(
        getChartPointWindow({
          x: d.x,
          xValue: d.xValue,
          timeBucket,
          timezone,
          timeFormat,
        }),
      )
    },
    [timeBucket, timeFormat, timezone],
  )

  // Chart metrics state
  const [activeChartMetrics, setActiveChartMetrics] = useState({
    [CHART_METRICS_MAPPING.unique]: true,
    [CHART_METRICS_MAPPING.views]: false,
    [CHART_METRICS_MAPPING.sessionDuration]: false,
    [CHART_METRICS_MAPPING.bounce]: false,
    [CHART_METRICS_MAPPING.liveVisitors]: false,
    [CHART_METRICS_MAPPING.viewsPerUnique]: false,
    [CHART_METRICS_MAPPING.trendlines]: false,
    [CHART_METRICS_MAPPING.cumulativeMode]: false,
    [CHART_METRICS_MAPPING.customEvents]: false,
    [CHART_METRICS_MAPPING.revenue]: false,
  })

  const activeChartMetricsCustomEvents = useMemo(() => {
    const param = searchParams.get('customEvents')
    return param ? param.split(',').filter(Boolean) : []
  }, [searchParams])

  // --- v2 queries ---

  const summaryQuery = useSummaryQuery('traffic')
  const compareSummaryQuery = useCompareSummaryQuery('traffic')

  const timeseriesMetrics = useMemo(() => {
    const metrics = ['visitors', 'pageviews']
    if (activeChartMetrics[CHART_METRICS_MAPPING.sessionDuration]) {
      metrics.push('session_duration')
    }
    if (activeChartMetrics[CHART_METRICS_MAPPING.bounce]) {
      metrics.push('bounce_rate')
    }
    if (activeChartMetrics[CHART_METRICS_MAPPING.liveVisitors]) {
      metrics.push('concurrency')
    }
    return metrics
  }, [activeChartMetrics])

  const chartMode = activeChartMetrics[CHART_METRICS_MAPPING.cumulativeMode]
    ? ('cumulative' as const)
    : ('periodical' as const)

  const timeseriesQuery = useTimeseriesQuery('traffic', {
    metrics: timeseriesMetrics,
    mode: chartMode,
  })
  const compareTimeseriesQuery = useCompareTimeseriesQuery('traffic', {
    metrics: timeseriesMetrics,
    mode: chartMode,
  })

  const customEventsQuery = useCustomEventsQuery({ limit: 100 })
  const pagePropertiesQuery = usePagePropertiesQuery({ limit: 100 })
  const customEventsTimeseriesQuery = useCustomEventsTimeseriesQuery(
    activeChartMetricsCustomEvents,
  )
  const customMetricsQuery = useCustomMetricsQuery(customMetrics)

  const customs = useMemo(
    () =>
      Object.fromEntries(
        (customEventsQuery.data?.data || []).map((row) => [
          row.event,
          row.count,
        ]),
      ),
    [customEventsQuery.data],
  )
  const properties = useMemo(
    () =>
      Object.fromEntries(
        (pagePropertiesQuery.data?.data || []).map((row) => [
          row.property,
          row.count,
        ]),
      ),
    [pagePropertiesQuery.data],
  )

  const customEVFilterApplied = useMemo(
    () => hasCustomEventFilter(filters),
    [filters],
  )

  const overall = useMemo(
    () => summaryToOverall(summaryQuery.data?.data, customEVFilterApplied),
    [summaryQuery.data, customEVFilterApplied],
  )
  const overallCompare = useMemo(
    () =>
      summaryToOverall(compareSummaryQuery.data?.data, customEVFilterApplied),
    [compareSummaryQuery.data, customEVFilterApplied],
  )

  const baseChartData = useMemo(
    () => pivotTrafficTimeseries(timeseriesQuery.data?.data),
    [timeseriesQuery.data],
  )
  const dataChartCompare = useMemo(
    () =>
      compareTimeseriesQuery.data
        ? pivotTrafficTimeseries(compareTimeseriesQuery.data.data)
        : {},
    [compareTimeseriesQuery.data],
  )
  const customEventsChartData = useMemo(
    () =>
      pivotCustomEventsTimeseries(
        customEventsTimeseriesQuery.data?.data,
        activeChartMetricsCustomEvents,
      ).events as unknown as Record<string, string[]>,
    [customEventsTimeseriesQuery.data, activeChartMetricsCustomEvents],
  )

  // Revenue state (still fetched via the v1 proxy — no v2 equivalent)
  const [isRevenueConnected, setIsRevenueConnected] = useState(false)
  const [revenueOverlay, setRevenueOverlay] = useState<{
    revenue: number[]
    refundsAmount: number[]
  } | null>(null)

  const chartData = useMemo(() => {
    if (revenueOverlay) {
      return { ...baseChartData, ...revenueOverlay }
    }
    return baseChartData
  }, [baseChartData, revenueOverlay])

  const summaryLoaded = Boolean(summaryQuery.data)
  const customsLoaded = Boolean(customEventsQuery.data)

  const isPanelsDataEmptyRaw =
    summaryLoaded &&
    customsLoaded &&
    !overall.current?.all &&
    !overall.current?.unique &&
    _isEmpty(customs)

  if (summaryLoaded && customsLoaded && !isPanelsDataEmptyRaw) {
    hasShownContentRef.current = true
  }

  const isPanelsDataEmpty = isPanelsDataEmptyRaw && !hasShownContentRef.current

  const isInitialLoading =
    (summaryQuery.isLoading || customEventsQuery.isLoading) &&
    !hasShownContentRef.current

  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Fetch revenue status
  useEffect(() => {
    const loadRevenueStatus = async () => {
      if (!id || isSelfhosted) {
        return
      }

      try {
        const status = await fetchRevenueStatus(id)
        if (isMountedRef.current && status) {
          setIsRevenueConnected(status.connected)
        }
      } catch (error) {
        console.error(
          '[ERROR] (fetchRevenueStatus) Fetching revenue status failed',
          error,
        )
      }
    }

    loadRevenueStatus()
  }, [id, fetchRevenueStatus])

  const chartMetrics = useMemo(
    () =>
      [
        {
          id: CHART_METRICS_MAPPING.unique,
          label: t('dashboard.sessions'),
          active: activeChartMetrics[CHART_METRICS_MAPPING.unique],
        },
        {
          id: CHART_METRICS_MAPPING.views,
          label: t('project.showAll'),
          active: activeChartMetrics[CHART_METRICS_MAPPING.views],
        },
        !isSelfhosted && isRevenueConnected
          ? {
              id: CHART_METRICS_MAPPING.revenue,
              label: t('dashboard.revenue'),
              active: activeChartMetrics[CHART_METRICS_MAPPING.revenue],
              conflicts: [
                CHART_METRICS_MAPPING.bounce,
                CHART_METRICS_MAPPING.sessionDuration,
              ],
            }
          : null,
        {
          id: CHART_METRICS_MAPPING.sessionDuration,
          label: t('dashboard.sessionDuration'),
          active: activeChartMetrics[CHART_METRICS_MAPPING.sessionDuration],
          conflicts: [
            CHART_METRICS_MAPPING.bounce,
            CHART_METRICS_MAPPING.revenue,
          ],
        },
        {
          id: CHART_METRICS_MAPPING.bounce,
          label: t('dashboard.bounceRate'),
          active: activeChartMetrics[CHART_METRICS_MAPPING.bounce],
          conflicts: [
            CHART_METRICS_MAPPING.sessionDuration,
            CHART_METRICS_MAPPING.revenue,
          ],
        },
        {
          id: CHART_METRICS_MAPPING.liveVisitors,
          label: t('dashboard.liveVisitors'),
          active: activeChartMetrics[CHART_METRICS_MAPPING.liveVisitors],
          // Concurrency is reconstructed from session intervals which carry no
          // dimension data, so it cannot respect dashboard filters
          disabled: !_isEmpty(filters),
          disabledTooltip: t('project.liveVisitorsFilterConflict'),
        },
        {
          id: CHART_METRICS_MAPPING.viewsPerUnique,
          label: t('dashboard.viewsPerUnique'),
          active: activeChartMetrics[CHART_METRICS_MAPPING.viewsPerUnique],
        },
        {
          id: CHART_METRICS_MAPPING.trendlines,
          label: t('dashboard.trendlines'),
          active: activeChartMetrics[CHART_METRICS_MAPPING.trendlines],
        },
        {
          id: CHART_METRICS_MAPPING.cumulativeMode,
          label: t('dashboard.cumulativeMode'),
          active: activeChartMetrics[CHART_METRICS_MAPPING.cumulativeMode],
        },
        {
          id: CHART_METRICS_MAPPING.customEvents,
          label: t('project.customEv'),
          active: activeChartMetrics[CHART_METRICS_MAPPING.customEvents],
        },
      ].filter(Boolean),
    [t, activeChartMetrics, isRevenueConnected, filters],
  )

  const chartMetricsCustomEvents = useMemo(() => {
    if (!_isEmpty(customs)) {
      return _map(_keys(customs), (key) => ({
        id: key,
        label: key,
        active: _includes(activeChartMetricsCustomEvents, key),
      }))
    }
    return []
  }, [customs, activeChartMetricsCustomEvents])

  const dataNames = useMemo(
    () => ({
      unique: t('dashboard.sessions'),
      total: t('project.total'),
      pageviews: t('project.pageviews'),
      customEvents: t('project.customEvents'),
      errors: t('project.errors'),
      bounce: `${t('dashboard.bounceRate')} (%)`,
      viewsPerUnique: t('dashboard.viewsPerUnique'),
      trendlineTotal: t('project.trendlineTotal'),
      trendlineUnique: t('project.trendlineUnique'),
      occurrences: t('project.occurrences'),
      sessionDuration: t('dashboard.sessionDuration'),
      liveVisitors: t('dashboard.liveVisitors'),
      revenue: t('dashboard.revenue'),
      refundsAmount: t('dashboard.refunds'),
      ..._keys(customs).reduce(
        (acc, key) => ({ ...acc, [key]: key }),
        {} as Record<string, string>,
      ),
    }),
    [t, customs],
  )

  const checkIfAllMetricsAreDisabled = useMemo(
    () =>
      !_some(
        { ...activeChartMetrics, ...activeChartMetricsCustomEvents },
        (value) => value,
      ),
    [activeChartMetrics, activeChartMetricsCustomEvents],
  )

  const filteredAnnotations = useMemo(() => {
    const xAxis = chartData?.x
    if (!annotations?.length || !xAxis?.length) return annotations || []

    const rangeStart = dayjs(xAxis[0]).startOf('day')
    const rangeEnd = dayjs(xAxis[xAxis.length - 1]).endOf('day')

    return annotations.filter((a) => {
      const d = dayjs(a.date)
      return (
        (d.isAfter(rangeStart) || d.isSame(rangeStart, 'day')) &&
        (d.isBefore(rangeEnd) || d.isSame(rangeEnd, 'day'))
      )
    })
  }, [annotations, chartData])

  const isConflicted = useCallback(
    (conflicts: string[] | undefined) => {
      if (!conflicts) return false
      return conflicts.some(
        (id) => activeChartMetrics[id as keyof typeof activeChartMetrics],
      )
    },
    [activeChartMetrics],
  )

  const switchTrafficChartMetric = useCallback(
    (pairID: string, conflicts?: string[]) => {
      if (isConflicted(conflicts)) {
        toast.error(t('project.conflictMetric'))
        return
      }

      if (pairID === CHART_METRICS_MAPPING.customEvents) {
        return
      }

      setActiveChartMetrics((prev) => ({
        ...prev,
        [pairID]: !prev[pairID as keyof typeof prev],
      }))
    },
    [isConflicted, t],
  )

  // Live visitors cannot be filtered — concurrency is reconstructed from
  // session intervals which carry no dimension data, so turn it off if a filter
  // gets applied while it's active (the toggle is disabled in that state)
  useEffect(() => {
    if (
      !_isEmpty(filters) &&
      activeChartMetrics[CHART_METRICS_MAPPING.liveVisitors]
    ) {
      setActiveChartMetrics((prev) => ({
        ...prev,
        [CHART_METRICS_MAPPING.liveVisitors]: false,
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  const switchCustomEventChart = useCallback(
    (eventId: string) => {
      const newParams = new URLSearchParams(searchParams.toString())
      const currentEvents =
        newParams.get('customEvents')?.split(',').filter(Boolean) || []

      let newEvents: string[]
      if (currentEvents.includes(eventId)) {
        newEvents = currentEvents.filter((e) => e !== eventId)
      } else {
        newEvents = [...currentEvents, eventId]
      }

      if (newEvents.length > 0) {
        newParams.set('customEvents', newEvents.join(','))
      } else {
        newParams.delete('customEvents')
      }
      setSearchParams(newParams)
    },
    [searchParams, setSearchParams],
  )

  // Load revenue data when the revenue metric is enabled
  const loadRevenueData = useCallback(async () => {
    if (
      !project ||
      !activeChartMetrics.revenue ||
      isSelfhosted ||
      !isRevenueConnected
    ) {
      setRevenueOverlay(null)
      return
    }

    const chart = baseChartData
    if (!Array.isArray(chart?.x) || chart.x.length === 0) {
      setRevenueOverlay(null)
      return
    }

    try {
      const revResult = await fetchRevenueData(id, {
        period: period === 'custom' ? 'custom' : period,
        from: common.from,
        to: common.to,
        timezone,
        timeBucket,
      })
      const revChart = revResult?.chart
      const revX = revChart?.x || []
      const revY = revChart?.revenue || []
      const revRefunds = revChart?.refundsAmount || []

      let revenueData: number[] = []
      let refundsData: number[] = []

      if (Array.isArray(revX) && revX.length > 0) {
        if (revX.length === chart.x.length && revX[0] === chart.x[0]) {
          revenueData = revY.map((v: any) => Number(v ?? 0))
          refundsData = revRefunds.map((v: any) => Number(v ?? 0))
        } else {
          const byX = new Map<string, number>()
          const refundsByX = new Map<string, number>()
          for (let i = 0; i < revX.length; i += 1) {
            byX.set(revX[i], Number(revY[i] ?? 0))
            refundsByX.set(revX[i], Number(revRefunds[i] ?? 0))
          }
          revenueData = chart.x.map((x: string) => Number(byX.get(x) ?? 0))
          refundsData = chart.x.map((x: string) =>
            Number(refundsByX.get(x) ?? 0),
          )
        }
      }

      setRevenueOverlay({ revenue: revenueData, refundsAmount: refundsData })
    } catch {
      setRevenueOverlay(null)
    }
  }, [
    project,
    activeChartMetrics.revenue,
    isRevenueConnected,
    common.from,
    common.to,
    period,
    timezone,
    timeBucket,
    baseChartData,
    id,
    fetchRevenueData,
  ])

  useEffect(() => {
    loadRevenueData()
  }, [loadRevenueData])

  const getCustomEventMetadata = useCallback(
    async (event: string) =>
      metadataToResult(
        (await v2api.getCustomEventsMetadata(pid, { ...common, event })).data,
      ),
    [pid, common],
  )

  const getPropertyMetadata = useCallback(
    async (property: string) =>
      metadataToResult(
        (await v2api.getPagePropertiesMetadata(pid, { ...common, property }))
          .data,
      ),
    [pid, common],
  )

  const hasRefNameFilter = useMemo(
    () => filters.some((f) => f.dimension === 'referrer_name'),
    [filters],
  )

  // --- Panels ---

  const locationSubTabs = useMemo<BreakdownSubTab[]>(
    () => [
      { id: 'country', label: t('project.mapping.cc'), dimension: 'country' },
      { id: 'region', label: t('project.mapping.rg'), dimension: 'region' },
      { id: 'city', label: t('project.mapping.ct'), dimension: 'city' },
      { id: 'locale', label: t('project.mapping.lc'), dimension: 'locale' },
      {
        id: 'map',
        label: t('project.mapping.map'),
        render: () => <TrafficMap isFullscreen={false} />,
      },
    ],
    [t],
  )

  const pagesSubTabs = useMemo<BreakdownSubTab[]>(
    () => [
      { id: 'page', label: t('project.mapping.pg'), dimension: 'page' },
      {
        id: 'entry_page',
        label: t('project.entryPages'),
        dimension: 'entry_page',
      },
      {
        id: 'exit_page',
        label: t('project.exitPages'),
        dimension: 'exit_page',
      },
      {
        id: 'userFlow',
        label: t('project.mapping.userFlow'),
        render: () => <UserFlow isReversed={false} setReversed={() => {}} />,
      },
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

  const sourcesSubTabs = useMemo<(BreakdownSubTab | BreakdownSubTab[])[]>(
    () => [
      {
        id: 'referrer',
        label: t('project.mapping.ref'),
        dimension: 'referrer',
      },
      [
        {
          id: 'utm_source',
          label: t('project.mapping.so'),
          dimension: 'utm_source',
        },
        {
          id: 'utm_medium',
          label: t('project.mapping.me'),
          dimension: 'utm_medium',
        },
        {
          id: 'utm_campaign',
          label: t('project.mapping.ca'),
          dimension: 'utm_campaign',
        },
        {
          id: 'utm_term',
          label: t('project.mapping.te'),
          dimension: 'utm_term',
        },
        {
          id: 'utm_content',
          label: t('project.mapping.co'),
          dimension: 'utm_content',
        },
      ],
    ],
    [t],
  )

  const networkSubTabs = useMemo<(BreakdownSubTab | BreakdownSubTab[])[]>(
    () => [
      [
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
        // do nothing
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

  const sourcesRowMapper = useCallback((entry: Entry, subTabId: string) => {
    const { name: entryName } = entry
    if (subTabId === 'referrer') {
      return <RefRow rowName={entryName} />
    }
    try {
      return decodeURIComponent(entryName as string)
    } catch {
      return entryName
    }
  }, [])

  const sourcesTransformEntries = useCallback(
    (entries: Entry[], subTabId: string) => {
      if (subTabId === 'referrer' && !hasRefNameFilter) {
        return groupRefEntries(entries)
      }
      return entries
    },
    [hasRefNameFilter],
  )

  const sourcesGetFilterLink = useCallback(
    (dimension: string, value: string | null, subTabId: string) => {
      if (subTabId === 'referrer') {
        // If grouped by name/domain (no referrer_name filter active) -> filter by referrer_name
        return getFilterLink(
          hasRefNameFilter || value === null ? 'referrer' : 'referrer_name',
          value,
        )
      }
      return getFilterLink(dimension, value)
    },
    [getFilterLink, hasRefNameFilter],
  )

  const exportTypes = useMemo(
    () => [
      {
        label: t('project.asCSV'),
        onClick: async () => {
          const dimensions = [
            'country',
            'region',
            'city',
            'locale',
            'page',
            'entry_page',
            'exit_page',
            'host',
            'browser',
            'browser_version',
            'os',
            'os_version',
            'device',
            'referrer',
            'utm_source',
            'utm_medium',
            'utm_campaign',
            'utm_term',
            'utm_content',
            'isp',
            'organization',
            'user_type',
            'connection_type',
          ]

          try {
            const results = await Promise.all(
              dimensions.map((dimension) =>
                v2api
                  .getBreakdown(pid, 'traffic', {
                    ...common,
                    dimension,
                    limit: 100,
                    sort: 'visitors:desc',
                  })
                  .catch(() => null),
              ),
            )

            const data: Record<string, Entry[]> = {}
            dimensions.forEach((dimension, index) => {
              const result = results[index]
              if (result && result.data.length > 0) {
                data[dimension] = mapBreakdownRows(result.data)
              }
            })

            onCSVExportClick(
              { data, types: _keys(data) },
              id,
              tnMapping,
              language,
            )
          } catch {
            toast.error(t('apiNotifications.somethingWentWrong'))
          }
        },
      },
    ],
    [t, pid, common, id, tnMapping, language],
  )

  // Show waiting state if project has no traffic data yet
  if (!project?.isDataExists) {
    return <WaitingForAnEvent />
  }

  const headerRightContent = (
    <ProjectViewHeaderActions tnMapping={tnMapping} exportTypes={exportTypes} />
  )

  if (isInitialLoading) {
    return (
      <>
        <DashboardHeader rightContent={headerRightContent} />
        <Loader />
      </>
    )
  }

  if (isPanelsDataEmpty) {
    return (
      <>
        <DashboardHeader rightContent={headerRightContent} />
        <NoEvents filters={filters} />
      </>
    )
  }

  // Fullscreen map view - takes over the entire content area
  if (isMapFullscreen && fullscreenMapRef.current) {
    return createPortal(<TrafficMap isFullscreen />, fullscreenMapRef.current)
  }

  return (
    <>
      <DashboardHeader rightContent={headerRightContent} />
      <div className={cx({ hidden: isPanelsDataEmpty })}>
        {!isPanelsDataEmpty ? (
          <Filters className='mb-3' tnMapping={tnMapping} />
        ) : null}
        <CustomMetrics
          className='mb-3'
          metrics={customMetrics}
          onRemoveMetric={(metricId) => onRemoveCustomMetric(metricId)}
          resetMetrics={resetCustomMetrics}
        />
        <div className='relative overflow-hidden rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-900/25'>
          <div className='mb-3 flex w-full items-center justify-end gap-1 lg:absolute lg:top-2 lg:right-2 lg:mb-0 lg:w-auto lg:justify-normal'>
            <Dropdown
              header={t('project.metricVis')}
              items={
                isActiveCompare
                  ? _filter(
                      chartMetrics,
                      (el) =>
                        !!el &&
                        !_includes(
                          FILTER_CHART_METRICS_MAPPING_FOR_COMPARE,
                          el.id,
                        ),
                    )
                  : chartMetrics
              }
              title={[
                <EyeIcon
                  key='eye-icon'
                  aria-label={t('project.metricVis')}
                  className='h-5 w-5'
                />,
              ]}
              labelExtractor={(pair) => {
                if (!pair) return null

                const { label, id: pairID, active, conflicts } = pair

                const conflicted = isConflicted(conflicts)

                if (pairID === CHART_METRICS_MAPPING.customEvents) {
                  if (_isEmpty(customs)) {
                    return (
                      <span className='flex cursor-not-allowed items-center p-2'>
                        <ProhibitIcon className='mr-2 h-4 w-4' />
                        {label}
                      </span>
                    )
                  }

                  return (
                    <CustomEventsSubmenu
                      label={label}
                      chartMetricsCustomEvents={chartMetricsCustomEvents}
                      switchCustomEventChart={switchCustomEventChart}
                    />
                  )
                }

                const checkbox = (
                  <Checkbox
                    classes={{
                      label: 'p-2',
                    }}
                    label={label}
                    disabled={conflicted || pair.disabled}
                    checked={active}
                    onChange={() => {
                      switchTrafficChartMetric(pairID, conflicts)
                    }}
                  />
                )

                if (pair.disabled && pair.disabledTooltip) {
                  return (
                    <Tooltip
                      text={pair.disabledTooltip}
                      tooltipNode={checkbox}
                    />
                  )
                }

                return checkbox
              }}
              buttonClassName='!p-1.5 rounded-md border border-transparent hover:border-gray-300 hover:bg-white hover:dark:border-slate-700/80 hover:dark:bg-slate-950 dark:focus:ring-slate-300'
              selectItemClassName='p-0'
              keyExtractor={(pair) => pair?.id || ''}
              onSelect={(pair, e) => {
                if (!pair) return

                const { id: pairID, conflicts } = pair
                e?.stopPropagation()
                e?.preventDefault()

                if (pair.disabled) {
                  return
                }

                if (pairID !== CHART_METRICS_MAPPING.customEvents) {
                  switchTrafficChartMetric(pairID, conflicts)
                }
              }}
              chevron='mini'
              headless
            />
            <ChartTypeSwitcher
              onSwitch={setChartTypeOnClick}
              type={chartType}
            />
            <Suspense fallback={null}>
              <HasImportedIndicator />
            </Suspense>
          </div>
          {!_isEmpty(overall) ? (
            <motion.div
              initial='hidden'
              animate='visible'
              variants={metricCardsContainerVariants}
              className='mb-5 flex flex-wrap justify-center gap-5 lg:justify-start'
            >
              <MetricCards
                overall={overall}
                overallCompare={overallCompare}
                activePeriodCompare={activePeriodCompare}
              />
              {!_isEmpty(customMetricsQuery.data?.data)
                ? _map(
                    customMetricsQuery.data?.data,
                    ({ key, current, previous }) => (
                      <React.Fragment key={key}>
                        <MetricCard
                          label={t('project.metrics.xAvg', { x: key })}
                          value={current.avg}
                          change={current.avg - previous.avg}
                          goodChangeDirection='down'
                          valueMapper={(value, type) =>
                            `${type === 'badge' && value > 0 ? '+' : ''}${nLocaleFormatter(value)}`
                          }
                        />
                        <MetricCard
                          label={t('project.metrics.xTotal', { x: key })}
                          value={current.sum}
                          change={current.sum - previous.sum}
                          goodChangeDirection='down'
                          valueMapper={(value, type) =>
                            `${type === 'badge' && value > 0 ? '+' : ''}${nLocaleFormatter(value)}`
                          }
                        />
                      </React.Fragment>
                    ),
                  )
                : null}
            </motion.div>
          ) : null}
          {!checkIfAllMetricsAreDisabled && !_isEmpty(chartData.x) ? (
            <div
              onContextMenu={(e) => handleChartContextMenu(e, chartData.x)}
              className='relative'
            >
              <TrafficChart
                chartData={chartData}
                timeBucket={timeBucket}
                activeChartMetrics={activeChartMetrics}
                applyRegions={!_includes(noRegionPeriods, activePeriod?.period)}
                timeFormat={timeFormat}
                rotateXAxis={rotateXAxis}
                chartType={chartType}
                customEventsChartData={customEventsChartData}
                dataChartCompare={dataChartCompare}
                onZoom={onMainChartZoom}
                enableZoom={shouldEnableZoom}
                dataNames={dataNames}
                className='mt-5 h-80 md:mt-0 [&_svg]:overflow-visible!'
                annotations={filteredAnnotations}
                period={activePeriod?.period}
                onDataPointClick={handleDataPointClick}
                timezone={timezone}
              />
            </div>
          ) : null}
        </div>
        <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
          <BreakdownPanel
            dataType='traffic'
            panelId='location'
            name={t('project.location')}
            icon={panelIconMapping.country}
            subTabs={locationSubTabs}
            rowMapper={locationRowMapper}
          />
          <BreakdownPanel
            dataType='traffic'
            panelId='pages'
            name={t('project.pages')}
            icon={panelIconMapping.page}
            subTabs={pagesSubTabs}
            rowMapper={pagesRowMapper}
          />
          <BreakdownPanel
            dataType='traffic'
            panelId='devices'
            name={t('project.devices')}
            icon={panelIconMapping.os}
            subTabs={devicesSubTabs}
            rowMapper={devicesRowMapper}
            capitalize={['device']}
            getVersionFilterLink={(parent, version, subTabId) =>
              getVersionFilterLink(
                parent,
                version,
                subTabId === 'browser' ? 'browser' : 'os',
              )
            }
          />
          <BreakdownPanel
            dataType='traffic'
            panelId='traffic-sources'
            name={t('project.trafficSources')}
            icon={panelIconMapping.referrer}
            subTabs={sourcesSubTabs}
            rowMapper={sourcesRowMapper}
            transformEntries={sourcesTransformEntries}
            getFilterLink={sourcesGetFilterLink}
          />
          <BreakdownPanel
            dataType='traffic'
            panelId='network'
            name={t('project.network')}
            icon={panelIconMapping.isp}
            subTabs={networkSubTabs}
            rowMapper={networkRowMapper}
          />
          {/* Combined Metadata Panel - holds both pageview properties and custom event metadata */}
          <CombinedMetadataPanel
            title={t('project.metadata')}
            property={{
              metadataKeys: _keys(properties),
              getMetadataValues: getPropertyMetadata,
              activeKey: metadataActiveKeys.property,
              onKeyChange: (key) =>
                setMetadataActiveKeys((prev) => ({ ...prev, property: key })),
            }}
            customEvent={{
              metadataKeys: _keys(customs),
              getMetadataValues: getCustomEventMetadata,
              activeKey: metadataActiveKeys.customEvent,
              onKeyChange: (key) =>
                setMetadataActiveKeys((prev) => ({
                  ...prev,
                  customEvent: key,
                })),
            }}
            getFilterLink={getFilterLink}
            chartData={chartData}
            filters={filters}
          />
          <CustomEvents
            customs={customs}
            filters={filters}
            getFilterLink={getFilterLink}
            chartData={chartData}
            getCustomEventMetadata={getCustomEventMetadata}
          />
        </div>
        <AnnotationModal
          isOpened={isAnnotationModalOpen}
          onClose={closeAnnotationModal}
          onSubmit={annotationToEdit ? onAnnotationUpdate : onAnnotationCreate}
          onDelete={annotationToEdit ? onAnnotationDelete : undefined}
          loading={annotationActionLoading}
          annotation={annotationToEdit}
          defaultDate={annotationModalDate}
          allowedToManage={allowedToManage}
        />
        <ChartContextMenu
          isOpen={contextMenu.isOpen}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          onAddAnnotation={() => {
            openAnnotationModal(contextMenu.date || undefined)
          }}
          onEditAnnotation={
            contextMenu.annotation
              ? () =>
                  openAnnotationModal(
                    contextMenu.annotation?.date,
                    contextMenu.annotation!,
                  )
              : undefined
          }
          onDeleteAnnotation={
            contextMenu.annotation
              ? () => {
                  onAnnotationDelete(contextMenu.annotation!)
                }
              : undefined
          }
          onExploreSessions={
            contextMenu.date
              ? () => {
                  const date = dayjs.tz(
                    contextMenu.date,
                    'YYYY-MM-DD',
                    timezone,
                  )
                  if (!date.isValid()) return

                  setSessionsDrawer({
                    from: date.startOf('day').toISOString(),
                    to: date.endOf('day').toISOString(),
                    label: date.format('dddd, MMM D, YYYY'),
                  })
                }
              : undefined
          }
          existingAnnotation={contextMenu.annotation}
          allowedToManage={allowedToManage}
        />
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
        />
      </div>
    </>
  )
}

const TrafficView = TrafficViewWrapper

export default TrafficView

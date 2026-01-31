import cx from 'clsx'
import _filter from 'lodash/filter'
import _includes from 'lodash/includes'
import _isEmpty from 'lodash/isEmpty'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import _some from 'lodash/some'
import { ProhibitIcon, EyeIcon } from '@phosphor-icons/react'
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  lazy,
  Suspense,
  useCallback,
  use,
  Component,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  useNavigate,
  Link,
  useSearchParams,
  useLoaderData,
  useRevalidator,
} from 'react-router'
import { toast } from 'sonner'

import type {
  TrafficLogResponse as ServerTrafficLogResponse,
  OverallObject as ServerOverallObject,
} from '~/api/api.server'
import {
  useCustomEventsMetadataProxy,
  usePropertyMetadataProxy,
  useGSCKeywordsProxy,
  useRevenueProxy,
} from '~/hooks/useAnalyticsProxy'
import { useAnnotations } from '~/hooks/useAnnotations'
import { TRAFFIC_PANELS_ORDER, chartTypes, isSelfhosted } from '~/lib/constants'
import { CountryEntry, Entry } from '~/lib/models/Entry'
import { OverallObject } from '~/lib/models/Project'
import AnnotationModal from '~/modals/AnnotationModal'
import CustomEventsSubmenu from '~/pages/Project/tabs/Traffic/CustomEventsSubmenu'
import CustomMetrics from '~/pages/Project/tabs/Traffic/CustomMetrics'
import {
  MetricCard,
  MetricCards,
} from '~/pages/Project/tabs/Traffic/MetricCards'
import PageLinkRow from '~/pages/Project/tabs/Traffic/PageLinkRow'
import RefRow from '~/pages/Project/tabs/Traffic/RefRow'
import { TrafficChart } from '~/pages/Project/tabs/Traffic/TrafficChart'
import TrafficHeaderActions from '~/pages/Project/tabs/Traffic/TrafficHeaderActions'
import UserFlow from '~/pages/Project/tabs/Traffic/UserFlow'
import CCRow from '~/pages/Project/View/components/CCRow'
import { ChartContextMenu } from '~/pages/Project/View/components/ChartContextMenu'
import DashboardHeader from '~/pages/Project/View/components/DashboardHeader'
import Filters from '~/pages/Project/View/components/Filters'
import NoEvents from '~/pages/Project/View/components/NoEvents'
import WaitingForAnEvent from '~/pages/Project/View/components/WaitingForAnEvent'
import {
  Customs,
  TrafficMeta,
  Params,
  ProjectView,
  ProjectViewCustomEvent,
  Properties,
} from '~/pages/Project/View/interfaces/traffic'
import {
  Panel,
  CustomEvents,
  MetadataKeyPanel,
} from '~/pages/Project/View/Panels'
import { FILTER_CHART_METRICS_MAPPING_FOR_COMPARE } from '~/pages/Project/View/utils/filters'
import {
  useViewProjectContext,
  useRefreshTriggers,
} from '~/pages/Project/View/ViewProject'
import {
  getFormatDate,
  panelIconMapping,
  noRegionPeriods,
  CHART_METRICS_MAPPING,
  getDeviceRowMapper,
  onCSVExportClick,
} from '~/pages/Project/View/ViewProject.helpers'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import { useTheme } from '~/providers/ThemeProvider'
import type { ProjectLoaderData } from '~/routes/projects.$id'
import Checkbox from '~/ui/Checkbox'
import Dropdown from '~/ui/Dropdown'
import Loader from '~/ui/Loader'
import LoadingBar from '~/ui/LoadingBar'
import { getLocaleDisplayName, nLocaleFormatter } from '~/utils/generic'
import { groupRefEntries } from '~/utils/referrers'
import routes from '~/utils/routes'
import { LoaderView } from '../../View/components/LoaderView'
import { ChartTypeSwitcher } from '../../View/components/ChartTypeSwitcher'

const InteractiveMap = lazy(
  () => import('~/pages/Project/View/components/InteractiveMap'),
)

interface PanelsData {
  types?: string[]
  data: Params
  customs?: Customs
  properties?: Properties
  meta?: TrafficMeta[]
}

type KeywordEntry = Entry & {
  impressions: number
  position: number
  ctr: number
}

interface TrafficViewProps {
  tnMapping: Record<string, string>
  customMetrics: ProjectViewCustomEvent[]
  onRemoveCustomMetric: (metricId: string) => void
  resetCustomMetrics: () => void
  mode: 'periodical' | 'cumulative'
  // Segment/View props
  projectViews: ProjectView[]
  projectViewsLoading: boolean | null
  loadProjectViews: (forced?: boolean) => void
  setProjectViewToUpdate: (view: ProjectView | undefined) => void
  setIsAddAViewOpened: (value: boolean) => void
  onCustomMetric: (metrics: ProjectViewCustomEvent[]) => void
}

interface DeferredTrafficData {
  trafficData: ServerTrafficLogResponse | null
  overallStats: Record<string, ServerOverallObject> | null
  trafficCompareData: ServerTrafficLogResponse | null
  overallCompareStats: Record<string, ServerOverallObject> | null
  customEventsData: { chart?: { events?: Record<string, unknown> } } | null
}

interface TrafficErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class TrafficErrorBoundary extends Component<
  { children: ReactNode },
  TrafficErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): TrafficErrorBoundaryState {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className='flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-8 dark:border-red-800/50 dark:bg-red-900/20'>
          <p className='text-center text-lg font-semibold text-red-600 dark:text-red-400'>
            Failed to load traffic data
          </p>
          <p className='mt-2 text-center text-sm text-red-500 dark:text-red-300'>
            {this.state.error?.message ||
              'An unexpected error occurred. Please try again.'}
          </p>
          <button
            type='button'
            onClick={() => window.location.reload()}
            className='mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-hidden'
          >
            Reload page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

function TrafficDataResolver({
  children,
}: {
  children: (data: DeferredTrafficData) => React.ReactNode
}) {
  const {
    trafficData: trafficDataPromise,
    overallStats: overallStatsPromise,
    trafficCompareData: trafficComparePromise,
    overallCompareStats: overallComparePromise,
    customEventsData: customEventsPromise,
  } = useLoaderData<ProjectLoaderData>()

  const trafficData = trafficDataPromise ? use(trafficDataPromise) : null
  const overallStats = overallStatsPromise ? use(overallStatsPromise) : null
  const trafficCompareData = trafficComparePromise
    ? use(trafficComparePromise)
    : null
  const overallCompareStats = overallComparePromise
    ? use(overallComparePromise)
    : null
  const customEventsData = customEventsPromise ? use(customEventsPromise) : null

  return (
    <>
      {children({
        trafficData,
        overallStats,
        trafficCompareData,
        overallCompareStats,
        customEventsData,
      })}
    </>
  )
}

function TrafficViewWrapper(props: TrafficViewProps) {
  return (
    <TrafficErrorBoundary>
      <Suspense fallback={<LoaderView />}>
        <TrafficDataResolver>
          {(deferredData) => (
            <TrafficViewInner {...props} deferredData={deferredData} />
          )}
        </TrafficDataResolver>
      </Suspense>
    </TrafficErrorBoundary>
  )
}

interface TrafficViewInnerProps extends TrafficViewProps {
  deferredData: DeferredTrafficData
}

const TrafficViewInner = ({
  tnMapping,
  customMetrics,
  onRemoveCustomMetric,
  resetCustomMetrics,
  mode: _mode,
  projectViews,
  projectViewsLoading,
  loadProjectViews,
  setProjectViewToUpdate,
  setIsAddAViewOpened,
  onCustomMetric,
  deferredData,
}: TrafficViewInnerProps) => {
  const { id, project, allowedToManage } = useCurrentProject()
  const revalidator = useRevalidator()
  const { fetchMetadata: fetchCustomEventsMetadata } =
    useCustomEventsMetadataProxy()
  const { fetchMetadata: fetchPropertyMetadata } = usePropertyMetadataProxy()
  const { fetchKeywords: fetchGSCKeywords } = useGSCKeywordsProxy()
  const { fetchRevenueStatus, fetchRevenueData } = useRevenueProxy()
  const { trafficRefreshTrigger } = useRefreshTriggers()
  const {
    timezone,
    period,
    dateRange,
    filters,
    timeFormat,
    timeBucket,
    activePeriod,
    // Comparison state from context
    isActiveCompare,
    activePeriodCompare,
    // Chart state from context
    chartType,
    setChartTypeOnClick,
    rotateXAxis,
    // Zoom state from context
    onMainChartZoom,
    shouldEnableZoom,
    // Filter functions from context
    getFilterLink,
    getVersionFilterLink,
    isMapFullscreen,
    setIsMapFullscreen,
    fullscreenMapRef,
  } = useViewProjectContext()
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const { theme } = useTheme()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Track if we've ever shown actual content to prevent NoEvents flash during exit animation
  const hasShownContentRef = useRef(false)

  // Annotations hook
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

  const panelsData: PanelsData = useMemo(() => {
    if (deferredData.trafficData) {
      return {
        types: _keys(deferredData.trafficData.params || {}),
        data: deferredData.trafficData.params || {},
        customs: deferredData.trafficData.customs,
        properties: deferredData.trafficData.properties,
        meta: deferredData.trafficData.meta,
      }
    }
    return { data: {} }
  }, [deferredData.trafficData])

  const baseChartData = useMemo(
    () => deferredData.trafficData?.chart || {},
    [deferredData.trafficData],
  )

  const overall: Partial<OverallObject> = useMemo(() => {
    if (deferredData.overallStats && id) {
      return deferredData.overallStats[id] || {}
    }
    return {}
  }, [deferredData.overallStats, id])

  const dataLoading = revalidator.state === 'loading'

  // Derive compare data from loader
  const overallCompare: Partial<OverallObject> = useMemo(() => {
    if (deferredData.overallCompareStats && id) {
      return deferredData.overallCompareStats[id] || {}
    }
    return {}
  }, [deferredData.overallCompareStats, id])

  const dataChartCompare = useMemo(
    () => deferredData.trafficCompareData?.chart || {},
    [deferredData.trafficCompareData],
  )

  // Derive custom events data from loader
  const customEventsChartData = useMemo(
    () =>
      (deferredData.customEventsData?.chart?.events || {}) as Record<
        string,
        string[]
      >,
    [deferredData.customEventsData],
  )

  // Revenue state (still fetched client-side for now)
  const [isRevenueConnected, setIsRevenueConnected] = useState(false)
  const [revenueOverlay, setRevenueOverlay] = useState<{
    revenue: number[]
    refundsAmount: number[]
  } | null>(null)

  // Merge base chart with revenue data
  const chartData = useMemo(() => {
    if (revenueOverlay) {
      return { ...baseChartData, ...revenueOverlay }
    }
    return baseChartData
  }, [baseChartData, revenueOverlay])

  const isPanelsDataEmptyRaw = useMemo(
    () => _isEmpty(panelsData.data) && _isEmpty(panelsData.customs),
    [panelsData.data, panelsData.customs],
  )

  // Track when we've shown content to prevent NoEvents flash during exit animation
  if (!isPanelsDataEmptyRaw) {
    hasShownContentRef.current = true
  }

  // Don't show NoEvents if we've previously shown content (prevents flash during tab switch)
  const isPanelsDataEmpty = isPanelsDataEmptyRaw && !hasShownContentRef.current

  // Chart metrics state
  const [activeChartMetrics, setActiveChartMetrics] = useState({
    [CHART_METRICS_MAPPING.unique]: true,
    [CHART_METRICS_MAPPING.views]: false,
    [CHART_METRICS_MAPPING.sessionDuration]: false,
    [CHART_METRICS_MAPPING.bounce]: false,
    [CHART_METRICS_MAPPING.viewsPerUnique]: false,
    [CHART_METRICS_MAPPING.trendlines]: false,
    [CHART_METRICS_MAPPING.cumulativeMode]: false,
    [CHART_METRICS_MAPPING.customEvents]: false,
    [CHART_METRICS_MAPPING.revenue]: false,
  })
  // Get custom events from URL params (SSR-friendly)
  const activeChartMetricsCustomEvents = useMemo(() => {
    const param = searchParams.get('customEvents')
    return param ? param.split(',').filter(Boolean) : []
  }, [searchParams])

  // Panel active tabs
  const [panelsActiveTabs, setPanelsActiveTabs] = useState<{
    location: 'cc' | 'rg' | 'ct' | 'lc' | 'map'
    page: 'pg' | 'host' | 'userFlow' | 'entryPage' | 'exitPage'
    device: 'br' | 'os' | 'dv'
    source: 'ref' | 'so' | 'me' | 'ca' | 'te' | 'co' | 'keywords'
    customEvMetadata: string
    pageviewMetadata: string
  }>({
    location: 'cc',
    page: 'pg',
    device: 'br',
    source: 'ref',
    customEvMetadata: '',
    pageviewMetadata: '',
  })

  // GSC Keywords state
  const [keywords, setKeywords] = useState<KeywordEntry[]>([])
  const [keywordsLoading, setKeywordsLoading] = useState(false)
  const [keywordsNotConnected, setKeywordsNotConnected] = useState(false)

  const isMountedRef = useRef(true)

  // Cleanup on unmount
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

  // Version data mapping for browser/OS versions
  const createVersionDataMapping = useMemo(() => {
    const browserDataSource = panelsData.data?.brv
    const osDataSource = panelsData.data?.osv

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
  }, [panelsData.data?.brv, panelsData.data?.osv])

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
    [t, activeChartMetrics, isRevenueConnected],
  )

  const chartMetricsCustomEvents = useMemo(() => {
    if (!_isEmpty(panelsData.customs)) {
      return _map(_keys(panelsData.customs), (key) => ({
        id: key,
        label: key,
        active: _includes(activeChartMetricsCustomEvents, key),
      }))
    }
    return []
  }, [panelsData, activeChartMetricsCustomEvents])

  const dataNamesCustomEvents = useMemo(() => {
    if (!_isEmpty(panelsData.customs)) {
      return { ..._keys(panelsData.customs) }
    }
    return {}
  }, [panelsData])

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
      revenue: t('dashboard.revenue'),
      refundsAmount: t('dashboard.refunds'),
      ...dataNamesCustomEvents,
    }),
    [t, dataNamesCustomEvents],
  )

  const checkIfAllMetricsAreDisabled = useMemo(
    () =>
      !_some(
        { ...activeChartMetrics, ...activeChartMetricsCustomEvents },
        (value) => value,
      ),
    [activeChartMetrics, activeChartMetricsCustomEvents],
  )

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

  const setPanelTab = (panel: keyof typeof panelsActiveTabs, tab: string) => {
    setPanelsActiveTabs((prev) => ({
      ...prev,
      [panel]: tab,
    }))
  }

  // Load revenue data (the only remaining client-side fetch)
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

    // Early return if base chart x-axis is not yet available
    const chart = baseChartData as { x?: string[] }
    if (!Array.isArray(chart?.x) || chart.x.length === 0) {
      setRevenueOverlay(null)
      return
    }

    try {
      let from: string | undefined
      let to: string | undefined

      if (dateRange) {
        from = getFormatDate(dateRange[0])
        to = getFormatDate(dateRange[1])
      }

      const revResult = await fetchRevenueData(id, {
        period: period === 'custom' ? 'custom' : period,
        from,
        to,
        timezone,
        timeBucket,
      })
      const revChart = revResult?.chart
      const revX = revChart?.x || []
      const revY = revChart?.revenue || []
      const revRefunds = revChart?.refundsAmount || []

      // Align revenue series to the main traffic chart x-axis
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
    dateRange,
    period,
    timezone,
    timeBucket,
    baseChartData,
    id,
    fetchRevenueData,
  ])

  const getCustomEventMetadata = async (event: string) => {
    let result
    if (period === 'custom' && dateRange) {
      result = await fetchCustomEventsMetadata(id, event, {
        timeBucket,
        period: '',
        from: getFormatDate(dateRange[0]),
        to: getFormatDate(dateRange[1]),
        timezone,
      })
    } else {
      result = await fetchCustomEventsMetadata(id, event, {
        timeBucket,
        period,
        timezone,
      })
    }

    return result || { result: [] }
  }

  const _getPropertyMetadata = async (property: string) => {
    let result
    if (period === 'custom' && dateRange) {
      result = await fetchPropertyMetadata(id, property, {
        timeBucket,
        period: '',
        from: getFormatDate(dateRange[0]),
        to: getFormatDate(dateRange[1]),
        filters,
        timezone,
      })
    } else {
      result = await fetchPropertyMetadata(id, property, {
        timeBucket,
        period,
        filters,
        timezone,
      })
    }

    return result || { result: [] }
  }

  // Load GSC Keywords when the traffic sources panel switches to 'keywords'
  useEffect(() => {
    const loadKeywords = async () => {
      if (!project) return
      if (panelsActiveTabs.source !== 'keywords') return
      if (keywordsLoading) return

      // Skip if we already have keywords loaded and period/filters haven't changed
      if (keywords.length > 0) return

      setKeywordsLoading(true)
      try {
        let from
        let to

        if (dateRange) {
          from = getFormatDate(dateRange[0])
          to = getFormatDate(dateRange[1])
        }

        const data =
          period === 'custom' && dateRange
            ? await fetchGSCKeywords(id, { period: '', from, to, timezone })
            : await fetchGSCKeywords(id, { period, timezone })

        if (isMountedRef.current && data) {
          if (data.notConnected) {
            setKeywordsNotConnected(true)
            setKeywords([])
          } else {
            setKeywordsNotConnected(false)
            setKeywords(data.keywords || [])
          }
        }
      } catch (error) {
        console.error('[ERROR] Loading GSC keywords failed:', error)
        if (isMountedRef.current) {
          setKeywordsNotConnected(true)
          setKeywords([])
        }
      } finally {
        if (isMountedRef.current) {
          setKeywordsLoading(false)
        }
      }
    }

    loadKeywords()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelsActiveTabs.source, period, dateRange, timezone, id, project])

  // Load revenue data when revenue metric is enabled
  useEffect(() => {
    loadRevenueData()
  }, [loadRevenueData, fetchRevenueData])

  // Handle refresh trigger - use revalidator for URL-based data
  useEffect(() => {
    if (trafficRefreshTrigger > 0) {
      revalidator.revalidate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trafficRefreshTrigger])

  const exportTypes = useMemo(
    () => [
      {
        label: t('project.asCSV'),
        onClick: () =>
          onCSVExportClick(
            { data: panelsData.data, types: panelsData.types || [] },
            id,
            tnMapping,
            language,
          ),
      },
    ],
    [t, panelsData, id, tnMapping, language],
  )

  // Show waiting state if project has no traffic data yet
  if (!project?.isDataExists) {
    return <WaitingForAnEvent />
  }

  const headerRightContent = (
    <TrafficHeaderActions
      projectViews={projectViews}
      projectViewsLoading={projectViewsLoading}
      loadProjectViews={loadProjectViews}
      setProjectViewToUpdate={setProjectViewToUpdate}
      setIsAddAViewOpened={setIsAddAViewOpened}
      onCustomMetric={onCustomMetric}
      filters={filters}
      allowedToManage={allowedToManage}
      dataLoading={dataLoading}
      exportTypes={exportTypes}
      panelsData={panelsData}
    />
  )

  // Show no events if data is empty
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
    const countryData = panelsData.data?.cc || []
    const regionData = panelsData.data?.rg || []
    const total = countryData.reduce(
      (acc: number, curr: any) => acc + curr.count,
      0,
    )

    return createPortal(
      <Suspense
        fallback={
          <div className='flex h-full flex-1 items-center justify-center'>
            <div className='flex flex-col items-center gap-2'>
              <div className='h-8 w-8 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent' />
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
          onClick={(mapType, key) => {
            const link = getFilterLink(mapType, key)
            navigate(link)
          }}
          onFullscreenToggle={setIsMapFullscreen}
          isFullscreen={true}
        />
      </Suspense>,
      fullscreenMapRef.current,
    )
  }

  return (
    <>
      <DashboardHeader rightContent={headerRightContent} />
      {dataLoading && !isPanelsDataEmpty ? <LoadingBar /> : null}
      <div className={cx({ hidden: isPanelsDataEmpty })}>
        {!isPanelsDataEmpty ? (
          <Filters className='mb-3' tnMapping={tnMapping} />
        ) : null}
        <div className='relative overflow-hidden rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-800/25'>
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
                  if (_isEmpty(panelsData.customs)) {
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

                return (
                  <Checkbox
                    classes={{
                      label: 'p-2',
                    }}
                    label={label}
                    disabled={conflicted}
                    checked={active}
                    onChange={() => {
                      switchTrafficChartMetric(pairID, conflicts)
                    }}
                  />
                )
              }}
              buttonClassName='!p-1.5 rounded-md border border-transparent hover:border-gray-300 hover:bg-white hover:dark:border-slate-700/80 hover:dark:bg-slate-900 focus:dark:ring-gray-200'
              selectItemClassName='p-0'
              keyExtractor={(pair) => pair?.id || ''}
              onSelect={(pair, e) => {
                if (!pair) return

                const { id: pairID, conflicts } = pair
                e?.stopPropagation()
                e?.preventDefault()

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
          </div>
          {!_isEmpty(overall) ? (
            <div className='mb-5 flex flex-wrap justify-center gap-5 lg:justify-start'>
              <MetricCards
                overall={overall}
                overallCompare={overallCompare}
                activePeriodCompare={activePeriodCompare}
              />
              {!_isEmpty(panelsData.meta)
                ? _map(panelsData.meta, ({ key, current, previous }) => (
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
                  ))
                : null}
            </div>
          ) : null}
          {!checkIfAllMetricsAreDisabled && !_isEmpty(chartData) ? (
            <div
              onContextMenu={(e) =>
                handleChartContextMenu(e, (chartData as any).x)
              }
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
                annotations={annotations}
              />
            </div>
          ) : null}
        </div>
        <CustomMetrics
          metrics={customMetrics}
          onRemoveMetric={(metricId) => onRemoveCustomMetric(metricId)}
          resetMetrics={resetCustomMetrics}
        />
        <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
          {!_isEmpty(panelsData.types)
            ? _map(TRAFFIC_PANELS_ORDER, (type: string) => {
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

                    if (panelsActiveTabs.location === 'lc') {
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
                      key={panelsActiveTabs.location}
                      icon={panelIconMapping.cc}
                      id={panelsActiveTabs.location}
                      getFilterLink={getFilterLink}
                      name={t('project.location')}
                      tabs={locationTabs}
                      onTabChange={(tab) => setPanelTab('location', tab)}
                      activeTabId={panelsActiveTabs.location}
                      data={panelsData.data[panelsActiveTabs.location]}
                      rowMapper={rowMapper}
                      customRenderer={
                        panelsActiveTabs.location === 'map'
                          ? () => {
                              const countryData = panelsData.data?.cc || []
                              const regionData = panelsData.data?.rg || []
                              const total = countryData.reduce(
                                (acc, curr) => acc + curr.count,
                                0,
                              )

                              return (
                                <Suspense
                                  fallback={
                                    <div className='flex h-full items-center justify-center'>
                                      <div className='flex flex-col items-center gap-2'>
                                        <div className='h-8 w-8 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent'></div>
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
                                    onClick={(mapType, key) => {
                                      const link = getFilterLink(mapType, key)
                                      navigate(link)
                                    }}
                                    onFullscreenToggle={setIsMapFullscreen}
                                    isFullscreen={false}
                                  />
                                </Suspense>
                              )
                            }
                          : undefined
                      }
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
                      key={panelsActiveTabs.device}
                      icon={panelIconMapping.os}
                      id={panelsActiveTabs.device}
                      getFilterLink={getFilterLink}
                      name={t('project.devices')}
                      tabs={deviceTabs}
                      onTabChange={(tab) => setPanelTab('device', tab)}
                      activeTabId={panelsActiveTabs.device}
                      data={panelsData.data[panelsActiveTabs.device]}
                      rowMapper={getDeviceRowMapper(
                        panelsActiveTabs.device,
                        theme,
                        t,
                      )}
                      capitalize={panelsActiveTabs.device === 'dv'}
                      versionData={
                        panelsActiveTabs.device === 'br'
                          ? createVersionDataMapping.browserVersions
                          : panelsActiveTabs.device === 'os'
                            ? createVersionDataMapping.osVersions
                            : undefined
                      }
                      getVersionFilterLink={(parent, version) =>
                        getVersionFilterLink(
                          parent,
                          version,
                          panelsActiveTabs.device === 'br' ? 'br' : 'os',
                        )
                      }
                    />
                  )
                }

                if (type === 'pg') {
                  const pageTabs = [
                    { id: 'pg', label: t('project.mapping.pg') },
                    { id: 'entryPage', label: t('project.entryPages') },
                    { id: 'exitPage', label: t('project.exitPages') },
                    { id: 'userFlow', label: t('project.mapping.userFlow') },
                    {
                      id: 'host',
                      label: t('project.mapping.host'),
                    },
                  ]

                  return (
                    <Panel
                      key={panelsActiveTabs.page}
                      icon={panelIconMapping.pg}
                      id={panelsActiveTabs.page}
                      getFilterLink={getFilterLink}
                      rowMapper={({ name: entryName }) => {
                        if (!entryName) {
                          return (
                            <span className='italic'>
                              {panelsActiveTabs.page === 'host'
                                ? t('project.unknownHost')
                                : t('common.notSet')}
                            </span>
                          )
                        }

                        let decodedUri = entryName as string

                        try {
                          decodedUri = decodeURIComponent(entryName)
                        } catch {
                          // do nothing
                        }

                        // For page paths (pg tab), show with clickable link
                        if (
                          panelsActiveTabs.page === 'pg' &&
                          project?.websiteUrl
                        ) {
                          return (
                            <PageLinkRow
                              pagePath={decodedUri}
                              websiteUrl={project.websiteUrl}
                            />
                          )
                        }

                        return decodedUri
                      }}
                      name={t('project.pages')}
                      tabs={pageTabs}
                      onTabChange={(tab) => setPanelTab('page', tab)}
                      activeTabId={panelsActiveTabs.page}
                      data={panelsData.data[panelsActiveTabs.page]}
                      customRenderer={
                        panelsActiveTabs.page === 'userFlow'
                          ? () => (
                              <UserFlow
                                isReversed={false}
                                setReversed={() => {}}
                              />
                            )
                          : undefined
                      }
                    />
                  )
                }

                if (type === 'traffic-sources') {
                  const hasRefNameFilter = filters.some(
                    (f) => f.column === 'refn',
                  )
                  const trafficSourcesTabs = [
                    { id: 'ref', label: t('project.mapping.ref') },
                    !isSelfhosted && {
                      id: 'keywords',
                      label: t('project.mapping.keywords'),
                    },
                    [
                      { id: 'so', label: t('project.mapping.so') },
                      { id: 'me', label: t('project.mapping.me') },
                      { id: 'ca', label: t('project.mapping.ca') },
                      { id: 'te', label: t('project.mapping.te') },
                      { id: 'co', label: t('project.mapping.co') },
                    ],
                  ].filter((x) => !!x)

                  const getTrafficSourcesRowMapper = (activeTab: string) => {
                    if (activeTab === 'ref') {
                      // eslint-disable-next-line
                      return ({ name: entryName }: any) => (
                        <RefRow rowName={entryName} />
                      )
                    }
                    return ({ name: entryName }: any) =>
                      decodeURIComponent(entryName)
                  }

                  return (
                    <Panel
                      key={panelsActiveTabs.source}
                      icon={panelIconMapping.ref}
                      id={panelsActiveTabs.source}
                      getFilterLink={(column: string, value: string | null) => {
                        if (panelsActiveTabs.source === 'ref') {
                          // If grouped by name/domain (no refn filter active) -> filter by refn
                          return getFilterLink(
                            hasRefNameFilter || value === null ? 'ref' : 'refn',
                            value,
                          )
                        }
                        return getFilterLink(column, value)
                      }}
                      name={t('project.trafficSources')}
                      tabs={trafficSourcesTabs}
                      onTabChange={(tab) => setPanelTab('source', tab)}
                      activeTabId={panelsActiveTabs.source}
                      data={
                        panelsActiveTabs.source === 'keywords'
                          ? keywords
                          : panelsActiveTabs.source === 'ref'
                            ? (() => {
                                const raw = panelsData.data?.ref || []
                                return hasRefNameFilter
                                  ? (raw as unknown as Entry[])
                                  : (groupRefEntries(
                                      raw as any,
                                    ) as unknown as Entry[])
                              })()
                            : (panelsData.data[
                                panelsActiveTabs.source
                              ] as unknown as Entry[])
                      }
                      valuesHeaderName={
                        panelsActiveTabs.source === 'keywords'
                          ? t('project.clicks')
                          : undefined
                      }
                      rowMapper={getTrafficSourcesRowMapper(
                        panelsActiveTabs.source,
                      )}
                      disableRowClick={panelsActiveTabs.source === 'keywords'}
                      hidePercentageInDetails={
                        panelsActiveTabs.source === 'keywords'
                      }
                      detailsExtraColumns={
                        panelsActiveTabs.source === 'keywords'
                          ? [
                              {
                                header: t('project.impressions'),
                                render: (entry: any) => entry.impressions,
                                sortLabel: 'impressions',
                                getSortValue: (entry: any) =>
                                  Number(entry.impressions || 0),
                              },
                              {
                                header: t('project.position'),
                                render: (entry: any) => entry.position,
                                sortLabel: 'position',
                                getSortValue: (entry: any) =>
                                  Number(entry.position || 0),
                              },
                              {
                                header: t('project.ctr'),
                                render: (entry: any) => `${entry.ctr}%`,
                                sortLabel: 'ctr',
                                getSortValue: (entry: any) =>
                                  Number(entry.ctr || 0),
                              },
                            ]
                          : undefined
                      }
                      customRenderer={
                        panelsActiveTabs.source === 'keywords'
                          ? keywordsLoading
                            ? () => <Loader />
                            : keywordsNotConnected
                              ? () => (
                                  <div className='mt-4 text-center'>
                                    <p className='text-sm text-gray-800 dark:text-gray-200'>
                                      {['owner', 'admin'].includes(
                                        project?.role || '',
                                      )
                                        ? t('project.connectGsc')
                                        : t('project.gscConnectionRequired')}
                                    </p>
                                    {['owner', 'admin'].includes(
                                      project?.role || '',
                                    ) ? (
                                      <Link
                                        to={`${routes.project_settings.replace(':id', id)}?tab=integrations`}
                                        className='mt-2 inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-800 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'
                                      >
                                        {t('project.goToProjectSettings')}
                                      </Link>
                                    ) : null}
                                  </div>
                                )
                              : undefined
                          : undefined
                      }
                    />
                  )
                }

                return null
              })
            : null}
          {/* Custom Events Panel - Full Width */}
          {!_isEmpty(panelsData.customs) ? (
            <CustomEvents
              customs={panelsData.customs}
              filters={filters}
              getFilterLink={getFilterLink}
              chartData={chartData}
              getCustomEventMetadata={getCustomEventMetadata}
            />
          ) : null}
          {/* Custom Events Metadata Panel - Left */}
          {!_isEmpty(panelsData.customs) ? (
            <MetadataKeyPanel
              title={t('project.customEvMetadata')}
              metadataKeys={_keys(panelsData.customs)}
              getMetadataValues={getCustomEventMetadata}
              getFilterLink={getFilterLink}
              chartData={chartData}
              filters={filters}
              activeKey={panelsActiveTabs.customEvMetadata}
              onKeyChange={(key) => setPanelTab('customEvMetadata', key)}
              filterPrefix='ev:key'
              mode='customEvent'
            />
          ) : null}
          {/* Pageview Metadata Panel - Right */}
          {!_isEmpty(panelsData.properties) ? (
            <MetadataKeyPanel
              title={t('project.pageviewMetadata')}
              metadataKeys={_keys(panelsData.properties)}
              getMetadataValues={_getPropertyMetadata}
              getFilterLink={getFilterLink}
              chartData={chartData}
              filters={filters}
              activeKey={panelsActiveTabs.pageviewMetadata}
              onKeyChange={(key) => setPanelTab('pageviewMetadata', key)}
              filterPrefix='tag:key'
              mode='property'
            />
          ) : null}
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
          existingAnnotation={contextMenu.annotation}
          allowedToManage={allowedToManage}
        />
      </div>
    </>
  )
}

const TrafficView = TrafficViewWrapper

export default TrafficView

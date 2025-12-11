import SwetrixSDK from '@swetrix/sdk'
import cx from 'clsx'
import dayjs from 'dayjs'
import { AnimatePresence, motion } from 'framer-motion'
import _filter from 'lodash/filter'
import _find from 'lodash/find'
import _findIndex from 'lodash/findIndex'
import _includes from 'lodash/includes'
import _isEmpty from 'lodash/isEmpty'
import _isString from 'lodash/isString'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import _pickBy from 'lodash/pickBy'
import _replace from 'lodash/replace'
import _some from 'lodash/some'
import _uniqBy from 'lodash/uniqBy'
import {
  MoonIcon,
  SunIcon,
  ChevronLeftIcon,
  SearchIcon,
  BugIcon,
  GaugeIcon,
  Trash2Icon,
  UsersIcon,
  UserIcon,
  BellRingIcon,
  ChartNoAxesColumnIcon,
  FilterIcon,
  BookmarkIcon,
  PencilIcon,
  DownloadIcon,
  SettingsIcon,
  BanIcon,
  ChartColumnIcon,
  ChartLineIcon,
  EyeIcon,
  PercentIcon,
  KeyboardIcon,
  TargetIcon,
  PuzzleIcon,
  SparklesIcon,
  FlagIcon,
} from 'lucide-react'
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  createContext,
  useContext,
  lazy,
  Suspense,
} from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useTranslation } from 'react-i18next'
import { useNavigate, Link, useSearchParams, LinkProps } from 'react-router'
import { ClientOnly } from 'remix-utils/client-only'
import { toast } from 'sonner'

import {
  getProjectData,
  getOverallStats,
  getPerfData,
  getProjectDataCustomEvents,
  getTrafficCompareData,
  getPerformanceCompareData,
  getCustomEventsMetadata,
  addFunnel,
  updateFunnel,
  deleteFunnel,
  getFunnelData,
  getPerformanceOverallStats,
  getPropertyMetadata,
  getProjectViews,
  deleteProjectView,
  getFunnels,
  getGSCKeywords,
  getAnnotations,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation,
  getProfiles,
  getProfile,
  getProfileSessions,
} from '~/api'
import EventsRunningOutBanner from '~/components/EventsRunningOutBanner'
import Footer from '~/components/Footer'
import Header from '~/components/Header'
import useSize from '~/hooks/useSize'
import { changeLanguage } from '~/i18n'
import {
  tbPeriodPairs,
  DEFAULT_TIMEZONE,
  CDN_URL,
  isDevelopment,
  timeBucketToDays,
  MAX_MONTHS_IN_PAST,
  PROJECT_TABS,
  TimeFormat,
  chartTypes,
  TRAFFIC_PANELS_ORDER,
  PERFORMANCE_PANELS_ORDER,
  isSelfhosted,
  tbPeriodPairsCompare,
  PERIOD_PAIRS_COMPARE,
  FILTERS_PERIOD_PAIRS,
  LS_IS_ACTIVE_COMPARE_KEY,
  TITLE_SUFFIX,
  MARKETPLACE_URL,
  TBPeriodPairsProps,
  ERROR_PERIOD_PAIRS,
  FUNNELS_PERIOD_PAIRS,
  type Period,
  type TimeBucket,
  VALID_PERIODS,
  VALID_TIME_BUCKETS,
  whitelist,
  languages,
  languageFlag,
} from '~/lib/constants'
import { CountryEntry, Entry } from '~/lib/models/Entry'
import {
  Funnel,
  AnalyticsFunnel,
  OverallObject,
  OverallPerformanceObject,
  Session,
  Annotation,
  Profile,
  ProfileDetails,
} from '~/lib/models/Project'
import AnnotationModal from '~/modals/AnnotationModal'
import NewFunnel from '~/modals/NewFunnel'
import ViewProjectHotkeys from '~/modals/ViewProjectHotkeys'
import { useAuth } from '~/providers/AuthProvider'
import { useTheme } from '~/providers/ThemeProvider'
import Checkbox from '~/ui/Checkbox'
import DatePicker from '~/ui/Datepicker'
import Dropdown from '~/ui/Dropdown'
import Flag from '~/ui/Flag'
import Loader from '~/ui/Loader'
import LoadingBar from '~/ui/LoadingBar'
import Select from '~/ui/Select'
import { Text } from '~/ui/Text'
import { trackCustom } from '~/utils/analytics'
import { periodToCompareDate } from '~/utils/compareConvertDate'
import {
  getTimeFromSeconds,
  getStringFromTime,
  getLocaleDisplayName,
  nLocaleFormatter,
  removeDuplicates,
} from '~/utils/generic'
import { getItem, setItem } from '~/utils/localstorage'
import { groupRefEntries } from '~/utils/referrers'
import routes from '~/utils/routes'

import { useCurrentProject, useProjectPassword } from '../../../providers/CurrentProjectProvider'
import ProjectAlertsView from '../Alerts/View'
import AskAIView from '../AskAI'
import ErrorsView from '../Errors/View/ErrorsView'
import FeatureFlagsView from '../FeatureFlags/View'
import GoalsView from '../Goals/View'
import SessionsView from '../Sessions/View/SessionsView'

import AddAViewModal from './components/AddAViewModal'
import CCRow from './components/CCRow'
import { ChartContextMenu } from './components/ChartContextMenu'
import { ChartManagerProvider } from './components/ChartManager'
import CustomEventsSubmenu from './components/CustomEventsSubmenu'
import CustomMetrics from './components/CustomMetrics'
import Filters from './components/Filters'
const CaptchaView = lazy(() => import('./components/CaptchaView'))
import { FunnelChart } from './components/FunnelChart'
import FunnelsList from './components/FunnelsList'
const InteractiveMap = lazy(() => import('./components/InteractiveMap'))
// Keywords list now reuses shared Panel UI; dedicated component removed from render
import LiveVisitorsDropdown from './components/LiveVisitorsDropdown'
import LockedDashboard from './components/LockedDashboard'
import { MetricCard, MetricCards, PerformanceMetricCards } from './components/MetricCards'
import NoEvents from './components/NoEvents'
import { PerformanceChart } from './components/PerformanceChart'
import ProjectSidebar from './components/ProjectSidebar'
import { RefreshStatsButton } from './components/RefreshStatsButton'
import RefRow from './components/RefRow'
import SearchFilters, { getFiltersUrlParams } from './components/SearchFilters'
import TBPeriodSelector from './components/TBPeriodSelector'
import { TrafficChart } from './components/TrafficChart'
import { UserDetails } from './components/UserDetails'
import UserFlow from './components/UserFlow'
import { Users, UsersFilter } from './components/Users'
import WaitingForAnEvent from './components/WaitingForAnEvent'
import {
  Customs,
  Filter,
  TrafficMeta,
  Params,
  ProjectView,
  ProjectViewCustomEvent,
  Properties,
  TrafficLogResponse,
} from './interfaces/traffic'
import { Panel, Metadata as MetadataGeneric, type CustomTab } from './Panels'
import { FILTER_CHART_METRICS_MAPPING_FOR_COMPARE, parseFilters } from './utils/filters'
import {
  onCSVExportClick,
  getFormatDate,
  panelIconMapping,
  typeNameMapping,
  noRegionPeriods,
  CHART_METRICS_MAPPING,
  CHART_METRICS_MAPPING_PERF,
  SHORTCUTS_TABS_LISTENERS,
  SHORTCUTS_TABS_MAP,
  SHORTCUTS_GENERAL_LISTENERS,
  SHORTCUTS_TIMEBUCKETS_LISTENERS,
  CHART_MEASURES_MAPPING_PERF,
  getDeviceRowMapper,
} from './ViewProject.helpers'

const SESSIONS_TAKE = 30

/**
 * Pixel distance threshold for snapping to nearby annotations when clicking on the chart.
 * If a click is within this many pixels of an annotation line, that annotation will be selected.
 */
const ANNOTATION_CLICK_THRESHOLD_PX = 30

/** Chart metrics derived from SVG/DOM layout */
interface ChartMetrics {
  /** X coordinate where the chart plotting area begins (left edge of x-axis) */
  chartAreaStart: number
  /** Width of the chart plotting area */
  chartAreaWidth: number
}

/**
 * Traverses up the DOM tree from a target element to find an annotation line element.
 * @param target - The element where the click/event originated
 * @param boundary - The boundary element to stop traversal (usually event.currentTarget)
 * @returns The annotation line element if found, null otherwise
 */
const findAnnotationLineElement = (target: Element, boundary: Element): Element | null => {
  let element: Element | null = target

  while (element && element !== boundary) {
    if (element.classList?.contains('annotation-line')) {
      return element
    }
    element = element.parentElement
  }

  return null
}

/**
 * Extracts the annotation ID from an annotation line element's class list.
 * Annotation elements have classes in the format "annotation-line annotation-id-{uuid}".
 * @param element - The annotation line DOM element
 * @returns The annotation ID if found, null otherwise
 */
const getAnnotationIdFromElement = (element: Element): string | null => {
  const classes = element.classList
  for (const className of classes) {
    if (className.startsWith('annotation-id-')) {
      return className.replace('annotation-id-', '')
    }
  }
  return null
}

/**
 * Calculates the chart area metrics by examining the SVG's x-axis domain path.
 * Falls back to sensible defaults if the DOM elements cannot be queried.
 *
 * @param svg - The SVG element containing the chart
 * @param chartContainer - The billboard.js chart container element
 * @returns Chart metrics with start position and width of the plotting area
 *
 * Fallback rationale:
 * - chartAreaStart defaults to 50px (typical left margin for y-axis labels)
 * - chartAreaWidth defaults to svgWidth - 70px (accounts for left margin + right padding)
 */
const calculateChartMetrics = (svg: SVGSVGElement, chartContainer: HTMLElement): ChartMetrics => {
  const svgRect = svg.getBoundingClientRect()

  // Default fallbacks based on typical billboard.js chart layout
  let chartAreaStart = 50
  let chartAreaWidth = svgRect.width - 70

  // Try to get exact boundaries from the x-axis domain path (the axis line)
  const xAxisPath = chartContainer.querySelector('.bb-axis-x path.domain') as SVGPathElement | null
  if (xAxisPath) {
    const pathBBox = xAxisPath.getBBox()
    chartAreaStart = pathBBox.x
    chartAreaWidth = pathBBox.width
  }

  return { chartAreaStart, chartAreaWidth }
}

/**
 * Calculates the date corresponding to a click position on the chart.
 *
 * @param clientX - The X coordinate of the click event (event.clientX)
 * @param svgRect - The bounding rectangle of the SVG element
 * @param xAxisData - Array of date strings representing x-axis values
 * @param chartMetrics - The computed chart area metrics
 * @returns The date string in YYYY-MM-DD format for the clicked position
 */
const calculateDateFromPosition = (
  clientX: number,
  svgRect: DOMRect,
  xAxisData: string[],
  chartMetrics: ChartMetrics,
): string => {
  const clickX = clientX - svgRect.left
  const { chartAreaStart, chartAreaWidth } = chartMetrics

  // Calculate relative position within the chart area (clamped to [0, 1])
  const relativeX = Math.max(0, clickX - chartAreaStart)
  const percentage = Math.min(1, relativeX / chartAreaWidth)

  // Map percentage to index in xAxisData
  const index = Math.round(percentage * (xAxisData.length - 1))
  const clampedIndex = Math.max(0, Math.min(xAxisData.length - 1, index))

  return dayjs(xAxisData[clampedIndex]).format('YYYY-MM-DD')
}

/**
 * Finds the closest annotation to a click position within the pixel threshold.
 *
 * @param clickX - The X coordinate of the click relative to the SVG's left edge
 * @param annotations - Array of all annotations
 * @param xAxisData - Array of date strings representing x-axis values
 * @param chartMetrics - The computed chart area metrics
 * @param pixelThreshold - Maximum distance in pixels to consider an annotation as "close"
 * @returns The closest annotation if within threshold, null otherwise
 */
const findClosestAnnotation = (
  clickX: number,
  annotations: Annotation[],
  xAxisData: string[],
  chartMetrics: ChartMetrics,
  pixelThreshold: number,
): Annotation | null => {
  const { chartAreaStart, chartAreaWidth } = chartMetrics

  let closestAnnotation: Annotation | null = null
  let closestDistance = Infinity

  for (const annotation of annotations) {
    const annotationDate = dayjs(annotation.date).format('YYYY-MM-DD')

    // Find the index of this annotation's date in xAxisData
    const annotationIndex = xAxisData.findIndex((xDate) => dayjs(xDate).format('YYYY-MM-DD') === annotationDate)

    if (annotationIndex !== -1) {
      // Calculate the x position of this annotation on the chart
      const annotationPercentage = annotationIndex / (xAxisData.length - 1)
      const annotationX = chartAreaStart + annotationPercentage * chartAreaWidth
      const distance = Math.abs(clickX - annotationX)

      if (distance < pixelThreshold && distance < closestDistance) {
        closestDistance = distance
        closestAnnotation = annotation
      }
    }
  }

  return closestAnnotation
}

interface ViewProjectContextType {
  // States
  timezone: string
  dateRange: Date[] | null
  isLoading: boolean
  timeBucket: string
  period: string
  activePeriod: TBPeriodPairsProps | undefined
  periodPairs: TBPeriodPairsProps[]
  timeFormat: '12-hour' | '24-hour'
  size: ReturnType<typeof useSize>[1]
  dataLoading: boolean
  activeTab: keyof typeof PROJECT_TABS
  filters: Filter[]
  customPanelTabs: CustomTab[]
  captchaRefreshTrigger: number
  goalsRefreshTrigger: number
  featureFlagsRefreshTrigger: number
  sessionsRefreshTrigger: number

  // Functions
  updatePeriod: (newPeriod: { period: Period; label?: string }) => void
  updateTimebucket: (newTimebucket: TimeBucket) => void

  // Refs
  refCalendar: React.RefObject<any>
}

const defaultViewProjectContext: ViewProjectContextType = {
  timezone: DEFAULT_TIMEZONE,
  dateRange: null,
  isLoading: false,
  timeBucket: '',
  period: '7d',
  activePeriod: undefined,
  periodPairs: [],
  timeFormat: TimeFormat['12-hour'],
  size: { width: 0, height: 0 } as any,
  dataLoading: false,
  activeTab: PROJECT_TABS.traffic,
  filters: [],
  customPanelTabs: [],
  captchaRefreshTrigger: 0,
  goalsRefreshTrigger: 0,
  featureFlagsRefreshTrigger: 0,
  sessionsRefreshTrigger: 0,
  updatePeriod: () => {},
  updateTimebucket: (_newTimebucket) => {},
  refCalendar: { current: null } as any,
}

export const ViewProjectContext = createContext<ViewProjectContextType>(defaultViewProjectContext)

export const useViewProjectContext = () => {
  const context = useContext(ViewProjectContext)
  return context
}

const ChartTypeSwitcher = ({
  className,
  onSwitch,
  type,
}: {
  className?: string
  onSwitch: (type: 'line' | 'bar') => void
  type: 'line' | 'bar'
}) => {
  const { t } = useTranslation('common')

  return (
    <div className={className}>
      {type === chartTypes.bar ? (
        <button
          type='button'
          title={t('project.lineChart')}
          onClick={() => onSwitch(chartTypes.line)}
          className='relative rounded-md border border-transparent bg-gray-50 p-2 hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:bg-slate-900 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200'
        >
          <ChartLineIcon className='h-5 w-5 text-gray-700 dark:text-gray-50' />
        </button>
      ) : null}
      {type === chartTypes.line ? (
        <button
          type='button'
          title={t('project.barChart')}
          onClick={() => onSwitch(chartTypes.bar)}
          className='relative rounded-md border border-transparent bg-gray-50 p-2 hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:bg-slate-900 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200'
        >
          <ChartColumnIcon className='h-5 w-5 text-gray-700 dark:text-gray-50' />
        </button>
      ) : null}
    </div>
  )
}

const ViewProjectContent = () => {
  const { id, project, preferences, updatePreferences, extensions, mergeProject, allowedToManage, liveVisitors } =
    useCurrentProject()
  const projectPassword = useProjectPassword(id)

  const { theme, setTheme } = useTheme()

  const { isAuthenticated, user, isLoading: authLoading } = useAuth()

  const { timezone = DEFAULT_TIMEZONE } = user || {}

  const {
    t,
    i18n: { language },
  } = useTranslation('common')

  const [customPanelTabs, setCustomPanelTabs] = useState<CustomTab[]>([])
  const [sdkInstance, setSdkInstance] = useState<SwetrixSDK | null>(null)

  const [activeChartMetricsCustomEvents, setActiveChartMetricsCustomEvents] = useState<string[]>([])

  const dashboardRef = useRef<HTMLDivElement>(null)

  const navigate = useNavigate()

  const [searchParams, setSearchParams] = useSearchParams()

  const isEmbedded = searchParams.get('embedded') === 'true'
  const projectQueryTabs = useMemo(() => {
    const tabs = searchParams.get('tabs')

    if (!tabs) {
      return []
    }

    return tabs.split(',')
  }, [searchParams])

  const [panelsData, setPanelsData] = useState<{
    types: (keyof Params)[]
    data: Params
    customs: Customs
    properties: Properties
    meta?: TrafficMeta[]
    // @ts-expect-error
  }>({})
  const [customExportTypes, setCustomExportTypes] = useState<
    { label: string; onClick: (data: typeof panelsData, tFunction: typeof t) => void }[]
  >([])
  const [overall, setOverall] = useState<Partial<OverallObject>>({})
  const [overallPerformance, setOverallPerformance] = useState<Partial<OverallPerformanceObject>>({})
  const [isPanelsDataEmpty, setIsPanelsDataEmpty] = useState(false)
  const [isNewFunnelOpened, setIsNewFunnelOpened] = useState(false)
  const [isAddAViewOpened, setIsAddAViewOpened] = useState(false)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)

  // @ts-expect-error
  const [chartData, setChartData] = useState<TrafficLogResponse['chart'] & { [key: string]: number[] }>({})
  // prevY2NeededRef removed - no longer needed with new chart management
  const [dataLoading, setDataLoading] = useState(false)
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false)
  const [captchaRefreshTrigger, setCaptchaRefreshTrigger] = useState(0)
  const [goalsRefreshTrigger, setGoalsRefreshTrigger] = useState(0)
  const [featureFlagsRefreshTrigger, setFeatureFlagsRefreshTrigger] = useState(0)
  const [sessionsRefreshTrigger, setSessionsRefreshTrigger] = useState(0)
  const [activeChartMetrics, setActiveChartMetrics] = useState<Record<keyof typeof CHART_METRICS_MAPPING, boolean>>({
    [CHART_METRICS_MAPPING.unique]: true,
    [CHART_METRICS_MAPPING.views]: false,
    [CHART_METRICS_MAPPING.sessionDuration]: false,
    [CHART_METRICS_MAPPING.bounce]: false,
    [CHART_METRICS_MAPPING.viewsPerUnique]: false,
    [CHART_METRICS_MAPPING.trendlines]: false,
    [CHART_METRICS_MAPPING.cumulativeMode]: false,
    [CHART_METRICS_MAPPING.customEvents]: false,
    ...(preferences.metricsVisualisation || {}),
  })
  const [activeChartMetricsPerf, setActiveChartMetricsPerf] = useState(CHART_METRICS_MAPPING_PERF.timing)
  const [activePerfMeasure, setActivePerfMeasure] = useState(CHART_MEASURES_MAPPING_PERF.median)
  const checkIfAllMetricsAreDisabled = useMemo(
    () => !_some({ ...activeChartMetrics, ...activeChartMetricsCustomEvents }, (value) => value),
    [activeChartMetrics, activeChartMetricsCustomEvents],
  )
  const [customMetrics, setCustomMetrics] = useState<ProjectViewCustomEvent[]>([])
  const filters = useMemo<Filter[]>(() => {
    return parseFilters(searchParams)
  }, [searchParams])

  // Search params without the session id, error id or funnel id. Needed for the back button.
  const pureSearchParams = useMemo(() => {
    const newSearchParams = new URLSearchParams(searchParams.toString())
    newSearchParams.delete('psid')
    newSearchParams.delete('eid')
    newSearchParams.delete('funnelId')
    return newSearchParams.toString()
  }, [searchParams])

  const tnMapping = typeNameMapping(t)
  const refCalendar = useRef(null)
  const refCalendarCompare = useRef(null)
  const activeTab = useMemo(() => {
    const tab = searchParams.get('tab') as keyof typeof PROJECT_TABS

    if (tab in PROJECT_TABS) {
      return tab
    }

    return PROJECT_TABS.traffic
  }, [searchParams])

  const period = useMemo<Period>(() => {
    const urlPeriod = searchParams.get('period') as Period

    if (VALID_PERIODS.includes(urlPeriod)) {
      return urlPeriod
    }

    return preferences.period || '7d'
  }, [searchParams, preferences.period])

  const [dateRangeCompare, setDateRangeCompare] = useState<null | Date[]>(null)

  const dateRange = useMemo<Date[] | null>(() => {
    if (period !== 'custom') {
      return null
    }

    let initialDateRange: Date[] | null = preferences.rangeDate
      ? [new Date(preferences.rangeDate[0]), new Date(preferences.rangeDate[1])]
      : null

    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (from && to) {
      const fromDate = new Date(from)
      const toDate = new Date(to)

      if (fromDate.getDate() && toDate.getDate()) {
        initialDateRange = [fromDate, toDate]
      }
    }

    return initialDateRange
  }, [period, searchParams, preferences.rangeDate])

  const periodPairs = useMemo<TBPeriodPairsProps[]>(() => {
    let tbs = null

    if (dateRange) {
      const days = Math.ceil(Math.abs(dateRange[1].getTime() - dateRange[0].getTime()) / (1000 * 3600 * 24))

      for (const index in timeBucketToDays) {
        if (timeBucketToDays[index].lt >= days) {
          tbs = timeBucketToDays[index].tb
        }
      }
    }

    return tbPeriodPairs(t, tbs, dateRange, language)
  }, [t, language, dateRange])

  const timeBucket = useMemo<TimeBucket>(() => {
    let _timeBucket = preferences.timeBucket || periodPairs[4].tbs[1]
    const urlTimeBucket = searchParams.get('timeBucket') as TimeBucket
    const currentPeriodPair = _find(periodPairs, (el) => el.period === period)

    // If the time bucket from preferences is not compatible with the current period, use the first time bucket of the period
    if (currentPeriodPair && !currentPeriodPair.tbs.includes(urlTimeBucket)) {
      _timeBucket = currentPeriodPair.tbs[0]
    }

    // Or use the time bucket from the URL if it's compatible with the current period
    if (VALID_TIME_BUCKETS.includes(urlTimeBucket)) {
      if (currentPeriodPair?.tbs?.includes(urlTimeBucket)) {
        _timeBucket = urlTimeBucket
      }
    }

    if (dateRange) {
      const days = Math.ceil(Math.abs(dateRange[1].getTime() - dateRange[0].getTime()) / (1000 * 3600 * 24))

      for (const index in timeBucketToDays) {
        if (timeBucketToDays[index].lt >= days) {
          if (!timeBucketToDays[index].tb?.includes(_timeBucket)) {
            _timeBucket = timeBucketToDays[index].tb[0]
          }

          break
        }
      }
    }

    return _timeBucket
  }, [searchParams, preferences.timeBucket, periodPairs, period, dateRange])

  const activePeriod = useMemo(() => _find(periodPairs, (p) => p.period === period), [period, periodPairs])

  const [isHotkeysHelpOpened, setIsHotkeysHelpOpened] = useState(false)

  // profiles / users
  const [profilesSkip, setProfilesSkip] = useState(0)
  const [canLoadMoreProfiles, setCanLoadMoreProfiles] = useState(false)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [profilesLoading, setProfilesLoading] = useState<boolean | null>(null)
  const [activeProfile, setActiveProfile] = useState<ProfileDetails | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSessions, setProfileSessions] = useState<Session[]>([])
  const [profileSessionsLoading, setProfileSessionsLoading] = useState<boolean | null>(null)
  const [profileSessionsSkip, setProfileSessionsSkip] = useState(0)
  const [canLoadMoreProfileSessions, setCanLoadMoreProfileSessions] = useState(false)
  const [profileTypeFilter, setProfileTypeFilter] = useState<'all' | 'anonymous' | 'identified'>('all')
  const activeProfileId = useMemo(() => {
    return searchParams.get('profileId')
  }, [searchParams])
  const prevActiveProfileIdRef = useRef<string | null>(activeProfileId)
  const profilesRequestIdRef = useRef(0)
  const skipNextProfilesAutoLoadRef = useRef(false)

  // Check if we're viewing a specific session detail
  const activePSID = useMemo(() => {
    return searchParams.get('psid')
  }, [searchParams])

  const [funnelToEdit, setFunnelToEdit] = useState<Funnel | undefined>(undefined)
  const [funnelActionLoading, setFunnelActionLoading] = useState(false)
  const [funnelAnalytics, setFunnelAnalytics] = useState<{
    funnel: AnalyticsFunnel[]
    totalPageviews: number
  } | null>(null)
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

  // null -> not loaded yet
  const [projectViews, setProjectViews] = useState<ProjectView[]>([])
  const [projectViewsLoading, setProjectViewsLoading] = useState<boolean | null>(null) //  // null - not loaded, true - loading, false - loaded
  const [projectViewDeleting, setProjectViewDeleting] = useState(false)
  const [projectViewToUpdate, setProjectViewToUpdate] = useState<ProjectView | undefined>()

  // Annotations state
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [annotationsLoading, setAnnotationsLoading] = useState(false)
  const [isAnnotationModalOpen, setIsAnnotationModalOpen] = useState(false)
  const [annotationToEdit, setAnnotationToEdit] = useState<Annotation | undefined>()
  const [annotationModalDate, setAnnotationModalDate] = useState<string | undefined>()
  const [annotationActionLoading, setAnnotationActionLoading] = useState(false)

  // Chart context menu state
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean
    x: number
    y: number
    date: string | null
    annotation: Annotation | null
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    date: null,
    annotation: null,
  })

  const mode = activeChartMetrics[CHART_METRICS_MAPPING.cumulativeMode] ? 'cumulative' : 'periodical'

  const loadProjectViews = async (forced?: boolean) => {
    if (!forced && projectViewsLoading !== null) {
      return
    }

    setProjectViewsLoading(true)

    try {
      const views = await getProjectViews(id, projectPassword)
      setProjectViews(views)
    } catch (reason: any) {
      console.error('[ERROR] (loadProjectViews)', reason)
      toast.error(reason)
    }

    setProjectViewsLoading(false)
  }

  const onProjectViewDelete = async (viewId: string) => {
    if (projectViewDeleting) {
      return
    }

    setProjectViewDeleting(true)

    try {
      await deleteProjectView(id, viewId)
    } catch (reason: any) {
      console.error('[ERROR] (deleteProjectView)', reason)
      toast.error(reason)
      setProjectViewDeleting(false)
      return
    }

    toast.success(t('apiNotifications.segmentDeleted'))
    await loadProjectViews(true)
    setProjectViewDeleting(false)
  }

  const onFunnelCreate = async (name: string, steps: string[]) => {
    if (funnelActionLoading) {
      return
    }

    setFunnelActionLoading(true)

    try {
      await addFunnel(id, name, steps)
    } catch (reason: any) {
      console.error('[ERROR] (onFunnelCreate)(addFunnel)', reason)
      toast.error(reason)
    }

    try {
      const funnels = await getFunnels(id, projectPassword)
      mergeProject({ funnels })
    } catch (reason: any) {
      console.error('[ERROR] (onFunnelCreate)(getFunnels)', reason)
    }

    toast.success(t('apiNotifications.funnelCreated'))
    setFunnelActionLoading(false)
  }

  const onFunnelEdit = async (funnelId: string, name: string, steps: string[]) => {
    if (funnelActionLoading) {
      return
    }

    setFunnelActionLoading(true)

    try {
      await updateFunnel(funnelId, id, name, steps)
    } catch (reason: any) {
      console.error('[ERROR] (onFunnelEdit)(updateFunnel)', reason)
      toast.error(reason)
    }

    try {
      const funnels = await getFunnels(id, projectPassword)
      mergeProject({ funnels })
    } catch (reason: any) {
      console.error('[ERROR] (onFunnelCreate)(getFunnels)', reason)
    }

    toast.success(t('apiNotifications.funnelUpdated'))
    setFunnelActionLoading(false)
  }

  const onFunnelDelete = async (funnelId: string) => {
    if (funnelActionLoading) {
      return
    }

    setFunnelActionLoading(true)

    try {
      await deleteFunnel(funnelId, id)
    } catch (reason: any) {
      console.error('[ERROR] (onFunnelDelete)(deleteFunnel)', reason)
      toast.error(reason)
    }

    try {
      const funnels = await getFunnels(id, projectPassword)
      mergeProject({ funnels })
    } catch (reason: any) {
      console.error('[ERROR] (onFunnelCreate)(getFunnels)', reason)
    }

    toast.success(t('apiNotifications.funnelDeleted'))
    setFunnelActionLoading(false)
  }

  // Annotation functions
  const loadAnnotations = async () => {
    if (annotationsLoading) {
      return
    }

    setAnnotationsLoading(true)

    try {
      const data = await getAnnotations(id, projectPassword)
      setAnnotations(data || [])
    } catch (reason: any) {
      console.error('[ERROR] (loadAnnotations)', reason)
    }

    setAnnotationsLoading(false)
  }

  const onAnnotationCreate = async (date: string, text: string) => {
    if (annotationActionLoading) {
      return
    }

    setAnnotationActionLoading(true)

    try {
      await createAnnotation(id, date, text)
      await loadAnnotations()
      toast.success(t('apiNotifications.annotationCreated'))
    } catch (reason: any) {
      console.error('[ERROR] (onAnnotationCreate)', reason)
      toast.error(reason)
    }

    setAnnotationActionLoading(false)
  }

  const onAnnotationUpdate = async (date: string, text: string) => {
    if (annotationActionLoading || !annotationToEdit) {
      return
    }

    setAnnotationActionLoading(true)

    try {
      await updateAnnotation(annotationToEdit.id, id, date, text)
      await loadAnnotations()
      toast.success(t('apiNotifications.annotationUpdated'))
    } catch (reason: any) {
      console.error('[ERROR] (onAnnotationUpdate)', reason)
      toast.error(reason)
    }

    setAnnotationActionLoading(false)
  }

  const onAnnotationDelete = async (annotation?: Annotation) => {
    const targetAnnotation = annotation || annotationToEdit

    if (annotationActionLoading || !targetAnnotation) {
      return
    }

    setAnnotationActionLoading(true)

    try {
      await deleteAnnotation(targetAnnotation.id, id)
      await loadAnnotations()
      toast.success(t('apiNotifications.annotationDeleted'))
    } catch (reason: any) {
      console.error('[ERROR] (onAnnotationDelete)', reason)
      toast.error(reason)
    }

    setAnnotationActionLoading(false)
    setAnnotationToEdit(undefined)
  }

  const openAnnotationModal = (date?: string, annotation?: Annotation) => {
    setAnnotationModalDate(date)
    setAnnotationToEdit(annotation)
    setIsAnnotationModalOpen(true)
  }

  const closeAnnotationModal = () => {
    setIsAnnotationModalOpen(false)
    setAnnotationToEdit(undefined)
    setAnnotationModalDate(undefined)
  }

  const handleChartContextMenu = (event: React.MouseEvent, xAxisData: string[] | undefined) => {
    event.preventDefault()

    let existingAnnotation: Annotation | null = null
    let date: string | null = null

    // Check if user clicked directly on an annotation line
    const annotationLineElement = findAnnotationLineElement(event.target as Element, event.currentTarget as Element)

    if (annotationLineElement) {
      // User clicked on an annotation line - find it by ID from the element's class
      const annotationId = getAnnotationIdFromElement(annotationLineElement)
      if (annotationId) {
        existingAnnotation = annotations.find((a) => a.id === annotationId) || null
        if (existingAnnotation) {
          date = dayjs(existingAnnotation.date).format('YYYY-MM-DD')
        }
      }
    }

    // If not clicking on an annotation line, calculate date from click position
    if (!existingAnnotation && xAxisData && xAxisData.length > 0) {
      const chartContainer = (event.currentTarget as HTMLElement).querySelector('.bb') as HTMLElement
      const svg = chartContainer?.querySelector('svg') as SVGSVGElement | null

      if (svg) {
        const svgRect = svg.getBoundingClientRect()
        const chartMetrics = calculateChartMetrics(svg, chartContainer)
        const clickX = event.clientX - svgRect.left

        date = calculateDateFromPosition(event.clientX, svgRect, xAxisData, chartMetrics)

        // Check for exact date match first
        existingAnnotation = annotations.find((a) => dayjs(a.date).format('YYYY-MM-DD') === date) || null

        // If no exact match, try to find the closest annotation within threshold
        if (!existingAnnotation && annotations.length > 0) {
          const closestAnnotation = findClosestAnnotation(
            clickX,
            annotations,
            xAxisData,
            chartMetrics,
            ANNOTATION_CLICK_THRESHOLD_PX,
          )

          if (closestAnnotation) {
            existingAnnotation = closestAnnotation
            date = dayjs(closestAnnotation.date).format('YYYY-MM-DD')
          }
        }
      }
    }

    setContextMenu({
      isOpen: true,
      x: event.clientX,
      y: event.clientY,
      date,
      annotation: existingAnnotation,
    })
  }

  const closeContextMenu = () => {
    setContextMenu((prev) => ({ ...prev, isOpen: false }))
  }

  const [panelsActiveTabs, setPanelsActiveTabs] = useState<{
    location: 'cc' | 'rg' | 'ct' | 'lc' | 'map'
    page: 'pg' | 'host' | 'userFlow' | 'entryPage' | 'exitPage'
    device: 'br' | 'os' | 'dv'
    source: 'ref' | 'so' | 'me' | 'ca' | 'te' | 'co' | 'keywords'
    metadata: 'ce' | 'props'
  }>({
    location: 'cc',
    page: 'pg',
    device: 'br',
    source: 'ref',
    metadata: 'ce',
  })

  const [performanceActiveTabs, setPerformanceActiveTabs] = useState<{
    location: 'cc' | 'rg' | 'ct' | 'map'
    page: 'pg' | 'host'
    device: 'br' | 'os' | 'dv'
  }>({
    location: 'cc',
    page: 'pg',
    device: 'br',
  })

  const setPanelTab = (
    panel: keyof typeof panelsActiveTabs,
    tab: (typeof panelsActiveTabs)[keyof typeof panelsActiveTabs],
  ) => {
    const extensionTab = customPanelTabs.find((el) => el.panelID === panel && el.tabContent === tab)

    extensionTab?.onOpen?.()

    setPanelsActiveTabs((prev) => ({
      ...prev,
      [panel]: tab,
    }))
  }

  const getVersionFilterLink = (parent: string | null, version: string | null, panelType: 'br' | 'os') => {
    const filterParams = new URLSearchParams(searchParams.toString())

    if (panelType === 'br') {
      // Apply both browser and browser version filters together
      filterParams.set('br', parent ?? 'null')
      filterParams.set('brv', version ?? 'null')
    } else if (panelType === 'os') {
      // Apply both OS and OS version filters together
      filterParams.set('os', parent ?? 'null')
      filterParams.set('osv', version ?? 'null')
    }

    return `?${filterParams.toString()}`
  }

  const [chartDataPerf, setChartDataPerf] = useState<any>({})
  const [isPanelsDataEmptyPerf, setIsPanelsDataEmptyPerf] = useState(false)
  const [panelsDataPerf, setPanelsDataPerf] = useState<any>({})

  // GSC Keywords state
  type KeywordEntry = Entry & { impressions: number; position: number; ctr: number }
  const [keywordsLoading, setKeywordsLoading] = useState<boolean>(false)
  const [keywordsNotConnected, setKeywordsNotConnected] = useState<boolean>(false)
  const [keywords, setKeywords] = useState<KeywordEntry[]>([])

  const timeFormat = useMemo<'12-hour' | '24-hour'>(() => user?.timeFormat || TimeFormat['12-hour'], [user])
  const [ref, size] = useSize()
  const rotateXAxis = useMemo(() => size.width > 0 && size.width < 500, [size])
  const customEventsChartData = useMemo(
    () =>
      _pickBy(preferences.customEvents, (value, keyCustomEvents) =>
        _includes(activeChartMetricsCustomEvents, keyCustomEvents),
      ),
    [preferences.customEvents, activeChartMetricsCustomEvents],
  )
  const [chartType, setChartType] = useState<keyof typeof chartTypes>(
    (getItem('chartType') as keyof typeof chartTypes) || chartTypes.line,
  )

  const [periodPairsCompare, setPeriodPairsCompare] = useState<
    {
      label: string
      period: string
    }[]
  >(tbPeriodPairsCompare(t, undefined, language))
  const [isActiveCompare, setIsActiveCompare] = useState(getItem(LS_IS_ACTIVE_COMPARE_KEY) === 'true')
  const [activePeriodCompare, setActivePeriodCompare] = useState(periodPairsCompare[0].period)
  const activeDropdownLabelCompare = useMemo(
    () => _find(periodPairsCompare, (p) => p.period === activePeriodCompare)?.label,
    [periodPairsCompare, activePeriodCompare],
  )
  const [dataChartCompare, setDataChartCompare] = useState<any>({})
  const [overallCompare, setOverallCompare] = useState<Partial<OverallObject>>({})
  const [overallPerformanceCompare, setOverallPerformanceCompare] = useState<Partial<OverallPerformanceObject>>({})
  const [dataChartPerfCompare, setDataChartPerfCompare] = useState<any>({})
  const maxRangeCompare = useMemo(() => {
    if (!isActiveCompare) {
      return 0
    }

    const findActivePeriod = _find(periodPairs, (p) => p.period === period)

    if (findActivePeriod?.period === 'custom' && dateRange) {
      return dayjs.utc(dateRange[1]).diff(dayjs.utc(dateRange[0]), 'day')
    }

    return findActivePeriod?.countDays || 0
  }, [isActiveCompare, period, dateRange, periodPairs])

  const createVersionDataMapping = useMemo(() => {
    const browserDataSource = activeTab === PROJECT_TABS.performance ? panelsDataPerf.data?.brv : panelsData.data?.brv
    const osDataSource = activeTab === PROJECT_TABS.performance ? panelsDataPerf.data?.osv : panelsData.data?.osv

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
  }, [panelsData.data?.brv, panelsData.data?.osv, activeTab, panelsDataPerf.data?.brv, panelsDataPerf.data?.osv])

  useEffect(() => {
    if (!project) {
      return
    }

    let pageTitle = user?.showLiveVisitorsInTitle ? `👀 ${liveVisitors} - ${project.name}` : project.name

    if (!pageTitle) {
      pageTitle = t('titles.main')
    }

    pageTitle += ` ${TITLE_SUFFIX}`

    document.title = pageTitle
  }, [project, user, liveVisitors, t])

  const timeBucketSelectorItems = useMemo(() => {
    if (activeTab === PROJECT_TABS.errors) {
      return _filter(periodPairs, (el) => {
        return _includes(ERROR_PERIOD_PAIRS, el.period)
      })
    }

    if (activeTab === PROJECT_TABS.funnels) {
      return _filter(periodPairs, (el) => {
        return _includes(FUNNELS_PERIOD_PAIRS, el.period)
      })
    }

    if (isActiveCompare) {
      return _filter(periodPairs, (el) => {
        return _includes(FILTERS_PERIOD_PAIRS, el.period)
      })
    }

    if (_includes(FILTERS_PERIOD_PAIRS, period)) {
      return periodPairs
    }

    return _filter(periodPairs, (el) => {
      return el.period !== PERIOD_PAIRS_COMPARE.COMPARE
    })
  }, [activeTab, isActiveCompare, period, periodPairs])

  const [showFiltersSearch, setShowFiltersSearch] = useState(false)

  const isConflicted = (conflicts?: string[]) => {
    if (!conflicts) {
      return false
    }

    return _some(conflicts, (conflict) => {
      const conflictPair = _find(chartMetrics, (metric) => metric.id === conflict)
      return conflictPair && conflictPair.active
    })
  }

  const chartMetrics = useMemo(() => {
    return [
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
      {
        id: CHART_METRICS_MAPPING.sessionDuration,
        label: t('dashboard.sessionDuration'),
        active: activeChartMetrics[CHART_METRICS_MAPPING.sessionDuration],
        conflicts: [CHART_METRICS_MAPPING.bounce],
      },
      {
        id: CHART_METRICS_MAPPING.bounce,
        label: t('dashboard.bounceRate'),
        active: activeChartMetrics[CHART_METRICS_MAPPING.bounce],
        conflicts: [CHART_METRICS_MAPPING.sessionDuration],
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
    ]
  }, [t, activeChartMetrics])

  const chartMetricsPerf = useMemo(() => {
    return [
      {
        id: CHART_METRICS_MAPPING_PERF.quantiles,
        label: t('dashboard.allocation'),
        active: activeChartMetricsPerf === CHART_METRICS_MAPPING_PERF.quantiles,
      },
      {
        id: CHART_METRICS_MAPPING_PERF.full,
        label: t('dashboard.timingFull'),
        active: activeChartMetricsPerf === CHART_METRICS_MAPPING_PERF.full,
      },
      {
        id: CHART_METRICS_MAPPING_PERF.timing,
        label: t('dashboard.timing'),
        active: activeChartMetricsPerf === CHART_METRICS_MAPPING_PERF.timing,
      },
      {
        id: CHART_METRICS_MAPPING_PERF.network,
        label: t('dashboard.network'),
        active: activeChartMetricsPerf === CHART_METRICS_MAPPING_PERF.network,
      },
      {
        id: CHART_METRICS_MAPPING_PERF.frontend,
        label: t('dashboard.frontend'),
        active: activeChartMetricsPerf === CHART_METRICS_MAPPING_PERF.frontend,
      },
      {
        id: CHART_METRICS_MAPPING_PERF.backend,
        label: t('dashboard.backend'),
        active: activeChartMetricsPerf === CHART_METRICS_MAPPING_PERF.backend,
      },
    ]
  }, [t, activeChartMetricsPerf])

  const chartMeasuresPerf = useMemo(() => {
    return [
      {
        id: CHART_MEASURES_MAPPING_PERF.p95,
        label: t('dashboard.xPercentile', { x: 95 }),
        active: activePerfMeasure === CHART_MEASURES_MAPPING_PERF.p95,
      },
      {
        id: CHART_MEASURES_MAPPING_PERF.p75,
        label: t('dashboard.xPercentile', { x: 75 }),
        active: activePerfMeasure === CHART_MEASURES_MAPPING_PERF.p75,
      },
      {
        id: CHART_MEASURES_MAPPING_PERF.median,
        label: t('dashboard.median'),
        active: activePerfMeasure === CHART_MEASURES_MAPPING_PERF.median,
      },
      {
        id: CHART_MEASURES_MAPPING_PERF.average,
        label: t('dashboard.average'),
        active: activePerfMeasure === CHART_MEASURES_MAPPING_PERF.average,
      },
    ]
  }, [t, activePerfMeasure])

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
      ...dataNamesCustomEvents,
    }),
    [t, dataNamesCustomEvents],
  )

  const dataNamesPerf = useMemo(
    () => ({
      full: t('dashboard.timing'),
      network: t('dashboard.network'),
      frontend: t('dashboard.frontend'),
      backend: t('dashboard.backend'),
      dns: t('dashboard.dns'),
      tls: t('dashboard.tls'),
      conn: t('dashboard.conn'),
      response: t('dashboard.response'),
      render: t('dashboard.render'),
      dom_load: t('dashboard.domLoad'),
      ttfb: t('dashboard.ttfb'),
      p50: t('dashboard.xPercentile', { x: 50 }),
      p75: t('dashboard.xPercentile', { x: 75 }),
      p95: t('dashboard.xPercentile', { x: 95 }),
    }),
    [t],
  )

  // @ts-expect-error
  const tabs: {
    id: keyof typeof PROJECT_TABS | 'settings'
    label: string
    icon: any
  }[] = useMemo(() => {
    const baseTabs = [
      {
        id: PROJECT_TABS.traffic,
        label: t('dashboard.traffic'),
        icon: ChartNoAxesColumnIcon,
      },
      {
        id: PROJECT_TABS.performance,
        label: t('dashboard.performance'),
        icon: GaugeIcon,
      },
      {
        id: PROJECT_TABS.profiles,
        label: t('dashboard.profiles'),
        icon: UserIcon,
      },
      {
        id: PROJECT_TABS.sessions,
        label: t('dashboard.sessions'),
        icon: UsersIcon,
      },
      {
        id: PROJECT_TABS.errors,
        label: t('dashboard.errors'),
        icon: BugIcon,
      },
      {
        id: PROJECT_TABS.funnels,
        label: t('dashboard.funnels'),
        icon: FilterIcon,
      },
      {
        id: PROJECT_TABS.goals,
        label: t('dashboard.goals'),
        icon: TargetIcon,
      },
      {
        id: PROJECT_TABS.featureFlags,
        label: t('dashboard.featureFlags'),
        icon: FlagIcon,
      },
    ]

    const adminTabs = allowedToManage
      ? [
          {
            id: 'settings',
            label: t('common.settings'),
            icon: SettingsIcon,
          },
        ]
      : []

    if (isSelfhosted) {
      return [...baseTabs, ...adminTabs]
    }

    const newTabs = [
      ...baseTabs,
      {
        id: PROJECT_TABS.ai,
        label: t('dashboard.askAi'),
        icon: SparklesIcon,
      },
      {
        id: PROJECT_TABS.alerts,
        label: t('dashboard.alerts'),
        icon: BellRingIcon,
      },
      {
        id: PROJECT_TABS.captcha,
        label: t('common.captcha'),
        icon: PuzzleIcon,
      },
      ...adminTabs,
    ].filter((x) => !!x)

    if (projectQueryTabs && projectQueryTabs.length) {
      return _filter(newTabs, (tab) => _includes(projectQueryTabs, tab.id))
    }

    return newTabs
  }, [t, projectQueryTabs, allowedToManage])

  const activeTabLabel = useMemo(() => _find(tabs, (tab) => tab.id === activeTab)?.label, [tabs, activeTab])

  const switchTrafficChartMetric = (pairID: keyof typeof CHART_METRICS_MAPPING, conflicts?: string[]) => {
    if (isConflicted(conflicts)) {
      toast.error(t('project.conflictMetric'))
      return
    }

    if (pairID === CHART_METRICS_MAPPING.customEvents) {
      return
    }

    setActiveChartMetrics((prev) => {
      const newActiveChartMetrics = { ...prev, [pairID]: !prev[pairID] }
      updatePreferences({
        metricsVisualisation: newActiveChartMetrics,
      })
      return newActiveChartMetrics
    })
  }

  const switchCustomEventChart = (id: string) => {
    setActiveChartMetricsCustomEvents((prev) => {
      const newActiveChartMetricsCustomEvents = [...prev]
      const index = _findIndex(prev, (item) => item === id)
      if (index === -1) {
        newActiveChartMetricsCustomEvents.push(id)
      } else {
        newActiveChartMetricsCustomEvents.splice(index, 1)
      }
      return newActiveChartMetricsCustomEvents
    })
  }

  const loadCustomEvents = async () => {
    if (_isEmpty(panelsData.customs)) {
      return
    }

    let data = null
    let from
    let to

    try {
      setDataLoading(true)

      if (dateRange) {
        from = getFormatDate(dateRange[0])
        to = getFormatDate(dateRange[1])
      }

      if (activeChartMetricsCustomEvents.length > 0) {
        if (period === 'custom' && dateRange) {
          data = await getProjectDataCustomEvents(
            id,
            timeBucket,
            '',
            filters,
            from,
            to,
            timezone,
            activeChartMetricsCustomEvents,
            projectPassword,
          )
        } else {
          data = await getProjectDataCustomEvents(
            id,
            timeBucket,
            period,
            filters,
            '',
            '',
            timezone,
            activeChartMetricsCustomEvents,
            projectPassword,
          )
        }
      }

      const events = data?.chart ? data.chart.events : customEventsChartData

      updatePreferences({
        customEvents: events,
      })
    } catch (reason) {
      console.error('[ERROR] Failed to load custom events:', reason)
    } finally {
      setDataLoading(false)
    }
  }

  const compareDisable = () => {
    setIsActiveCompare(false)
    setDateRangeCompare(null)
    setDataChartCompare({})
    setOverallCompare({})
    setOverallPerformanceCompare({})
    setDataChartPerfCompare({})
    setActivePeriodCompare(periodPairsCompare[0].period)
  }

  const loadAnalytics = async () => {
    setDataLoading(true)
    try {
      let data: TrafficLogResponse & {
        overall?: OverallObject
      }
      let dataCompare:
        | (TrafficLogResponse & {
            overall?: OverallObject
          })
        | null = null
      let from
      let fromCompare: string | undefined
      let to
      let toCompare: string | undefined
      let customEventsChart = customEventsChartData
      let rawOverall: any

      if (isActiveCompare) {
        if (dateRangeCompare && activePeriodCompare === PERIOD_PAIRS_COMPARE.CUSTOM) {
          let start
          let end
          let diff
          const startCompare = dayjs.utc(dateRangeCompare[0])
          const endCompare = dayjs.utc(dateRangeCompare[1])
          const diffCompare = endCompare.diff(startCompare, 'day')

          if (activePeriod?.period === 'custom' && dateRange) {
            start = dayjs.utc(dateRange[0])
            end = dayjs.utc(dateRange[1])
            diff = end.diff(start, 'day')
          }

          // @ts-expect-error
          if (activePeriod?.period === 'custom' ? diffCompare <= diff : diffCompare <= activePeriod?.countDays) {
            fromCompare = getFormatDate(dateRangeCompare[0])
            toCompare = getFormatDate(dateRangeCompare[1])
          } else {
            toast.error(t('project.compareDateRangeError'))
            compareDisable()
          }
        } else {
          let date
          if (dateRange) {
            date = _find(periodToCompareDate, (item) => item.period === period)?.formula(dateRange)
          } else {
            date = _find(periodToCompareDate, (item) => item.period === period)?.formula()
          }

          if (date) {
            fromCompare = date.from
            toCompare = date.to
          }
        }

        if (!_isEmpty(fromCompare) && !_isEmpty(toCompare)) {
          dataCompare =
            (await getTrafficCompareData(
              id,
              timeBucket,
              '',
              filters,
              fromCompare,
              toCompare,
              timezone,
              projectPassword,
              mode,
            )) || {}
          const compareOverall = await getOverallStats(
            [id],
            timeBucket,
            'custom',
            fromCompare,
            toCompare,
            timezone,
            filters,
            projectPassword,
          )

          // @ts-expect-error
          dataCompare.overall = compareOverall[id]
        }
      }

      if (dateRange) {
        from = getFormatDate(dateRange[0])
        to = getFormatDate(dateRange[1])
      }

      if (period === 'custom' && dateRange) {
        data = await getProjectData(
          id,
          timeBucket,
          '',
          filters,
          customMetrics,
          from,
          to,
          timezone,
          projectPassword,
          mode,
        )
        if (activeChartMetricsCustomEvents.length > 0) {
          customEventsChart = await getProjectDataCustomEvents(
            id,
            timeBucket,
            '',
            filters,
            from,
            to,
            timezone,
            activeChartMetricsCustomEvents,
            projectPassword,
          )
        }
        rawOverall = await getOverallStats([id], timeBucket, period, from, to, timezone, filters, projectPassword)
      } else {
        data = await getProjectData(
          id,
          timeBucket,
          period,
          filters,
          customMetrics,
          '',
          '',
          timezone,
          projectPassword,
          mode,
        )
        if (activeChartMetricsCustomEvents.length > 0) {
          customEventsChart = await getProjectDataCustomEvents(
            id,
            timeBucket,
            period,
            filters,
            '',
            '',
            timezone,
            activeChartMetricsCustomEvents,
            projectPassword,
          )
        }
        rawOverall = await getOverallStats([id], timeBucket, period, '', '', timezone, filters, projectPassword)
      }

      customEventsChart = customEventsChart?.chart ? customEventsChart.chart.events : customEventsChartData

      updatePreferences({
        customEvents: customEventsChart,
      })

      data.overall = rawOverall[id]
      setOverall(rawOverall[id])

      const sdkData = {
        ...(data || {}),
        filters,
        timezone,
        timeBucket,
        period,
        from,
        to,
      }

      if (_keys(data).length < 2) {
        setAnalyticsLoading(false)
        setDataLoading(false)
        setIsPanelsDataEmpty(true)
        sdkInstance?._emitEvent('load', sdkData)
        return
      }

      const { chart, params, customs, properties, meta } = data
      let newTimebucket = timeBucket
      sdkInstance?._emitEvent('load', sdkData)

      if (period === 'all' && !_isEmpty(data.timeBucket)) {
        newTimebucket = _includes(data.timeBucket, timeBucket) ? timeBucket : (data.timeBucket?.[0] as TimeBucket)

        const newSearchParams = new URLSearchParams(searchParams.toString())
        newSearchParams.set('timeBucket', newTimebucket)
        setSearchParams(newSearchParams)
      }

      if (!_isEmpty(dataCompare)) {
        if (!_isEmpty(dataCompare?.chart)) {
          setDataChartCompare(dataCompare.chart)
        }

        if (!_isEmpty(dataCompare?.overall)) {
          setOverallCompare(dataCompare.overall)
        }
      }

      if (_isEmpty(params)) {
        setIsPanelsDataEmpty(true)
      } else {
        setChartData(chart as any)

        setPanelsData({
          types: _keys(params),
          data: params,
          customs,
          properties,
          meta,
        })

        setIsPanelsDataEmpty(false)
      }

      setAnalyticsLoading(false)
      setDataLoading(false)
    } catch (reason) {
      setAnalyticsLoading(false)
      setDataLoading(false)
      setIsPanelsDataEmpty(true)
      console.error('[ERROR](loadAnalytics) Loading analytics data failed')
      console.error(reason)
    }
  }

  const getCustomEventMetadata = async (event: string) => {
    if (period === 'custom' && dateRange) {
      return getCustomEventsMetadata(
        id,
        event,
        timeBucket,
        '',
        getFormatDate(dateRange[0]),
        getFormatDate(dateRange[1]),
        timezone,
        projectPassword,
      )
    }

    return getCustomEventsMetadata(id, event, timeBucket, period, '', '', timezone, projectPassword)
  }

  const _getPropertyMetadata = async (event: string) => {
    if (period === 'custom' && dateRange) {
      return getPropertyMetadata(
        id,
        event,
        timeBucket,
        '',
        getFormatDate(dateRange[0]),
        getFormatDate(dateRange[1]),
        filters,
        timezone,
        projectPassword,
      )
    }

    return getPropertyMetadata(id, event, timeBucket, period, '', '', filters, timezone, projectPassword)
  }

  const loadProfiles = async (forcedSkip?: number, override?: boolean) => {
    if (profilesLoading) {
      return
    }

    const requestId = profilesRequestIdRef.current
    setProfilesLoading(true)

    try {
      const skip = typeof forcedSkip === 'number' ? forcedSkip : profilesSkip
      let dataProfiles: { profiles: Profile[] }
      let from
      let to

      if (dateRange) {
        from = getFormatDate(dateRange[0])
        to = getFormatDate(dateRange[1])
      }

      if (period === 'custom' && dateRange) {
        dataProfiles = await getProfiles(
          id,
          '',
          filters,
          from,
          to,
          SESSIONS_TAKE,
          skip,
          timezone,
          profileTypeFilter,
          projectPassword,
        )
      } else {
        dataProfiles = await getProfiles(
          id,
          period,
          filters,
          '',
          '',
          SESSIONS_TAKE,
          skip,
          timezone,
          profileTypeFilter,
          projectPassword,
        )
      }

      if (requestId === profilesRequestIdRef.current) {
        if (override) {
          setProfiles(dataProfiles?.profiles || [])
        } else {
          setProfiles((prev) => [...prev, ...(dataProfiles?.profiles || [])])
        }
        setProfilesSkip((prev) => {
          if (typeof forcedSkip === 'number') {
            return SESSIONS_TAKE + forcedSkip
          }
          return SESSIONS_TAKE + prev
        })

        if (dataProfiles?.profiles?.length < SESSIONS_TAKE) {
          setCanLoadMoreProfiles(false)
        } else {
          setCanLoadMoreProfiles(true)
        }
      }
    } catch (reason) {
      console.error('[ERROR](loadProfiles) Loading profiles data failed:', reason)
    } finally {
      if (requestId === profilesRequestIdRef.current) {
        setProfilesLoading(false)
      }
    }
  }

  const loadProfile = async (profileId: string) => {
    setProfileLoading(true)
    setProfileSessions([])
    setProfileSessionsSkip(0)
    setCanLoadMoreProfileSessions(false)

    try {
      let from
      let to

      if (dateRange) {
        from = getFormatDate(dateRange[0])
        to = getFormatDate(dateRange[1])
      }

      const data = await getProfile(
        id,
        profileId,
        period === 'custom' ? '' : period,
        from || '',
        to || '',
        timezone,
        projectPassword,
      )
      setActiveProfile(data)
      // Load initial sessions for the profile
      loadProfileSessionsData(profileId, 0)
    } catch (reason) {
      console.error('[ERROR](loadProfile) Loading profile data failed:', reason)
      setActiveProfile(null)
    } finally {
      setProfileLoading(false)
    }
  }

  const loadProfileSessionsData = async (profileId: string, forcedSkip?: number) => {
    if (profileSessionsLoading) {
      return
    }

    setProfileSessionsLoading(true)

    try {
      const skip = typeof forcedSkip === 'number' ? forcedSkip : profileSessionsSkip
      let dataSessions: { sessions: Session[] }
      let from
      let to

      if (dateRange) {
        from = getFormatDate(dateRange[0])
        to = getFormatDate(dateRange[1])
      }

      if (period === 'custom' && dateRange) {
        dataSessions = await getProfileSessions(
          id,
          profileId,
          '',
          filters,
          from,
          to,
          SESSIONS_TAKE,
          skip,
          timezone,
          projectPassword,
        )
      } else {
        dataSessions = await getProfileSessions(
          id,
          profileId,
          period,
          filters,
          '',
          '',
          SESSIONS_TAKE,
          skip,
          timezone,
          projectPassword,
        )
      }

      setProfileSessions((prev) => [...prev, ...(dataSessions?.sessions || [])])
      setProfileSessionsSkip((prev) => {
        if (typeof forcedSkip === 'number') {
          return SESSIONS_TAKE + forcedSkip
        }
        return SESSIONS_TAKE + prev
      })

      if (dataSessions?.sessions?.length < SESSIONS_TAKE) {
        setCanLoadMoreProfileSessions(false)
      } else {
        setCanLoadMoreProfileSessions(true)
      }
    } catch (reason) {
      console.error('[ERROR](loadProfileSessions) Loading profile sessions failed:', reason)
    } finally {
      setProfileSessionsLoading(false)
    }
  }

  const loadAnalyticsPerf = async () => {
    setDataLoading(true)

    try {
      let dataPerf: { timeBucket?: TimeBucket[]; params?: any; chart?: any }
      let from
      let to
      let dataCompare
      let fromCompare: string | undefined
      let toCompare: string | undefined
      let rawOverall: any

      const measure =
        activeChartMetricsPerf === CHART_METRICS_MAPPING_PERF.quantiles
          ? CHART_METRICS_MAPPING_PERF.quantiles
          : activePerfMeasure

      if (isActiveCompare) {
        if (dateRangeCompare && activePeriodCompare === PERIOD_PAIRS_COMPARE.CUSTOM) {
          let start
          let end
          let diff
          const startCompare = dayjs.utc(dateRangeCompare[0])
          const endCompare = dayjs.utc(dateRangeCompare[1])
          const diffCompare = endCompare.diff(startCompare, 'day')

          if (activePeriod?.period === 'custom' && dateRange) {
            start = dayjs.utc(dateRange[0])
            end = dayjs.utc(dateRange[1])
            diff = end.diff(start, 'day')
          }

          // @ts-expect-error
          if (activePeriod?.period === 'custom' ? diffCompare <= diff : diffCompare <= activePeriod?.countDays) {
            fromCompare = getFormatDate(dateRangeCompare[0])
            toCompare = getFormatDate(dateRangeCompare[1])
          } else {
            toast.error(t('project.compareDateRangeError'))
            compareDisable()
          }
        } else {
          let date
          if (dateRange) {
            date = _find(periodToCompareDate, (item) => item.period === period)?.formula(dateRange)
          } else {
            date = _find(periodToCompareDate, (item) => item.period === period)?.formula()
          }

          if (date) {
            fromCompare = date.from
            toCompare = date.to
          }
        }

        if (!_isEmpty(fromCompare) && !_isEmpty(toCompare)) {
          dataCompare = await getPerformanceCompareData(
            id,
            timeBucket,
            '',
            filters,
            fromCompare,
            toCompare,
            timezone,
            measure,
            projectPassword,
          )
          const compareOverall = await getPerformanceOverallStats(
            [id],
            'custom',
            fromCompare,
            toCompare,
            timezone,
            filters,
            measure,
            projectPassword,
          )
          dataCompare.overall = compareOverall[id]
        }
      }

      if (dateRange) {
        from = getFormatDate(dateRange[0])
        to = getFormatDate(dateRange[1])
      }

      if (period === 'custom' && dateRange) {
        dataPerf = await getPerfData(id, timeBucket, '', filters, from, to, timezone, measure, projectPassword)
        rawOverall = await getOverallStats([id], timeBucket, period, from, to, timezone, filters, projectPassword)
      } else {
        dataPerf = await getPerfData(id, timeBucket, period, filters, '', '', timezone, measure, projectPassword)
        rawOverall = await getPerformanceOverallStats([id], period, '', '', timezone, filters, measure, projectPassword)
      }

      // @ts-expect-error
      dataPerf.overall = rawOverall[id]

      setOverallPerformance(rawOverall[id])

      if (_keys(dataPerf).length < 2) {
        setIsPanelsDataEmptyPerf(true)
        setDataLoading(false)
        setAnalyticsLoading(false)
        return
      }

      let newTimebucket = timeBucket

      if (period === 'all' && !_isEmpty(dataPerf.timeBucket)) {
        newTimebucket = _includes(dataPerf.timeBucket, timeBucket)
          ? timeBucket
          : (dataPerf.timeBucket?.[0] as TimeBucket)
        const newSearchParams = new URLSearchParams(searchParams.toString())
        newSearchParams.set('timeBucket', newTimebucket)
        setSearchParams(newSearchParams)
      }

      if (!_isEmpty(dataCompare)) {
        if (!_isEmpty(dataCompare?.chart)) {
          setDataChartPerfCompare(dataCompare.chart)
        }

        if (!_isEmpty(dataCompare?.overall)) {
          setOverallPerformanceCompare(dataCompare.overall)
        }
      }

      if (_isEmpty(dataPerf.params)) {
        setIsPanelsDataEmptyPerf(true)
      } else {
        const { chart: chartPerf } = dataPerf
        setChartDataPerf(chartPerf)

        setPanelsDataPerf({
          types: _keys(dataPerf.params),
          data: dataPerf.params,
        })

        setIsPanelsDataEmptyPerf(false)
      }

      setAnalyticsLoading(false)
      setDataLoading(false)
    } catch (reason) {
      setAnalyticsLoading(false)
      setDataLoading(false)
      setIsPanelsDataEmptyPerf(true)
      console.error('[ERROR](loadAnalytics) Loading analytics data failed:', reason)
    }
  }

  const loadFunnelsData = async () => {
    if (!activeFunnel?.id) {
      return
    }

    setDataLoading(true)

    try {
      let dataFunnel: { funnel: AnalyticsFunnel[]; totalPageviews: number }
      let from
      let to

      if (dateRange) {
        from = getFormatDate(dateRange[0])
        to = getFormatDate(dateRange[1])
      }

      if (period === 'custom' && dateRange) {
        dataFunnel = await getFunnelData(id, '', from, to, timezone, activeFunnel.id, projectPassword)
      } else {
        dataFunnel = await getFunnelData(id, period, '', '', timezone, activeFunnel.id, projectPassword)
      }

      const { funnel, totalPageviews } = dataFunnel

      setFunnelAnalytics({ funnel, totalPageviews })

      // Unhide the wrapper first, then mount the chart on the next tick
      setAnalyticsLoading(false)
      setDataLoading(false)

      await new Promise((resolve) => setTimeout(resolve, 1))
    } catch (reason) {
      setAnalyticsLoading(false)
      setDataLoading(false)

      console.error('[ERROR](loadFunnelsData) Loading funnels data failed:', reason)
    }
  }

  const onCustomMetric = (metrics: ProjectViewCustomEvent[]) => {
    if (activeTab !== PROJECT_TABS.traffic) {
      return
    }

    setCustomMetrics(metrics)
  }

  const onRemoveCustomMetric = (metricId: ProjectViewCustomEvent['id']) => {
    if (activeTab !== PROJECT_TABS.traffic) {
      return
    }

    const newMetrics = _filter(customMetrics, (metric) => metric.id !== metricId)

    setCustomMetrics(newMetrics)
  }

  const resetCustomMetrics = () => {
    if (activeTab !== PROJECT_TABS.traffic) {
      return
    }

    setCustomMetrics([])
  }

  const setDashboardTab = (key: keyof typeof PROJECT_TABS) => {
    if (dataLoading) {
      return
    }

    const newSearchParams = new URLSearchParams(searchParams.toString())
    newSearchParams.set('tab', key)
    setSearchParams(newSearchParams)
  }

  const funnelSummary = useMemo(() => {
    if (!funnelAnalytics || _isEmpty(funnelAnalytics.funnel)) {
      return null
    }

    const stepsCount = funnelAnalytics.funnel.length
    const startVisitors = funnelAnalytics.funnel[0]?.events || 0
    const endVisitors = funnelAnalytics.funnel[stepsCount - 1]?.events || 0
    const conversionRate = Number(((endVisitors / Math.max(startVisitors, 1)) * 100).toFixed(2))

    return {
      stepsCount,
      startVisitors,
      endVisitors,
      conversionRate,
    }
  }, [funnelAnalytics])

  const refreshStats = useCallback(
    async (isManual = true) => {
      if (!isManual) {
        setIsAutoRefreshing(true)
      }

      if (!authLoading && !dataLoading) {
        if (activeTab === PROJECT_TABS.performance) {
          loadAnalyticsPerf()
          return
        }

        if (activeTab === PROJECT_TABS.funnels) {
          loadFunnelsData()
          return
        }

        if (activeTab === PROJECT_TABS.profiles) {
          if (activeProfileId) {
            await loadProfile(activeProfileId)
            return
          }

          setProfilesSkip(0)
          loadProfiles(0, true)
          return
        }

        if (activeTab === PROJECT_TABS.captcha) {
          setCaptchaRefreshTrigger((prev) => prev + 1)
          return
        }

        if (activeTab === PROJECT_TABS.goals) {
          setGoalsRefreshTrigger((prev) => prev + 1)
          return
        }

        if (activeTab === PROJECT_TABS.featureFlags) {
          setFeatureFlagsRefreshTrigger((prev) => prev + 1)
          return
        }

        if (activeTab === PROJECT_TABS.sessions) {
          setSessionsRefreshTrigger((prev) => prev + 1)
          return
        }

        loadAnalytics()
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [authLoading, dataLoading, activeTab, activeProfileId],
  )

  useEffect(() => {
    if (activeTab !== PROJECT_TABS.traffic || authLoading || !project) return

    loadAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, activeTab, customMetrics, filters, authLoading, project, isActiveCompare, dateRange, period, timeBucket])

  // Load annotations when project loads
  useEffect(() => {
    if (authLoading || !project) {
      return
    }

    loadAnnotations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, project])

  useEffect(() => {
    if (activeTab !== PROJECT_TABS.traffic || authLoading || !project) {
      return
    }

    loadCustomEvents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChartMetricsCustomEvents, activeTab, authLoading, project])

  useEffect(() => {
    if (activeTab !== PROJECT_TABS.performance || authLoading || !project) return

    loadAnalyticsPerf()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    activePerfMeasure,
    activeChartMetricsPerf,
    filters,
    authLoading,
    project,
    isActiveCompare,
    dateRange,
    period,
    timeBucket,
  ])

  // Load GSC Keywords when the traffic sources panel switches to 'keywords'
  useEffect(() => {
    const loadKeywords = async () => {
      if (authLoading || !project) return
      if (activeTab !== PROJECT_TABS.traffic) return
      if (panelsActiveTabs.source !== 'keywords') return
      if (keywordsLoading) return

      setKeywordsLoading(true)
      setKeywordsNotConnected(false)

      try {
        let from: string | undefined
        let to: string | undefined
        if (dateRange) {
          from = getFormatDate(dateRange[0])
          to = getFormatDate(dateRange[1])
        }

        const res = await getGSCKeywords(id, period, from, to, timezone, projectPassword)
        const list = (res?.keywords || []).map(
          (k: { name: string; count: number; impressions: number; position: number; ctr: number }) => ({
            name: k.name,
            count: k.count,
            impressions: k.impressions,
            position: k.position,
            ctr: k.ctr,
          }),
        )
        setKeywords(list)
      } catch (error: any) {
        const message = typeof error === 'string' ? error : error?.message
        if (message && (message as string).toLowerCase().includes('search console')) {
          setKeywordsNotConnected(true)
        } else {
          toast.error(typeof error === 'string' ? error : t('apiNotifications.somethingWentWrong'))
        }
      } finally {
        setKeywordsLoading(false)
      }
    }

    loadKeywords()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, panelsActiveTabs.source, period, dateRange, timezone, id, project, authLoading])

  useEffect(() => {
    if (activeTab !== PROJECT_TABS.funnels || authLoading || !project) return

    loadFunnelsData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFunnel, activeTab, authLoading, project, dateRange, period, timeBucket])

  // Load profiles list when users tab is active
  useEffect(() => {
    if (authLoading || activeTab !== PROJECT_TABS.profiles || !project || activeProfileId) {
      return
    }

    if (skipNextProfilesAutoLoadRef.current) {
      skipNextProfilesAutoLoadRef.current = false
      return
    }

    // Reset pagination and load the first page whenever the query context changes
    setProfilesSkip(0)
    loadProfiles(0, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    dateRange,
    filters,
    id,
    period,
    projectPassword,
    timezone,
    authLoading,
    project,
    activeProfileId,
    profileTypeFilter,
  ])

  // Load single profile when profileId is set
  useEffect(() => {
    if (authLoading || !activeProfileId || !project) {
      return
    }

    loadProfile(activeProfileId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfileId, authLoading, project])

  // Reset profiles when navigating away from profile detail
  useEffect(() => {
    const prevProfileId = prevActiveProfileIdRef.current
    prevActiveProfileIdRef.current = activeProfileId

    if (prevProfileId && !activeProfileId) {
      // We just closed a profile detail, reset to first page
      setProfilesSkip(0)
      skipNextProfilesAutoLoadRef.current = true
      loadProfiles(0, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfileId])

  useEffect(() => {
    let sdk: SwetrixSDK | null = null

    const filteredExtensions = _filter(extensions, (ext) => _isString(ext.fileURL))

    if (!_isEmpty(filteredExtensions)) {
      const processedExtensions = _map(filteredExtensions, (ext) => {
        const { id: extId, fileURL } = ext
        return {
          id: extId,
          cdnURL: `${CDN_URL}file/${fileURL}`,
        }
      })

      // temp fix until it's deployed so I could change it in SDK and extensions too
      const processPanelId = (id: string) => {
        if (id === 'ce') {
          return 'metadata'
        }
        return id
      }

      sdk = new SwetrixSDK(
        processedExtensions,
        {
          debug: isDevelopment,
        },
        {
          onAddExportDataRow: (label: any, onClick: (e: any) => void) => {
            setCustomExportTypes((prev) => {
              // TODO: Fix this
              // A temporary measure to prevent duplicate items stored here (for some reason, SDK is initialised two times)
              return _uniqBy(
                [
                  {
                    label,
                    onClick,
                  },
                  ...prev,
                ],
                'label',
              )
            })
          },
          onRemoveExportDataRow: (label: any) => {
            setCustomExportTypes((prev) => _filter(prev, (row) => row.label !== label))
          },
          onAddPanelTab: (extensionID: string, panelID: string, tabContent?: string, onOpen?: () => void) => {
            const processedPanelID = processPanelId(panelID)
            setCustomPanelTabs((prev) =>
              removeDuplicates(
                [
                  ...prev,
                  {
                    extensionID,
                    panelID: processedPanelID,
                    tabContent,
                    onOpen,
                  },
                ],
                ['extensionID', 'panelID'],
              ),
            )
          },
          onUpdatePanelTab: (extensionID: string, panelID: string, tabContent: any) => {
            const processedPanelID = processPanelId(panelID)
            setCustomPanelTabs((prev) =>
              _map(prev, (row) => {
                if (row.extensionID === extensionID && row.panelID === processedPanelID) {
                  return {
                    ...row,
                    tabContent,
                  }
                }

                return row
              }),
            )
          },
          onRemovePanelTab: (extensionID: string, panelID: string) => {
            const processedPanelID = processPanelId(panelID)
            setCustomPanelTabs((prev) =>
              _filter(prev, (row) => row.extensionID !== extensionID && row.panelID !== processedPanelID),
            )
          },
        },
      )
      setSdkInstance(sdk)
    }

    return () => {
      if (sdk) {
        sdk._destroy()
      }
    }
  }, [extensions])

  useEffect(() => {
    sdkInstance?._emitEvent('timeupdate', {
      period,
      timeBucket,
      dateRange: period === 'custom' ? dateRange : null,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdkInstance])

  useEffect(() => {
    sdkInstance?._emitEvent('clientinfo', {
      language,
      theme,
    })
  }, [sdkInstance, language, theme])

  useEffect(() => {
    if (_isEmpty(project)) {
      return
    }

    const { active: isActive, created, public: isPublic, name } = project

    sdkInstance?._emitEvent('projectinfo', {
      id: project.id,
      name,
      isActive,
      created,
      isPublic,
    })
  }, [sdkInstance, project])

  useEffect(() => {
    setPeriodPairsCompare(tbPeriodPairsCompare(t, undefined, language))
  }, [t, language])

  // Reset isAutoRefreshing when loading completes
  useEffect(() => {
    if (!dataLoading) {
      setIsAutoRefreshing(false)
    }
  }, [dataLoading])

  // We can assume period provided is never custom, as it's handled separately in the Datepicker callback function
  const updatePeriod = ({ period: newPeriod }: { period: Period }) => {
    if (period === newPeriod) {
      return
    }

    const newSearchParams = new URLSearchParams(searchParams.toString())
    newSearchParams.delete('from')
    newSearchParams.delete('to')
    newSearchParams.set('period', newPeriod)

    updatePreferences({
      period: newPeriod,
      rangeDate: undefined,
    })

    sdkInstance?._emitEvent('timeupdate', {
      period: newPeriod,
      dateRange: null,
    })

    setSearchParams(newSearchParams)
  }

  const updateTimebucket = (newTimebucket: TimeBucket) => {
    if (dataLoading) {
      return
    }

    const newSearchParams = new URLSearchParams(searchParams.toString())
    newSearchParams.set('timeBucket', newTimebucket)
    setSearchParams(newSearchParams)

    updatePreferences({
      timeBucket: newTimebucket,
    })
    sdkInstance?._emitEvent('timeupdate', {
      period,
      timeBucket: newTimebucket,
      dateRange,
    })
  }

  const openSettingsHandler = () => {
    navigate(_replace(routes.project_settings, ':id', id))
  }

  const onMainChartZoom = (domain: [Date, Date] | null) => {
    if (!domain) {
      return
    }

    const [from, to] = domain
    const newSearchParams = new URLSearchParams(searchParams.toString())

    // Format dates based on time bucket precision
    let fromFormatted = from.toISOString().split('T')[0] + 'T00:00:00.000Z'
    let toFormatted = to.toISOString().split('T')[0] + 'T23:59:59.999Z'

    newSearchParams.set('from', fromFormatted)
    newSearchParams.set('to', toFormatted)
    newSearchParams.set('period', 'custom')
    setSearchParams(newSearchParams)
  }

  // Detect touch-capable devices (mobile/tablets) to avoid accidental zoom while scrolling
  const isTouchDevice = useMemo(() => {
    if (typeof window === 'undefined') return false
    const hasTouchEvent = 'ontouchstart' in window
    const hasMaxTouchPoints = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0
    const coarsePointer = window.matchMedia ? window.matchMedia('(pointer: coarse)').matches : false
    return hasTouchEvent || hasMaxTouchPoints || coarsePointer
  }, [])

  const shouldEnableZoom = useMemo(() => {
    if (isTouchDevice) {
      return false
    }

    if (period !== 'custom' || !dateRange) {
      return true
    }

    // Enable zoom only if the range is more than 1 day
    const daysDiff = Math.ceil((dateRange[1].getTime() - dateRange[0].getTime()) / (1000 * 3600 * 24))
    return daysDiff > 1
  }, [period, dateRange, isTouchDevice])

  const getFilterLink = (column: string, value: string | null): LinkProps['to'] => {
    const isFilterActive = filters.findIndex((filter) => filter.column === column && filter.filter === value) >= 0

    const newSearchParams = new URLSearchParams(searchParams.toString())
    let searchString = ''

    if (isFilterActive) {
      newSearchParams.delete(column, value ?? 'null')
      newSearchParams.delete(`!${column}`, value ?? 'null')
      newSearchParams.delete(`~${column}`, value ?? 'null')
      newSearchParams.delete(`^${column}`, value ?? 'null')
      searchString = newSearchParams.toString()
    } else {
      newSearchParams.append(column, value ?? 'null')
      searchString = newSearchParams.toString()
    }

    return {
      search: searchString,
    }
  }

  const exportTypes = [
    {
      label: t('project.asCSV'),
      onClick: () => {
        if (activeTab === PROJECT_TABS.performance) {
          return onCSVExportClick(panelsDataPerf, id, tnMapping, language)
        }
        return onCSVExportClick(panelsData, id, tnMapping, language)
      },
    },
  ]

  const setChartTypeOnClick = (type: keyof typeof chartTypes) => {
    setItem('chartType', type)
    setChartType(type)
  }

  const resetDateRange = () => {
    const newSearchParams = new URLSearchParams(searchParams.toString())
    newSearchParams.delete('from')
    newSearchParams.delete('to')
    setSearchParams(newSearchParams)
  }

  /* KEYBOARD SHORTCUTS */
  const generalShortcutsActions = {
    B: () => setChartTypeOnClick(chartTypes.bar),
    '∫': () => setChartTypeOnClick(chartTypes.bar),
    L: () => setChartTypeOnClick(chartTypes.line),
    '¬': () => setChartTypeOnClick(chartTypes.line),
    S: () => setShowFiltersSearch(true),
    ß: () => setShowFiltersSearch(true),
    r: refreshStats,
  }

  const timebucketShortcutsMap = {
    h: '1h',
    t: 'today',
    y: 'yesterday',
    d: '1d',
    w: '7d',
    m: '4w',
    q: '3M',
    l: '12M',
    z: '24M',
    a: 'all',
    u: 'custom',
    c: 'compare',
  }

  // 'Keyboard shortcuts' help modal
  useHotkeys('shift+?', () => {
    setIsHotkeysHelpOpened((val) => !val)
  })

  // 'Tabs switching' shortcuts
  useHotkeys(SHORTCUTS_TABS_LISTENERS, ({ key }) => {
    if (key === 'E') {
      openSettingsHandler()
      return
    }

    // @ts-expect-error
    const tab = SHORTCUTS_TABS_MAP[key]

    if (!tab) {
      return
    }

    setDashboardTab(tab)
  })

  // 'General' shortcuts
  useHotkeys(SHORTCUTS_GENERAL_LISTENERS, ({ key }) => {
    // @ts-expect-error
    generalShortcutsActions[key]?.()
  })

  // 'Timebuckets selection' shortcuts
  useHotkeys(SHORTCUTS_TIMEBUCKETS_LISTENERS, ({ key }) => {
    const pairs = tbPeriodPairs(t, undefined, undefined, language)
    // @ts-expect-error
    const pair = _find(pairs, ({ period }) => period === timebucketShortcutsMap[key])

    if (!pair) {
      return
    }

    if (pair.isCustomDate) {
      // @ts-expect-error
      refCalendar.current?.openCalendar?.()
      return
    }

    if (pair.period === 'compare') {
      if (activeTab === PROJECT_TABS.alerts) {
        return
      }

      if (isActiveCompare) {
        compareDisable()
      } else {
        setIsActiveCompare(true)
      }

      return
    }

    resetDateRange()

    updatePeriod(pair)
  })

  // Mobile tab selector dropdown
  const MobileTabSelector = () => (
    <div className='mb-4 md:hidden'>
      <Select
        items={tabs}
        keyExtractor={(item) => item.id}
        labelExtractor={(item) => item.label}
        onSelect={(item) => {
          if (item.id === 'settings') {
            openSettingsHandler()
            return
          }

          setDashboardTab(item?.id)
        }}
        title={activeTabLabel}
        capitalise
        selectedItem={tabs.find((tab) => tab.id === activeTab)}
      />
    </div>
  )

  if (authLoading || !project) {
    return (
      <>
        {!isEmbedded ? <Header /> : null}
        <div
          className={cx('flex flex-col bg-gray-50 dark:bg-slate-900', {
            'min-h-including-header': !isEmbedded,
            'min-h-[100vh]': isEmbedded,
          })}
        >
          <Loader />
        </div>
        {!isEmbedded ? <Footer /> : null}
      </>
    )
  }

  if (project.isLocked) {
    return (
      <>
        {!isEmbedded ? <Header /> : null}
        <div
          className={cx('flex bg-gray-50 dark:bg-slate-900', {
            'min-h-including-header': !isEmbedded,
            'min-h-[100vh]': isEmbedded,
          })}
        >
          {/* Desktop Sidebar */}
          <div className='h-including-header sticky top-0 hidden md:block'>
            <ProjectSidebar
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={setDashboardTab}
              projectId={id}
              projectName={project.name}
              dataLoading={dataLoading}
              searchParams={searchParams}
              allowedToManage={allowedToManage}
            />
          </div>
          {/* Main Content */}
          <div className='flex flex-1 flex-col px-4 py-2 sm:px-6 lg:px-8'>
            <MobileTabSelector />
            <LockedDashboard />
          </div>
        </div>
        {!isEmbedded ? <Footer /> : null}
      </>
    )
  }

  if (
    !project.isDataExists &&
    activeTab !== PROJECT_TABS.errors &&
    !(activeTab === PROJECT_TABS.captcha && project.isCaptchaDataExists) &&
    !analyticsLoading
  ) {
    return (
      <>
        {!isEmbedded ? <Header /> : null}
        <div
          className={cx('flex bg-gray-50 dark:bg-slate-900', {
            'min-h-including-header': !isEmbedded,
            'min-h-[100vh]': isEmbedded,
          })}
        >
          {/* Desktop Sidebar */}
          <div className='h-including-header sticky top-0 hidden md:block'>
            <ProjectSidebar
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={setDashboardTab}
              projectId={id}
              projectName={project.name}
              dataLoading={dataLoading}
              searchParams={searchParams}
              allowedToManage={allowedToManage}
            />
          </div>
          {/* Main Content */}
          <div className='flex flex-1 flex-col px-4 py-2 sm:px-6 lg:px-8'>
            <MobileTabSelector />
            <WaitingForAnEvent />
          </div>
        </div>
        {!isEmbedded ? <Footer /> : null}
      </>
    )
  }

  return (
    <ClientOnly>
      {() => (
        <ViewProjectContext.Provider
          value={{
            // States
            timezone,
            dateRange,
            isLoading: authLoading,
            timeBucket,
            period,
            activePeriod,
            periodPairs,
            timeFormat,
            size,
            dataLoading,
            activeTab,
            filters,
            customPanelTabs,
            captchaRefreshTrigger,
            goalsRefreshTrigger,
            featureFlagsRefreshTrigger,
            sessionsRefreshTrigger,

            // Functions
            updatePeriod,
            updateTimebucket,

            // Refs
            refCalendar,
          }}
        >
          <>
            {(dataLoading && !isAutoRefreshing) || (profilesLoading && !_isEmpty(profiles)) ? <LoadingBar /> : null}
            {!isEmbedded ? <Header /> : null}
            <EventsRunningOutBanner />
            <div
              ref={ref}
              className={cx('flex bg-gray-50 dark:bg-slate-900', {
                'min-h-[100vh]': analyticsLoading && isEmbedded,
              })}
            >
              {/* Desktop Sidebar */}
              <div className='h-including-header sticky top-0 hidden md:block'>
                <ProjectSidebar
                  tabs={tabs}
                  activeTab={activeTab}
                  onTabChange={setDashboardTab}
                  projectId={id}
                  projectName={project.name}
                  dataLoading={dataLoading}
                  searchParams={searchParams}
                  allowedToManage={allowedToManage}
                />
              </div>
              {/* Main Content */}
              <div
                className={cx('flex flex-1 flex-col px-4 py-2 sm:px-6 lg:px-8', {
                  'min-h-including-header': !isEmbedded,
                  'min-h-[100vh]': isEmbedded,
                })}
                ref={dashboardRef}
              >
                <MobileTabSelector />
                <AnimatePresence mode='wait'>
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {activeTab !== PROJECT_TABS.alerts &&
                    activeTab !== PROJECT_TABS.ai &&
                    (activeTab !== PROJECT_TABS.sessions || !activePSID) &&
                    (activeFunnel || activeTab !== PROJECT_TABS.funnels) ? (
                      <>
                        <div className='relative top-0 z-20 -mt-2 flex flex-col items-center justify-between bg-gray-50/50 py-2 backdrop-blur-md lg:sticky lg:flex-row dark:bg-slate-900/50'>
                          <div className='flex flex-wrap items-center justify-center gap-2'>
                            {activeTab === PROJECT_TABS.funnels ? (
                              <Text as='h2' size='xl' weight='bold' className='break-words break-all'>
                                {activeFunnel?.name}
                              </Text>
                            ) : null}
                            {activeTab !== PROJECT_TABS.funnels ? <LiveVisitorsDropdown /> : null}
                          </div>
                          <div className='mx-auto mt-3 flex w-full max-w-[420px] flex-wrap items-center justify-center gap-x-2 gap-y-1 sm:mx-0 sm:w-auto sm:max-w-none sm:flex-nowrap sm:justify-between lg:mt-0'>
                            {activeTab !== PROJECT_TABS.funnels ? (
                              <>
                                <RefreshStatsButton onRefresh={refreshStats} />
                                <div
                                  className={cx('border-gray-200 dark:border-gray-600', {
                                    // @ts-expect-error
                                    'lg:border-r': activeTab === PROJECT_TABS.funnels,
                                    hidden: activeTab === PROJECT_TABS.errors,
                                  })}
                                >
                                  <button
                                    type='button'
                                    title={t('project.search')}
                                    onClick={() => {
                                      if (dataLoading) {
                                        return
                                      }

                                      setShowFiltersSearch(true)
                                    }}
                                    className={cx(
                                      'relative rounded-md border border-transparent p-2 text-sm font-medium transition-colors hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200',
                                      {
                                        'cursor-not-allowed opacity-50': authLoading || dataLoading,
                                      },
                                    )}
                                  >
                                    <SearchIcon className='h-5 w-5 text-gray-700 dark:text-gray-50' />
                                  </button>
                                </div>
                                {activeTab === PROJECT_TABS.traffic ? (
                                  <Dropdown
                                    header={t('project.segments')}
                                    onClick={() => loadProjectViews()}
                                    loading={projectViewsLoading || projectViewsLoading === null}
                                    items={_filter(
                                      [
                                        ...projectViews,
                                        allowedToManage && {
                                          id: 'add-a-view',
                                          name: t('project.addASegment'),
                                          createView: true,
                                        },
                                        !allowedToManage &&
                                          _isEmpty(projectViews) && {
                                            id: 'no-views',
                                            name: t('project.noSegmentsYet'),
                                            notClickable: true,
                                          },
                                      ],
                                      (x) => !!x,
                                    )}
                                    title={[<BookmarkIcon key='bookmark-icon' className='h-5 w-5' />]}
                                    labelExtractor={(item, close) => {
                                      // @ts-expect-error
                                      if (item.createView) {
                                        return item.name
                                      }

                                      if (item.id === 'no-views') {
                                        return <Text colour='secondary'>{item.name}</Text>
                                      }

                                      return (
                                        <div
                                          className={cx('flex items-center justify-between space-x-4', {
                                            'cursor-wait': dataLoading,
                                          })}
                                        >
                                          <span>{item.name}</span>
                                          {allowedToManage ? (
                                            <div className='flex cursor-pointer space-x-1'>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  setProjectViewToUpdate(item)
                                                  close()
                                                  setIsAddAViewOpened(true)
                                                }}
                                                aria-label={t('common.settings')}
                                                className='rounded-md p-1 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                                              >
                                                <PencilIcon className='size-3' />
                                              </button>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  close()
                                                  onProjectViewDelete(item.id)
                                                }}
                                                aria-label={t('common.settings')}
                                                className={cx(
                                                  'rounded-md p-1 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-slate-800 dark:hover:text-slate-200',
                                                  {
                                                    'cursor-not-allowed': projectViewDeleting,
                                                  },
                                                )}
                                              >
                                                <Trash2Icon className='size-3' />
                                              </button>
                                            </div>
                                          ) : null}
                                        </div>
                                      )
                                    }}
                                    keyExtractor={(item) => item.id}
                                    onSelect={(item: ProjectView, e) => {
                                      // @ts-expect-error
                                      if (item.createView) {
                                        e?.stopPropagation()
                                        setIsAddAViewOpened(true)

                                        return
                                      }

                                      if (item.filters && !_isEmpty(item.filters)) {
                                        const newUrlParams = getFiltersUrlParams(
                                          filters,
                                          item.filters,
                                          true,
                                          searchParams,
                                        )
                                        setSearchParams(newUrlParams)
                                      }

                                      if (item.customEvents && !_isEmpty(item.customEvents)) {
                                        onCustomMetric(item.customEvents)
                                      }
                                    }}
                                    chevron='mini'
                                    buttonClassName='!p-2 rounded-md hover:bg-white border border-gray-50/0 hover:border-gray-300 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:z-10 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:dark:ring-gray-200'
                                    headless
                                  />
                                ) : null}
                                {_includes([PROJECT_TABS.traffic, PROJECT_TABS.performance], activeTab) ? (
                                  <Dropdown
                                    header={t('project.exportData')}
                                    items={_filter(
                                      [
                                        ...exportTypes,
                                        ...customExportTypes,
                                        !isSelfhosted && {
                                          label: t('project.lookingForMore'),
                                          lookingForMore: true,
                                          onClick: () => {},
                                        },
                                      ],
                                      (el) => !!el,
                                    )}
                                    title={[<DownloadIcon key='download-icon' className='h-5 w-5' />]}
                                    labelExtractor={(item) => item.label}
                                    keyExtractor={(item) => item.label}
                                    onSelect={(item, e) => {
                                      // @ts-expect-error lookingForMore is defined as an exception above
                                      if (item.lookingForMore) {
                                        e?.stopPropagation()
                                        window.open(MARKETPLACE_URL, '_blank')

                                        return
                                      }

                                      trackCustom('DASHBOARD_EXPORT', {
                                        type: item.label === t('project.asCSV') ? 'csv' : 'extension',
                                      })

                                      item.onClick(panelsData, t)
                                    }}
                                    chevron='mini'
                                    buttonClassName='!p-2 rounded-md hover:bg-white border border-gray-50/0 hover:border-gray-300 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:z-10 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:dark:ring-gray-200'
                                    headless
                                  />
                                ) : null}
                              </>
                            ) : null}
                            {activeTab === PROJECT_TABS.funnels ? (
                              <RefreshStatsButton onRefresh={refreshStats} />
                            ) : null}
                            <div className='flex items-center'>
                              <TBPeriodSelector
                                classes={{
                                  timeBucket: activeTab === PROJECT_TABS.errors ? 'hidden' : '',
                                }}
                                activePeriod={activePeriod}
                                items={timeBucketSelectorItems}
                                title={activePeriod?.label}
                                onSelect={(pair) => {
                                  if (dataLoading) {
                                    return
                                  }

                                  if (pair.period === PERIOD_PAIRS_COMPARE.COMPARE) {
                                    // @ts-expect-error
                                    if (activeTab === PROJECT_TABS.alerts) {
                                      return
                                    }

                                    if (isActiveCompare) {
                                      compareDisable()
                                    } else {
                                      setIsActiveCompare(true)
                                    }

                                    return
                                  }

                                  if (pair.isCustomDate) {
                                    setTimeout(() => {
                                      // @ts-expect-error
                                      refCalendar.current.openCalendar()
                                    }, 100)
                                  } else {
                                    resetDateRange()
                                    updatePeriod(pair)
                                  }
                                }}
                              />
                              <DatePicker
                                ref={refCalendar}
                                onChange={([from, to]) => {
                                  const newSearchParams = new URLSearchParams(searchParams.toString())
                                  newSearchParams.set('from', from.toISOString())
                                  newSearchParams.set('to', to.toISOString())
                                  newSearchParams.set('period', 'custom')
                                  setSearchParams(newSearchParams)
                                }}
                                value={dateRange || []}
                                maxDateMonths={MAX_MONTHS_IN_PAST}
                                maxRange={0}
                              />
                              <DatePicker
                                ref={refCalendarCompare}
                                onChange={(date) => {
                                  setDateRangeCompare(date)
                                  setActivePeriodCompare(PERIOD_PAIRS_COMPARE.CUSTOM)
                                  setPeriodPairsCompare(tbPeriodPairsCompare(t, date, language))
                                }}
                                value={dateRangeCompare || []}
                                maxDateMonths={MAX_MONTHS_IN_PAST}
                                maxRange={maxRangeCompare}
                              />
                            </div>
                            {isActiveCompare && activeTab !== PROJECT_TABS.errors ? (
                              <>
                                <div className='text-md mx-2 font-medium whitespace-pre-line text-gray-600 dark:text-gray-200'>
                                  vs
                                </div>
                                <Dropdown
                                  items={periodPairsCompare}
                                  title={activeDropdownLabelCompare}
                                  labelExtractor={(pair) => pair.label}
                                  keyExtractor={(pair) => pair.label}
                                  onSelect={(pair) => {
                                    if (pair.period === PERIOD_PAIRS_COMPARE.DISABLE) {
                                      compareDisable()
                                      return
                                    }

                                    if (pair.period === PERIOD_PAIRS_COMPARE.CUSTOM) {
                                      setTimeout(() => {
                                        // @ts-expect-error
                                        refCalendarCompare.current.openCalendar()
                                      }, 100)
                                    } else {
                                      setPeriodPairsCompare(tbPeriodPairsCompare(t, undefined, language))
                                      setDateRangeCompare(null)
                                      setActivePeriodCompare(pair.period)
                                    }
                                  }}
                                  chevron='mini'
                                  headless
                                />
                              </>
                            ) : null}
                          </div>
                        </div>
                        {activeTab === PROJECT_TABS.funnels ? (
                          <div className='mx-auto mt-2 mb-4 flex max-w-max items-center space-x-4 lg:mx-0'>
                            <Link
                              to={{
                                search: pureSearchParams,
                              }}
                              className='flex items-center text-sm text-gray-900 underline decoration-dashed hover:decoration-solid dark:text-gray-100'
                            >
                              <ChevronLeftIcon className='mr-1 size-3' />
                              {t('project.backToFunnels')}
                            </Link>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                    {activeTab === PROJECT_TABS.alerts && (project.role !== 'owner' || !isAuthenticated) ? (
                      <div className='mt-5 rounded-xl bg-gray-700 p-5'>
                        <div className='flex items-center text-gray-50'>
                          <BellRingIcon className='mr-2 h-8 w-8' strokeWidth={1.5} />
                          <p className='text-3xl font-bold'>{t('dashboard.alerts')}</p>
                        </div>
                        <p className='mt-2 text-sm whitespace-pre-wrap text-gray-100'>{t('dashboard.alertsDesc')}</p>
                        <Link
                          to={routes.signup}
                          className='mt-6 block max-w-max rounded-md border border-transparent bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-indigo-50 md:px-4'
                          aria-label={t('titles.signup')}
                        >
                          {t('header.startForFree')}
                        </Link>
                      </div>
                    ) : null}
                    {activeTab === PROJECT_TABS.funnels && !activeFunnel && !_isEmpty(project.funnels) ? (
                      <FunnelsList
                        openFunnelSettings={(funnel?: Funnel) => {
                          if (funnel) {
                            setFunnelToEdit(funnel)
                            setIsNewFunnelOpened(true)
                            return
                          }

                          setIsNewFunnelOpened(true)
                        }}
                        funnels={project.funnels}
                        deleteFunnel={onFunnelDelete}
                        loading={funnelActionLoading}
                        allowedToManage={allowedToManage}
                      />
                    ) : null}
                    {activeTab === PROJECT_TABS.funnels && !activeFunnel && _isEmpty(project.funnels) ? (
                      <div className='mt-5 rounded-xl bg-gray-700 p-5'>
                        <div className='flex items-center text-gray-50'>
                          <FilterIcon className='mr-2 h-8 w-8' strokeWidth={1.5} />
                          <p className='text-3xl font-bold'>{t('dashboard.funnels')}</p>
                        </div>
                        <p className='mt-2 text-sm whitespace-pre-wrap text-gray-100'>{t('dashboard.funnelsDesc')}</p>
                        {isAuthenticated ? (
                          <button
                            type='button'
                            onClick={() => setIsNewFunnelOpened(true)}
                            className='mt-6 block max-w-max rounded-md border border-transparent bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-indigo-50 md:px-4'
                          >
                            {t('dashboard.newFunnel')}
                          </button>
                        ) : (
                          <Link
                            to={routes.signup}
                            className='mt-6 block max-w-max rounded-md border border-transparent bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-indigo-50 md:px-4'
                            aria-label={t('titles.signup')}
                          >
                            {t('header.startForFree')}
                          </Link>
                        )}
                      </div>
                    ) : null}
                    {activeTab === PROJECT_TABS.profiles && !activeProfileId ? (
                      <>
                        <UsersFilter
                          profileType={profileTypeFilter}
                          onProfileTypeChange={(type) => {
                            setProfileTypeFilter(type)
                            setProfilesSkip(0)
                          }}
                        />
                        {(profilesLoading === null || profilesLoading) && _isEmpty(profiles) ? <Loader /> : null}
                        {typeof profilesLoading === 'boolean' && !profilesLoading && _isEmpty(profiles) ? (
                          <NoEvents filters={filters} />
                        ) : null}
                        <Users profiles={profiles} timeFormat={timeFormat} />
                        {canLoadMoreProfiles ? (
                          <button
                            type='button'
                            title={t('project.loadMore')}
                            onClick={() => loadProfiles()}
                            className={cx(
                              'relative mx-auto mt-2 flex items-center rounded-md border border-transparent p-2 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:bg-slate-900 dark:text-gray-50 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200',
                              {
                                'cursor-not-allowed opacity-50': profilesLoading || profilesLoading === null,
                                hidden: profilesLoading && _isEmpty(profiles),
                              },
                            )}
                          >
                            <DownloadIcon className='mr-2 h-5 w-5' strokeWidth={1.5} />
                            {t('project.loadMore')}
                          </button>
                        ) : null}
                      </>
                    ) : null}
                    {activeTab === PROJECT_TABS.profiles && activeProfileId ? (
                      <>
                        <div className='mx-auto mt-2 mb-4 flex max-w-max items-center space-x-4 lg:mx-0'>
                          <Link
                            to={{
                              search: (() => {
                                const params = new URLSearchParams(searchParams)
                                params.delete('profileId')
                                return params.toString()
                              })(),
                            }}
                            className='flex items-center text-sm text-gray-900 underline decoration-dashed hover:decoration-solid dark:text-gray-100'
                          >
                            <ChevronLeftIcon className='mr-1 size-3' />
                            {t('project.backToUsers')}
                          </Link>
                          <RefreshStatsButton onRefresh={() => loadProfile(activeProfileId)} />
                        </div>
                        {profileLoading ? (
                          <Loader />
                        ) : (
                          <UserDetails
                            details={activeProfile}
                            sessions={profileSessions}
                            sessionsLoading={profileSessionsLoading}
                            timeFormat={timeFormat}
                            chartType={chartType}
                            onLoadMoreSessions={() => {
                              if (activeProfileId) {
                                loadProfileSessionsData(activeProfileId)
                              }
                            }}
                            canLoadMoreSessions={canLoadMoreProfileSessions}
                          />
                        )}
                      </>
                    ) : null}
                    {activeTab === PROJECT_TABS.sessions ? (
                      <SessionsView tnMapping={tnMapping} chartType={chartType} rotateXAxis={rotateXAxis} />
                    ) : null}
                    {activeTab === PROJECT_TABS.errors ? <ErrorsView /> : null}
                    {activeTab === PROJECT_TABS.alerts && project.role === 'owner' && isAuthenticated ? (
                      <ProjectAlertsView />
                    ) : null}
                    {activeTab === PROJECT_TABS.goals ? (
                      <GoalsView
                        period={period}
                        from={dateRange ? getFormatDate(dateRange[0]) : ''}
                        to={dateRange ? getFormatDate(dateRange[1]) : ''}
                        timezone={timezone}
                      />
                    ) : null}
                    {activeTab === PROJECT_TABS.featureFlags ? (
                      <FeatureFlagsView
                        period={period}
                        from={dateRange ? getFormatDate(dateRange[0]) : ''}
                        to={dateRange ? getFormatDate(dateRange[1]) : ''}
                        timezone={timezone}
                      />
                    ) : null}
                    {activeTab === PROJECT_TABS.ai ? <AskAIView projectId={id} /> : null}
                    {activeTab === PROJECT_TABS.captcha ? <CaptchaView projectId={id} /> : null}
                    {analyticsLoading &&
                    (activeTab === PROJECT_TABS.traffic || activeTab === PROJECT_TABS.performance) ? (
                      <Loader />
                    ) : null}
                    {isPanelsDataEmpty && activeTab === PROJECT_TABS.traffic ? <NoEvents filters={filters} /> : null}
                    {isPanelsDataEmptyPerf && activeTab === PROJECT_TABS.performance ? (
                      <NoEvents filters={filters} />
                    ) : null}
                    {activeTab === PROJECT_TABS.traffic ? (
                      <div className={cx({ hidden: isPanelsDataEmpty || analyticsLoading })}>
                        <div className='relative overflow-hidden rounded-lg border border-gray-300 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-800/25'>
                          <div className='mb-3 flex w-full items-center justify-end gap-2 lg:absolute lg:top-2 lg:right-2 lg:mb-0 lg:w-auto lg:justify-normal'>
                            <Dropdown
                              header={t('project.metricVis')}
                              items={
                                isActiveCompare
                                  ? _filter(chartMetrics, (el) => {
                                      return !_includes(FILTER_CHART_METRICS_MAPPING_FOR_COMPARE, el.id)
                                    })
                                  : chartMetrics
                              }
                              title={[
                                <EyeIcon key='eye-icon' aria-label={t('project.metricVis')} className='h-5 w-5' />,
                              ]}
                              labelExtractor={(pair) => {
                                const { label, id: pairID, active, conflicts } = pair

                                const conflicted = isConflicted(conflicts)

                                if (pairID === CHART_METRICS_MAPPING.customEvents) {
                                  if (_isEmpty(panelsData.customs)) {
                                    return (
                                      <span className='flex cursor-not-allowed items-center p-2'>
                                        <BanIcon className='mr-2 h-4 w-4' strokeWidth={1.5} />
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
                                      label: cx('p-2', { hidden: analyticsLoading }),
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
                              buttonClassName='!px-2 bg-gray-50 rounded-md border border-transparent hover:border-gray-300 hover:bg-white dark:bg-slate-900 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200'
                              selectItemClassName='p-0'
                              keyExtractor={(pair) => pair.id}
                              onSelect={({ id: pairID, conflicts }, e) => {
                                e?.stopPropagation()
                                e?.preventDefault()

                                if (pairID !== CHART_METRICS_MAPPING.customEvents) {
                                  switchTrafficChartMetric(pairID, conflicts)
                                }
                              }}
                              chevron='mini'
                              headless
                            />
                            <ChartTypeSwitcher onSwitch={setChartTypeOnClick} type={chartType} />
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
                            <div onContextMenu={(e) => handleChartContextMenu(e, chartData.x)} className='relative'>
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
                                className='mt-5 h-80 md:mt-0 [&_svg]:!overflow-visible'
                                annotations={annotations}
                              />
                            </div>
                          ) : null}
                        </div>
                        {!isPanelsDataEmpty ? <Filters tnMapping={tnMapping} /> : null}
                        <CustomMetrics
                          metrics={customMetrics}
                          onRemoveMetric={(id) => onRemoveCustomMetric(id)}
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
                                      return <CCRow cc={cc} name={entryName || undefined} language={language} />
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
                                      onTabChange={(tab) =>
                                        setPanelsActiveTabs({
                                          ...panelsActiveTabs,
                                          location: tab as 'cc' | 'rg' | 'ct' | 'lc' | 'map',
                                        })
                                      }
                                      activeTabId={panelsActiveTabs.location}
                                      data={panelsData.data[panelsActiveTabs.location]}
                                      rowMapper={rowMapper}
                                      customRenderer={
                                        panelsActiveTabs.location === 'map'
                                          ? () => {
                                              const countryData = panelsData.data?.cc || []
                                              const regionData = panelsData.data?.rg || []
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
                                      onTabChange={(tab) =>
                                        setPanelsActiveTabs({ ...panelsActiveTabs, device: tab as 'br' | 'os' | 'dv' })
                                      }
                                      activeTabId={panelsActiveTabs.device}
                                      data={panelsData.data[panelsActiveTabs.device]}
                                      rowMapper={getDeviceRowMapper(panelsActiveTabs.device, theme, t)}
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

                                        return decodedUri
                                      }}
                                      name={t('project.pages')}
                                      tabs={pageTabs}
                                      onTabChange={(tab) =>
                                        setPanelsActiveTabs({
                                          ...panelsActiveTabs,
                                          page: tab as 'pg' | 'host' | 'userFlow' | 'entryPage' | 'exitPage',
                                        })
                                      }
                                      activeTabId={panelsActiveTabs.page}
                                      data={panelsData.data[panelsActiveTabs.page]}
                                      customRenderer={
                                        panelsActiveTabs.page === 'userFlow'
                                          ? () => <UserFlow isReversed={false} setReversed={() => {}} />
                                          : undefined
                                      }
                                    />
                                  )
                                }

                                if (type === 'traffic-sources') {
                                  const hasRefNameFilter = filters.some((f) => f.column === 'refn')
                                  const trafficSourcesTabs = [
                                    { id: 'ref', label: t('project.mapping.ref') },
                                    !isSelfhosted && { id: 'keywords', label: t('project.mapping.keywords') },
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
                                      return ({ name: entryName }: any) => <RefRow rowName={entryName} />
                                    }
                                    return ({ name: entryName }: any) => decodeURIComponent(entryName)
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
                                      onTabChange={(tab) =>
                                        setPanelsActiveTabs({
                                          ...panelsActiveTabs,
                                          source: tab as 'ref' | 'so' | 'me' | 'ca' | 'te' | 'co' | 'keywords',
                                        })
                                      }
                                      activeTabId={panelsActiveTabs.source}
                                      data={
                                        panelsActiveTabs.source === 'keywords'
                                          ? keywords
                                          : panelsActiveTabs.source === 'ref'
                                            ? (() => {
                                                const raw = panelsData.data?.ref || []
                                                return hasRefNameFilter
                                                  ? (raw as unknown as Entry[])
                                                  : (groupRefEntries(raw as any) as unknown as Entry[])
                                              })()
                                            : (panelsData.data[panelsActiveTabs.source] as unknown as Entry[])
                                      }
                                      valuesHeaderName={
                                        panelsActiveTabs.source === 'keywords' ? t('project.clicks') : undefined
                                      }
                                      rowMapper={getTrafficSourcesRowMapper(panelsActiveTabs.source)}
                                      disableRowClick={panelsActiveTabs.source === 'keywords'}
                                      hidePercentageInDetails={panelsActiveTabs.source === 'keywords'}
                                      detailsExtraColumns={
                                        panelsActiveTabs.source === 'keywords'
                                          ? [
                                              {
                                                header: t('project.impressions'),
                                                render: (entry: any) => entry.impressions,
                                                sortLabel: 'impressions',
                                                getSortValue: (entry: any) => Number(entry.impressions || 0),
                                              },
                                              {
                                                header: t('project.position'),
                                                render: (entry: any) => entry.position,
                                                sortLabel: 'position',
                                                getSortValue: (entry: any) => Number(entry.position || 0),
                                              },
                                              {
                                                header: t('project.ctr'),
                                                render: (entry: any) => `${entry.ctr}%`,
                                                sortLabel: 'ctr',
                                                getSortValue: (entry: any) => Number(entry.ctr || 0),
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
                                                      {['owner', 'admin'].includes(project?.role || '')
                                                        ? t('project.connectGsc')
                                                        : t('project.gscConnectionRequired')}
                                                    </p>
                                                    {['owner', 'admin'].includes(project?.role || '') ? (
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
                          {!_isEmpty(panelsData.data) ? (
                            <MetadataGeneric
                              customs={panelsData.customs}
                              properties={panelsData.properties}
                              filters={filters}
                              getFilterLink={getFilterLink}
                              chartData={chartData}
                              getCustomEventMetadata={getCustomEventMetadata}
                              getPropertyMetadata={_getPropertyMetadata}
                              onTabChange={(tab) => setPanelTab('metadata', tab as 'ce' | 'props')}
                              activeTabId={panelsActiveTabs.metadata}
                            />
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    {activeTab === PROJECT_TABS.performance ? (
                      <div className={cx('pt-2', { hidden: isPanelsDataEmptyPerf || analyticsLoading })}>
                        <div className='relative overflow-hidden rounded-lg border border-gray-300 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-800/25'>
                          <div className='mb-3 flex w-full items-center justify-end gap-2 lg:absolute lg:top-2 lg:right-2 lg:mb-0 lg:w-auto lg:justify-normal'>
                            <Dropdown
                              items={chartMetricsPerf}
                              className='xs:min-w-0'
                              header={t('main.metric')}
                              title={[
                                <EyeIcon key='eye-icon' aria-label={t('project.metricVis')} className='h-5 w-5' />,
                              ]}
                              labelExtractor={(pair) => pair.label}
                              keyExtractor={(pair) => pair.id}
                              onSelect={({ id: pairID }) => {
                                setActiveChartMetricsPerf(pairID)
                              }}
                              buttonClassName='!px-2 bg-gray-50 rounded-md border border-transparent hover:border-gray-300 hover:bg-white dark:bg-slate-900 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200'
                              chevron='mini'
                              headless
                            />
                            <Dropdown
                              disabled={activeChartMetricsPerf === CHART_METRICS_MAPPING_PERF.quantiles}
                              items={chartMeasuresPerf}
                              className='xs:min-w-0'
                              header={t('project.aggregation')}
                              title={[
                                <PercentIcon
                                  key='percent-icon'
                                  aria-label={t('project.aggregation')}
                                  className='h-5 w-5'
                                />,
                              ]}
                              labelExtractor={(pair) => pair.label}
                              keyExtractor={(pair) => pair.id}
                              onSelect={({ id: pairID }) => {
                                setActivePerfMeasure(pairID)
                              }}
                              buttonClassName='!px-2 bg-gray-50 rounded-md border border-transparent hover:border-gray-300 hover:bg-white dark:bg-slate-900 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200'
                              chevron='mini'
                              headless
                            />
                            <ChartTypeSwitcher onSwitch={setChartTypeOnClick} type={chartType} />
                          </div>

                          {!_isEmpty(overallPerformance) ? (
                            <PerformanceMetricCards
                              overall={overallPerformance}
                              overallCompare={overallPerformanceCompare}
                              activePeriodCompare={activePeriodCompare}
                            />
                          ) : null}
                          {!checkIfAllMetricsAreDisabled && !_isEmpty(chartDataPerf) ? (
                            <div
                              onContextMenu={(e) => handleChartContextMenu(e, chartDataPerf?.x)}
                              className='relative'
                            >
                              <PerformanceChart
                                chart={chartDataPerf}
                                timeBucket={timeBucket}
                                activeChartMetrics={activeChartMetricsPerf}
                                rotateXAxis={rotateXAxis}
                                chartType={chartType}
                                timeFormat={timeFormat}
                                compareChart={dataChartPerfCompare}
                                onZoom={onMainChartZoom}
                                enableZoom={shouldEnableZoom}
                                dataNames={dataNamesPerf}
                                className='mt-5 h-80 md:mt-0 [&_svg]:!overflow-visible'
                                annotations={annotations}
                              />
                            </div>
                          ) : null}
                        </div>
                        {!isPanelsDataEmptyPerf ? <Filters tnMapping={tnMapping} /> : null}
                        <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
                          {!_isEmpty(panelsDataPerf.types)
                            ? _map(PERFORMANCE_PANELS_ORDER, (type: keyof typeof tnMapping) => {
                                if (type === 'location') {
                                  const locationTabs = [
                                    { id: 'cc', label: t('project.mapping.cc') },
                                    { id: 'rg', label: t('project.mapping.rg') },
                                    { id: 'ct', label: t('project.mapping.ct') },
                                    { id: 'map', label: 'Map' },
                                  ]

                                  const rowMapper = (entry: CountryEntry) => {
                                    const { name: entryName, cc } = entry

                                    if (cc !== undefined) {
                                      return <CCRow cc={cc} name={entryName || undefined} language={language} />
                                    }

                                    return <CCRow cc={entryName} language={language} />
                                  }

                                  return (
                                    <Panel
                                      key={performanceActiveTabs.location}
                                      icon={panelIconMapping.cc}
                                      id={performanceActiveTabs.location}
                                      getFilterLink={getFilterLink}
                                      name={t('project.location')}
                                      tabs={locationTabs}
                                      onTabChange={(tab) =>
                                        setPerformanceActiveTabs({
                                          ...performanceActiveTabs,
                                          location: tab as 'cc' | 'rg' | 'ct' | 'map',
                                        })
                                      }
                                      activeTabId={performanceActiveTabs.location}
                                      data={panelsDataPerf.data[performanceActiveTabs.location]}
                                      rowMapper={rowMapper}
                                      // @ts-expect-error
                                      valueMapper={(value) => getStringFromTime(getTimeFromSeconds(value), true)}
                                      customRenderer={
                                        performanceActiveTabs.location === 'map'
                                          ? () => {
                                              const countryData = panelsDataPerf.data?.cc || []
                                              const regionData = panelsDataPerf.data?.rg || []
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
                                      valuesHeaderName={t('project.loadTime')}
                                      highlightColour='orange'
                                    />
                                  )
                                }

                                if (type === 'devices') {
                                  const deviceTabs = [
                                    { id: 'br', label: t('project.mapping.br') },
                                    { id: 'dv', label: t('project.mapping.dv') },
                                  ]

                                  return (
                                    <Panel
                                      key={performanceActiveTabs.device}
                                      icon={panelIconMapping.os}
                                      id={performanceActiveTabs.device}
                                      getFilterLink={getFilterLink}
                                      name={t('project.devices')}
                                      tabs={deviceTabs}
                                      onTabChange={(tab) =>
                                        setPerformanceActiveTabs({
                                          ...performanceActiveTabs,
                                          device: tab as 'br' | 'dv',
                                        })
                                      }
                                      activeTabId={performanceActiveTabs.device}
                                      data={panelsDataPerf.data[performanceActiveTabs.device]}
                                      rowMapper={getDeviceRowMapper(performanceActiveTabs.device, theme, t)}
                                      capitalize={performanceActiveTabs.device === 'dv'}
                                      // @ts-expect-error
                                      valueMapper={(value) => getStringFromTime(getTimeFromSeconds(value), true)}
                                      versionData={
                                        performanceActiveTabs.device === 'br'
                                          ? createVersionDataMapping.browserVersions
                                          : undefined
                                      }
                                      getVersionFilterLink={(parent, version) =>
                                        getVersionFilterLink(parent, version, 'br')
                                      }
                                      valuesHeaderName={t('project.loadTime')}
                                      highlightColour='orange'
                                    />
                                  )
                                }

                                if (type === 'pg') {
                                  const pageTabs = [
                                    { id: 'pg', label: t('project.mapping.pg') },
                                    {
                                      id: 'host',
                                      label: t('project.mapping.host'),
                                    },
                                  ]

                                  return (
                                    <Panel
                                      key={performanceActiveTabs.page}
                                      icon={panelIconMapping.pg}
                                      id={performanceActiveTabs.page}
                                      getFilterLink={getFilterLink}
                                      rowMapper={({ name: entryName }) => {
                                        if (!entryName) {
                                          return (
                                            <span className='italic'>
                                              {panelsActiveTabs.page === 'pg'
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
                                        setPerformanceActiveTabs({
                                          ...performanceActiveTabs,
                                          page: tab as 'pg' | 'host',
                                        })
                                      }
                                      activeTabId={performanceActiveTabs.page}
                                      data={panelsDataPerf.data[performanceActiveTabs.page]}
                                      // @ts-expect-error
                                      valueMapper={(value) => getStringFromTime(getTimeFromSeconds(value), true)}
                                      valuesHeaderName={t('project.loadTime')}
                                      highlightColour='orange'
                                    />
                                  )
                                }

                                return null
                              })
                            : null}
                        </div>
                      </div>
                    ) : null}
                    {activeTab === PROJECT_TABS.funnels ? (
                      <div
                        className={cx(
                          'relative overflow-hidden rounded-lg border border-gray-300 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-800/25',
                          { hidden: !activeFunnel || analyticsLoading },
                        )}
                      >
                        {funnelSummary ? (
                          <>
                            <p className='font-medium text-gray-900 lg:text-left dark:text-gray-50'>
                              {t('project.funnelSummary.xStepFunnel', { x: funnelSummary.stepsCount })}
                              <span className='mx-2 text-gray-400'>•</span>
                              {t('project.funnelSummary.conversionRateShort', { x: funnelSummary.conversionRate })}
                            </p>
                            <p className='text-center text-gray-900 lg:text-left dark:text-gray-50'>
                              {t('project.funnelSummary.startShort')}: {nLocaleFormatter(funnelSummary.startVisitors)}
                              <span className='mx-1'>→</span>
                              {t('project.funnelSummary.endShort')}: {nLocaleFormatter(funnelSummary.endVisitors)}
                            </p>
                          </>
                        ) : null}
                        {funnelAnalytics?.funnel ? (
                          <FunnelChart
                            funnel={funnelAnalytics.funnel}
                            totalPageviews={funnelAnalytics.totalPageviews}
                            t={t}
                            className='mt-5 h-80 [&_svg]:!overflow-visible'
                          />
                        ) : null}
                      </div>
                    ) : null}
                  </motion.div>
                </AnimatePresence>

                {isEmbedded ? null : (
                  <>
                    <div className='flex-1' />
                    <div className='mt-4 flex w-full items-center justify-between gap-2'>
                      <Dropdown
                        items={whitelist}
                        buttonClassName='relative rounded-md border border-transparent bg-gray-50 p-2 hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:bg-slate-900 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200 inline-flex items-center [&>svg]:w-4 [&>svg]:h-4 [&>svg]:mr-0 [&>svg]:ml-1 font-medium !text-sm text-slate-900 dark:text-gray-50'
                        title={
                          <span className='inline-flex items-center'>
                            <Flag
                              className='mr-2 rounded-xs'
                              country={languageFlag[language]}
                              size={16}
                              alt={languages[language]}
                            />
                            {languages[language]}
                          </span>
                        }
                        labelExtractor={(lng: string) => (
                          <div className='flex items-center'>
                            <Flag
                              className='mr-2 rounded-xs'
                              country={languageFlag[lng]}
                              size={16}
                              alt={languageFlag[lng]}
                            />
                            {languages[lng]}
                          </div>
                        )}
                        onSelect={(lng: string) => {
                          changeLanguage(lng)
                        }}
                        headless
                      />
                      <div className='flex items-center gap-2'>
                        <button
                          type='button'
                          onClick={() => setIsHotkeysHelpOpened(true)}
                          aria-label={t('modals.shortcuts.title')}
                          className='relative rounded-md border border-transparent bg-gray-50 p-2 transition-colors hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:bg-slate-900 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200'
                        >
                          <KeyboardIcon className='h-6 w-6 text-slate-700 dark:text-gray-200' />
                        </button>
                        <Dropdown
                          title={
                            <span className='flex items-center justify-center'>
                              <span className='sr-only'>{t('header.switchTheme')}</span>
                              {theme === 'dark' ? (
                                <SunIcon className='h-6 w-6 text-gray-200' aria-hidden='true' />
                              ) : (
                                <MoonIcon className='h-6 w-6 text-slate-700' aria-hidden='true' />
                              )}
                            </span>
                          }
                          items={[
                            { key: 'light', label: t('header.light'), icon: SunIcon },
                            { key: 'dark', label: t('header.dark'), icon: MoonIcon },
                          ]}
                          keyExtractor={(item) => item.key}
                          labelExtractor={(item) => (
                            <div
                              className={cx('flex w-full items-center', {
                                'light:text-indigo-600': item.key === 'light',
                                'dark:text-indigo-400': item.key === 'dark',
                              })}
                            >
                              <item.icon
                                className={cx('mr-2 h-5 w-5', {
                                  'dark:text-gray-300': item.key === 'light',
                                  'light:text-gray-400': item.key === 'dark',
                                })}
                                aria-hidden='true'
                              />
                              {item.label}
                            </div>
                          )}
                          onSelect={(item) => setTheme(item.key as 'light' | 'dark')}
                          className='flex'
                          chevron={null}
                          headless
                          buttonClassName='relative rounded-md border border-transparent bg-gray-50 p-2 md:px-2 hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:bg-slate-900 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200'
                          menuItemsClassName='top-5'
                          selectItemClassName='font-semibold'
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            <ViewProjectHotkeys isOpened={isHotkeysHelpOpened} onClose={() => setIsHotkeysHelpOpened(false)} />
            <NewFunnel
              funnel={funnelToEdit}
              isOpened={isNewFunnelOpened}
              onClose={() => {
                setIsNewFunnelOpened(false)
                setFunnelToEdit(undefined)
              }}
              onSubmit={async (name: string, steps: string[]) => {
                if (funnelToEdit) {
                  await onFunnelEdit(funnelToEdit.id, name, steps)
                  return
                }

                await onFunnelCreate(name, steps)
              }}
              loading={funnelActionLoading}
            />
            <SearchFilters
              type={activeTab === PROJECT_TABS.errors ? 'errors' : 'traffic'}
              showModal={showFiltersSearch}
              setShowModal={setShowFiltersSearch}
              tnMapping={tnMapping}
              filters={filters}
            />
            <AddAViewModal
              showModal={isAddAViewOpened}
              setShowModal={(show) => {
                setIsAddAViewOpened(show)
                setProjectViewToUpdate(undefined)
              }}
              onSubmit={() => {
                setProjectViews([])
                setProjectViewsLoading(null)
                setProjectViewToUpdate(undefined)
              }}
              defaultView={projectViewToUpdate}
              tnMapping={tnMapping}
            />
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
                  ? () => openAnnotationModal(contextMenu.annotation?.date, contextMenu.annotation!)
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
            {!isEmbedded ? <Footer showDBIPMessage /> : null}
          </>
        </ViewProjectContext.Provider>
      )}
    </ClientOnly>
  )
}

const ViewProject = () => {
  return (
    <ChartManagerProvider>
      <ViewProjectContent />
    </ChartManagerProvider>
  )
}

export default ViewProject

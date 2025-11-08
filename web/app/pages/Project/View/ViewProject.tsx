import SwetrixSDK from '@swetrix/sdk'
import cx from 'clsx'
import dayjs from 'dayjs'
import { AnimatePresence, motion } from 'framer-motion'
import _debounce from 'lodash/debounce'
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
  BellRingIcon,
  ChartNoAxesColumnIcon,
  FilterIcon,
  RotateCw,
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
  getSessions,
  getSession,
  getErrors,
  getError,
  updateErrorStatus,
  getPropertyMetadata,
  getProjectViews,
  deleteProjectView,
  getFunnels,
  getGSCKeywords,
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
  ERROR_PANELS_ORDER,
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
  SwetrixError,
  SwetrixErrorDetails,
  SessionDetails as SessionDetailsModel,
  Session,
} from '~/lib/models/Project'
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

import AddAViewModal from './components/AddAViewModal'
import CCRow from './components/CCRow'
import { ChartManagerProvider } from './components/ChartManager'
import CustomEventsSubmenu from './components/CustomEventsSubmenu'
import CustomMetrics from './components/CustomMetrics'
import { ErrorChart } from './components/ErrorChart'
import { ErrorDetails } from './components/ErrorDetails'
import { Errors } from './components/Errors'
import Filters from './components/Filters'
import { FunnelChart } from './components/FunnelChart'
import FunnelsList from './components/FunnelsList'
const InteractiveMap = lazy(() => import('./components/InteractiveMap'))
// Keywords list now reuses shared Panel UI; dedicated component removed from render
import LiveVisitorsDropdown from './components/LiveVisitorsDropdown'
import LockedDashboard from './components/LockedDashboard'
import { MetricCard, MetricCards, PerformanceMetricCards } from './components/MetricCards'
import NoErrorDetails from './components/NoErrorDetails'
import NoEvents from './components/NoEvents'
import NoSessionDetails from './components/NoSessionDetails'
import { Pageflow } from './components/Pageflow'
import { PerformanceChart } from './components/PerformanceChart'
import RefRow from './components/RefRow'
import SearchFilters, { getFiltersUrlParams } from './components/SearchFilters'
import { SessionChart } from './components/SessionChart'
import { SessionDetails } from './components/SessionDetails'
import { Sessions } from './components/Sessions'
import TBPeriodSelector from './components/TBPeriodSelector'
import { TrafficChart } from './components/TrafficChart'
import UserFlow from './components/UserFlow'
import WaitingForAnError from './components/WaitingForAnError'
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
import { Panel, Metadata as MetadataGeneric, MetadataPanel, type CustomTab } from './Panels'
import { FILTER_CHART_METRICS_MAPPING_FOR_COMPARE, ERROR_FILTERS_MAPPING, parseFilters } from './utils/filters'
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
const ERRORS_TAKE = 30

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
  const [errorOptions, setErrorOptions] = useState<Record<string, boolean>>({
    [ERROR_FILTERS_MAPPING.showResolved]: false,
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

  // sessions
  const [sessionsSkip, setSessionsSkip] = useState(0)
  const [canLoadMoreSessions, setCanLoadMoreSessions] = useState(false)
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionsLoading, setSessionsLoading] = useState<boolean | null>(null) // null - not loaded, true - loading, false - loaded
  const [activeSession, setActiveSession] = useState<{
    [key: string]: any
    details: SessionDetailsModel
  } | null>(null)
  const [sessionLoading, setSessionLoading] = useState(false)
  const activePSID = useMemo(() => {
    return searchParams.get('psid')
  }, [searchParams])
  const prevActivePSIDRef = useRef<string | null>(activePSID)
  const [zoomedTimeRange, setZoomedTimeRange] = useState<[Date, Date] | null>(null)
  const [sessionChartInstance, _setSessionChartInstance] = useState<any>(null)
  const sessionsRequestIdRef = useRef(0)
  const skipNextSessionsAutoLoadRef = useRef(false)

  // errors
  const [errorsSkip, setErrorsSkip] = useState(0)
  const [canLoadMoreErrors, setCanLoadMoreErrors] = useState(false)
  const [errors, setErrors] = useState<SwetrixError[]>([])
  const [errorsLoading, setErrorsLoading] = useState<boolean | null>(null) // null - not loaded, true - loading, false - loaded
  const [activeError, setActiveError] = useState<{ details: SwetrixErrorDetails; [key: string]: any } | null>(null)
  const [errorLoading, setErrorLoading] = useState(false)
  const [errorStatusUpdating, setErrorStatusUpdating] = useState(false)
  const activeEID = useMemo(() => {
    return searchParams.get('eid')
  }, [searchParams])
  const prevActiveEIDRef = useRef<string | null>(activeEID)
  const errorsRequestIdRef = useRef(0)
  const skipNextErrorsAutoLoadRef = useRef(false)

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

  // Reset sessions and errors when filters change so lists reload with correct pagination
  useEffect(() => {
    sessionsRequestIdRef.current += 1
    errorsRequestIdRef.current += 1
    setSessionsSkip(0)
    setSessions([])
    setSessionsLoading(null)

    setErrorsSkip(0)
    setErrors([])
    setErrorsLoading(null)
  }, [filters])

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

  const [errorsActiveTabs, setErrorsActiveTabs] = useState<{
    location: 'cc' | 'rg' | 'ct' | 'lc' | 'map'
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
    const browserDataSource =
      activeTab === PROJECT_TABS.errors
        ? activeError?.params?.brv
        : activeTab === PROJECT_TABS.performance
          ? panelsDataPerf.data?.brv
          : panelsData.data?.brv
    const osDataSource =
      activeTab === PROJECT_TABS.errors
        ? activeError?.params?.osv
        : activeTab === PROJECT_TABS.performance
          ? panelsDataPerf.data?.osv
          : panelsData.data?.osv

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
  }, [
    panelsData.data?.brv,
    panelsData.data?.osv,
    activeTab,
    activeError?.params?.brv,
    activeError?.params?.osv,
    panelsDataPerf.data?.brv,
    panelsDataPerf.data?.osv,
  ])

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
        label: t('dashboard.unique'),
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

  const errorFilters = useMemo(() => {
    return [
      {
        id: ERROR_FILTERS_MAPPING.showResolved,
        label: t('project.showResolved'),
        active: errorOptions[ERROR_FILTERS_MAPPING.showResolved],
      },
    ]
  }, [t, errorOptions])

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
      unique: t('project.unique'),
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
    const selfhostedOnly = [
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
      return [...selfhostedOnly, ...adminTabs]
    }

    const newTabs = [
      ...selfhostedOnly,
      {
        id: PROJECT_TABS.alerts,
        label: t('dashboard.alerts'),
        icon: BellRingIcon,
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

  const resetErrors = () => {
    errorsRequestIdRef.current += 1
    setErrorsSkip(0)
    setErrors([])
    setErrorsLoading(null)
    setCanLoadMoreErrors(false)
  }

  const switchActiveErrorFilter = _debounce((pairID: string) => {
    setErrorOptions((prev) => ({ ...prev, [pairID]: !prev[pairID] }))
    resetErrors()
  }, 0)

  const updateStatusInErrors = (status: 'active' | 'resolved') => {
    if (!activeError?.details?.eid) {
      return
    }

    const index = _findIndex(errors, (error) => error.eid === activeEID)

    if (index === -1) {
      return
    }

    errors[index] = {
      ...errors[index],
      status,
    }
  }

  const markErrorAsResolved = async () => {
    if (errorStatusUpdating || !activeEID || !activeError?.details?.eid) {
      return
    }

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
    if (errorStatusUpdating || !activeEID || !activeError?.details?.eid) {
      return
    }

    setErrorStatusUpdating(true)

    try {
      await updateErrorStatus(id, 'active', activeEID)
      await loadError(activeEID)
      updateStatusInErrors('active')
    } catch (reason) {
      console.error('[markErrorAsResolved]', reason)
      toast.error(t('apiNotifications.updateErrorStatusFailed'))
      setErrorStatusUpdating(false)
      return
    }

    toast.success(t('apiNotifications.errorStatusUpdated'))
    setErrorStatusUpdating(false)
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

  const loadError = useCallback(
    async (eid: string) => {
      setErrorLoading(true)

      try {
        let error
        let from
        let to

        if (dateRange) {
          from = getFormatDate(dateRange[0])
          to = getFormatDate(dateRange[1])
        }

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

        console.error('[ERROR] (loadError)(getError)', message)
        toast.error(message)
      }
      setErrorLoading(false)
    },
    [dateRange, id, period, timeBucket, projectPassword, timezone, filters],
  )

  const loadSession = async (psid: string) => {
    if (sessionLoading) {
      return
    }

    setSessionLoading(true)

    try {
      const session = await getSession(id, psid, timezone, projectPassword)

      setActiveSession(session)
    } catch (reason: any) {
      console.error('[ERROR] (loadSession)(getSession)', reason)
      toast.error(reason)
    }

    setSessionLoading(false)
  }

  useEffect(() => {
    if (!activePSID) {
      setActiveSession(null)
      // Coming back from a session detail to the list: reset pagination and reload first page
      if (prevActivePSIDRef.current) {
        skipNextSessionsAutoLoadRef.current = true
        resetSessions()
        loadSessions(0)
      }
      prevActivePSIDRef.current = null
      return
    }

    loadSession(activePSID)
    prevActivePSIDRef.current = activePSID
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, dateRange, timeBucket, activePSID])

  useEffect(() => {
    if (!activeEID) {
      setActiveError(null)
      // Coming back from an error detail to the list: reset pagination and reload first page
      if (prevActiveEIDRef.current) {
        skipNextErrorsAutoLoadRef.current = true
        resetErrors()
        loadErrors(0, true)
      }
      prevActiveEIDRef.current = null
      return
    }

    loadError(activeEID)
    prevActiveEIDRef.current = activeEID
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, dateRange, timeBucket, activeEID, filters])

  const loadSessions = async (forcedSkip?: number) => {
    if (sessionsLoading) {
      return
    }

    const requestId = sessionsRequestIdRef.current
    setSessionsLoading(true)

    try {
      const skip = typeof forcedSkip === 'number' ? forcedSkip : sessionsSkip
      let dataSessions: { sessions: Session[] }
      let from
      let to

      if (dateRange) {
        from = getFormatDate(dateRange[0])
        to = getFormatDate(dateRange[1])
      }

      if (period === 'custom' && dateRange) {
        dataSessions = await getSessions(id, '', filters, from, to, SESSIONS_TAKE, skip, timezone, projectPassword)
      } else {
        dataSessions = await getSessions(id, period, filters, '', '', SESSIONS_TAKE, skip, timezone, projectPassword)
      }

      if (requestId === sessionsRequestIdRef.current) {
        setSessions((prev) => [...prev, ...(dataSessions?.sessions || [])])
        setSessionsSkip((prev) => {
          if (typeof forcedSkip === 'number') {
            return SESSIONS_TAKE + forcedSkip
          }

          return SESSIONS_TAKE + prev
        })

        if (dataSessions?.sessions?.length < SESSIONS_TAKE) {
          setCanLoadMoreSessions(false)
        } else {
          setCanLoadMoreSessions(true)
        }
      }
    } catch (reason) {
      console.error('[ERROR](loadSessions) Loading sessions data failed:', reason)
    } finally {
      if (requestId === sessionsRequestIdRef.current) {
        setSessionsLoading(false)
      }
    }
  }

  const loadErrors = async (forcedSkip?: number, override?: boolean) => {
    if (errorsLoading) {
      return
    }

    const requestId = errorsRequestIdRef.current
    setErrorsLoading(true)

    try {
      // If errors list is empty (e.g., after navigating back), default to first page
      const skip = typeof forcedSkip === 'number' ? forcedSkip : _isEmpty(errors) ? 0 : errorsSkip
      let dataErrors: { errors: SwetrixError[] }
      let from
      let to

      if (dateRange) {
        from = getFormatDate(dateRange[0])
        to = getFormatDate(dateRange[1])
      }

      if (period === 'custom' && dateRange) {
        dataErrors = await getErrors(
          id,
          '',
          filters,
          errorOptions,
          from,
          to,
          ERRORS_TAKE,
          skip,
          timezone,
          projectPassword,
        )
      } else {
        dataErrors = await getErrors(
          id,
          period,
          filters,
          errorOptions,
          '',
          '',
          ERRORS_TAKE,
          skip,
          timezone,
          projectPassword,
        )
      }

      if (requestId === errorsRequestIdRef.current) {
        if (override) {
          setErrors(dataErrors?.errors || [])
        } else {
          setErrors((prev) => [...prev, ...(dataErrors?.errors || [])])
        }

        setErrorsSkip((prev) => {
          if (typeof forcedSkip === 'number') {
            return ERRORS_TAKE + forcedSkip
          }

          return ERRORS_TAKE + prev
        })

        if (dataErrors?.errors?.length < ERRORS_TAKE) {
          setCanLoadMoreErrors(false)
        } else {
          setCanLoadMoreErrors(true)
        }
      }
    } catch (reason) {
      console.error('[ERROR](loadErrors) Loading errors data failed:', reason)
    } finally {
      if (requestId === errorsRequestIdRef.current) {
        setErrorsLoading(false)
      }
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

  const refreshStats = async () => {
    if (!authLoading && !dataLoading) {
      if (activeTab === PROJECT_TABS.performance) {
        loadAnalyticsPerf()
        return
      }

      if (activeTab === PROJECT_TABS.funnels) {
        loadFunnelsData()
        return
      }

      if (activeTab === PROJECT_TABS.sessions) {
        if (activePSID) {
          await loadSession(activePSID)
          return
        }

        resetSessions()
        loadSessions(0)
        return
      }

      if (activeTab === PROJECT_TABS.errors) {
        if (activeEID) {
          await loadError(activeEID)
          return
        }

        resetErrors()
        loadErrors(0)
        return
      }

      loadAnalytics()
    }
  }

  useEffect(() => {
    if (activeTab !== PROJECT_TABS.traffic || authLoading || !project) return

    loadAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, activeTab, customMetrics, filters, authLoading, project, isActiveCompare, dateRange, period, timeBucket])

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

  useEffect(() => {
    if (authLoading || activeTab !== PROJECT_TABS.sessions || authLoading || !project || activePSID) {
      return
    }

    if (skipNextSessionsAutoLoadRef.current) {
      // We've explicitly loaded the first page already when closing a session detail
      skipNextSessionsAutoLoadRef.current = false
      return
    }

    loadSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, dateRange, filters, id, period, projectPassword, timezone, authLoading, project, activePSID])

  useEffect(() => {
    if (authLoading || activeTab !== PROJECT_TABS.errors || authLoading || !project || activeEID) {
      return
    }

    if (skipNextErrorsAutoLoadRef.current) {
      skipNextErrorsAutoLoadRef.current = false
      return
    }

    loadErrors()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    errorOptions,
    dateRange,
    filters,
    id,
    period,
    projectPassword,
    timezone,
    authLoading,
    project,
    activeEID,
  ])

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

  const resetSessions = () => {
    sessionsRequestIdRef.current += 1
    setSessionsSkip(0)
    setSessions([])
    setSessionsLoading(null)
    setCanLoadMoreSessions(false)
  }

  // We can assume period provided is never custom, as it's handled separately in the Datepicker callback function
  const updatePeriod = ({ period: newPeriod }: { period: Period }) => {
    if (period === newPeriod) {
      return
    }

    const newSearchParams = new URLSearchParams(searchParams.toString())
    newSearchParams.delete('from')
    newSearchParams.delete('to')
    newSearchParams.set('period', newPeriod)

    resetSessions()
    resetErrors()

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

  const resetSessionChartZoom = () => {
    if (sessionChartInstance) {
      sessionChartInstance.unzoom()
    }
    setZoomedTimeRange(null)
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

  const TabSelector = () => (
    <div className='mb-[1px]'>
      <div className='sm:hidden'>
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
      <div className='hidden sm:block'>
        <nav className='-mb-px flex space-x-4 overflow-x-auto' aria-label='Tabs'>
          {_map(tabs, (tab) => {
            const isCurrent = tab.id === activeTab

            const handleClick = (e: React.MouseEvent) => {
              if (tab.id === 'settings') {
                return
              }

              e.preventDefault()
              setDashboardTab(tab.id)
            }

            const newSearchParams = new URLSearchParams(searchParams.toString())
            newSearchParams.set('tab', tab.id)
            const tabUrl: LinkProps['to'] =
              tab.id === 'settings'
                ? _replace(routes.project_settings, ':id', id)
                : { search: newSearchParams.toString() }

            return (
              <Link
                key={tab.id}
                to={tabUrl}
                onClick={handleClick}
                className={cx(
                  'text-md group inline-flex cursor-pointer items-center border-b-2 px-1 py-2 font-bold whitespace-nowrap transition-colors',
                  {
                    'border-slate-900 text-slate-900 dark:border-gray-50 dark:text-gray-50': isCurrent,
                    'border-transparent text-gray-500 dark:text-gray-400': !isCurrent,
                    'cursor-wait': dataLoading && tab.id !== 'settings',
                    'hover:border-gray-300 hover:text-gray-700 dark:hover:border-gray-300 dark:hover:text-gray-300':
                      !isCurrent && !dataLoading,
                  },
                )}
                aria-current={isCurrent ? 'page' : undefined}
              >
                <tab.icon
                  className={cx(
                    isCurrent
                      ? 'text-slate-900 dark:text-gray-50'
                      : 'text-gray-500 group-hover:text-gray-500 dark:text-gray-400 dark:group-hover:text-gray-300',
                    'mr-2 -ml-0.5 h-5 w-5',
                  )}
                  aria-hidden='true'
                  strokeWidth={1.5}
                />
                <span>{tab.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )

  if (authLoading || !project) {
    return (
      <>
        {!isEmbedded ? <Header /> : null}
        <div
          className={cx('flex flex-col bg-gray-50 dark:bg-slate-900', {
            'min-h-min-footer': !isEmbedded,
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
          className={cx(
            'mx-auto flex w-full max-w-7xl flex-col bg-gray-50 px-4 py-6 sm:px-6 lg:px-8 dark:bg-slate-900',
            {
              'min-h-min-footer': !isEmbedded,
              'min-h-[100vh]': isEmbedded,
            },
          )}
        >
          <TabSelector />
          <h2 className='mt-2 text-center text-xl font-bold break-words break-all text-gray-900 sm:text-left dark:text-gray-50'>
            {project.name}
          </h2>
          <LockedDashboard />
        </div>
        {!isEmbedded ? <Footer /> : null}
      </>
    )
  }

  if (!project.isDataExists && activeTab !== PROJECT_TABS.errors && !analyticsLoading) {
    return (
      <>
        {!isEmbedded ? <Header /> : null}
        <div
          className={cx(
            'mx-auto flex w-full max-w-7xl flex-col bg-gray-50 px-4 py-6 sm:px-6 lg:px-8 dark:bg-slate-900',
            {
              'min-h-min-footer': !isEmbedded,
              'min-h-[100vh]': isEmbedded,
            },
          )}
        >
          <TabSelector />
          <h2 className='mt-2 text-center text-xl font-bold break-words break-all text-gray-900 sm:text-left dark:text-gray-50'>
            {project.name}
          </h2>
          <WaitingForAnEvent />
        </div>
        {!isEmbedded ? <Footer /> : null}
      </>
    )
  }

  if (
    typeof project.isErrorDataExists === 'boolean' && // to prevent flickering
    !project.isErrorDataExists &&
    activeTab === PROJECT_TABS.errors
  ) {
    return (
      <>
        {!isEmbedded ? <Header /> : null}
        <div
          className={cx(
            'mx-auto flex w-full max-w-7xl flex-col bg-gray-50 px-4 py-6 sm:px-6 lg:px-8 dark:bg-slate-900',
            {
              'min-h-min-footer': !isEmbedded,
              'min-h-[100vh]': isEmbedded,
            },
          )}
        >
          <TabSelector />
          <h2 className='mt-2 text-center text-xl font-bold break-words break-all text-gray-900 sm:text-left dark:text-gray-50'>
            {project.name}
          </h2>
          <WaitingForAnError />
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

            // Functions
            updatePeriod,
            updateTimebucket,

            // Refs
            refCalendar,
          }}
        >
          <>
            {dataLoading ? <LoadingBar /> : null}
            {!isEmbedded ? <Header /> : null}
            <EventsRunningOutBanner />
            <div
              ref={ref}
              className={cx('bg-gray-50 dark:bg-slate-900', {
                'min-h-[100vh]': analyticsLoading && isEmbedded,
              })}
            >
              <div
                className={cx('mx-auto flex w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8', {
                  'min-h-min-footer': !isEmbedded,
                  'min-h-[100vh]': isEmbedded,
                })}
                ref={dashboardRef}
              >
                <TabSelector />
                <AnimatePresence mode='wait'>
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {activeTab !== PROJECT_TABS.alerts &&
                    (activeTab !== PROJECT_TABS.sessions || !activePSID) &&
                    (activeFunnel || activeTab !== PROJECT_TABS.funnels) ? (
                      <>
                        <div className='relative top-0 z-20 flex flex-col items-center justify-between bg-gray-50/50 py-2 backdrop-blur-md lg:sticky lg:flex-row dark:bg-slate-900/50'>
                          <div className='flex flex-wrap items-center justify-center gap-2'>
                            <h2 className='text-xl font-bold break-words break-all text-gray-900 dark:text-gray-50'>
                              {/* If tab is funnels - then display a funnel name, otherwise a project name */}
                              {activeTab === PROJECT_TABS.funnels ? activeFunnel?.name : project.name}
                            </h2>
                            {activeTab !== PROJECT_TABS.funnels ? <LiveVisitorsDropdown /> : null}
                          </div>
                          <div className='mx-auto mt-3 flex w-full max-w-[420px] flex-wrap items-center justify-center gap-x-2 gap-y-1 sm:mx-0 sm:w-auto sm:max-w-none sm:flex-nowrap sm:justify-between lg:mt-0'>
                            {activeTab !== PROJECT_TABS.funnels ? (
                              <>
                                <button
                                  type='button'
                                  title={t('project.refreshStats')}
                                  onClick={refreshStats}
                                  className={cx(
                                    'relative rounded-md border border-transparent p-2 text-sm font-medium transition-colors hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200',
                                    {
                                      'cursor-not-allowed opacity-50': authLoading || dataLoading,
                                    },
                                  )}
                                >
                                  <RotateCw className='h-5 w-5 text-gray-700 dark:text-gray-50' />
                                </button>
                                <div
                                  className={cx('border-gray-200 dark:border-gray-600', {
                                    // @ts-expect-error
                                    'lg:border-r': activeTab === PROJECT_TABS.funnels,
                                    hidden: activeTab === PROJECT_TABS.errors && activeError,
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
                                        return <span className='text-gray-600 dark:text-gray-200'>{item.name}</span>
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
                            {activeTab === PROJECT_TABS.errors &&
                            allowedToManage &&
                            activeError &&
                            activeError?.details?.status !== 'resolved' ? (
                              <button
                                type='button'
                                disabled={errorStatusUpdating}
                                onClick={markErrorAsResolved}
                                className={cx('p-2 text-sm font-medium text-gray-700 dark:text-gray-50', {
                                  'cursor-not-allowed': authLoading || errorLoading,
                                  'opacity-50': errorLoading && !errorStatusUpdating,
                                  'animate-pulse cursor-not-allowed': errorStatusUpdating,
                                })}
                              >
                                {t('project.resolve')}
                              </button>
                            ) : null}
                            {activeTab === PROJECT_TABS.errors &&
                            allowedToManage &&
                            activeError &&
                            activeError?.details?.status === 'resolved' ? (
                              <button
                                type='button'
                                disabled={errorStatusUpdating}
                                onClick={markErrorAsActive}
                                className={cx('p-2 text-sm font-medium text-gray-700 dark:text-gray-50', {
                                  'cursor-not-allowed': authLoading || errorLoading,
                                  'opacity-50': errorLoading && !errorStatusUpdating,
                                  'animate-pulse cursor-not-allowed': errorStatusUpdating,
                                })}
                              >
                                {t('project.markAsActive')}
                              </button>
                            ) : null}
                            {activeTab === PROJECT_TABS.errors && !activeError ? (
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
                            ) : null}
                            {activeTab === PROJECT_TABS.funnels ? (
                              <button
                                type='button'
                                title={t('project.refreshStats')}
                                onClick={refreshStats}
                                className={cx(
                                  'relative rounded-md border border-transparent p-2 text-sm font-medium transition-colors hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200',
                                  {
                                    'cursor-not-allowed opacity-50': authLoading || dataLoading,
                                  },
                                )}
                              >
                                <RotateCw className='h-5 w-5 text-gray-700 dark:text-gray-50' />
                              </button>
                            ) : null}
                            <div className='flex items-center'>
                              <TBPeriodSelector
                                classes={{
                                  timeBucket: activeTab === PROJECT_TABS.errors && !activeEID ? 'hidden' : '',
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
                    {activeTab === PROJECT_TABS.sessions && !activePSID ? (
                      <>
                        {!_isEmpty(sessions) ? <Filters tnMapping={tnMapping} /> : null}
                        {(sessionsLoading === null || sessionsLoading) && _isEmpty(sessions) ? <Loader /> : null}
                        {typeof sessionsLoading === 'boolean' && !sessionsLoading && _isEmpty(sessions) ? (
                          <NoEvents filters={filters} />
                        ) : null}
                        <Sessions sessions={sessions} timeFormat={timeFormat} />
                        {canLoadMoreSessions ? (
                          <button
                            type='button'
                            title={t('project.loadMore')}
                            onClick={() => loadSessions()}
                            className={cx(
                              'relative mx-auto mt-2 flex items-center rounded-md border border-transparent p-2 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:bg-slate-900 dark:text-gray-50 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200',
                              {
                                'cursor-not-allowed opacity-50': sessionsLoading || sessionsLoading === null,
                                hidden: sessionsLoading && _isEmpty(sessions),
                              },
                            )}
                          >
                            <DownloadIcon className='mr-2 h-5 w-5' strokeWidth={1.5} />
                            {t('project.loadMore')}
                          </button>
                        ) : null}
                      </>
                    ) : null}
                    {activeTab === PROJECT_TABS.sessions && activePSID ? (
                      <>
                        <div className='mx-auto mt-2 mb-4 flex max-w-max items-center space-x-4 lg:mx-0'>
                          <Link
                            to={{
                              search: pureSearchParams,
                            }}
                            onClick={resetSessionChartZoom}
                            className='flex items-center text-sm text-gray-900 underline decoration-dashed hover:decoration-solid dark:text-gray-100'
                          >
                            <ChevronLeftIcon className='mr-1 size-3' />
                            {t('project.backToSessions')}
                          </Link>
                          <button
                            type='button'
                            title={t('project.refreshStats')}
                            onClick={refreshStats}
                            className={cx(
                              'flex items-center text-sm text-gray-900 transition-colors hover:text-gray-600 dark:text-gray-100 dark:hover:text-gray-300',
                              {
                                'cursor-not-allowed': authLoading || dataLoading || sessionLoading,
                              },
                            )}
                            disabled={authLoading || dataLoading || sessionLoading}
                          >
                            <RotateCw className='mr-1 size-4' />
                            {t('project.refresh')}
                          </button>
                        </div>
                        {activeSession?.details ? <SessionDetails details={activeSession?.details} /> : null}
                        {!_isEmpty(activeSession?.chart) ? (
                          <div className='relative'>
                            <SessionChart
                              chart={activeSession?.chart}
                              timeBucket={activeSession?.timeBucket}
                              timeFormat={timeFormat}
                              rotateXAxis={rotateXAxis}
                              chartType={chartType}
                              dataNames={dataNames}
                              onZoom={setZoomedTimeRange}
                            />
                            {zoomedTimeRange ? (
                              <button
                                onClick={resetSessionChartZoom}
                                className='absolute top-2 right-0 z-10 rounded border bg-white px-2 py-1 text-xs text-gray-800 hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 hover:dark:bg-slate-700'
                              >
                                {t('project.resetZoom')}
                              </button>
                            ) : null}
                          </div>
                        ) : null}

                        {_isEmpty(activeSession) && sessionLoading ? (
                          <Loader />
                        ) : (
                          <Pageflow
                            pages={activeSession?.pages}
                            timeFormat={timeFormat}
                            zoomedTimeRange={zoomedTimeRange}
                          />
                        )}
                        {activeSession !== null &&
                        _isEmpty(activeSession?.chart) &&
                        _isEmpty(activeSession?.pages) &&
                        !sessionLoading ? (
                          <NoSessionDetails />
                        ) : null}
                      </>
                    ) : null}
                    {activeTab === PROJECT_TABS.errors && !activeEID ? (
                      <>
                        {!_isEmpty(errors) ? <Filters tnMapping={tnMapping} /> : null}
                        {(errorsLoading === null || errorsLoading) && _isEmpty(errors) ? <Loader /> : null}
                        {typeof errorsLoading === 'boolean' && !errorsLoading && _isEmpty(errors) ? (
                          <NoEvents filters={filters} />
                        ) : null}
                        <Errors errors={errors} />
                        {canLoadMoreErrors ? (
                          <button
                            type='button'
                            title={t('project.loadMore')}
                            onClick={() => loadErrors()}
                            className={cx(
                              'relative mx-auto mt-2 flex items-center rounded-md border border-transparent p-2 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:bg-slate-900 dark:text-gray-50 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200',
                              {
                                'cursor-not-allowed opacity-50': errorsLoading,
                                hidden: errorsLoading && _isEmpty(errors),
                              },
                            )}
                          >
                            <DownloadIcon className='mr-2 h-5 w-5' strokeWidth={1.5} />
                            {t('project.loadMore')}
                          </button>
                        ) : null}
                      </>
                    ) : null}
                    {activeTab === PROJECT_TABS.errors && activeEID ? (
                      <>
                        <div className='mx-auto mt-2 mb-3 flex max-w-max items-center space-x-4 lg:mx-0'>
                          <Link
                            to={{
                              search: pureSearchParams,
                            }}
                            className='flex items-center text-sm text-gray-900 underline decoration-dashed hover:decoration-solid dark:text-gray-100'
                          >
                            <ChevronLeftIcon className='mr-1 size-3' />
                            {t('project.backToErrors')}
                          </Link>
                        </div>
                        {activeError?.details ? <ErrorDetails details={activeError.details} /> : null}
                        {activeError?.chart ? (
                          <ErrorChart
                            chart={activeError?.chart}
                            timeBucket={activeError?.timeBucket}
                            timeFormat={timeFormat}
                            rotateXAxis={rotateXAxis}
                            chartType={chartType}
                            dataNames={dataNames}
                          />
                        ) : null}
                        <Filters tnMapping={tnMapping} />
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
                                    {
                                      id: 'host',
                                      label: t('project.mapping.host'),
                                    },
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
                                        setErrorsActiveTabs({ ...errorsActiveTabs, page: tab as 'pg' | 'host' })
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
                          {activeError?.metadata ? <MetadataPanel metadata={activeError.metadata} /> : null}
                        </div>
                        {_isEmpty(activeError) && errorLoading ? <Loader /> : null}
                        {!errorLoading && _isEmpty(activeError) ? <NoErrorDetails /> : null}
                      </>
                    ) : null}
                    {activeTab === PROJECT_TABS.alerts && project.role === 'owner' && isAuthenticated ? (
                      <ProjectAlertsView />
                    ) : null}
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
                            />
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
                            />
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

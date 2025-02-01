/* eslint-disable react-hooks/exhaustive-deps */
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  createContext,
  useContext,
  SetStateAction,
  Dispatch,
} from 'react'
import { ClientOnly } from 'remix-utils/client-only'
import useSize from '~/hooks/useSize'
import { useNavigate, Link, useSearchParams, useLoaderData } from '@remix-run/react'
import bb from 'billboard.js'
import { MagnifyingGlassIcon, ChevronLeftIcon, GlobeAltIcon, ClockIcon } from '@heroicons/react/24/outline'
import {
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
} from 'lucide-react'
import cx from 'clsx'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { useHotkeys } from 'react-hotkeys-hook'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import _includes from 'lodash/includes'
import _last from 'lodash/last'
import _isEmpty from 'lodash/isEmpty'
import _replace from 'lodash/replace'
import _toUpper from 'lodash/toUpper'
import _find from 'lodash/find'
import _filter from 'lodash/filter'
import _uniqBy from 'lodash/uniqBy'
import _findIndex from 'lodash/findIndex'
import _debounce from 'lodash/debounce'
import _some from 'lodash/some'
import _pickBy from 'lodash/pickBy'
import _every from 'lodash/every'
import _size from 'lodash/size'
import _truncate from 'lodash/truncate'
import _isString from 'lodash/isString'
import { toast } from 'sonner'

import { periodToCompareDate } from '~/utils/compareConvertDate'

import { getTimeFromSeconds, getStringFromTime, getLocaleDisplayName, nLocaleFormatter } from '~/utils/generic'
import { getItem, setItem, removeItem } from '~/utils/localstorage'
import EventsRunningOutBanner from '~/components/EventsRunningOutBanner'
import {
  tbPeriodPairs,
  LIVE_VISITORS_UPDATE_INTERVAL,
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
  LS_IS_ACTIVE_COMPARE,
  LS_PROJECTS_PROTECTED,
  isBrowser,
  TITLE_SUFFIX,
  KEY_FOR_ALL_TIME,
  MARKETPLACE_URL,
  BROWSER_LOGO_MAP,
  OS_LOGO_MAP,
  OS_LOGO_MAP_DARK,
  TBPeriodPairsProps,
  ERROR_PANELS_ORDER,
  ERROR_PERIOD_PAIRS,
  FUNNELS_PERIOD_PAIRS,
  ThemeType,
} from '~/lib/constants'
import { Project, Funnel, AnalyticsFunnel, OverallObject, OverallPerformanceObject } from '~/lib/models/Project'
import { CountryEntry } from '~/lib/models/Entry'
import Loader from '~/ui/Loader'
import Dropdown from '~/ui/Dropdown'
import Checkbox from '~/ui/Checkbox'
import Select from '~/ui/Select'
import FlatPicker from '~/ui/Flatpicker'
import LineChart from '~/ui/icons/LineChart'
import BarChart from '~/ui/icons/BarChart'
import NewFunnel from '~/modals/NewFunnel'
import ViewProjectHotkeys from '~/modals/ViewProjectHotkeys'
import routes from '~/utils/routes'
import Header from '~/components/Header'
import Footer from '~/components/Footer'
import {
  getProjectData,
  getProject,
  getOverallStats,
  getLiveVisitors,
  getPerfData,
  getProjectDataCustomEvents,
  getTrafficCompareData,
  getPerformanceCompareData,
  checkPassword,
  getCustomEventsMetadata,
  addFunnel,
  updateFunnel,
  deleteFunnel,
  getFunnelData,
  getFunnels,
  getPerformanceOverallStats,
  getSessions,
  getSession,
  getErrors,
  getError,
  updateErrorStatus,
  getPropertyMetadata,
  getProjectViews,
  deleteProjectView,
} from '~/api'
import { Panel, Metadata } from './Panels'
import {
  onCSVExportClick,
  getFormatDate,
  panelIconMapping,
  typeNameMapping,
  noRegionPeriods,
  getSettings,
  getColumns,
  CHART_METRICS_MAPPING,
  CHART_METRICS_MAPPING_PERF,
  getSettingsPerf,
  getSettingsFunnels,
  SHORTCUTS_TABS_LISTENERS,
  SHORTCUTS_TABS_MAP,
  SHORTCUTS_GENERAL_LISTENERS,
  SHORTCUTS_TIMEBUCKETS_LISTENERS,
  CHART_MEASURES_MAPPING_PERF,
  deviceIconMapping,
} from './ViewProject.helpers'
import CCRow from './components/CCRow'
import FunnelsList from './components/FunnelsList'
import RefRow from './components/RefRow'
import NoEvents from './components/NoEvents'
import SearchFilters from './components/SearchFilters'
import Filters from './components/Filters'
import LiveVisitorsDropdown from './components/LiveVisitorsDropdown'
import CountryDropdown from './components/CountryDropdown'
import { MetricCard, MetricCards, PerformanceMetricCards } from './components/MetricCards'
import ProjectAlertsView from '../Alerts/View'
import Uptime from '../uptime/View'
import UTMDropdown from './components/UTMDropdown'
import TBPeriodSelector from './components/TBPeriodSelector'
import { Session } from './interfaces/session'
import { Sessions } from './components/Sessions'
import { Pageflow } from './components/Pageflow'
import { SessionDetails } from './components/SessionDetails'
import { SessionChart } from './components/SessionChart'
import { Errors } from './components/Errors'
import LockedDashboard from './components/LockedDashboard'
import WaitingForAnEvent from './components/WaitingForAnEvent'
import { ErrorChart } from './components/ErrorChart'
import { ErrorDetails } from './components/ErrorDetails'
import { SwetrixError } from './interfaces/error'
import NoErrorDetails from './components/NoErrorDetails'
import WaitingForAnError from './components/WaitingForAnError'
import NoSessionDetails from './components/NoSessionDetails'
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
import { trackCustom } from '~/utils/analytics'
import {
  handleNavigationParams,
  updateFilterState,
  validTimeBacket,
  validPeriods,
  parseFiltersFromUrl,
  isFilterValid,
  FILTER_CHART_METRICS_MAPPING_FOR_COMPARE,
  ERROR_FILTERS_MAPPING,
} from './utils/filters'
import AddAViewModal from './components/AddAViewModal'
import CustomMetrics from './components/CustomMetrics'
import { useRequiredParams } from '~/hooks/useRequiredParams'
import BrowserDropdown from './components/BrowserDropdown'
import OSDropdown from './components/OSDropdown'
import { StateType, useAppDispatch } from '~/lib/store'
import UIActions from '~/lib/reducers/ui'
import { useSelector } from 'react-redux'
import PageDropdown from './components/PageDropdown'
const SwetrixSDK = require('@swetrix/sdk')

const CUSTOM_EV_DROPDOWN_MAX_VISIBLE_LENGTH = 32
const SESSIONS_TAKE = 30
const ERRORS_TAKE = 30

interface ViewProjectContextType {
  // States
  projectId: string
  projectPassword: string
  timezone: string
  dateRange: Date[] | null
  isLoading: boolean
  timeBucket: string
  period: string
  activePeriod: TBPeriodPairsProps | undefined
  periodPairs: TBPeriodPairsProps[]
  timeFormat: '12-hour' | '24-hour'
  size: ReturnType<typeof useSize>[1]
  allowedToManage: boolean
  dataLoading: boolean
  activeTab: keyof typeof PROJECT_TABS
  filters: Filter[]

  // Functions
  setDateRange: Dispatch<SetStateAction<Date[] | null>>
  updatePeriod: (newPeriod: { period: string; label?: string }) => void
  updateTimebucket: (newTimebucket: string) => void
  setPeriodPairs: Dispatch<SetStateAction<TBPeriodPairsProps[]>>

  // Refs
  refCalendar: React.MutableRefObject<any>
}

export const ViewProjectContext = createContext<ViewProjectContextType | undefined>(undefined)

export const useViewProjectContext = () => {
  const context = useContext(ViewProjectContext)

  if (context === undefined) {
    throw new Error('useViewProjectContext must be used within a ViewProjectContextProvider')
  }

  return context
}

const ViewProject = () => {
  const dispatch = useAppDispatch()

  const {
    theme: ssrTheme,
    embedded,
    isAuth: ssrAuthenticated,
    queryPassword,
    tabs: projectQueryTabs,
  } = useLoaderData<{
    theme: ThemeType
    embedded: boolean
    isAuth: boolean
    queryPassword: string | null
    tabs: string[]
  }>()

  const { projectViewPrefs, customEventsPrefs } = useSelector((state: StateType) => state.ui.cache)

  const { loading: authLoading, authenticated: csrAuthenticated, user } = useSelector((state: StateType) => state.auth)

  const { theme } = useSelector((state: StateType) => state.ui.theme)

  const { extensions, projectPasswords } = useSelector((state: StateType) => state.ui.misc)

  const authenticated = isBrowser ? (authLoading ? ssrAuthenticated : csrAuthenticated) : ssrAuthenticated
  const { timezone = DEFAULT_TIMEZONE } = user || {}

  const {
    t,
    i18n: { language },
  } = useTranslation('common')

  const _theme = isBrowser ? theme : ssrTheme

  const [periodPairs, setPeriodPairs] = useState<TBPeriodPairsProps[]>(tbPeriodPairs(t, undefined, undefined, language))

  const [customExportTypes, setCustomExportTypes] = useState<any[]>([])
  const [customPanelTabs, setCustomPanelTabs] = useState<any[]>([])
  const [sdkInstance, setSdkInstance] = useState<any>(null)

  const [activeChartMetricsCustomEvents, setActiveChartMetricsCustomEvents] = useState<any[]>([])

  const dashboardRef = useRef<HTMLDivElement>(null)

  const { id } = useRequiredParams<{ id: string }>()
  const navigate = useNavigate()

  const [searchParams, setSearchParams] = useSearchParams()

  const [project, setProject] = useState<Project | null>(null)
  const [liveVisitors, setLiveVisitors] = useState<number>(0)

  const projectPassword = useMemo(
    () => projectPasswords[id] || queryPassword || (getItem(LS_PROJECTS_PROTECTED)?.[id] as string) || '',
    [id, projectPasswords, queryPassword],
  )

  const [areFiltersParsed, setAreFiltersParsed] = useState(false)

  const [panelsData, setPanelsData] = useState<{
    types: (keyof Params)[]
    data: Params
    customs: Customs
    properties: Properties
    meta?: TrafficMeta[]
    // @ts-expect-error
  }>({})
  const [overall, setOverall] = useState<Partial<OverallObject>>({})
  const [overallPerformance, setOverallPerformance] = useState<Partial<OverallPerformanceObject>>({})
  const [isPanelsDataEmpty, setIsPanelsDataEmpty] = useState(false)
  const [isNewFunnelOpened, setIsNewFunnelOpened] = useState(false)
  const [isAddAViewOpened, setIsAddAViewOpened] = useState(false)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [period, setPeriod] = useState(
    projectViewPrefs ? projectViewPrefs[id]?.period || periodPairs[4].period : periodPairs[4].period,
  )
  const [timeBucket, setTimebucket] = useState(
    projectViewPrefs ? projectViewPrefs[id]?.timeBucket || periodPairs[4].tbs[1] : periodPairs[4].tbs[1],
  )
  const activePeriod = useMemo(() => _find(periodPairs, (p) => p.period === period), [period, periodPairs])
  const [chartData, setChartData] = useState<any>({})
  const [mainChart, setMainChart] = useState<any>(null)
  const [dataLoading, setDataLoading] = useState(false)
  const [activeChartMetrics, setActiveChartMetrics] = useState<{
    [key: string]: boolean
  }>({
    [CHART_METRICS_MAPPING.unique]: true,
    [CHART_METRICS_MAPPING.views]: false,
    [CHART_METRICS_MAPPING.sessionDuration]: false,
    [CHART_METRICS_MAPPING.bounce]: false,
    [CHART_METRICS_MAPPING.viewsPerUnique]: false,
    [CHART_METRICS_MAPPING.trendlines]: false,
    [CHART_METRICS_MAPPING.cumulativeMode]: false,
  })
  const [errorOptions, setErrorOptions] = useState<{
    [key: string]: boolean
  }>({
    [ERROR_FILTERS_MAPPING.showResolved]: false,
  })
  const [activeChartMetricsPerf, setActiveChartMetricsPerf] = useState(CHART_METRICS_MAPPING_PERF.timing)
  const [activePerfMeasure, setActivePerfMeasure] = useState(CHART_MEASURES_MAPPING_PERF.median)
  const checkIfAllMetricsAreDisabled = useMemo(
    () => !_some({ ...activeChartMetrics, ...activeChartMetricsCustomEvents }, (value) => value),
    [activeChartMetrics, activeChartMetricsCustomEvents],
  )
  const [customMetrics, setCustomMetrics] = useState<ProjectViewCustomEvent[]>([])
  const [filters, setFilters] = useState<Filter[]>([])
  const [filtersPerf, setFiltersPerf] = useState<Filter[]>([])
  const [filtersSessions, setFiltersSessions] = useState<Filter[]>([])

  const [filtersErrors, setFiltersErrors] = useState<Filter[]>([])

  const [filtersSubError, setFiltersSubError] = useState<Filter[]>([])

  const tnMapping = typeNameMapping(t)
  const refCalendar = useRef(null)
  const refCalendarCompare = useRef(null)
  const localStorageDateRange = projectViewPrefs ? projectViewPrefs[id]?.rangeDate : null
  const [dateRange, setDateRange] = useState<null | Date[]>(
    localStorageDateRange ? [new Date(localStorageDateRange[0]), new Date(localStorageDateRange[1])] : null,
  )
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get('tab') as keyof typeof PROJECT_TABS

    if (tab in PROJECT_TABS) {
      return tab
    }

    return PROJECT_TABS.traffic
  })

  const [isHotkeysHelpOpened, setIsHotkeysHelpOpened] = useState(false)

  // sessions
  const [sessionsSkip, setSessionsSkip] = useState(0)
  const [canLoadMoreSessions, setCanLoadMoreSessions] = useState(false)
  const [sessions, setSessions] = useState<any[]>([])
  const [sessionsLoading, setSessionsLoading] = useState<boolean | null>(null) // null - not loaded, true - loading, false - loaded
  const [activeSession, setActiveSession] = useState<any>(null)
  const [sessionLoading, setSessionLoading] = useState(false)
  const [activePSID, setActivePSID] = useState<string | null>(null)

  // errors
  const [errorsSkip, setErrorsSkip] = useState(0)
  const [canLoadMoreErrors, setCanLoadMoreErrors] = useState(false)
  const [errors, setErrors] = useState<any[]>([])
  const [errorsLoading, setErrorsLoading] = useState<boolean | null>(null) // null - not loaded, true - loading, false - loaded
  const [activeError, setActiveError] = useState<any>(null)
  const [errorLoading, setErrorLoading] = useState(false)
  const [errorStatusUpdating, setErrorStatusUpdating] = useState(false)
  const [activeEID, setActiveEID] = useState<string | null>(null)

  const [activeFunnel, setActiveFunnel] = useState<Funnel | null>(null)
  const [funnelToEdit, setFunnelToEdit] = useState<Funnel | undefined>(undefined)
  const [funnelActionLoading, setFunnelActionLoading] = useState(false)

  // null -> not loaded yet
  const [projectViews, setProjectViews] = useState<ProjectView[]>([])
  const [projectViewsLoading, setProjectViewsLoading] = useState<boolean | null>(null) //  // null - not loaded, true - loading, false - loaded
  const [projectViewDeleting, setProjectViewDeleting] = useState(false)
  const [projectViewToUpdate, setProjectViewToUpdate] = useState<ProjectView | undefined>()

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

    toast.success(t('apiNotifications.viewDeleted'))
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
      setProject((prev) => (prev ? { ...prev, funnels } : null))
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
      setProject((prev) => (prev ? { ...prev, funnels } : null))
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
      setProject((prev) => (prev ? { ...prev, funnels } : null))
    } catch (reason: any) {
      console.error('[ERROR] (onFunnelCreate)(getFunnels)', reason)
    }

    toast.success(t('apiNotifications.funnelDeleted'))
    setFunnelActionLoading(false)
  }

  const [countryActiveTab, setCountryActiveTab] = useState<'cc' | 'rg' | 'ct'>('cc')

  const [browserActiveTab, setBrowserActiveTab] = useState<'br' | 'brv'>('br')

  const [pageActiveTab, setPageActiveTab] = useState<'pg' | 'host'>('pg')
  const [pgActiveFragment, setPgActiveFragment] = useState(0)

  const [osActiveTab, setOsActiveTab] = useState<'os' | 'osv'>('os')

  const [utmActiveTab, setUtmActiveTab] = useState<'so' | 'me' | 'ca'>('so')

  const [chartDataPerf, setChartDataPerf] = useState<any>({})
  const [isPanelsDataEmptyPerf, setIsPanelsDataEmptyPerf] = useState(false)
  const [panelsDataPerf, setPanelsDataPerf] = useState<any>({})

  const timeFormat = useMemo<'12-hour' | '24-hour'>(() => user.timeFormat || TimeFormat['12-hour'], [user])
  const [ref, size] = useSize()
  const rotateXAxis = useMemo(() => size.width > 0 && size.width < 500, [size])
  const customEventsChartData = useMemo(
    () =>
      _pickBy(customEventsPrefs[id], (value, keyCustomEvents) =>
        _includes(activeChartMetricsCustomEvents, keyCustomEvents),
      ),
    [customEventsPrefs, id, activeChartMetricsCustomEvents],
  )
  const [chartType, setChartType] = useState((getItem('chartType') as string) || chartTypes.line)

  const [periodPairsCompare, setPeriodPairsCompare] = useState<
    {
      label: string
      period: string
    }[]
  >(tbPeriodPairsCompare(t, undefined, language))
  const [isActiveCompare, setIsActiveCompare] = useState(() => {
    const activeCompare = getItem(LS_IS_ACTIVE_COMPARE)

    if (typeof activeCompare === 'string') {
      return activeCompare === 'true'
    }

    if (typeof activeCompare === 'boolean') {
      return activeCompare
    }

    return false
  })
  const [activePeriodCompare, setActivePeriodCompare] = useState(periodPairsCompare[0].period)
  const activeDropdownLabelCompare = useMemo(
    () => _find(periodPairsCompare, (p) => p.period === activePeriodCompare)?.label,
    [periodPairsCompare, activePeriodCompare],
  )
  const [dateRangeCompare, setDateRangeCompare] = useState<null | Date[]>(null)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActiveCompare, period])

  useEffect(() => {
    if (!project) {
      // TODO: Probably should display something like "Loading..."
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
        id: CHART_MEASURES_MAPPING_PERF.average,
        label: t('dashboard.average'),
        active: activePerfMeasure === CHART_MEASURES_MAPPING_PERF.average,
      },
      {
        id: CHART_MEASURES_MAPPING_PERF.median,
        label: t('dashboard.median'),
        active: activePerfMeasure === CHART_MEASURES_MAPPING_PERF.median,
      },
      {
        id: CHART_MEASURES_MAPPING_PERF.p95,
        label: t('dashboard.xPercentile', { x: 95 }),
        active: activePerfMeasure === CHART_MEASURES_MAPPING_PERF.p95,
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

  const allowedToManage = project?.role === 'owner' || project?.role === 'admin'

  const dataNamesFunnel = useMemo(
    () => ({
      dropoff: t('project.dropoff'),
      events: t('project.visitors'),
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
      ['79eF2Z9rNNvv', 'STEzHcB1rALV'].includes(id) && {
        id: PROJECT_TABS.uptime,
        label: t('dashboard.uptime'),
        icon: ClockIcon,
      },
      ...adminTabs,
    ].filter((x) => !!x)

    if (projectQueryTabs && projectQueryTabs.length) {
      return _filter(newTabs, (tab) => _includes(projectQueryTabs, tab.id))
    }

    return newTabs
  }, [t, id, projectQueryTabs, allowedToManage])

  const activeTabLabel = useMemo(() => _find(tabs, (tab) => tab.id === activeTab)?.label, [tabs, activeTab])

  const switchTrafficChartMetric = (pairID: string, conflicts?: string[]) => {
    if (isConflicted(conflicts)) {
      toast.error(t('project.conflictMetric'))
      return
    }

    if (pairID === CHART_METRICS_MAPPING.customEvents) {
      return
    }

    setActiveChartMetrics((prev) => ({ ...prev, [pairID]: !prev[pairID] }))
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const switchActiveErrorFilter = useCallback(
    _debounce((pairID: string) => {
      setErrorOptions((prev) => ({ ...prev, [pairID]: !prev[pairID] }))
      resetErrors()
    }, 0),
    [],
  )

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

  const onErrorLoading = () => {
    if (projectPassword) {
      checkPassword(id, projectPassword).then((res) => {
        if (res) {
          navigate({
            pathname: _replace(routes.project, ':id', id),
            search: `?theme=${ssrTheme}&embedded=${embedded}`,
          })
          return
        }

        toast.error(t('apiNotifications.incorrectPassword'))
        navigate({
          pathname: _replace(routes.project_protected_password, ':id', id),
          search: `?theme=${ssrTheme}&embedded=${embedded}`,
        })
        removeItem(LS_PROJECTS_PROTECTED)
      })
      return
    }

    toast.error(t('project.noExist'))
    navigate(routes.dashboard)
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

      const isAllActiveChartMetricsCustomEvents = _every(activeChartMetricsCustomEvents, (metric) => {
        return _includes(_keys(customEventsChartData), metric)
      })

      if (!isAllActiveChartMetricsCustomEvents) {
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

      dispatch(
        UIActions.setCustomEventsPrefs({
          pid: id,
          data: events,
        }),
      )

      const applyRegions = !_includes(noRegionPeriods, activePeriod?.period)
      const bbSettings = getSettings(
        chartData,
        timeBucket,
        activeChartMetrics,
        applyRegions,
        timeFormat,
        rotateXAxis,
        chartType,
        events,
      )
      setMainChart(() => {
        const generate = bb.generate(bbSettings)
        generate.data.names(dataNames)
        return generate
      })
    } catch (reason) {
      console.error('[ERROR] Failed to load custom events:', reason)
    } finally {
      setDataLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === PROJECT_TABS.traffic) {
      loadCustomEvents()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChartMetricsCustomEvents])

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
      let dataCompare: TrafficLogResponse & {
        overall?: OverallObject
      }
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
            'custom',
            fromCompare,
            toCompare,
            timezone,
            filters,
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
        rawOverall = await getOverallStats([id], period, from, to, timezone, filters, projectPassword)
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
        rawOverall = await getOverallStats([id], period, '', '', timezone, filters, projectPassword)
      }

      customEventsChart = customEventsChart?.chart ? customEventsChart.chart.events : customEventsChartData

      dispatch(
        UIActions.setCustomEventsPrefs({
          pid: id,
          data: customEventsChart,
        }),
      )

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

      if (period === KEY_FOR_ALL_TIME && !_isEmpty(data.timeBucket)) {
        // @ts-expect-error
        newTimebucket = _includes(data.timeBucket, timeBucket) ? timeBucket : data.timeBucket[0]
        // @ts-expect-error
        setPeriodPairs((prev) => {
          const newPeriodPairs = _map(prev, (item) => {
            if (item.period === KEY_FOR_ALL_TIME) {
              return {
                ...item,
                // @ts-expect-error
                tbs: data.timeBucket.length > 2 ? [data.timeBucket[0], data.timeBucket[1]] : data.timeBucket,
              }
            }
            return item
          })
          return newPeriodPairs
        })
        setTimebucket(newTimebucket)
      }

      // @ts-expect-error
      if (!_isEmpty(dataCompare)) {
        // @ts-expect-error
        if (!_isEmpty(dataCompare?.chart)) {
          setDataChartCompare(dataCompare.chart)
        }

        // @ts-expect-error
        if (!_isEmpty(dataCompare?.overall)) {
          setOverallCompare(dataCompare.overall)
        }
      }

      if (_isEmpty(params)) {
        setIsPanelsDataEmpty(true)
      } else {
        const applyRegions = !_includes(noRegionPeriods, activePeriod?.period)
        const bbSettings = getSettings(
          chart,
          newTimebucket,
          activeChartMetrics,
          applyRegions,
          timeFormat,
          rotateXAxis,
          chartType,
          customEventsChart,
          // @ts-expect-error
          dataCompare?.chart,
        )
        setChartData(chart)

        setPanelsData({
          types: _keys(params),
          data: params,
          customs,
          properties,
          meta,
        })

        if (activeTab === PROJECT_TABS.traffic) {
          setMainChart(() => {
            const generate = bb.generate(bbSettings)
            generate.data.names(dataNames)
            return generate
          })
        }

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
          error = await getError(id, eid, '', filtersSubError, from, to, timezone, projectPassword)
        } else {
          error = await getError(id, eid, period, filtersSubError, '', '', timezone, projectPassword)
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
    [dateRange, id, period, projectPassword, timezone],
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
    if (authLoading) {
      return
    }

    const tab = searchParams.get('tab') as string

    if (tab === PROJECT_TABS.errors) {
      const eid = searchParams.get('eid') as string

      if (eid) {
        setActiveEID(eid)
      }
    }

    if (tab === PROJECT_TABS.sessions) {
      const psid = searchParams.get('psid') as string

      if (psid) {
        setActivePSID(psid)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading])

  useEffect(() => {
    if (!activePSID) {
      return
    }

    loadSession(activePSID)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, dateRange, timeBucket, activePSID])

  useEffect(() => {
    if (!activeEID || !areFiltersParsed) {
      return
    }

    loadError(activeEID)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, dateRange, timeBucket, activeEID, filtersSubError, areFiltersParsed])

  const loadSessions = async (forcedSkip?: number) => {
    if (sessionsLoading) {
      return
    }

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
        dataSessions = await getSessions(
          id,
          '',
          filtersSessions,
          from,
          to,
          SESSIONS_TAKE,
          skip,
          timezone,
          projectPassword,
        )
      } else {
        dataSessions = await getSessions(
          id,
          period,
          filtersSessions,
          '',
          '',
          SESSIONS_TAKE,
          skip,
          timezone,
          projectPassword,
        )
      }

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
    } catch (reason) {
      console.error('[ERROR](loadSessions) Loading sessions data failed:', reason)
    } finally {
      setSessionsLoading(false)
    }
  }

  const loadErrors = async (forcedSkip?: number, override?: boolean) => {
    if (errorsLoading) {
      return
    }

    setErrorsLoading(true)

    try {
      const skip = typeof forcedSkip === 'number' ? forcedSkip : errorsSkip
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
          filtersErrors,
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
          filtersErrors,
          errorOptions,
          '',
          '',
          ERRORS_TAKE,
          skip,
          timezone,
          projectPassword,
        )
      }

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
    } catch (reason) {
      console.error('[ERROR](loadErrors) Loading errors data failed:', reason)
    } finally {
      setErrorsLoading(false)
    }
  }

  const loadAnalyticsPerf = async () => {
    setDataLoading(true)

    try {
      let dataPerf: { timeBucket?: any; params?: any; chart?: any }
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
            filtersPerf,
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
            filtersPerf,
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
        dataPerf = await getPerfData(id, timeBucket, '', filtersPerf, from, to, timezone, measure, projectPassword)
        rawOverall = await getOverallStats([id], period, from, to, timezone, filtersPerf, projectPassword)
      } else {
        dataPerf = await getPerfData(id, timeBucket, period, filtersPerf, '', '', timezone, measure, projectPassword)
        rawOverall = await getPerformanceOverallStats(
          [id],
          period,
          '',
          '',
          timezone,
          filtersPerf,
          measure,
          projectPassword,
        )
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

      if (period === KEY_FOR_ALL_TIME && !_isEmpty(dataPerf.timeBucket)) {
        // eslint-disable-next-line prefer-destructuring
        newTimebucket = _includes(dataPerf.timeBucket, timeBucket) ? timeBucket : dataPerf.timeBucket[0]
        setPeriodPairs((prev) => {
          const newPeriodPairs = _map(prev, (item) => {
            if (item.period === KEY_FOR_ALL_TIME) {
              return {
                ...item,
                tbs:
                  dataPerf.timeBucket.length > 2
                    ? [dataPerf.timeBucket[0], dataPerf.timeBucket[1]]
                    : dataPerf.timeBucket,
              }
            }
            return item
          })
          return newPeriodPairs
        })
        setTimebucket(newTimebucket)
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
        const bbSettings = getSettingsPerf(
          chartPerf,
          timeBucket,
          activeChartMetricsPerf,
          rotateXAxis,
          chartType,
          timeFormat,
          dataCompare?.chart,
        )
        setChartDataPerf(chartPerf)

        setPanelsDataPerf({
          types: _keys(dataPerf.params),
          data: dataPerf.params,
        })

        if (activeTab === PROJECT_TABS.performance) {
          setMainChart(() => {
            const generate = bb.generate(bbSettings)
            generate.data.names(dataNamesPerf)
            return generate
          })
        }

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

      const bbSettings = getSettingsFunnels(funnel, totalPageviews, t)

      if (activeTab === PROJECT_TABS.funnels) {
        setMainChart(() => {
          const generate = bb.generate(bbSettings)
          generate.data.names(dataNamesFunnel)
          return generate
        })
      }

      setAnalyticsLoading(false)
      setDataLoading(false)
    } catch (reason) {
      setAnalyticsLoading(false)
      setDataLoading(false)

      console.error('[ERROR](loadFunnelsData) Loading funnels data failed:', reason)
    }
  }

  const filterHandler = async (column: string, filter: any, isExclusive = false) => {
    if (dataLoading) {
      return
    }

    const columnPerf = `${column}_perf`
    const columnSessions = `${column}_sess`
    const columnErrors = `${column}_err`
    const columnSubErrors = `${column}_subErr`
    let filtersToUpdate: Filter[] = []

    switch (activeTab) {
      case PROJECT_TABS.performance:
        filtersToUpdate = updateFilterState(
          searchParams,
          setSearchParams,
          filtersPerf,
          setFiltersPerf,
          columnPerf,
          column,
          filter,
          isExclusive,
        )
        break
      case PROJECT_TABS.sessions:
        filtersToUpdate = updateFilterState(
          searchParams,
          setSearchParams,
          filtersSessions,
          setFiltersSessions,
          columnSessions,
          column,
          filter,
          isExclusive,
        )
        break
      case PROJECT_TABS.errors:
        if (!activeEID) {
          filtersToUpdate = updateFilterState(
            searchParams,
            setSearchParams,
            filtersErrors,
            setFiltersErrors,
            columnErrors,
            column,
            filter,
            isExclusive,
          )
        } else {
          filtersToUpdate = updateFilterState(
            searchParams,
            setSearchParams,
            filtersSubError,
            setFiltersSubError,
            columnSubErrors,
            column,
            filter,
            isExclusive,
          )
        }
        break
      case PROJECT_TABS.traffic:
        filtersToUpdate = updateFilterState(
          searchParams,
          setSearchParams,
          filters,
          setFilters,
          column,
          column,
          filter,
          isExclusive,
        )
        break
    }

    resetSessions()
    resetErrors()

    sdkInstance?._emitEvent('filtersupdate', filtersToUpdate)
  }

  const onFilterSearch = (items: Filter[], override: boolean): void => {
    switch (activeTab) {
      case PROJECT_TABS.performance:
        handleNavigationParams(
          items,
          '_perf',
          searchParams,
          setSearchParams,
          override,
          setFiltersPerf,
          loadAnalyticsPerf,
        )
        break
      case PROJECT_TABS.sessions:
        handleNavigationParams(
          items,
          '_sess',
          searchParams,
          setSearchParams,
          override,
          setFiltersSessions,
          resetSessions,
        )
        break
      case PROJECT_TABS.errors:
        if (!activeEID) {
          handleNavigationParams(items, '_err', searchParams, setSearchParams, override, setFiltersErrors, resetErrors)
        } else {
          handleNavigationParams(
            items,
            '_subErr',
            searchParams,
            setSearchParams,
            override,
            setFiltersSubError,
            resetErrors,
          )
        }
        break
      default:
        handleNavigationParams(items, '', searchParams, setSearchParams, override, setFilters, loadAnalytics)
    }

    resetSessions()
    resetErrors()
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

  const onChangeExclusive = (column: string, filter: string, isExclusive: boolean) => {
    if (dataLoading) {
      return
    }

    const updateFilters = (filters: Filter[], setFilters: React.Dispatch<React.SetStateAction<Filter[]>>): Filter[] => {
      const newFilters = filters.map((f) => (f.column === column && f.filter === filter ? { ...f, isExclusive } : f))
      if (JSON.stringify(newFilters) !== JSON.stringify(filters)) {
        setFilters(newFilters)
      }
      return newFilters
    }

    let newFilters: Filter[]

    switch (activeTab) {
      case PROJECT_TABS.performance:
        newFilters = updateFilters(filtersPerf, setFiltersPerf)
        break
      case PROJECT_TABS.sessions:
        newFilters = updateFilters(filtersSessions, setFiltersSessions)
        break
      case PROJECT_TABS.errors:
        if (!activeEID) {
          newFilters = updateFilters(filtersErrors, setFiltersErrors)
          resetErrors()
        } else {
          newFilters = updateFilters(filtersSubError, setFiltersSubError)
        }
        break
      default:
        newFilters = updateFilters(filters, setFilters)
        break
    }

    const paramName = activeTab === PROJECT_TABS.performance ? `${column}_perf` : column

    if (searchParams.get(paramName) !== filter) {
      searchParams.set(paramName, filter)
      setSearchParams(searchParams)
    }

    sdkInstance?._emitEvent('filtersupdate', newFilters)
  }

  const setDashboardTab = (key: keyof typeof PROJECT_TABS) => {
    if (dataLoading) {
      return
    }

    setActiveTab(key)
  }

  useEffect(() => {
    parseFiltersFromUrl('_perf', searchParams, setFiltersPerf)
    parseFiltersFromUrl('_sess', searchParams, setFiltersSessions)
    parseFiltersFromUrl('_err', searchParams, setFiltersErrors)
    parseFiltersFromUrl('_subErr', searchParams, setFiltersSubError)
    parseFiltersFromUrl('', searchParams, setFilters)

    const parsePeriodFilters = () => {
      try {
        const intialPeriod = projectViewPrefs
          ? searchParams.get('period') || projectViewPrefs[id]?.period
          : searchParams.get('period') || '7d'

        if (!_includes(validPeriods, intialPeriod)) {
          return
        }

        if (intialPeriod === 'custom') {
          // @ts-expect-error
          const from = new Date(searchParams.get('from'))
          // @ts-expect-error
          const to = new Date(searchParams.get('to'))
          if (from.getDate() && to.getDate()) {
            onRangeDateChange([from, to], true)
            setDateRange([from, to])
          }
          return
        }

        setPeriodPairs(tbPeriodPairs(t, undefined, undefined, language))
        setDateRange(null)
        updatePeriod({
          period: intialPeriod,
        })
      } catch {}
    }

    parsePeriodFilters()

    try {
      const initialTimeBucket = searchParams.get('timeBucket')

      if (_includes(validTimeBacket, initialTimeBucket)) {
        const newPeriodFull = _find(periodPairs, (el) => el.period === period)
        if (_includes(newPeriodFull?.tbs, initialTimeBucket)) {
          setTimebucket(initialTimeBucket || periodPairs[3].tbs[1])
        }
      }
    } catch {}

    setAreFiltersParsed(true)
  }, [activeTab])

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
    if (!areFiltersParsed || activeTab !== PROJECT_TABS.traffic || authLoading || !project) return

    loadAnalytics()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mode,
    areFiltersParsed,
    activeTab,
    customMetrics,
    filters,
    authLoading,
    project,
    isActiveCompare,
    dateRange,
    period,
    timeBucket,
  ])

  useEffect(() => {
    if (!areFiltersParsed || activeTab !== PROJECT_TABS.performance || authLoading || !project) return

    loadAnalyticsPerf()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    areFiltersParsed,
    activeTab,
    activePerfMeasure,
    activeChartMetricsPerf,
    filtersPerf,
    authLoading,
    project,
    isActiveCompare,
    dateRange,
    period,
    timeBucket,
  ])

  useEffect(() => {
    if (activeTab !== PROJECT_TABS.funnels || authLoading || !project) return

    loadFunnelsData()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFunnel, activeTab, authLoading, project, dateRange, period, timeBucket])

  useEffect(() => {
    if (authLoading || !areFiltersParsed || activeTab !== PROJECT_TABS.sessions || authLoading || !project) {
      return
    }

    loadSessions()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    dateRange,
    filtersSessions,
    id,
    period,
    projectPassword,
    timezone,
    authLoading,
    project,
    areFiltersParsed,
  ])

  useEffect(() => {
    if (authLoading || !areFiltersParsed || activeTab !== PROJECT_TABS.errors || authLoading || !project) {
      return
    }

    loadErrors()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    errorOptions,
    dateRange,
    filtersErrors,
    id,
    period,
    projectPassword,
    timezone,
    areFiltersParsed,
    authLoading,
    project,
  ])

  useEffect(() => {
    searchParams.set('tab', activeTab)
    setSearchParams(searchParams)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  useEffect(() => {
    if (activeTab === PROJECT_TABS.traffic) {
      if (
        (!authLoading && !_isEmpty(chartData) && !_isEmpty(mainChart)) ||
        (isActiveCompare && !_isEmpty(dataChartCompare) && !_isEmpty(mainChart))
      ) {
        if (
          activeChartMetrics.views ||
          activeChartMetrics.unique ||
          activeChartMetrics.viewsPerUnique ||
          activeChartMetrics.trendlines
        ) {
          mainChart.load({
            columns: getColumns(chartData, activeChartMetrics),
          })
        }

        if (
          activeChartMetrics.bounce ||
          activeChartMetrics.sessionDuration ||
          activeChartMetrics.views ||
          activeChartMetrics.unique ||
          !activeChartMetrics.bounce ||
          !activeChartMetrics.sessionDuration
        ) {
          const applyRegions = !_includes(noRegionPeriods, activePeriod?.period)
          const bbSettings = getSettings(
            chartData,
            timeBucket,
            activeChartMetrics,
            applyRegions,
            timeFormat,
            rotateXAxis,
            chartType,
            customEventsChartData,
            dataChartCompare,
          )

          setMainChart(() => {
            const generate = bb.generate(bbSettings)
            generate.data.names(dataNames)
            return generate
          })
        }

        if (!activeChartMetrics.views) {
          mainChart.unload({
            ids: 'total',
          })
        }

        if (!activeChartMetrics.unique) {
          mainChart.unload({
            ids: 'unique',
          })
        }

        if (!activeChartMetrics.viewsPerUnique) {
          mainChart.unload({
            ids: 'viewsPerUnique',
          })
        }
      }
    } else if (!authLoading && !_isEmpty(chartDataPerf) && !_isEmpty(mainChart)) {
      const bbSettings = getSettingsPerf(
        chartDataPerf,
        timeBucket,
        activeChartMetricsPerf,
        rotateXAxis,
        chartType,
        timeFormat,
        dataChartPerfCompare,
      )

      setMainChart(() => {
        const generate = bb.generate(bbSettings)
        generate.data.names(dataNamesPerf)
        return generate
      })
    }
  }, [authLoading, activeChartMetrics, chartData, chartDataPerf, activeChartMetricsPerf, dataChartCompare]) // eslint-disable-line

  useEffect(() => {
    let sdk: any | null = null

    const filteredExtensions = _filter(extensions, (ext) => _isString(ext.fileURL))

    if (!_isEmpty(filteredExtensions)) {
      const processedExtensions = _map(filteredExtensions, (ext) => {
        const { id: extId, fileURL } = ext
        return {
          id: extId,
          cdnURL: `${CDN_URL}file/${fileURL}`,
        }
      })

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
          onAddPanelTab: (extensionID: string, panelID: string, tabContent: any, onOpen: (a: any) => void) => {
            setCustomPanelTabs((prev) => [
              ...prev,
              {
                extensionID,
                panelID,
                tabContent,
                onOpen,
              },
            ])
          },
          onUpdatePanelTab: (extensionID: string, panelID: string, tabContent: any) => {
            setCustomPanelTabs((prev) =>
              _map(prev, (row) => {
                if (row.extensionID === extensionID && row.panelID === panelID) {
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
            setCustomPanelTabs((prev) =>
              _filter(prev, (row) => row.extensionID !== extensionID && row.panelID !== panelID),
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
  }, [sdkInstance]) // eslint-disable-line

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
      id,
      name,
      isActive,
      created,
      isPublic,
    })
  }, [sdkInstance, project]) // eslint-disable-line

  useEffect(() => {
    setPeriodPairs(tbPeriodPairs(t, undefined, undefined, language))
    setPeriodPairsCompare(tbPeriodPairsCompare(t, undefined, language))
  }, [t, language])

  const resetSessions = () => {
    setSessionsSkip(0)
    setSessions([])
    setSessionsLoading(null)
  }

  const resetErrors = () => {
    setErrorsSkip(0)
    setErrors([])
    setErrorsLoading(null)
  }

  const onRangeDateChange = (dates: Date[], onRender?: boolean) => {
    const days = Math.ceil(Math.abs(dates[1].getTime() - dates[0].getTime()) / (1000 * 3600 * 24))

    // eslint-disable-next-line no-restricted-syntax
    for (const index in timeBucketToDays) {
      if (timeBucketToDays[index].lt >= days) {
        let eventEmitTimeBucket = timeBucket

        if (!onRender && !_includes(timeBucketToDays[index].tb, timeBucket)) {
          // eslint-disable-next-line prefer-destructuring
          eventEmitTimeBucket = timeBucketToDays[index].tb[0]
          searchParams.set('timeBucket', eventEmitTimeBucket)
          setTimebucket(eventEmitTimeBucket)
        }

        searchParams.set('period', 'custom')
        searchParams.set('from', dates[0].toISOString())
        searchParams.set('to', dates[1].toISOString())
        setSearchParams(searchParams)

        setPeriodPairs(tbPeriodPairs(t, timeBucketToDays[index].tb, dates, language))
        setPeriod('custom')

        dispatch(
          UIActions.setProjectViewPrefs({
            pid: id,
            period: 'custom',
            timeBucket: timeBucketToDays[index].tb[0],
            rangeDate: dates,
          }),
        )

        setCanLoadMoreSessions(false)
        resetSessions()
        resetErrors()

        sdkInstance?._emitEvent('timeupdate', {
          period: 'custom',
          timeBucket: eventEmitTimeBucket,
          dateRange: dates,
        })

        break
      }
    }
  }

  useEffect(() => {
    if (!_isEmpty(activeChartMetricsCustomEvents)) {
      setActiveChartMetricsCustomEvents([])
    }
  }, [period, filters]) // eslint-disable-line

  useEffect(() => {
    if (dateRange && areFiltersParsed) {
      onRangeDateChange(dateRange)
    }
  }, [dateRange, t, areFiltersParsed]) // eslint-disable-line

  useEffect(() => {
    if (!project || project.isLocked) {
      return
    }

    const updateLiveVisitors = async () => {
      const { id: pid } = project
      const result = await getLiveVisitors([pid], projectPassword)

      setLiveVisitors(result[pid])
    }

    updateLiveVisitors()

    const interval = setInterval(async () => {
      await updateLiveVisitors()
    }, LIVE_VISITORS_UPDATE_INTERVAL)

    return () => clearInterval(interval)
  }, [project, projectPassword])

  useEffect(() => {
    if (authLoading || !_isEmpty(project)) {
      return
    }

    getProject(id, projectPassword)
      .then((result) => {
        if (_isEmpty(result)) {
          onErrorLoading()
        }

        if (result.isPasswordProtected && !result.role && _isEmpty(projectPassword)) {
          navigate({
            pathname: _replace(routes.project_protected_password, ':id', id),
            search: `?theme=${ssrTheme}&embedded=${embedded}`,
          })
          return
        }

        setProject(result)
      })
      .catch((reason) => {
        console.error('[ERROR] (getProject)', reason)
        onErrorLoading()
      })
  }, [authLoading, project, id]) // eslint-disable-line

  const updatePeriod = (newPeriod: { period: string; label?: string }) => {
    if (period === newPeriod.period) {
      return
    }

    const newPeriodFull = _find(periodPairs, (el) => el.period === newPeriod.period)
    let tb = timeBucket
    if (_isEmpty(newPeriodFull)) return

    if (!_includes(newPeriodFull.tbs, timeBucket)) {
      tb = _last(newPeriodFull.tbs) || 'day'
      searchParams.set('timeBucket', tb)
      setTimebucket(tb)
    }

    if (newPeriod.period !== 'custom') {
      searchParams.delete('from')
      searchParams.delete('to')
      searchParams.set('period', newPeriod.period)
      dispatch(
        UIActions.setProjectViewPrefs({
          pid: id,
          period: newPeriod.period,
          timeBucket: tb,
        }),
      )
      setPeriod(newPeriod.period)

      setCanLoadMoreSessions(false)
      resetSessions()
      resetErrors()

      setDateRange(null)
    }

    setSearchParams(searchParams)
    sdkInstance?._emitEvent('timeupdate', {
      period: newPeriod.period,
      timeBucket: tb,
      dateRange: newPeriod.period === 'custom' ? dateRange : null,
    })
  }

  const updateTimebucket = (newTimebucket: string) => {
    if (dataLoading) {
      return
    }

    searchParams.set('timeBucket', newTimebucket)
    setSearchParams(searchParams)
    setTimebucket(newTimebucket)
    dispatch(
      UIActions.setProjectViewPrefs({
        pid: id,
        period,
        timeBucket: newTimebucket,
        rangeDate: dateRange as Date[],
      }),
    )
    sdkInstance?._emitEvent('timeupdate', {
      period,
      timeBucket: newTimebucket,
      dateRange,
    })
  }

  const onMeasureChange = (measure: string) => {
    setActivePerfMeasure(measure)
  }

  const openSettingsHandler = () => {
    navigate(_replace(routes.project_settings, ':id', id))
  }

  const isConflicted = (conflicts?: string[]) => {
    if (!conflicts) {
      return false
    }

    return _some(conflicts, (conflict) => {
      const conflictPair = _find(chartMetrics, (metric) => metric.id === conflict)
      return conflictPair && conflictPair.active
    })
  }

  const cleanURLFilters = () => {
    for (const [key] of Array.from(searchParams.entries())) {
      if (!isFilterValid(key, true)) {
        continue
      }
      searchParams.delete(key)
    }

    setSearchParams(searchParams)
  }

  const resetActiveTabFilters = () => {
    if (dataLoading) {
      return
    }

    cleanURLFilters()

    if (activeTab === PROJECT_TABS.traffic) {
      setFilters([])
    } else if (activeTab === PROJECT_TABS.performance) {
      setFiltersPerf([])
    } else if (activeTab === PROJECT_TABS.sessions) {
      setFiltersSessions([])
    } else if (activeTab === PROJECT_TABS.errors && !activeEID) {
      setFiltersErrors([])
    } else if (activeTab === PROJECT_TABS.errors && activeEID) {
      setFiltersSubError([])
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

  const setChartTypeOnClick = (type: string) => {
    setItem('chartType', type)
    setChartType(type)

    if (activeTab === PROJECT_TABS.traffic) {
      const bbSettings = getSettings(
        chartData,
        timeBucket,
        activeChartMetrics,
        !_includes(noRegionPeriods, activePeriod?.period),
        timeFormat,
        rotateXAxis,
        type,
        customEventsChartData,
        dataChartCompare,
      )

      setMainChart(() => {
        const generate = bb.generate(bbSettings)
        generate.data.names(dataNames)
        return generate
      })
    }

    if (activeTab === PROJECT_TABS.performance) {
      const bbPerfSettings = getSettingsPerf(
        chartDataPerf,
        timeBucket,
        activeChartMetricsPerf,
        rotateXAxis,
        type,
        timeFormat,
        dataChartPerfCompare,
      )

      setMainChart(() => {
        const generate = bb.generate(bbPerfSettings)
        generate.data.names(dataNamesPerf)
        return generate
      })
    }
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
    a: KEY_FOR_ALL_TIME,
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

    setDateRange(null)
    updatePeriod(pair)
  })

  const TabsSelector = () => (
    <div>
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
        />
      </div>
      <div className='hidden sm:block'>
        <nav className='-mb-px flex space-x-4 overflow-x-auto font-mono' aria-label='Tabs'>
          {_map(tabs, (tab) => {
            const isCurrent = tab.id === activeTab

            const handleClick = (e: React.MouseEvent) => {
              if (tab.id === 'settings') {
                return
              }

              e.preventDefault()
              setDashboardTab(tab.id)
            }

            const currentUrl = new URL(window.location.href)
            currentUrl.searchParams.set('tab', tab.id)
            const tabUrl = tab.id === 'settings' ? _replace(routes.project_settings, ':id', id) : currentUrl.toString()

            return (
              <Link
                key={tab.id}
                to={tabUrl}
                onClick={handleClick}
                className={cx(
                  'text-md group inline-flex cursor-pointer items-center border-b-2 px-1 py-2 font-bold whitespace-nowrap',
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
        {!embedded && <Header ssrTheme={ssrTheme} authenticated={authenticated} />}
        <div
          className={cx('min-h-min-footer bg-gray-50 dark:bg-slate-900', {
            'min-h-min-footer': !embedded,
            'min-h-[100vh]': embedded,
          })}
        >
          <Loader />
        </div>
        {!embedded && <Footer authenticated={authenticated} />}
      </>
    )
  }

  if (project.isLocked) {
    return (
      <>
        {!embedded && <Header ssrTheme={ssrTheme} authenticated={authenticated} />}
        <div
          className={cx('mx-auto w-full max-w-[1584px] bg-gray-50 px-2 py-6 sm:px-4 lg:px-8 dark:bg-slate-900', {
            'min-h-min-footer': !embedded,
            'min-h-[100vh]': embedded,
          })}
        >
          <TabsSelector />
          <h2 className='mt-2 text-center font-mono text-xl font-bold break-words break-all text-gray-900 sm:text-left dark:text-gray-50'>
            {project.name}
          </h2>
          <LockedDashboard user={user} project={project} />
        </div>
        {!embedded && <Footer authenticated={authenticated} />}
      </>
    )
  }

  if (!project.isDataExists && !_includes([PROJECT_TABS.errors, PROJECT_TABS.uptime], activeTab) && !analyticsLoading) {
    return (
      <>
        {!embedded && <Header ssrTheme={ssrTheme} authenticated={authenticated} />}
        <div
          className={cx('mx-auto w-full max-w-[1584px] bg-gray-50 px-2 py-6 sm:px-4 lg:px-8 dark:bg-slate-900', {
            'min-h-min-footer': !embedded,
            'min-h-[100vh]': embedded,
          })}
        >
          <TabsSelector />
          <h2 className='mt-2 text-center font-mono text-xl font-bold break-words break-all text-gray-900 sm:text-left dark:text-gray-50'>
            {project.name}
          </h2>
          <WaitingForAnEvent project={project} />
        </div>
        {!embedded && <Footer authenticated={authenticated} />}
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
        {!embedded && <Header ssrTheme={ssrTheme} authenticated={authenticated} />}
        <div
          className={cx('mx-auto w-full max-w-[1584px] bg-gray-50 px-2 py-6 sm:px-4 lg:px-8 dark:bg-slate-900', {
            'min-h-min-footer': !embedded,
            'min-h-[100vh]': embedded,
          })}
        >
          <TabsSelector />
          <h2 className='mt-2 text-center font-mono text-xl font-bold break-words break-all text-gray-900 sm:text-left dark:text-gray-50'>
            {project.name}
          </h2>
          <WaitingForAnError />
        </div>
        {!embedded && <Footer authenticated={authenticated} />}
      </>
    )
  }

  return (
    <ClientOnly>
      {() => (
        <ViewProjectContext.Provider
          value={{
            // States
            projectId: project?.id,
            projectPassword,
            timezone,
            dateRange,
            isLoading: authLoading,
            timeBucket,
            period,
            activePeriod,
            periodPairs,
            timeFormat,
            size,
            allowedToManage,
            dataLoading,
            activeTab,
            filters:
              activeTab === PROJECT_TABS.traffic
                ? filters
                : activeTab === PROJECT_TABS.performance
                  ? filtersPerf
                  : activeTab === PROJECT_TABS.sessions
                    ? filtersSessions
                    : activeTab === PROJECT_TABS.errors && !activeEID
                      ? filtersErrors
                      : activeTab === PROJECT_TABS.errors && activeEID
                        ? filtersSubError
                        : [],

            // Functions
            setDateRange,
            updatePeriod,
            updateTimebucket,
            setPeriodPairs,

            // Refs
            refCalendar,
          }}
        >
          <>
            {!embedded && <Header ssrTheme={ssrTheme} authenticated={authenticated} />}
            <EventsRunningOutBanner />
            <div
              ref={ref}
              className={cx('bg-gray-50 dark:bg-slate-900', {
                'min-h-[100vh]': analyticsLoading && embedded,
              })}
            >
              <div
                className={cx('mx-auto w-full max-w-[1584px] px-2 py-6 sm:px-4 lg:px-8', {
                  'min-h-min-footer': !embedded,
                  'min-h-[100vh]': embedded,
                })}
                ref={dashboardRef}
              >
                <TabsSelector />
                {activeTab !== PROJECT_TABS.alerts &&
                  activeTab !== PROJECT_TABS.uptime &&
                  (activeTab !== PROJECT_TABS.sessions || !activePSID) &&
                  (activeFunnel || activeTab !== PROJECT_TABS.funnels) && (
                    <>
                      <div className='mt-2 flex flex-col items-center justify-between lg:flex-row lg:items-start'>
                        <div className='flex flex-wrap items-center space-x-5'>
                          <h2 className='font-mono text-xl font-bold break-words break-all text-gray-900 dark:text-gray-50'>
                            {/* If tab is funnels - then display a funnel name, otherwise a project name */}
                            {activeTab === PROJECT_TABS.funnels ? activeFunnel?.name : project.name}
                          </h2>
                          {activeTab !== PROJECT_TABS.funnels && (
                            <LiveVisitorsDropdown
                              onSessionSelect={(psid) => {
                                setDashboardTab(PROJECT_TABS.sessions)
                                setActivePSID(psid)
                              }}
                              live={liveVisitors}
                            />
                          )}
                        </div>
                        <div className='mx-auto mt-3 flex w-full max-w-[420px] flex-wrap items-center justify-center gap-y-1 space-x-2 sm:mx-0 sm:w-auto sm:max-w-none sm:flex-nowrap sm:justify-between lg:mt-0'>
                          {activeTab !== PROJECT_TABS.funnels && (
                            <>
                              <button
                                type='button'
                                title={t('project.refreshStats')}
                                onClick={refreshStats}
                                className={cx(
                                  'relative rounded-md bg-gray-50 p-2 text-sm font-medium hover:bg-white hover:shadow-xs focus:z-10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:bg-slate-900 dark:hover:bg-slate-800 focus:dark:border-gray-200 focus:dark:ring-gray-200',
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
                                    'relative rounded-md bg-gray-50 p-2 text-sm font-medium hover:bg-white hover:shadow-xs focus:z-10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:bg-slate-900 dark:hover:bg-slate-800 focus:dark:border-gray-200 focus:dark:ring-gray-200',
                                    {
                                      'cursor-not-allowed opacity-50': authLoading || dataLoading,
                                    },
                                  )}
                                >
                                  <MagnifyingGlassIcon className='h-5 w-5 stroke-2 text-gray-700 dark:text-gray-50' />
                                </button>
                              </div>
                              {activeTab === PROJECT_TABS.traffic && (
                                <Dropdown
                                  header={t('project.views')}
                                  onClick={() => loadProjectViews()}
                                  loading={projectViewsLoading || projectViewsLoading === null}
                                  selectItemClassName={
                                    !allowedToManage &&
                                    !(projectViewsLoading || projectViewsLoading === null) &&
                                    _isEmpty(projectViews)
                                      ? 'block px-4 py-2 text-sm text-gray-700 dark:border-gray-800 dark:bg-slate-800 dark:text-gray-50'
                                      : undefined
                                  }
                                  items={_filter(
                                    [
                                      ...projectViews,
                                      allowedToManage && {
                                        id: 'add-a-view',
                                        name: t('project.addAView'),
                                        createView: true,
                                      },
                                      !allowedToManage &&
                                        _isEmpty(projectViews) && {
                                          id: 'no-views',
                                          name: t('project.noViewsYet'),
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
                                      <span
                                        className={cx('flex items-center justify-between space-x-4', {
                                          'cursor-wait': dataLoading,
                                        })}
                                      >
                                        <span>{item.name}</span>
                                        {allowedToManage && (
                                          <span className='flex cursor-pointer space-x-2'>
                                            <PencilIcon
                                              className='size-4 hover:text-gray-900 dark:hover:text-gray-50'
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                setProjectViewToUpdate(item)
                                                close()
                                                setIsAddAViewOpened(true)
                                              }}
                                              strokeWidth={1.5}
                                            />
                                            <Trash2Icon
                                              className={cx('size-4 hover:text-gray-900 dark:hover:text-gray-50', {
                                                'cursor-not-allowed': projectViewDeleting,
                                              })}
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                close()
                                                onProjectViewDelete(item.id)
                                              }}
                                              strokeWidth={1.5}
                                            />
                                          </span>
                                        )}
                                      </span>
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
                                      onFilterSearch(item.filters, true)
                                    }

                                    if (item.customEvents && !_isEmpty(item.customEvents)) {
                                      onCustomMetric(item.customEvents)
                                    }
                                  }}
                                  chevron='mini'
                                  buttonClassName='!p-2 rounded-md hover:bg-white hover:shadow-xs dark:hover:bg-slate-800 focus:z-10 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:dark:ring-gray-200 focus:dark:border-gray-200'
                                  headless
                                />
                              )}
                              {_includes([PROJECT_TABS.traffic, PROJECT_TABS.performance], activeTab) && (
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
                                  buttonClassName='!p-2 rounded-md hover:bg-white hover:shadow-xs dark:hover:bg-slate-800 focus:z-10 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:dark:ring-gray-200 focus:dark:border-gray-200'
                                  headless
                                />
                              )}
                              <div
                                className={cx(
                                  'space-x-2 border-gray-200 sm:mr-3 lg:border-x lg:px-3 dark:border-gray-600',
                                  {
                                    hidden:
                                      isPanelsDataEmpty ||
                                      analyticsLoading ||
                                      checkIfAllMetricsAreDisabled ||
                                      activeTab === PROJECT_TABS.sessions ||
                                      activeTab === PROJECT_TABS.errors,
                                  },
                                )}
                              >
                                <button
                                  type='button'
                                  title={t('project.barChart')}
                                  onClick={() => setChartTypeOnClick(chartTypes.bar)}
                                  className={cx(
                                    'relative rounded-md fill-gray-700 p-2 text-sm font-medium focus:z-10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:fill-gray-50 focus:dark:border-gray-200 focus:dark:ring-gray-200',
                                    {
                                      'bg-white stroke-white shadow-xs dark:bg-slate-800 dark:stroke-slate-800':
                                        chartType === chartTypes.bar,
                                      'bg-gray-50 stroke-gray-50 dark:bg-slate-900 dark:stroke-slate-900 [&_svg]:hover:fill-gray-500 [&_svg]:hover:dark:fill-gray-200':
                                        chartType !== chartTypes.bar,
                                    },
                                  )}
                                >
                                  <BarChart className='h-5 w-5 [&_path]:stroke-[3.5%]' />
                                </button>
                                <button
                                  type='button'
                                  title={t('project.lineChart')}
                                  onClick={() => setChartTypeOnClick(chartTypes.line)}
                                  className={cx(
                                    'relative rounded-md fill-gray-700 p-2 text-sm font-medium focus:z-10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:fill-gray-50 focus:dark:border-gray-200 focus:dark:ring-gray-200',
                                    {
                                      'bg-white stroke-white shadow-xs dark:bg-slate-800 dark:stroke-slate-800':
                                        chartType === chartTypes.line,
                                      'bg-gray-50 stroke-gray-50 dark:bg-slate-900 dark:stroke-slate-900 [&_svg]:hover:fill-gray-500 [&_svg]:hover:dark:fill-gray-200':
                                        chartType !== chartTypes.line,
                                    },
                                  )}
                                >
                                  <LineChart className='h-5 w-5 [&_path]:stroke-[3.5%]' />
                                </button>
                              </div>
                            </>
                          )}
                          {activeTab === PROJECT_TABS.traffic && !isPanelsDataEmpty && (
                            <Dropdown
                              items={
                                isActiveCompare
                                  ? _filter(chartMetrics, (el) => {
                                      return !_includes(FILTER_CHART_METRICS_MAPPING_FOR_COMPARE, el.id)
                                    })
                                  : chartMetrics
                              }
                              title={t('project.metricVis')}
                              labelExtractor={(pair) => {
                                const { label, id: pairID, active, conflicts } = pair

                                const conflicted = isConflicted(conflicts)

                                if (pairID === CHART_METRICS_MAPPING.customEvents) {
                                  if (_isEmpty(panelsData.customs)) {
                                    return (
                                      <span className='flex cursor-not-allowed items-center px-4 py-2'>
                                        <BanIcon className='mr-1 h-5 w-5' strokeWidth={1.5} />
                                        {label}
                                      </span>
                                    )
                                  }

                                  return (
                                    <Dropdown
                                      menuItemsClassName='max-w-[300px] max-h-[300px] overflow-auto'
                                      items={chartMetricsCustomEvents}
                                      title={label}
                                      labelExtractor={(event) => (
                                        <Checkbox
                                          className={cx({ hidden: isPanelsDataEmpty || analyticsLoading })}
                                          label={
                                            _size(event.label) > CUSTOM_EV_DROPDOWN_MAX_VISIBLE_LENGTH ? (
                                              <span title={event.label}>
                                                {_truncate(event.label, {
                                                  length: CUSTOM_EV_DROPDOWN_MAX_VISIBLE_LENGTH,
                                                })}
                                              </span>
                                            ) : (
                                              event.label
                                            )
                                          }
                                          onChange={() => {
                                            switchCustomEventChart(event.id)
                                          }}
                                          checked={event.active}
                                        />
                                      )}
                                      buttonClassName='group-hover:bg-gray-200 dark:group-hover:bg-slate-700 px-4 py-2 inline-flex w-full bg-white text-sm font-medium text-gray-700 dark:text-gray-50 dark:border-gray-800 dark:bg-slate-800'
                                      keyExtractor={(event) => event.id}
                                      onSelect={(event, e) => {
                                        e?.stopPropagation()
                                        e?.preventDefault()

                                        switchCustomEventChart(event.id)
                                      }}
                                      chevron='mini'
                                      headless
                                    />
                                  )
                                }

                                return (
                                  <Checkbox
                                    className={cx('px-4 py-2', { hidden: isPanelsDataEmpty || analyticsLoading })}
                                    label={label}
                                    disabled={conflicted}
                                    checked={active}
                                    onChange={() => {
                                      switchTrafficChartMetric(pairID, conflicts)
                                    }}
                                  />
                                )
                              }}
                              buttonClassName='!px-2.5'
                              selectItemClassName='group text-gray-700 dark:text-gray-50 dark:border-gray-800 dark:bg-slate-800 block text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700'
                              keyExtractor={(pair) => pair.id}
                              onSelect={({ id: pairID, conflicts }) => {
                                switchTrafficChartMetric(pairID, conflicts)
                              }}
                              chevron='mini'
                              headless
                            />
                          )}
                          {activeTab === PROJECT_TABS.errors &&
                            allowedToManage &&
                            activeError &&
                            activeError?.details?.status !== 'resolved' && (
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
                            )}
                          {activeTab === PROJECT_TABS.errors &&
                            allowedToManage &&
                            activeError &&
                            activeError?.details?.status === 'resolved' && (
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
                            )}
                          {activeTab === PROJECT_TABS.errors && !activeError && (
                            <Dropdown
                              items={errorFilters}
                              title={t('project.filters')}
                              labelExtractor={(pair) => {
                                const { label, active, id: pairID } = pair

                                return (
                                  <Checkbox
                                    className='px-4 py-2'
                                    label={label}
                                    checked={active}
                                    onChange={() => switchActiveErrorFilter(pairID)}
                                  />
                                )
                              }}
                              buttonClassName='!px-2.5'
                              selectItemClassName='group text-gray-700 dark:text-gray-50 dark:border-gray-800 dark:bg-slate-800 block text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700'
                              keyExtractor={(pair) => pair.id}
                              onSelect={({ id: pairID }) => {
                                switchActiveErrorFilter(pairID)
                              }}
                              chevron='mini'
                              headless
                            />
                          )}
                          {activeTab === PROJECT_TABS.funnels && (
                            <button
                              type='button'
                              title={t('project.refreshStats')}
                              onClick={refreshStats}
                              className={cx(
                                'relative rounded-md bg-gray-50 p-2 text-sm font-medium hover:bg-white hover:shadow-xs focus:z-10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:bg-slate-900 dark:hover:bg-slate-800 focus:dark:border-gray-200 focus:dark:ring-gray-200',
                                {
                                  'cursor-not-allowed opacity-50': authLoading || dataLoading,
                                },
                              )}
                            >
                              <RotateCw className='h-5 w-5 text-gray-700 dark:text-gray-50' />
                            </button>
                          )}
                          {activeTab === PROJECT_TABS.performance && !isPanelsDataEmptyPerf && (
                            <Dropdown
                              items={chartMetricsPerf}
                              className='xs:min-w-0 min-w-[170px]'
                              title={
                                <p>
                                  {
                                    _find(chartMetricsPerf, ({ id: chartId }) => chartId === activeChartMetricsPerf)
                                      ?.label
                                  }
                                </p>
                              }
                              labelExtractor={(pair) => pair.label}
                              keyExtractor={(pair) => pair.id}
                              onSelect={({ id: pairID }) => {
                                setActiveChartMetricsPerf(pairID)
                              }}
                              buttonClassName='!px-2.5'
                              chevron='mini'
                              headless
                            />
                          )}
                          {activeTab === PROJECT_TABS.performance && !isPanelsDataEmptyPerf && (
                            <Dropdown
                              disabled={activeChartMetricsPerf === CHART_METRICS_MAPPING_PERF.quantiles}
                              items={chartMeasuresPerf}
                              className='xs:min-w-0 min-w-[170px]'
                              title={
                                <p>
                                  {_find(chartMeasuresPerf, ({ id: chartId }) => chartId === activePerfMeasure)?.label}
                                </p>
                              }
                              labelExtractor={(pair) => pair.label}
                              keyExtractor={(pair) => pair.id}
                              onSelect={({ id: pairID }) => {
                                onMeasureChange(pairID)
                              }}
                              buttonClassName='!px-2.5'
                              chevron='mini'
                              headless
                            />
                          )}
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
                                setPeriodPairs(tbPeriodPairs(t, undefined, undefined, language))
                                setDateRange(null)
                                updatePeriod(pair)
                              }
                            }}
                          />
                          {isActiveCompare && activeTab !== PROJECT_TABS.errors && (
                            <>
                              <div className='text-md mx-2 font-mono font-medium whitespace-pre-line text-gray-600 dark:text-gray-200'>
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
                          )}
                          <FlatPicker
                            className='!mx-0'
                            ref={refCalendar}
                            onChange={setDateRange}
                            value={dateRange || []}
                            maxDateMonths={MAX_MONTHS_IN_PAST}
                            maxRange={0}
                          />
                          <FlatPicker
                            className='!mx-0'
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
                      </div>
                      {activeTab === PROJECT_TABS.funnels && (
                        <button
                          type='button'
                          onClick={() => setActiveFunnel(null)}
                          className='mx-auto mt-2 mb-4 flex items-center text-base font-normal text-gray-900 underline decoration-dashed hover:decoration-solid lg:mx-0 lg:mt-0 dark:text-gray-100'
                        >
                          <ChevronLeftIcon className='h-4 w-4' />
                          {t('project.backToFunnels')}
                        </button>
                      )}
                    </>
                  )}
                {activeTab === PROJECT_TABS.alerts && (project.role !== 'owner' || !authenticated) && (
                  <div className='mt-5 rounded-xl bg-gray-700 p-5'>
                    <div className='flex items-center text-gray-50'>
                      <BellRingIcon className='mr-2 h-8 w-8' strokeWidth={1.5} />
                      <p className='text-3xl font-bold'>{t('dashboard.alerts')}</p>
                    </div>
                    <p className='mt-2 text-lg whitespace-pre-wrap text-gray-100'>{t('dashboard.alertsDesc')}</p>
                    <Link
                      to={routes.signup}
                      className='mt-6 inline-block rounded-md border border-transparent bg-white px-3 py-2 text-base font-medium text-gray-700 select-none hover:bg-indigo-50'
                      aria-label={t('titles.signup')}
                    >
                      {t('common.getStarted')}
                    </Link>
                  </div>
                )}
                {activeTab === PROJECT_TABS.funnels && !activeFunnel && !_isEmpty(project.funnels) && (
                  <FunnelsList
                    openFunnelSettings={(funnel?: Funnel) => {
                      if (funnel) {
                        setFunnelToEdit(funnel)
                        setIsNewFunnelOpened(true)
                        return
                      }

                      setIsNewFunnelOpened(true)
                    }}
                    openFunnel={setActiveFunnel}
                    funnels={project.funnels}
                    deleteFunnel={onFunnelDelete}
                    loading={funnelActionLoading}
                    authenticated={authenticated}
                    allowedToManage={allowedToManage}
                  />
                )}
                {activeTab === PROJECT_TABS.funnels && !activeFunnel && _isEmpty(project.funnels) && (
                  <div className='mt-5 rounded-xl bg-gray-700 p-5'>
                    <div className='flex items-center text-gray-50'>
                      <FilterIcon className='mr-2 h-8 w-8' strokeWidth={1.5} />
                      <p className='text-3xl font-bold'>{t('dashboard.funnels')}</p>
                    </div>
                    <p className='mt-2 text-lg whitespace-pre-wrap text-gray-100'>{t('dashboard.funnelsDesc')}</p>
                    {authenticated ? (
                      <button
                        type='button'
                        onClick={() => setIsNewFunnelOpened(true)}
                        className='mt-6 inline-block rounded-md border border-transparent bg-white px-3 py-2 text-base font-medium text-gray-700 select-none hover:bg-indigo-50'
                      >
                        {t('dashboard.newFunnel')}
                      </button>
                    ) : (
                      <Link
                        to={routes.signup}
                        className='mt-6 inline-block rounded-md border border-transparent bg-white px-3 py-2 text-base font-medium text-gray-700 select-none hover:bg-indigo-50'
                        aria-label={t('titles.signup')}
                      >
                        {t('common.getStarted')}
                      </Link>
                    )}
                  </div>
                )}
                {activeTab === PROJECT_TABS.sessions && !activePSID && (
                  <>
                    <Filters
                      onRemoveFilter={filterHandler}
                      onChangeExclusive={onChangeExclusive}
                      tnMapping={tnMapping}
                      resetFilters={resetActiveTabFilters}
                    />
                    {(sessionsLoading === null || sessionsLoading) && _isEmpty(sessions) && <Loader />}
                    {typeof sessionsLoading === 'boolean' && !sessionsLoading && _isEmpty(sessions) && (
                      <NoEvents
                        filters={filters}
                        filterHandler={filterHandler}
                        onChangeExclusive={onChangeExclusive}
                        resetActiveTabFilters={resetActiveTabFilters}
                      />
                    )}
                    <Sessions
                      sessions={sessions}
                      onClick={(psid) => {
                        setActivePSID(psid)
                      }}
                      timeFormat={timeFormat}
                    />
                    {canLoadMoreSessions && (
                      <button
                        type='button'
                        title={t('project.refreshStats')}
                        onClick={() => loadSessions()}
                        className={cx(
                          'relative mx-auto mt-2 flex items-center rounded-md bg-gray-50 p-2 text-sm font-medium text-gray-700 hover:bg-white hover:shadow-xs focus:z-10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:bg-slate-900 dark:text-gray-50 dark:hover:bg-slate-800 focus:dark:border-gray-200 focus:dark:ring-gray-200',
                          {
                            'cursor-not-allowed opacity-50': sessionsLoading || sessionsLoading === null,
                            hidden: sessionsLoading && _isEmpty(sessions),
                          },
                        )}
                      >
                        <DownloadIcon className='mr-2 h-5 w-5' strokeWidth={1.5} />
                        {t('project.loadMore')}
                      </button>
                    )}
                  </>
                )}
                {activeTab === PROJECT_TABS.sessions && activePSID && (
                  <>
                    <button
                      type='button'
                      onClick={() => {
                        setActiveSession(null)
                        setActivePSID(null)
                        searchParams.delete('psid')
                        setSearchParams(searchParams)
                      }}
                      className='mx-auto mt-2 mb-4 flex items-center text-base font-normal text-gray-900 underline decoration-dashed hover:decoration-solid lg:mx-0 dark:text-gray-100'
                    >
                      <ChevronLeftIcon className='h-4 w-4' />
                      {t('project.backToSessions')}
                    </button>
                    {activeSession?.details && <SessionDetails details={activeSession?.details} />}
                    {!_isEmpty(activeSession?.chart) && (
                      <SessionChart
                        chart={activeSession?.chart}
                        timeBucket={activeSession?.timeBucket}
                        timeFormat={timeFormat}
                        rotateXAxis={rotateXAxis}
                        chartType={chartType}
                        dataNames={dataNames}
                      />
                    )}
                    <Pageflow pages={activeSession?.pages} timeFormat={timeFormat} />
                    {_isEmpty(activeSession) && sessionLoading && <Loader />}
                    {activeSession !== null &&
                      _isEmpty(activeSession?.chart) &&
                      _isEmpty(activeSession?.pages) &&
                      !sessionLoading && <NoSessionDetails />}
                  </>
                )}
                {activeTab === PROJECT_TABS.errors && !activeEID && (
                  <>
                    <Filters
                      onRemoveFilter={filterHandler}
                      onChangeExclusive={onChangeExclusive}
                      tnMapping={tnMapping}
                      resetFilters={resetActiveTabFilters}
                    />
                    {(errorsLoading === null || errorsLoading) && _isEmpty(errors) && <Loader />}
                    {typeof errorsLoading === 'boolean' && !errorsLoading && _isEmpty(errors) && (
                      <NoEvents
                        filters={filtersErrors}
                        filterHandler={filterHandler}
                        onChangeExclusive={onChangeExclusive}
                        resetActiveTabFilters={resetActiveTabFilters}
                      />
                    )}
                    <Errors
                      errors={errors}
                      onClick={(eidToLoad) => {
                        setActiveEID(eidToLoad)
                        setErrorLoading(true)
                      }}
                    />
                    {canLoadMoreErrors && (
                      <button
                        type='button'
                        title={t('project.refreshStats')}
                        onClick={() => loadErrors()}
                        className={cx(
                          'relative mx-auto mt-2 flex items-center rounded-md bg-gray-50 p-2 text-sm font-medium text-gray-700 hover:bg-white hover:shadow-xs focus:z-10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:bg-slate-900 dark:text-gray-50 dark:hover:bg-slate-800 focus:dark:border-gray-200 focus:dark:ring-gray-200',
                          {
                            'cursor-not-allowed opacity-50': errorsLoading,
                            hidden: errorsLoading && _isEmpty(errors),
                          },
                        )}
                      >
                        <DownloadIcon className='mr-2 h-5 w-5' strokeWidth={1.5} />
                        {t('project.loadMore')}
                      </button>
                    )}
                  </>
                )}
                {activeTab === PROJECT_TABS.errors && activeEID && (
                  <>
                    <button
                      type='button'
                      onClick={() => {
                        setActiveError(null)
                        setActiveEID(null)
                        searchParams.delete('eid')
                        setSearchParams(searchParams)
                      }}
                      className='mx-auto mt-2 mb-4 flex items-center text-base font-normal text-gray-900 underline decoration-dashed hover:decoration-solid lg:mx-0 lg:mt-0 dark:text-gray-100'
                    >
                      <ChevronLeftIcon className='h-4 w-4' />
                      {t('project.backToErrors')}
                    </button>
                    {activeError?.details && <ErrorDetails details={activeError.details} />}
                    {activeError?.chart && (
                      <ErrorChart
                        chart={activeError?.chart}
                        timeBucket={activeError?.timeBucket}
                        timeFormat={timeFormat}
                        rotateXAxis={rotateXAxis}
                        chartType={chartType}
                        dataNames={dataNames}
                      />
                    )}
                    <Filters
                      onRemoveFilter={filterHandler}
                      onChangeExclusive={onChangeExclusive}
                      tnMapping={tnMapping}
                      resetFilters={resetActiveTabFilters}
                    />
                    <div className='mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
                      {!_isEmpty(activeError?.params) &&
                        _map(ERROR_PANELS_ORDER, (type: keyof typeof tnMapping) => {
                          const panelName = tnMapping[type]
                          // @ts-expect-error
                          const panelIcon = panelIconMapping[type]

                          if (type === 'cc') {
                            const ccPanelName = tnMapping[countryActiveTab]

                            const rowMapper = (entry: CountryEntry) => {
                              const { name: entryName, cc } = entry

                              if (cc) {
                                return <CCRow cc={cc} name={entryName} language={language} />
                              }

                              return <CCRow cc={entryName} language={language} />
                            }

                            return (
                              <Panel
                                key={countryActiveTab}
                                icon={panelIcon}
                                id={countryActiveTab}
                                onFilter={filterHandler}
                                name={<CountryDropdown onSelect={setCountryActiveTab} title={ccPanelName} />}
                                data={activeError.params[countryActiveTab]}
                                rowMapper={rowMapper}
                              />
                            )
                          }

                          if (type === 'br') {
                            const brPanelName = tnMapping[browserActiveTab]

                            const rowMapper = (entry: any) => {
                              const { name: entryName, br } = entry

                              const logoKey = browserActiveTab === 'br' ? entryName : br

                              // @ts-expect-error
                              const logoUrl = BROWSER_LOGO_MAP[logoKey]

                              if (!logoUrl) {
                                return (
                                  <>
                                    <GlobeAltIcon className='h-5 w-5' />
                                    &nbsp;
                                    {entryName}
                                  </>
                                )
                              }

                              return (
                                <>
                                  <img src={logoUrl} className='h-5 w-5' alt='' />
                                  &nbsp;
                                  {entryName}
                                </>
                              )
                            }

                            return (
                              <Panel
                                key={browserActiveTab}
                                icon={panelIcon}
                                id={browserActiveTab}
                                onFilter={filterHandler}
                                name={<BrowserDropdown onSelect={setBrowserActiveTab} title={brPanelName} />}
                                data={activeError.params[browserActiveTab]}
                                rowMapper={rowMapper}
                              />
                            )
                          }

                          if (type === 'os') {
                            const osPanelName = tnMapping[osActiveTab]

                            const rowMapper = (entry: any) => {
                              const { name: entryName, os } = entry

                              const logoKey = osActiveTab === 'os' ? entryName : os

                              // @ts-expect-error
                              const logoPathLight = OS_LOGO_MAP[logoKey]
                              // @ts-expect-error
                              const logoPathDark = OS_LOGO_MAP_DARK[logoKey]

                              let logoPath = _theme === 'dark' ? logoPathDark : logoPathLight
                              logoPath ||= logoPathLight

                              if (!logoPath) {
                                return (
                                  <>
                                    <GlobeAltIcon className='h-5 w-5' />
                                    &nbsp;
                                    {entryName}
                                  </>
                                )
                              }

                              const logoUrl = `/${logoPath}`

                              return (
                                <>
                                  <img src={logoUrl} className='h-5 w-5 dark:fill-gray-50' alt='' />
                                  &nbsp;
                                  {entryName}
                                </>
                              )
                            }

                            return (
                              <Panel
                                key={osActiveTab}
                                icon={panelIcon}
                                id={osActiveTab}
                                onFilter={filterHandler}
                                name={<OSDropdown onSelect={setOsActiveTab} title={osPanelName} />}
                                data={activeError.params[osActiveTab]}
                                rowMapper={rowMapper}
                              />
                            )
                          }

                          if (type === 'dv') {
                            return (
                              <Panel
                                key={type}
                                icon={panelIcon}
                                id={type}
                                onFilter={filterHandler}
                                name={panelName}
                                data={activeError.params[type]}
                                rowMapper={(entry: { name: keyof typeof deviceIconMapping }) => {
                                  const { name: entryName } = entry

                                  const icon = deviceIconMapping[entryName]

                                  if (!icon) {
                                    return entryName
                                  }

                                  return (
                                    <>
                                      {icon}
                                      &nbsp;
                                      {entryName}
                                    </>
                                  )
                                }}
                                capitalize
                              />
                            )
                          }

                          if (type === 'pg') {
                            return (
                              <Panel
                                key={pageActiveTab}
                                icon={panelIcon}
                                id={pageActiveTab}
                                onFilter={filterHandler}
                                rowMapper={({ name: entryName }) => {
                                  if (!entryName) {
                                    return _toUpper(
                                      pageActiveTab === 'pg' ? t('project.redactedPage') : t('project.unknownHost'),
                                    )
                                  }

                                  let decodedUri = entryName as string

                                  try {
                                    decodedUri = decodeURIComponent(entryName)
                                  } catch (_) {
                                    // do nothing
                                  }

                                  return decodedUri
                                }}
                                data={activeError.params[pageActiveTab]}
                                name={<PageDropdown onSelect={setPageActiveTab} title={tnMapping[pageActiveTab]} />}
                              />
                            )
                          }

                          if (type === 'lc') {
                            return (
                              <Panel
                                key={type}
                                icon={panelIcon}
                                id={type}
                                onFilter={filterHandler}
                                name={panelName}
                                data={activeError.params[type]}
                                rowMapper={({ name: entryName }: { name: string }) =>
                                  getLocaleDisplayName(entryName, language)
                                }
                              />
                            )
                          }

                          return (
                            <Panel
                              key={type}
                              icon={panelIcon}
                              id={type}
                              onFilter={filterHandler}
                              name={panelName}
                              data={activeError.params[type]}
                            />
                          )
                        })}
                    </div>
                    {_isEmpty(activeError) && errorLoading && <Loader />}
                    {!errorLoading && _isEmpty(activeError) && <NoErrorDetails />}
                  </>
                )}
                {activeTab === PROJECT_TABS.alerts && project.role === 'owner' && authenticated && (
                  <ProjectAlertsView projectId={id} />
                )}
                {activeTab === PROJECT_TABS.uptime && <Uptime />}
                {analyticsLoading && (activeTab === PROJECT_TABS.traffic || activeTab === PROJECT_TABS.performance) && (
                  <Loader />
                )}
                {isPanelsDataEmpty && activeTab === PROJECT_TABS.traffic && (
                  <NoEvents
                    filters={filters}
                    filterHandler={filterHandler}
                    onChangeExclusive={onChangeExclusive}
                    resetActiveTabFilters={resetActiveTabFilters}
                  />
                )}
                {isPanelsDataEmptyPerf && activeTab === PROJECT_TABS.performance && (
                  <NoEvents
                    filters={filtersPerf}
                    filterHandler={filterHandler}
                    onChangeExclusive={onChangeExclusive}
                    resetActiveTabFilters={resetActiveTabFilters}
                  />
                )}
                {activeTab === PROJECT_TABS.traffic && (
                  <div className={cx('pt-2', { hidden: isPanelsDataEmpty || analyticsLoading })}>
                    {!_isEmpty(overall) && (
                      <div className='mb-5 flex flex-wrap justify-center gap-5 lg:justify-start'>
                        <MetricCards
                          overall={overall}
                          overallCompare={overallCompare}
                          activePeriodCompare={activePeriodCompare}
                        />
                        {!_isEmpty(panelsData.meta) &&
                          _map(panelsData.meta, ({ key, current, previous }) => (
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
                          ))}
                      </div>
                    )}
                    <div
                      className={cx('h-80', {
                        hidden: checkIfAllMetricsAreDisabled,
                      })}
                    >
                      <div className='mt-5 h-80 md:mt-0 [&_svg]:!overflow-visible' id='dataChart' />
                    </div>
                    <Filters
                      onRemoveFilter={filterHandler}
                      onChangeExclusive={onChangeExclusive}
                      tnMapping={tnMapping}
                      resetFilters={resetActiveTabFilters}
                    />
                    <CustomMetrics
                      metrics={customMetrics}
                      onRemoveMetric={(id) => onRemoveCustomMetric(id)}
                      resetMetrics={resetCustomMetrics}
                    />
                    {dataLoading && (
                      <div className='static mt-4 !bg-transparent' id='loader'>
                        <div className='loader-head dark:!bg-slate-800'>
                          <div className='first dark:!bg-slate-600' />
                          <div className='second dark:!bg-slate-600' />
                        </div>
                      </div>
                    )}
                    <div className='mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
                      {!_isEmpty(panelsData.types) &&
                        _map(TRAFFIC_PANELS_ORDER, (type: keyof typeof tnMapping) => {
                          const panelName = tnMapping[type]
                          // @ts-expect-error
                          const panelIcon = panelIconMapping[type]
                          const customTabs = _filter(customPanelTabs, (tab) => tab.panelID === type)

                          if (type === 'cc') {
                            const ccPanelName = tnMapping[countryActiveTab]

                            const rowMapper = (entry: CountryEntry) => {
                              const { name: entryName, cc } = entry

                              if (cc) {
                                return <CCRow cc={cc} name={entryName} language={language} />
                              }

                              return <CCRow cc={entryName} language={language} />
                            }

                            return (
                              <Panel
                                key={countryActiveTab}
                                icon={panelIcon}
                                id={countryActiveTab}
                                onFilter={filterHandler}
                                name={<CountryDropdown onSelect={setCountryActiveTab} title={ccPanelName} />}
                                data={panelsData.data[countryActiveTab]}
                                customTabs={customTabs}
                                rowMapper={rowMapper}
                              />
                            )
                          }

                          if (type === 'br') {
                            const brPanelName = tnMapping[browserActiveTab]

                            const rowMapper = (entry: any) => {
                              const { name: entryName, br } = entry

                              const logoKey = browserActiveTab === 'br' ? entryName : br

                              // @ts-expect-error
                              const logoUrl = BROWSER_LOGO_MAP[logoKey]

                              if (!logoUrl) {
                                return (
                                  <>
                                    <GlobeAltIcon className='h-5 w-5' />
                                    &nbsp;
                                    {entryName}
                                  </>
                                )
                              }

                              return (
                                <>
                                  <img src={logoUrl} className='h-5 w-5' alt='' />
                                  &nbsp;
                                  {entryName}
                                </>
                              )
                            }

                            return (
                              <Panel
                                key={browserActiveTab}
                                icon={panelIcon}
                                id={browserActiveTab}
                                onFilter={filterHandler}
                                name={<BrowserDropdown onSelect={setBrowserActiveTab} title={brPanelName} />}
                                data={panelsData.data[browserActiveTab]}
                                rowMapper={rowMapper}
                              />
                            )
                          }

                          if (type === 'os') {
                            const osPanelName = tnMapping[osActiveTab]

                            const rowMapper = (entry: any) => {
                              const { name: entryName, os } = entry

                              const logoKey = osActiveTab === 'os' ? entryName : os

                              // @ts-expect-error
                              const logoPathLight = OS_LOGO_MAP[logoKey]
                              // @ts-expect-error
                              const logoPathDark = OS_LOGO_MAP_DARK[logoKey]

                              let logoPath = _theme === 'dark' ? logoPathDark : logoPathLight
                              logoPath ||= logoPathLight

                              if (!logoPath) {
                                return (
                                  <>
                                    <GlobeAltIcon className='h-5 w-5' />
                                    &nbsp;
                                    {entryName}
                                  </>
                                )
                              }

                              const logoUrl = `/${logoPath}`

                              return (
                                <>
                                  <img src={logoUrl} className='h-5 w-5 dark:fill-gray-50' alt='' />
                                  &nbsp;
                                  {entryName}
                                </>
                              )
                            }

                            return (
                              <Panel
                                key={osActiveTab}
                                icon={panelIcon}
                                id={osActiveTab}
                                onFilter={filterHandler}
                                name={<OSDropdown onSelect={setOsActiveTab} title={osPanelName} />}
                                data={panelsData.data[osActiveTab]}
                                rowMapper={rowMapper}
                              />
                            )
                          }

                          if (type === 'dv') {
                            return (
                              <Panel
                                key={type}
                                icon={panelIcon}
                                id={type}
                                onFilter={filterHandler}
                                name={panelName}
                                data={panelsData.data[type]}
                                customTabs={customTabs}
                                rowMapper={(entry: { name: keyof typeof deviceIconMapping }) => {
                                  const { name: entryName } = entry

                                  const icon = deviceIconMapping[entryName]

                                  if (!icon) {
                                    return entryName
                                  }

                                  return (
                                    <>
                                      {icon}
                                      &nbsp;
                                      {entryName}
                                    </>
                                  )
                                }}
                                capitalize
                              />
                            )
                          }

                          if (type === 'ref') {
                            return (
                              <Panel
                                key={type}
                                icon={panelIcon}
                                id={type}
                                onFilter={filterHandler}
                                name={panelName}
                                data={panelsData.data[type]}
                                customTabs={customTabs}
                                rowMapper={({ name: entryName }) => <RefRow rowName={entryName} />}
                              />
                            )
                          }

                          if (type === 'so') {
                            const ccPanelName = tnMapping[utmActiveTab]

                            return (
                              <Panel
                                key={utmActiveTab}
                                icon={panelIcon}
                                id={utmActiveTab}
                                onFilter={filterHandler}
                                name={<UTMDropdown onSelect={setUtmActiveTab} title={ccPanelName} />}
                                data={panelsData.data[utmActiveTab]}
                                customTabs={customTabs}
                                rowMapper={({ name: entryName }) => decodeURIComponent(entryName)}
                              />
                            )
                          }

                          if (type === 'pg') {
                            return (
                              <Panel
                                key={pageActiveTab}
                                icon={panelIcon}
                                id={pageActiveTab}
                                onFilter={filterHandler}
                                onFragmentChange={setPgActiveFragment}
                                rowMapper={({ name: entryName }) => {
                                  if (!entryName) {
                                    return _toUpper(
                                      pageActiveTab === 'pg' ? t('project.redactedPage') : t('project.unknownHost'),
                                    )
                                  }

                                  let decodedUri = entryName as string

                                  try {
                                    decodedUri = decodeURIComponent(entryName)
                                  } catch (_) {
                                    // do nothing
                                  }

                                  return decodedUri
                                }}
                                name={
                                  pgActiveFragment === 1 ? (
                                    tnMapping.userFlow
                                  ) : (
                                    <PageDropdown onSelect={setPageActiveTab} title={tnMapping[pageActiveTab]} />
                                  )
                                }
                                data={panelsData.data[pageActiveTab]}
                                customTabs={customTabs}
                              />
                            )
                          }

                          if (type === 'lc') {
                            return (
                              <Panel
                                key={type}
                                icon={panelIcon}
                                id={type}
                                onFilter={filterHandler}
                                name={panelName}
                                data={panelsData.data[type]}
                                rowMapper={({ name: entryName }: { name: string }) =>
                                  getLocaleDisplayName(entryName, language)
                                }
                                customTabs={customTabs}
                              />
                            )
                          }

                          return (
                            <Panel
                              key={type}
                              icon={panelIcon}
                              id={type}
                              onFilter={filterHandler}
                              name={panelName}
                              data={panelsData.data[type]}
                              customTabs={customTabs}
                            />
                          )
                        })}
                      {!_isEmpty(panelsData.data) && (
                        <Metadata
                          customs={panelsData.customs}
                          properties={panelsData.properties}
                          filters={filters}
                          onFilter={filterHandler}
                          chartData={chartData}
                          customTabs={_filter(customPanelTabs, (tab) => tab.panelID === 'ce')}
                          getCustomEventMetadata={getCustomEventMetadata}
                          getPropertyMetadata={_getPropertyMetadata}
                        />
                      )}
                    </div>
                  </div>
                )}
                {activeTab === PROJECT_TABS.performance && (
                  <div className={cx('pt-8 md:pt-4', { hidden: isPanelsDataEmptyPerf || analyticsLoading })}>
                    {!_isEmpty(overallPerformance) && (
                      <PerformanceMetricCards
                        overall={overallPerformance}
                        overallCompare={overallPerformanceCompare}
                        activePeriodCompare={activePeriodCompare}
                      />
                    )}
                    <div
                      className={cx('h-80', {
                        hidden: checkIfAllMetricsAreDisabled,
                      })}
                    >
                      <div className='h-80 [&_svg]:!overflow-visible' id='dataChart' />
                    </div>
                    <Filters
                      onRemoveFilter={filterHandler}
                      onChangeExclusive={onChangeExclusive}
                      tnMapping={tnMapping}
                      resetFilters={resetActiveTabFilters}
                    />
                    {dataLoading && (
                      <div className='static mt-4 !bg-transparent' id='loader'>
                        <div className='loader-head dark:!bg-slate-800'>
                          <div className='first dark:!bg-slate-600' />
                          <div className='second dark:!bg-slate-600' />
                        </div>
                      </div>
                    )}
                    <div className='mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
                      {!_isEmpty(panelsDataPerf.types) &&
                        _map(PERFORMANCE_PANELS_ORDER, (type: keyof typeof tnMapping) => {
                          const panelName = tnMapping[type]
                          // @ts-expect-error
                          const panelIcon = panelIconMapping[type]
                          const customTabs = _filter(customPanelTabs, (tab) => tab.panelID === type)

                          if (type === 'cc') {
                            const ccPanelName = tnMapping[countryActiveTab]

                            const rowMapper = (entry: CountryEntry) => {
                              const { name: entryName, cc } = entry

                              if (cc) {
                                return <CCRow cc={cc} name={entryName} language={language} />
                              }

                              return <CCRow cc={entryName} language={language} />
                            }

                            return (
                              <Panel
                                projectPassword={projectPassword}
                                key={countryActiveTab}
                                icon={panelIcon}
                                id={countryActiveTab}
                                onFilter={filterHandler}
                                name={<CountryDropdown onSelect={setCountryActiveTab} title={ccPanelName} />}
                                data={panelsDataPerf.data[countryActiveTab]}
                                customTabs={customTabs}
                                rowMapper={rowMapper}
                                // @ts-expect-error
                                valueMapper={(value) => getStringFromTime(getTimeFromSeconds(value), true)}
                              />
                            )
                          }

                          if (type === 'dv') {
                            return (
                              <Panel
                                projectPassword={projectPassword}
                                key={type}
                                icon={panelIcon}
                                id={type}
                                onFilter={filterHandler}
                                name={panelName}
                                data={panelsDataPerf.data[type]}
                                customTabs={customTabs}
                                rowMapper={(entry: { name: keyof typeof deviceIconMapping }) => {
                                  const { name: entryName } = entry

                                  const icon = deviceIconMapping[entryName]

                                  if (!icon) {
                                    return entryName
                                  }

                                  return (
                                    <>
                                      {icon}
                                      &nbsp;
                                      {entryName}
                                    </>
                                  )
                                }}
                                // @ts-expect-error
                                valueMapper={(value) => getStringFromTime(getTimeFromSeconds(value), true)}
                                capitalize
                              />
                            )
                          }

                          if (type === 'pg') {
                            return (
                              <Panel
                                projectPassword={projectPassword}
                                key={pageActiveTab}
                                icon={panelIcon}
                                id={pageActiveTab}
                                onFilter={filterHandler}
                                data={panelsDataPerf.data[pageActiveTab]}
                                customTabs={customTabs}
                                // @ts-expect-error
                                valueMapper={(value) => getStringFromTime(getTimeFromSeconds(value), true)}
                                rowMapper={({ name: entryName }) =>
                                  entryName ||
                                  (pageActiveTab === 'pg' ? t('project.redactedPage') : t('project.unknownHost'))
                                }
                                name={<PageDropdown onSelect={setPageActiveTab} title={tnMapping[pageActiveTab]} />}
                              />
                            )
                          }

                          if (type === 'br') {
                            const brPanelName = tnMapping[browserActiveTab]

                            const rowMapper = (entry: any) => {
                              const { name: entryName, br } = entry

                              const logoKey = browserActiveTab === 'br' ? entryName : br

                              // @ts-expect-error
                              const logoUrl = BROWSER_LOGO_MAP[logoKey]

                              if (!logoUrl) {
                                return (
                                  <>
                                    <GlobeAltIcon className='h-5 w-5' />
                                    &nbsp;
                                    {entryName}
                                  </>
                                )
                              }

                              return (
                                <>
                                  <img src={logoUrl} className='h-5 w-5' alt='' />
                                  &nbsp;
                                  {entryName}
                                </>
                              )
                            }

                            return (
                              <Panel
                                key={browserActiveTab}
                                icon={panelIcon}
                                id={browserActiveTab}
                                onFilter={filterHandler}
                                name={<BrowserDropdown onSelect={setBrowserActiveTab} title={brPanelName} />}
                                data={panelsDataPerf.data[browserActiveTab]}
                                rowMapper={rowMapper}
                              />
                            )
                          }

                          return (
                            <Panel
                              key={type}
                              icon={panelIcon}
                              id={type}
                              onFilter={filterHandler}
                              name={panelName}
                              data={panelsDataPerf.data[type]}
                              customTabs={customTabs}
                              // @ts-expect-error
                              valueMapper={(value) => getStringFromTime(getTimeFromSeconds(value), true)}
                            />
                          )
                        })}
                    </div>
                  </div>
                )}
                {activeTab === PROJECT_TABS.funnels && (
                  <div className={cx('pt-4 md:pt-0', { hidden: !activeFunnel || analyticsLoading })}>
                    <div className='h-80'>
                      <div className='mt-5 h-80 md:mt-0' id='dataChart' />
                    </div>
                    {dataLoading && (
                      <div className='static mt-4 !bg-transparent' id='loader'>
                        <div className='loader-head dark:!bg-slate-800'>
                          <div className='first dark:!bg-slate-600' />
                          <div className='second dark:!bg-slate-600' />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <ViewProjectHotkeys isOpened={isHotkeysHelpOpened} onClose={() => setIsHotkeysHelpOpened(false)} />
            <NewFunnel
              project={project}
              projectPassword={projectPassword}
              pid={id}
              funnel={funnelToEdit}
              isOpened={isNewFunnelOpened}
              allowedToManage={allowedToManage}
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
              projectPassword={projectPassword}
              showModal={showFiltersSearch}
              setShowModal={setShowFiltersSearch}
              setProjectFilter={onFilterSearch}
              pid={id}
              tnMapping={tnMapping}
              filters={
                activeTab === PROJECT_TABS.performance
                  ? filtersPerf
                  : activeTab === PROJECT_TABS.sessions
                    ? filtersSessions
                    : activeTab === PROJECT_TABS.errors
                      ? filtersErrors
                      : filters
              }
            />
            <AddAViewModal
              projectPassword={projectPassword}
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
              pid={id}
              tnMapping={tnMapping}
            />
            {!embedded && <Footer authenticated={authenticated} showDBIPMessage />}
          </>
        </ViewProjectContext.Provider>
      )}
    </ClientOnly>
  )
}

export default ViewProject

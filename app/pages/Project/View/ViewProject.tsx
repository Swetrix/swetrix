/* eslint-disable react/forbid-prop-types, react/no-unstable-nested-components, react/display-name */
import React, { useState, useEffect, useMemo, memo, useRef, useCallback } from 'react'
import { ClientOnly } from 'remix-utils/client-only'
import useSize from 'hooks/useSize'
import { useNavigate, useParams, Link } from '@remix-run/react'
import bb from 'billboard.js'
import {
  ArrowDownTrayIcon,
  Cog8ToothIcon,
  ArrowPathIcon,
  ChartBarIcon,
  BoltIcon,
  BellIcon,
  NoSymbolIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronLeftIcon,
  GlobeAltIcon,
  UsersIcon,
  BugAntIcon,
} from '@heroicons/react/24/outline'
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
import _startsWith from 'lodash/startsWith'
import _debounce from 'lodash/debounce'
import _forEach from 'lodash/forEach'
import _some from 'lodash/some'
import _pickBy from 'lodash/pickBy'
import _every from 'lodash/every'
import _size from 'lodash/size'
import _truncate from 'lodash/truncate'
import _isString from 'lodash/isString'
import PropTypes from 'prop-types'

import { withProjectProtected } from 'hoc/projectProtected'

import { periodToCompareDate } from 'utils/compareConvertDate'

import { getTimeFromSeconds, getStringFromTime, getLocaleDisplayName } from 'utils/generic'
import { getItem, setItem, removeItem } from 'utils/localstorage'
import EventsRunningOutBanner from 'components/EventsRunningOutBanner'
import {
  tbPeriodPairs,
  getProjectCacheKey,
  LIVE_VISITORS_UPDATE_INTERVAL,
  DEFAULT_TIMEZONE,
  CDN_URL,
  isDevelopment,
  timeBucketToDays,
  getProjectCacheCustomKey,
  MAX_MONTHS_IN_PAST,
  PROJECT_TABS,
  TimeFormat,
  getProjectForcastCacheKey,
  chartTypes,
  roleAdmin,
  TRAFFIC_PANELS_ORDER,
  PERFORMANCE_PANELS_ORDER,
  isSelfhosted,
  tbPeriodPairsCompare,
  PERIOD_PAIRS_COMPARE,
  filtersPeriodPairs,
  IS_ACTIVE_COMPARE,
  PROJECTS_PROTECTED,
  getProjectCacheCustomKeyPerf,
  isBrowser,
  TITLE_SUFFIX,
  FILTERS_PANELS_ORDER,
  KEY_FOR_ALL_TIME,
  MARKETPLACE_URL,
  getFunnelsCacheKey,
  getFunnelsCacheCustomKey,
  BROWSER_LOGO_MAP,
  OS_LOGO_MAP,
  OS_LOGO_MAP_DARK,
  ITBPeriodPairs,
  ERROR_PANELS_ORDER,
  ERRORS_FILTERS_PANELS_ORDER,
  errorPeriodPairs,
} from 'redux/constants'
import { IUser } from 'redux/models/IUser'
import {
  IProject,
  ILiveStats,
  IFunnel,
  IAnalyticsFunnel,
  IOverallObject,
  IOverallPerformanceObject,
} from 'redux/models/IProject'
import { IProjectForShared, ISharedProject } from 'redux/models/ISharedProject'
import { ICountryEntry } from 'redux/models/IEntry'
import Loader from 'ui/Loader'
import Dropdown from 'ui/Dropdown'
import Checkbox from 'ui/Checkbox'
import Select from 'ui/Select'
import FlatPicker from 'ui/Flatpicker'
import Robot from 'ui/icons/Robot'
import LineChart from 'ui/icons/LineChart'
import BarChart from 'ui/icons/BarChart'
import Forecast from 'modals/Forecast'
import NewFunnel from 'modals/NewFunnel'
import ViewProjectHotkeys from 'modals/ViewProjectHotkeys'
import routes from 'routesPath'
import Header from 'components/Header'
import Footer from 'components/Footer'
import {
  getProjectData,
  getProject,
  getOverallStats,
  getLiveVisitors,
  getPerfData,
  getProjectDataCustomEvents,
  getProjectCompareData,
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
} from 'api'
import { getChartPrediction } from 'api/ai'
import { Panel, CustomEvents } from './Panels'
import {
  onCSVExportClick,
  getFormatDate,
  panelIconMapping,
  typeNameMapping,
  validFilters,
  validPeriods,
  validTimeBacket,
  noRegionPeriods,
  getSettings,
  getColumns,
  CHART_METRICS_MAPPING,
  CHART_METRICS_MAPPING_PERF,
  getSettingsPerf,
  transformAIChartData,
  FILTER_CHART_METRICS_MAPPING_FOR_COMPARE,
  getSettingsFunnels,
  convertFilters,
  SHORTCUTS_TABS_LISTENERS,
  SHORTCUTS_TABS_MAP,
  SHORTCUTS_GENERAL_LISTENERS,
  SHORTCUTS_TIMEBUCKETS_LISTENERS,
  CHART_MEASURES_MAPPING_PERF,
  ERROR_FILTERS_MAPPING,
} from './ViewProject.helpers'
import CCRow from './components/CCRow'
import FunnelsList from './components/FunnelsList'
import RefRow from './components/RefRow'
import NoEvents from './components/NoEvents'
import SearchFilters from './components/SearchFilters'
import Filters from './components/Filters'
import LiveVisitorsDropdown from './components/LiveVisitorsDropdown'
import CountryDropdown from './components/CountryDropdown'
import MetricCards from './components/MetricCards'
import PerformanceMetricCards from './components/PerformanceMetricCards'
import ProjectAlertsView from '../Alerts/View'
import UTMDropdown from './components/UTMDropdown'
import TBPeriodSelector from './components/TBPeriodSelector'
import { ISession } from './interfaces/session'
import { Sessions } from './components/Sessions'
import { Pageflow } from './components/Pageflow'
import { SessionDetails } from './components/SessionDetails'
import { SessionChart } from './components/SessionChart'
import { Errors } from './components/Errors'
import LockedDashboard from './components/LockedDashboard'
import WaitingForAnEvent from './components/WaitingForAnEvent'
import { ErrorChart } from './components/ErrorChart'
import { ErrorDetails } from './components/ErrorDetails'
import { IError } from './interfaces/error'
import NoErrorDetails from './components/NoErrorDetails'
import WaitingForAnError from './components/WaitingForAnError'
const SwetrixSDK = require('@swetrix/sdk')

const CUSTOM_EV_DROPDOWN_MAX_VISIBLE_LENGTH = 32
const SESSIONS_TAKE = 30
const ERRORS_TAKE = 30

interface IViewProject {
  projects: IProject[]
  extensions: any
  isLoading: boolean
  showError: (message: string) => void
  cache: any
  cachePerf: any
  setProjectCache: (pid: string, data: any, key: string) => void
  projectViewPrefs: {
    [key: string]: {
      period: string
      timeBucket: string
      rangeDate?: Date[]
    }
  } | null
  setProjectViewPrefs: (pid: string, period: string, timeBucket: string, rangeDate?: Date[]) => void
  setPublicProject: (project: Partial<IProject | ISharedProject>) => void
  setLiveStatsForProject: (id: string, count: number) => void
  generateAlert: (message: string, type: string) => void
  setProjectCachePerf: (pid: string, data: any, key: string) => void
  setProjectForcastCache: (pid: string, data: any, key: string) => void
  authenticated: boolean
  user: IUser
  timezone: string
  sharedProjects: ISharedProject[]
  projectTab: string
  setProjectTab: (tab: string) => void
  // eslint-disable-next-line no-unused-vars, no-shadow
  setProjects: (projects: Partial<IProject | ISharedProject>[]) => void
  customEventsPrefs: any
  setCustomEventsPrefs: (pid: string, data: any) => void
  liveStats: ILiveStats
  password: {
    [key: string]: string
  }
  theme: 'dark' | 'light'
  ssrTheme: 'dark' | 'light'
  embedded: boolean
  ssrAuthenticated: boolean
  queryPassword: string | null
  authLoading: boolean
  cacheFunnels: any
  setFunnelsCache: (pid: string, data: any, key: string) => void
  updateProject: (pid: string, project: Partial<IProject | ISharedProject>) => void
  projectQueryTabs: string[]
}

const ViewProject = ({
  projects,
  isLoading: _isLoading,
  showError,
  cache,
  cachePerf,
  setProjectCache,
  projectViewPrefs,
  setProjectViewPrefs,
  setPublicProject,
  setLiveStatsForProject,
  authenticated: csrAuthenticated,
  timezone,
  user,
  sharedProjects,
  extensions,
  generateAlert,
  setProjectCachePerf,
  projectTab,
  setProjectTab,
  setProjects,
  setProjectForcastCache,
  customEventsPrefs,
  setCustomEventsPrefs,
  liveStats,
  password,
  theme,
  ssrTheme,
  embedded,
  ssrAuthenticated,
  queryPassword,
  authLoading,
  cacheFunnels,
  setFunnelsCache,
  updateProject,
  projectQueryTabs,
}: IViewProject) => {
  const authenticated = isBrowser ? (authLoading ? ssrAuthenticated : csrAuthenticated) : ssrAuthenticated

  // t is used for translation
  const {
    t,
    i18n: { language },
  }: {
    t: (
      key: string,
      options?: {
        [key: string]: string | number | null
      },
    ) => string
    i18n: {
      language: string
    }
  } = useTranslation('common')

  const _theme = isBrowser ? theme : ssrTheme

  // periodPairs is used for dropdown and updated when t changes
  const [periodPairs, setPeriodPairs] = useState<ITBPeriodPairs[]>(tbPeriodPairs(t, undefined, undefined, language))

  // customExportTypes used for marketplace extensions if you have extensions with export
  const [customExportTypes, setCustomExportTypes] = useState<any[]>([])
  // customPanelTabs used for marketplace extensions if you have extensions with custom panel
  const [customPanelTabs, setCustomPanelTabs] = useState<any[]>([])
  // sdkInstance is a sdk used for dowland and working with marketplace extensions. DO NOT TOUCH IT
  const [sdkInstance, setSdkInstance] = useState<any>(null)

  // activeChartMetricsCustomEvents is a list of custom events for logic with api, chart and dropdown
  const [activeChartMetricsCustomEvents, setActiveChartMetricsCustomEvents] = useState<any[]>([])

  // dashboardRef is a ref for dashboard div
  const dashboardRef = useRef<HTMLDivElement>(null)

  // { id } is a project id from url
  // @ts-ignore
  const {
    id,
  }: {
    id: string
  } = useParams()
  // history is a history from react-router-dom
  const navigate = useNavigate()

  // find project by id from url from state in redux projects and sharedProjects. projects and sharedProjects loading from api in Saga on page load
  const project: IProjectForShared = useMemo(
    () =>
      _find(
        [...projects, ..._map(sharedProjects, (item) => ({ ...item.project, role: item.role }))],
        (p) => p.id === id,
      ) || ({} as IProjectForShared),
    [projects, id, sharedProjects],
  )

  const projectPassword: string = useMemo(
    () => password[id] || (getItem(PROJECTS_PROTECTED)?.[id] as string) || queryPassword || '',
    [id, password, queryPassword],
  )

  /* isSharedProject is a boolean check if project is shared. If isSharedProject is true,
  we used role and other colummn from sharedProjects.
  And it is used for remove settings button when user have role viewer or logic with Alert tabs */
  const isSharedProject = useMemo(() => {
    const foundProject = _find([..._map(sharedProjects, (item) => item.project)], (p) => p.id === id)
    return !_isEmpty(foundProject)
  }, [id, sharedProjects])

  // areFiltersParsed used for check filters is parsed from url. If we have query params in url, we parse it and set to state
  // when areFiltersParsed and areFiltersPerfParsed changed we call loadAnalytics or loadAnalyticsPerf and other func for load data
  // all state with Parsed in name is used for parse query params from url
  const [areFiltersParsed, setAreFiltersParsed] = useState<boolean>(false)
  // similar areFiltersParsed but using for activeTab === 'performance'
  const [areFiltersPerfParsed, setAreFiltersPerfParsed] = useState<boolean>(false)
  // similar areFiltersParsed and areFiltersPerfParsed but using for period
  const [arePeriodParsed, setArePeriodParsed] = useState<boolean>(false)
  // similar areFiltersParsed and areFiltersPerfParsed but using for timeBucket
  const [areTimeBucketParsed, setAreTimeBucketParsed] = useState<boolean>(false)

  // panelsData is a data used for components <Panels /> and <CustomEvents />,
  // also using for logic with custom events on chart and export data like csv
  const [panelsData, setPanelsData] = useState<any>({})
  const [overall, setOverall] = useState<Partial<IOverallObject>>({})
  const [overallPerformance, setOverallPerformance] = useState<Partial<IOverallPerformanceObject>>({})
  // isPanelsDataEmpty is a true we are display components <NoEvents /> and do not show dropdowns with activeChartMetrics
  const [isPanelsDataEmpty, setIsPanelsDataEmpty] = useState<boolean>(false)
  const [isForecastOpened, setIsForecastOpened] = useState<boolean>(false)
  const [isNewFunnelOpened, setIsNewFunnelOpened] = useState<boolean>(false)
  // analyticsLoading is a boolean for show loader on chart
  const [analyticsLoading, setAnalyticsLoading] = useState<boolean>(true)
  // period using for logic with update data on chart. Set when user change period in dropdown and when we parse query params from url
  const [period, setPeriod] = useState<string>(
    projectViewPrefs ? projectViewPrefs[id]?.period || periodPairs[4].period : periodPairs[4].period,
  )
  // timeBucket using for logic with update data on chart. Set when user change timeBucket in dropdown and when we parse query params from url
  const [timeBucket, setTimebucket] = useState<string>(
    projectViewPrefs ? projectViewPrefs[id]?.timeBucket || periodPairs[4].tbs[1] : periodPairs[4].tbs[1],
  )
  // activeTab using for change tabs and display other data on chart. Like performance, traffic, custom events
  const activePeriod = useMemo(() => _find(periodPairs, (p) => p.period === period), [period, periodPairs])
  // chartData is a data for chart. It is a main data for chart
  const [chartData, setChartData] = useState<any>({})
  // mainChart is a ref for chart
  const [mainChart, setMainChart] = useState<any>(null)
  // dataLoading is a boolean for show loader on chart and do not load data when we have dataLoading === true
  const [dataLoading, setDataLoading] = useState<boolean>(false)
  // activeChartMetrics is a list of metrics for logic with api, chart and dropdown
  // when user change metrics in dropdown, we change activeChartMetrics and show other data on chart
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
  // similar activeChartMetrics but using for performance tab
  const [activeChartMetricsPerf, setActiveChartMetricsPerf] = useState<string>(CHART_METRICS_MAPPING_PERF.timing)
  const [activePerfMeasure, setActivePerfMeasure] = useState(CHART_MEASURES_MAPPING_PERF.median)
  // checkIfAllMetricsAreDisabled when all metrics are disabled, we are hidden chart
  const checkIfAllMetricsAreDisabled = useMemo(
    () => !_some({ ...activeChartMetrics, ...activeChartMetricsCustomEvents }, (value) => value),
    [activeChartMetrics, activeChartMetricsCustomEvents],
  )
  // filters - when we change filters we loading new data from api, update query url and update chart
  const [filters, setFilters] = useState<any[]>([])
  // similar filters but using for performance tab
  const [filtersPerf, setFiltersPerf] = useState<any[]>([])
  // similar filters but using for the sessions tab
  const [filtersSessions, setFiltersSessions] = useState<any[]>([])
  const [areFiltersSessionsParsed, setAreFiltersSessionsParsed] = useState<boolean>(false)
  const [filtersErrors, setFiltersErrors] = useState<any[]>([])
  const [areFiltersErrorsParsed, setAreFiltersErrorsParsed] = useState<boolean>(false)

  // isLoading is a true when we loading data from api
  const isLoading = authenticated ? _isLoading : false
  // tnMapping is a mapping for panels type
  const tnMapping = typeNameMapping(t)
  // refCalendar is a ref for calendar
  const refCalendar = useRef(null)
  // refCalendarCompare is a ref for calendar when compare is enabled
  const refCalendarCompare = useRef(null)
  // localStorageDateRange is a date range from local storage
  const localStorageDateRange = projectViewPrefs ? projectViewPrefs[id]?.rangeDate : null
  // dateRange is a date range for calendar
  const [dateRange, setDateRange] = useState<null | Date[]>(
    localStorageDateRange ? [new Date(localStorageDateRange[0]), new Date(localStorageDateRange[1])] : null,
  )
  // activeTab traffic, performance, alerts
  const [activeTab, setActiveTab] = useState<string>(() => {
    // first we check if we have activeTab in url
    // if we have activeTab in url, we return it
    // if we do not have activeTab in url, we return activeTab from localStorage or default tab trafic
    return projectTab || PROJECT_TABS.traffic
  })

  const [isHotkeysHelpOpened, setIsHotkeysHelpOpened] = useState(false)

  // sessions
  const [sessionsSkip, setSessionsSkip] = useState<number>(0)
  const [canLoadMoreSessions, setCanLoadMoreSessions] = useState<boolean>(false)
  const [sessions, setSessions] = useState<any[]>([])
  const [sessionsLoading, setSessionsLoading] = useState<boolean | null>(null) // null - not loaded, true - loading, false - loaded
  const [activeSession, setActiveSession] = useState<any>(null)
  const [sessionLoading, setSessionLoading] = useState<boolean>(false)

  // errors
  const [errorsSkip, setErrorsSkip] = useState<number>(0)
  const [canLoadMoreErrors, setCanLoadMoreErrors] = useState<boolean>(false)
  const [errors, setErrors] = useState<any[]>([])
  const [errorsLoading, setErrorsLoading] = useState<boolean | null>(null) // null - not loaded, true - loading, false - loaded
  const [activeError, setActiveError] = useState<any>(null)
  const [errorLoading, setErrorLoading] = useState<boolean>(false)
  const [errorStatusUpdating, setErrorStatusUpdating] = useState(false)
  const [activeEID, setActiveEID] = useState<string | null>(null)

  const [activeFunnel, setActiveFunnel] = useState<IFunnel | null>(null)
  const [funnelToEdit, setFunnelToEdit] = useState<IFunnel | undefined>(undefined)
  const [funnelActionLoading, setFunnelActionLoading] = useState<boolean>(false)

  const mode = activeChartMetrics[CHART_METRICS_MAPPING.cumulativeMode] ? 'cumulative' : 'periodical'

  const onFunnelCreate = async (name: string, steps: string[]) => {
    if (funnelActionLoading) {
      return
    }

    setFunnelActionLoading(true)

    try {
      await addFunnel(id, name, steps)
    } catch (reason: any) {
      console.error('[ERROR] (onFunnelCreate)(addFunnel)', reason)
      showError(reason)
    }

    try {
      const funnels = await getFunnels(id, projectPassword)

      updateProject(id, {
        funnels,
      })
    } catch (reason: any) {
      console.error('[ERROR] (onFunnelCreate)(getFunnels)', reason)
    }

    generateAlert(t('apiNotifications.funnelCreated'), 'success')
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
      showError(reason)
    }

    try {
      const funnels = await getFunnels(id, projectPassword)

      await updateProject(id, {
        funnels,
      })
    } catch (reason: any) {
      console.error('[ERROR] (onFunnelCreate)(getFunnels)', reason)
    }

    generateAlert(t('apiNotifications.funnelUpdated'), 'success')
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
      showError(reason)
    }

    try {
      const funnels = await getFunnels(id, projectPassword)

      updateProject(id, {
        funnels,
      })
    } catch (reason: any) {
      console.error('[ERROR] (onFunnelCreate)(getFunnels)', reason)
    }

    generateAlert(t('apiNotifications.funnelDeleted'), 'success')
    setFunnelActionLoading(false)
  }
  // pgActiveFragment is a active fragment for pagination
  const [pgActiveFragment, setPgActiveFragment] = useState<number>(0)

  // TODO: THIS SHOULD BE MOVED TO REDUCERS WITH CACHE FUNCTIONALITY
  // I PUT IT HERE JUST TO SEE IF IT WORKS WELL
  // forecastData is a data for forecast chart
  const [forecasedChartData, setForecasedChartData] = useState<any>({})

  // Used to switch between Country, Region and City tabs
  const [countryActiveTab, setCountryActiveTab] = useState<'cc' | 'rg' | 'ct'>('cc')

  // Used to switch between different UTM tabs
  const [utmActiveTab, setUtmActiveTab] = useState<'so' | 'me' | 'ca'>('so')

  // chartDataPerf is a data for performance chart
  const [chartDataPerf, setChartDataPerf] = useState<any>({})
  // similar to isPanelsDataEmpty but using for performance tab
  const [isPanelsDataEmptyPerf, setIsPanelsDataEmptyPerf] = useState<boolean>(false)
  // similar to panelsData but using for performance tab
  const [panelsDataPerf, setPanelsDataPerf] = useState<any>({})
  // timeFormat is a time format for chart
  // @ts-expect-error
  const timeFormat = useMemo<'12-hour' | '24-hour'>(() => user.timeFormat || TimeFormat['12-hour'], [user])
  // ref, size using for logic with responsive chart
  const [ref, size] = useSize() as any
  // rotateXAxias using for logic with responsive chart
  const rotateXAxis = useMemo(() => size.width > 0 && size.width < 500, [size])
  // customEventsChartData is a data for custom events on a chart
  const customEventsChartData = useMemo(
    () =>
      _pickBy(customEventsPrefs[id], (value, keyCustomEvents) =>
        _includes(activeChartMetricsCustomEvents, keyCustomEvents),
      ),
    [customEventsPrefs, id, activeChartMetricsCustomEvents],
  )
  // chartType is a type of chart, bar or line
  const [chartType, setChartType] = useState<string>((getItem('chartType') as string) || chartTypes.line)

  // similar to periodPairs but using for compare
  const [periodPairsCompare, setPeriodPairsCompare] = useState<
    {
      label: string
      period: string
    }[]
  >(tbPeriodPairsCompare(t, undefined, language))
  // similar to isActive but using for compare
  const [isActiveCompare, setIsActiveCompare] = useState<boolean>(() => {
    const activeCompare = getItem(IS_ACTIVE_COMPARE)

    if (typeof activeCompare === 'string') {
      return activeCompare === 'true'
    }

    if (typeof activeCompare === 'boolean') {
      return activeCompare
    }

    return false
  })
  // similar to activePeriod but using for compare
  const [activePeriodCompare, setActivePeriodCompare] = useState<string>(periodPairsCompare[0].period)
  // activeDropdownLabelCompare is a label using for overview panels and dropdown
  const activeDropdownLabelCompare = useMemo(
    () => _find(periodPairsCompare, (p) => p.period === activePeriodCompare)?.label,
    [periodPairsCompare, activePeriodCompare],
  )
  // dateRangeCompare is a date range for calendar when compare is enabled
  const [dateRangeCompare, setDateRangeCompare] = useState<null | Date[]>(null)
  // dataChartCompare is a data for chart when compare is enabled
  const [dataChartCompare, setDataChartCompare] = useState<any>({})
  const [overallCompare, setOverallCompare] = useState<Partial<IOverallObject>>({})
  const [overallPerformanceCompare, setOverallPerformanceCompare] = useState<Partial<IOverallPerformanceObject>>({})
  // dataChartPerfCompare is a data for performance chart when compare is enabled
  const [dataChartPerfCompare, setDataChartPerfCompare] = useState<any>({})
  // maxRangeCompare is a max range for calendar when compare is enabled
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

  // pgPanelNameMapping is a mapping for panel names. Using for change name of panels pg if userFlow active
  const pgPanelNameMapping = [
    tnMapping.pg, // when fragment 0 is selected
    tnMapping.userFlow, // when fragment 1 is selected
  ]

  // { name } is a project name from project
  const { name } = project

  useEffect(() => {
    let pageTitle = user?.showLiveVisitorsInTitle ? `👀 ${liveStats[id]} - ${name}` : name

    if (!pageTitle) {
      pageTitle = t('titles.main')
    }

    pageTitle += ` ${TITLE_SUFFIX}`

    document.title = pageTitle
  }, [name, user, liveStats, id, t])

  // sharedRoles is a role for shared project
  const sharedRoles = useMemo(() => _find(user.sharedProjects, (p) => p.project.id === id)?.role || {}, [user, id])

  const timeBucketSelectorItems = useMemo(() => {
    if (activeTab === PROJECT_TABS.errors) {
      return _filter(periodPairs, (el) => {
        return _includes(errorPeriodPairs, el.period)
      })
    }

    if (isActiveCompare) {
      return _filter(periodPairs, (el) => {
        return _includes(filtersPeriodPairs, el.period)
      })
    }

    if (_includes(filtersPeriodPairs, period)) {
      return periodPairs
    }

    return _filter(periodPairs, (el) => {
      return el.period !== PERIOD_PAIRS_COMPARE.COMPARE
    })
  }, [activeTab, isActiveCompare, period, periodPairs])

  // for search filters
  const [showFiltersSearch, setShowFiltersSearch] = useState(false)

  // chartMetrics is a list of metrics for dropdown
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

  // chartMetricsPerf is a list of metrics for dropdown in performance tab
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

  // chartMetricsCustomEvents is a list of custom events for dropdown
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

  // dataNamesCustomEvents is a list of custom events for chart
  const dataNamesCustomEvents = useMemo(() => {
    if (!_isEmpty(panelsData.customs)) {
      return { ..._keys(panelsData.customs) }
    }
    return {}
  }, [panelsData])

  // dataNames is a list of metrics for chart
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

  // dataNamesPerf is a list of metrics for chart in performance tab
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

  const allowedToManage = useMemo(() => project?.isOwner || sharedRoles === roleAdmin.role, [project, sharedRoles])

  const dataNamesFunnel = useMemo(
    () => ({
      dropoff: t('project.dropoff'),
      events: t('project.visitors'),
    }),
    [t],
  )

  // tabs is a tabs for project
  const tabs: {
    id: string
    label: string
    icon: any
  }[] = useMemo(() => {
    const selfhostedOnly = [
      {
        id: PROJECT_TABS.traffic,
        label: t('dashboard.traffic'),
        icon: ChartBarIcon,
      },
      {
        id: PROJECT_TABS.performance,
        label: t('dashboard.performance'),
        icon: BoltIcon,
      },
    ]

    const adminTabs = allowedToManage
      ? [
          {
            id: 'settings',
            label: t('common.settings'),
            icon: Cog8ToothIcon,
          },
        ]
      : []

    if (isSelfhosted) {
      return [...selfhostedOnly, ...adminTabs]
    }

    const newTabs = [
      ...selfhostedOnly,
      {
        id: PROJECT_TABS.sessions,
        label: t('dashboard.sessions'),
        icon: UsersIcon,
      },
      {
        id: PROJECT_TABS.errors,
        label: t('dashboard.errors'),
        icon: BugAntIcon,
      },
      {
        id: PROJECT_TABS.funnels,
        label: t('dashboard.funnels'),
        icon: FunnelIcon,
      },
      {
        id: PROJECT_TABS.alerts,
        label: t('dashboard.alerts'),
        icon: BellIcon,
      },
      ...adminTabs,
    ]

    if (projectQueryTabs && projectQueryTabs.length) {
      return _filter(newTabs, (tab) => _includes(projectQueryTabs, tab.id))
    }

    return newTabs
  }, [t, projectQueryTabs, allowedToManage])

  // activeTabLabel is a label for active tab. Using for title in dropdown
  const activeTabLabel = useMemo(() => _find(tabs, (tab) => tab.id === activeTab)?.label, [tabs, activeTab])

  // switchActiveChartMetric is a function for change activeChartMetrics
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const switchActiveChartMetric = useCallback(
    _debounce((pairID) => {
      if (activeTab === PROJECT_TABS.performance) {
        setActiveChartMetricsPerf(pairID)
      } else {
        setActiveChartMetrics((prev) => ({ ...prev, [pairID]: !prev[pairID] }))
      }
    }, 0),
    [activeTab],
  )

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
      await updateErrorStatus(project.id, 'resolved', activeEID)
      await loadError(activeEID)
      updateStatusInErrors('resolved')
    } catch (reason) {
      console.error('[markErrorAsResolved]', reason)
      generateAlert(t('apiNotifications.updateErrorStatusFailed'), 'error')
      setErrorStatusUpdating(false)
      return
    }

    generateAlert(t('apiNotifications.errorStatusUpdated'), 'success')
    setErrorStatusUpdating(false)
  }

  const markErrorAsActive = async () => {
    if (errorStatusUpdating || !activeEID || !activeError?.details?.eid) {
      return
    }

    setErrorStatusUpdating(true)

    try {
      await updateErrorStatus(project.id, 'active', activeEID)
      await loadError(activeEID)
      updateStatusInErrors('active')
    } catch (reason) {
      console.error('[markErrorAsResolved]', reason)
      generateAlert(t('apiNotifications.updateErrorStatusFailed'), 'error')
      setErrorStatusUpdating(false)
      return
    }

    generateAlert(t('apiNotifications.errorStatusUpdated'), 'success')
    setErrorStatusUpdating(false)
  }

  // onErrorLoading is a function for redirect to dashboard when project do not exist
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

        showError(t('apiNotifications.incorrectPassword'))
        navigate({
          pathname: _replace(routes.project_protected_password, ':id', id),
          search: `?theme=${ssrTheme}&embedded=${embedded}`,
        })
        removeItem(PROJECTS_PROTECTED)
      })
      return
    }

    showError(t('project.noExist'))
    navigate(routes.dashboard)
  }

  // loadCustomEvents is a function for load custom events data for chart from api
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
        // if custom date range is selected
        from = getFormatDate(dateRange[0])
        to = getFormatDate(dateRange[1])
      }

      // customEventsChartData includes all activeChartMetricsCustomEvents return true if not false
      const isAllActiveChartMetricsCustomEvents = _every(activeChartMetricsCustomEvents, (metric) => {
        return _includes(_keys(customEventsChartData), metric)
      })

      // check if we need to load new date or we have data in redux/localstorage
      if (!isAllActiveChartMetricsCustomEvents) {
        // check if activePeriod is custom
        if (period === 'custom' && dateRange) {
          // activePeriod is custom
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
          // activePeriod is not custom
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

      setCustomEventsPrefs(id, events)

      const applyRegions = !_includes(noRegionPeriods, activePeriod?.period)
      // render new settings for chart
      const bbSettings = getSettings(
        chartData,
        timeBucket,
        activeChartMetrics,
        applyRegions,
        timeFormat,
        forecasedChartData,
        rotateXAxis,
        chartType,
        events,
      )
      // set chart data
      setMainChart(() => {
        // @ts-ignore
        const generate = bb.generate(bbSettings)
        generate.data.names(dataNames)
        return generate
      })
    } catch (e) {
      console.error('[ERROR] FAILED TO LOAD CUSTOM EVENTS', e)
    } finally {
      setDataLoading(false)
    }
  }

  // loadCustomEvents when activeChartMetricsCustomEvents changed
  useEffect(() => {
    if (activeTab === PROJECT_TABS.traffic) {
      loadCustomEvents()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChartMetricsCustomEvents])

  // compareDisable is a function you need to use if you want to disable compare
  const compareDisable = () => {
    setIsActiveCompare(false)
    setDateRangeCompare(null)
    setDataChartCompare({})
    setOverallCompare({})
    setOverallPerformanceCompare({})
    setDataChartPerfCompare({})
    setActivePeriodCompare(periodPairsCompare[0].period)
  }

  // loadAnalytics is a function for load data for chart from api
  const loadAnalytics = async (forced = false, newFilters: any[] | null = null) => {
    if (!forced && (isLoading || _isEmpty(project) || dataLoading)) {
      return
    }

    setDataLoading(true)
    try {
      let data: {
        timeBucket?: any
        chart?: any
        params?: any
        customs?: any
        appliedFilters?: any
        overall?: IOverallObject
      }
      let dataCompare
      let key = ''
      let keyCompare = ''
      let from
      let fromCompare: string | undefined
      let to
      let toCompare: string | undefined
      let customEventsChart = customEventsChartData
      let rawOverall: any

      // first we check isActiveCompare if comapre active we load compare date or check if we have data in redux/localstorage
      // and set state dependent compare
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

          // @ts-ignore
          if (activePeriod?.period === 'custom' ? diffCompare <= diff : diffCompare <= activePeriod?.countDays) {
            fromCompare = getFormatDate(dateRangeCompare[0])
            toCompare = getFormatDate(dateRangeCompare[1])
            keyCompare = getProjectCacheCustomKey(fromCompare, toCompare, timeBucket, mode, newFilters || filters)
          } else {
            showError(t('project.compareDateRangeError'))
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
            keyCompare = getProjectCacheCustomKey(fromCompare, toCompare, timeBucket, mode, newFilters || filters)
          }
        }

        if (!_isEmpty(fromCompare) && !_isEmpty(toCompare)) {
          if (!_isEmpty(cache[id]) && !_isEmpty(cache[id][keyCompare])) {
            dataCompare = cache[id][keyCompare]
          } else {
            dataCompare =
              (await getProjectCompareData(
                id,
                timeBucket,
                '',
                newFilters || filters,
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
              newFilters || filters,
              projectPassword,
            )
            dataCompare.overall = compareOverall[id]
          }
        }

        setProjectCache(id, dataCompare, keyCompare)
      }

      // if activePeriod is custom we check dateRange and set key for cache
      if (dateRange) {
        from = getFormatDate(dateRange[0])
        to = getFormatDate(dateRange[1])
        key = getProjectCacheCustomKey(from, to, timeBucket, mode, newFilters || filters)
      } else {
        key = getProjectCacheKey(period, timeBucket, mode, newFilters || filters)
      }

      // check if we need to load new data or we have data in redux/localstorage
      if (!forced && !_isEmpty(cache[id]) && !_isEmpty(cache[id][key])) {
        data = cache[id][key]
        // @ts-ignore
        setOverall(data.overall)
      } else {
        if (period === 'custom' && dateRange) {
          data = await getProjectData(
            id,
            timeBucket,
            '',
            newFilters || filters,
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
          rawOverall = await getOverallStats([id], period, from, to, timezone, newFilters || filters, projectPassword)
        } else {
          data = await getProjectData(
            id,
            timeBucket,
            period,
            newFilters || filters,
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
          rawOverall = await getOverallStats([id], period, '', '', timezone, newFilters || filters, projectPassword)
        }

        customEventsChart = customEventsChart?.chart ? customEventsChart.chart.events : customEventsChartData

        setCustomEventsPrefs(id, customEventsChart)

        data.overall = rawOverall[id]

        setProjectCache(id, data, key)
        setOverall(rawOverall[id])
      }

      // using for extensions
      const sdkData = {
        ...(data || {}),
        filters: newFilters || filters,
        timezone,
        timeBucket,
        period,
        from,
        to,
      }

      // empty or has overall only
      if (_keys(data).length < 2) {
        setAnalyticsLoading(false)
        setDataLoading(false)
        setIsPanelsDataEmpty(true)
        sdkInstance?._emitEvent('load', sdkData)
        return
      }

      const { chart, params, customs, appliedFilters } = data
      let newTimebucket = timeBucket
      sdkInstance?._emitEvent('load', sdkData)

      if (period === KEY_FOR_ALL_TIME && !_isEmpty(data.timeBucket)) {
        // eslint-disable-next-line prefer-destructuring
        newTimebucket = _includes(data.timeBucket, timeBucket) ? timeBucket : data.timeBucket[0]
        setPeriodPairs((prev) => {
          // find in prev state period === KEY_FOR_ALL_TIME and change tbs
          const newPeriodPairs = _map(prev, (item) => {
            if (item.period === KEY_FOR_ALL_TIME) {
              return {
                ...item,
                tbs: data.timeBucket.length > 2 ? [data.timeBucket[0], data.timeBucket[1]] : data.timeBucket,
              }
            }
            return item
          })
          return newPeriodPairs
        })
        setTimebucket(newTimebucket)
      }

      if (!_isEmpty(appliedFilters)) {
        setFilters(appliedFilters)
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
        const applyRegions = !_includes(noRegionPeriods, activePeriod?.period)
        const bbSettings = getSettings(
          chart,
          newTimebucket,
          activeChartMetrics,
          applyRegions,
          timeFormat,
          forecasedChartData,
          rotateXAxis,
          chartType,
          customEventsChart,
          dataCompare?.chart,
        )
        setChartData(chart)

        setPanelsData({
          types: _keys(params),
          data: params,
          customs,
        })

        if (activeTab === PROJECT_TABS.traffic) {
          setMainChart(() => {
            // @ts-ignore
            const generate = bb.generate(bbSettings)
            generate.data.names(dataNames)
            return generate
          })
        }

        setIsPanelsDataEmpty(false)
      }

      setAnalyticsLoading(false)
      setDataLoading(false)
    } catch (e) {
      setAnalyticsLoading(false)
      setDataLoading(false)
      setIsPanelsDataEmpty(true)
      console.error('[ERROR](loadAnalytics) Loading analytics data failed')
      console.error(e)
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
          error = await getError(id, eid, '', from, to, timezone, projectPassword)
        } else {
          error = await getError(id, eid, period, '', '', timezone, projectPassword)
        }

        setActiveError(error)
      } catch (reason: any) {
        if (reason?.status === 400) {
          // this error did not occur within specified time frame
          setErrorLoading(false)
          setActiveError(null)
          return
        }

        const message = _isEmpty(reason.data?.message) ? reason.data : reason.data.message

        console.error('[ERROR] (loadError)(getError)', message)
        showError(message)
      }
      setErrorLoading(false)
    },
    [dateRange, id, period, projectPassword, showError, timezone],
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
      showError(reason) // todo: error message i18n
    }

    setSessionLoading(false)
  }

  useEffect(() => {
    if (authLoading) {
      return
    }

    // @ts-ignore
    const url = new URL(window.location)
    const { searchParams } = url
    const psid = searchParams.get('psid') as string
    const tab = searchParams.get('tab') as string

    if (psid && tab === PROJECT_TABS.sessions) {
      loadSession(psid)
    }

    if (PROJECT_TABS[tab]) {
      setActiveTab(tab)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading])

  useEffect(() => {
    // @ts-ignore
    const url = new URL(window.location)
    const { searchParams } = url
    const eid = searchParams.get('eid') as string
    const tab = searchParams.get('tab') as string

    if (eid && tab === PROJECT_TABS.errors) {
      // loadError(eid)
      setActiveEID(eid)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!activeEID) {
      return
    }

    loadError(activeEID)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, dateRange, timeBucket, activeEID])

  const loadSessions = async (forcedSkip?: number) => {
    if (sessionsLoading) {
      return
    }

    setSessionsLoading(true)

    try {
      const skip = typeof forcedSkip === 'number' ? forcedSkip : sessionsSkip
      let dataSessions: { sessions: ISession[]; appliedFilters: any[] }
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
    } catch (e) {
      console.error('[ERROR](loadAnalytics) Loading analytics data failed')
      console.error(e)
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
      let dataErrors: { errors: IError[]; appliedFilters: any[] }
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
    } catch (e) {
      console.error('[ERROR](loadErrors) Loading errors data failed')
      console.error(e)
    } finally {
      setErrorsLoading(false)
    }
  }

  // similar to loadAnalytics but using for performance tab
  const loadAnalyticsPerf = async (forced = false, newFilters: any[] | null = null) => {
    if (!forced && (isLoading || _isEmpty(project) || dataLoading)) {
      return
    }

    setDataLoading(true)
    try {
      let dataPerf: { timeBucket?: any; params?: any; appliedFilters?: any; chart?: any }
      let key
      let from
      let to
      let dataCompare
      let keyCompare = ''
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

          // @ts-ignore
          if (activePeriod?.period === 'custom' ? diffCompare <= diff : diffCompare <= activePeriod?.countDays) {
            fromCompare = getFormatDate(dateRangeCompare[0])
            toCompare = getFormatDate(dateRangeCompare[1])
            keyCompare = getProjectCacheCustomKeyPerf(
              fromCompare,
              toCompare,
              timeBucket,
              newFilters || filtersPerf,
              measure,
            )
          } else {
            showError(t('project.compareDateRangeError'))
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
            keyCompare = getProjectCacheCustomKeyPerf(
              fromCompare,
              toCompare,
              timeBucket,
              newFilters || filtersPerf,
              measure,
            )
          }
        }

        if (!_isEmpty(fromCompare) && !_isEmpty(toCompare)) {
          if (!_isEmpty(cache[id]) && !_isEmpty(cache[id][keyCompare])) {
            dataCompare = cache[id][keyCompare]
          } else {
            dataCompare = await getPerfData(
              id,
              timeBucket,
              '',
              newFilters || filtersPerf,
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
              newFilters || filters,
              measure,
              projectPassword,
            )
            dataCompare.overall = compareOverall[id]
          }
        }

        setProjectCachePerf(id, dataCompare || {}, keyCompare)
      }

      if (dateRange) {
        from = getFormatDate(dateRange[0])
        to = getFormatDate(dateRange[1])
        key = getProjectCacheCustomKey(from, to, timeBucket, mode, newFilters || filtersPerf, measure)
      } else {
        key = getProjectCacheKey(period, timeBucket, mode, newFilters || filtersPerf, measure)
      }

      if (!forced && !_isEmpty(cachePerf[id]) && !_isEmpty(cachePerf[id][key])) {
        dataPerf = cachePerf[id][key]
        // @ts-ignore
        setOverallPerformance(dataPerf.overall)
      } else {
        if (period === 'custom' && dateRange) {
          dataPerf = await getPerfData(
            id,
            timeBucket,
            '',
            newFilters || filtersPerf,
            from,
            to,
            timezone,
            measure,
            projectPassword,
          )
          rawOverall = await getOverallStats([id], period, from, to, timezone, newFilters || filters, projectPassword)
        } else {
          dataPerf = await getPerfData(
            id,
            timeBucket,
            period,
            newFilters || filtersPerf,
            '',
            '',
            timezone,
            measure,
            projectPassword,
          )
          rawOverall = await getPerformanceOverallStats(
            [id],
            period,
            '',
            '',
            timezone,
            newFilters || filters,
            measure,
            projectPassword,
          )
        }

        // @ts-ignore
        dataPerf.overall = rawOverall[id]

        setProjectCachePerf(id, dataPerf || {}, key)
        setOverallPerformance(rawOverall[id])
      }

      const { appliedFilters } = dataPerf

      if (!_isEmpty(appliedFilters)) {
        setFiltersPerf(appliedFilters)
      }

      // empty or has overall only
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
          // find in prev state period === KEY_FOR_ALL_TIME and change tbs
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
            // @ts-ignore
            const generate = bb.generate(bbSettings)
            generate.data.names(dataNamesPerf)
            return generate
          })
        }

        setIsPanelsDataEmptyPerf(false)
      }

      setAnalyticsLoading(false)
      setDataLoading(false)
    } catch (e) {
      setAnalyticsLoading(false)
      setDataLoading(false)
      setIsPanelsDataEmptyPerf(true)
      console.error('[ERROR](loadAnalytics) Loading analytics data failed')
      console.error(e)
    }
  }

  const loadFunnelsData = useCallback(
    async (forced = false) => {
      if (!activeFunnel) {
        return
      }

      if (!forced && (isLoading || _isEmpty(project) || dataLoading)) {
        return
      }

      setDataLoading(true)

      try {
        let dataFunnel: { funnel: IAnalyticsFunnel[]; totalPageviews: number }
        let key
        let from
        let to

        if (dateRange) {
          from = getFormatDate(dateRange[0])
          to = getFormatDate(dateRange[1])
          key = getFunnelsCacheCustomKey(id, activeFunnel.id, from, to)
        } else {
          key = getFunnelsCacheKey(id, activeFunnel.id, period)
        }

        if (!forced && !_isEmpty(cacheFunnels[id]) && !_isEmpty(cacheFunnels[id][key])) {
          dataFunnel = cacheFunnels[id][key]
        } else {
          if (period === 'custom' && dateRange) {
            dataFunnel = await getFunnelData(id, '', from, to, timezone, activeFunnel.id, projectPassword)
          } else {
            dataFunnel = await getFunnelData(id, period, '', '', timezone, activeFunnel.id, projectPassword)
          }

          setFunnelsCache(id, dataFunnel || {}, key)
        }

        const { funnel, totalPageviews } = dataFunnel

        const bbSettings = getSettingsFunnels(funnel, totalPageviews, t)

        if (activeTab === PROJECT_TABS.funnels) {
          setMainChart(() => {
            // @ts-ignore
            const generate = bb.generate(bbSettings)
            generate.data.names(dataNamesFunnel)
            return generate
          })
        }

        setAnalyticsLoading(false)
        setDataLoading(false)
      } catch (e) {
        setAnalyticsLoading(false)
        setDataLoading(false)
        console.error('[ERROR](loadFunnelsData) Loading funnels data failed')
        console.error(e)
      }
    },
    [
      activeFunnel,
      activeTab,
      cacheFunnels,
      dataLoading,
      dateRange,
      id,
      isLoading,
      period,
      project,
      projectPassword,
      timezone,
      setFunnelsCache,
      t,
      dataNamesFunnel,
    ],
  )

  // this funtion is used for requesting the data from the API when the filter is changed
  const filterHandler = (column: string, filter: any, isExclusive = false) => {
    let newFilters
    let newFiltersPerf
    let newFiltersSessions
    let newFiltersErrors
    const columnPerf = `${column}_perf`
    const columnSessions = `${column}_sess`
    const columnErrors = `${column}_err`

    if (activeTab === PROJECT_TABS.performance) {
      if (_find(filtersPerf, (f) => f.filter === filter)) {
        newFiltersPerf = _filter(filtersPerf, (f) => f.filter !== filter)

        // @ts-ignore
        const url = new URL(window.location)
        url.searchParams.delete(columnPerf)
        const { pathname, search } = url
        navigate(`${pathname}${search}`)
        setFiltersPerf(newFiltersPerf)
      } else {
        newFiltersPerf = [...filtersPerf, { column, filter, isExclusive }]

        // @ts-ignore
        const url = new URL(window.location)
        url.searchParams.append(columnPerf, filter)
        const { pathname, search } = url
        navigate(`${pathname}${search}`)
        setFiltersPerf(newFiltersPerf)
      }
    }

    if (activeTab === PROJECT_TABS.sessions) {
      if (_find(filtersSessions, (f) => f.filter === filter)) {
        newFiltersSessions = _filter(filtersSessions, (f) => f.filter !== filter)

        // @ts-ignore
        const url = new URL(window.location)
        url.searchParams.delete(columnSessions)
        const { pathname, search } = url
        navigate(`${pathname}${search}`)
        setFiltersSessions(newFiltersSessions)
      } else {
        newFiltersSessions = [...filtersSessions, { column, filter, isExclusive }]

        // @ts-ignore
        const url = new URL(window.location)
        url.searchParams.append(columnSessions, filter)
        const { pathname, search } = url
        navigate(`${pathname}${search}`)
        setFiltersSessions(newFiltersSessions)
      }
    }

    if (activeTab === PROJECT_TABS.errors) {
      if (_find(filtersErrors, (f) => f.filter === filter)) {
        newFiltersErrors = _filter(filtersErrors, (f) => f.filter !== filter)

        // @ts-ignore
        const url = new URL(window.location)
        url.searchParams.delete(columnErrors)
        const { pathname, search } = url
        navigate(`${pathname}${search}`)
        setFiltersErrors(newFiltersErrors)
      } else {
        newFiltersErrors = [...filtersErrors, { column, filter, isExclusive }]

        // @ts-ignore
        const url = new URL(window.location)
        url.searchParams.append(columnErrors, filter)
        const { pathname, search } = url
        navigate(`${pathname}${search}`)
        setFiltersErrors(newFiltersErrors)
      }
    }

    if (activeTab === PROJECT_TABS.traffic) {
      // eslint-disable-next-line no-lonely-if
      if (_find(filters, (f) => f.filter === filter) /* && f.filter === filter) */) {
        // selected filter is already included into the filters array -> removing it
        // removing filter from the state
        newFilters = _filter(filters, (f) => f.filter !== filter)
        setFilters(newFilters)

        // removing filter from the page URL
        // @ts-ignore
        const url = new URL(window.location)
        url.searchParams.delete(column)
        const { pathname, search } = url
        navigate(`${pathname}${search}`)
      } else {
        // selected filter is not present in the filters array -> applying it
        // sroting filter in the state
        newFilters = [...filters, { column, filter, isExclusive }]
        setFilters(newFilters)

        // storing filter in the page URL

        // @ts-ignore
        const url = new URL(window.location)
        url.searchParams.append(column, filter)
        const { pathname, search } = url
        navigate(`${pathname}${search}`)
      }
    }

    resetSessions()
    resetErrors()

    sdkInstance?._emitEvent('filtersupdate', newFilters)
    if (activeTab === PROJECT_TABS.performance) {
      loadAnalyticsPerf(true, newFiltersPerf)
    } else if (activeTab === PROJECT_TABS.traffic) {
      loadAnalytics(true, newFilters)
    }
  }

  const onFilterSearch = (
    items: {
      column: string
      filter: string[]
    }[],
    override: boolean,
  ) => {
    const newFilters = _filter(items, (item) => {
      return !_isEmpty(item.filter)
    })
    // @ts-ignore
    const url = new URL(window.location)

    if (activeTab === PROJECT_TABS.performance) {
      if (override) {
        _forEach(FILTERS_PANELS_ORDER, (value) => {
          if (url.searchParams.has(`${value}_perf`)) {
            url.searchParams.delete(`${value}_perf`)
          }
        })
      }

      _forEach(items, (item) => {
        if (url.searchParams.has(`${item.column}_perf`)) {
          url.searchParams.delete(`${item.column}_perf`)
        }
        _forEach(item.filter, (filter) => {
          url.searchParams.append(`${item.column}_perf`, filter)
        })
      })

      const { pathname, search } = url
      navigate(`${pathname}${search}`)

      if (!override) {
        loadAnalyticsPerf(true, [...filtersPerf, ...newFilters])
        setFiltersPerf([...filtersPerf, ...newFilters])
        return
      }

      setFiltersPerf(newFilters)
      loadAnalyticsPerf(true, newFilters)
    } else if (activeTab === PROJECT_TABS.sessions) {
      if (override) {
        _forEach(FILTERS_PANELS_ORDER, (value) => {
          if (url.searchParams.has(`${value}_sess`)) {
            url.searchParams.delete(`${value}_sess`)
          }
        })
      }

      _forEach(items, (item) => {
        if (url.searchParams.has(`${item.column}_sess`)) {
          url.searchParams.delete(`${item.column}_sess`)
        }
        _forEach(item.filter, (filter) => {
          url.searchParams.append(`${item.column}_sess`, filter)
        })
      })

      const { pathname, search } = url
      navigate(`${pathname}${search}`)

      const converted = convertFilters(newFilters)
      resetSessions()

      if (!override) {
        setFiltersSessions([...filters, ...converted])
        return
      }

      setFiltersSessions(converted)
    } else if (activeTab === PROJECT_TABS.errors) {
      if (override) {
        _forEach(ERRORS_FILTERS_PANELS_ORDER, (value) => {
          if (url.searchParams.has(`${value}_err`)) {
            url.searchParams.delete(`${value}_err`)
          }
        })
      }

      _forEach(items, (item) => {
        if (url.searchParams.has(`${item.column}_err`)) {
          url.searchParams.delete(`${item.column}_err`)
        }
        _forEach(item.filter, (filter) => {
          url.searchParams.append(`${item.column}_err`, filter)
        })
      })

      const { pathname, search } = url
      navigate(`${pathname}${search}`)

      const converted = convertFilters(newFilters)
      resetErrors()

      if (!override) {
        setFiltersErrors([...filters, ...converted])
        return
      }

      setFiltersErrors(converted)
    } else {
      if (override) {
        _forEach(FILTERS_PANELS_ORDER, (value) => {
          if (url.searchParams.has(value)) {
            url.searchParams.delete(value)
          }
        })
      }

      _forEach(items, (item) => {
        if (url.searchParams.has(item.column)) {
          url.searchParams.delete(item.column)
        }
        _forEach(item.filter, (filter) => {
          url.searchParams.append(item.column, filter)
        })
      })

      const { pathname, search } = url
      navigate(`${pathname}${search}`)

      if (!override) {
        loadAnalytics(true, [...filters, ...newFilters])
        setFilters([...filters, ...newFilters])
        return
      }

      setFilters(newFilters)
      loadAnalytics(true, newFilters)
    }

    resetSessions()
    resetErrors()
  }

  // this function is used for requesting the data from the API when the exclusive filter is changed
  const onChangeExclusive = (column: string, filter: string, isExclusive: boolean) => {
    let newFilters
    if (activeTab === PROJECT_TABS.performance) {
      newFilters = _map(filtersPerf, (f) => {
        if (f.column === column && f.filter === filter) {
          return {
            ...f,
            isExclusive,
          }
        }

        return f
      })
      setFiltersPerf(newFilters)
      loadAnalyticsPerf(true, newFilters)
    } else if (activeTab === PROJECT_TABS.sessions) {
      newFilters = _map(filtersSessions, (f) => {
        if (f.column === column && f.filter === filter) {
          return {
            ...f,
            isExclusive,
          }
        }

        return f
      })
      setFiltersSessions(newFilters)
    } else if (activeTab === PROJECT_TABS.errors) {
      newFilters = _map(filtersErrors, (f) => {
        if (f.column === column && f.filter === filter) {
          return {
            ...f,
            isExclusive,
          }
        }

        return f
      })
      resetErrors()
      setFiltersErrors(newFilters)
    } else {
      newFilters = _map(filters, (f) => {
        if (f.column === column && f.filter === filter) {
          return {
            ...f,
            isExclusive,
          }
        }

        return f
      })
      setFilters(newFilters)
      loadAnalytics(true, newFilters)
    }

    // storing exclusive filter in the page URL
    // @ts-ignore
    const url = new URL(window.location)

    if (activeTab === PROJECT_TABS.performance) {
      const columnPerf = `${column}_perf`
      url.searchParams.delete(columnPerf)
      url.searchParams.append(columnPerf, filter)
    } else {
      url.searchParams.delete(column)
      url.searchParams.append(column, filter)
    }

    const { pathname, search } = url
    navigate(`${pathname}${search}`)
    sdkInstance?._emitEvent('filtersupdate', newFilters)
  }

  // this function is used for requesting the data from the API when you press the reset button
  const refreshStats = async () => {
    if (!isLoading && !dataLoading) {
      if (activeTab === PROJECT_TABS.performance) {
        loadAnalyticsPerf(true)
        return
      }

      if (activeTab === PROJECT_TABS.funnels) {
        loadFunnelsData(true)
        return
      }

      if (activeTab === PROJECT_TABS.sessions) {
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

      loadAnalytics(true)
    }
  }

  // onForecastOpen is a function for open forecast modal
  const onForecastOpen = () => {
    if (isLoading || dataLoading) {
      return
    }

    if (!_isEmpty(forecasedChartData)) {
      setForecasedChartData({})
      return
    }

    setIsForecastOpened(true)
  }

  // onForecastSubmit is a function for submit forecast modal
  const onForecastSubmit = async (periodToForecast: string) => {
    setIsForecastOpened(false)
    setDataLoading(true)
    const key = getProjectForcastCacheKey(period, timeBucket, periodToForecast, filters)
    const data = cache[id][key]

    if (!_isEmpty(data)) {
      setForecasedChartData(data)
      setDataLoading(false)
      return
    }

    try {
      const result = await getChartPrediction(chartData, periodToForecast, timeBucket)
      const transformed = transformAIChartData(result)
      setProjectForcastCache(id, transformed, key)
      setForecasedChartData(transformed)
    } catch (e) {
      console.error(`[onForecastSubmit] Error: ${e}`)
    }

    setDataLoading(false)
  }

  useEffect(() => {
    loadAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forecasedChartData, mode])

  // this useEffect is used for parsing tab from url and set activeTab
  useEffect(() => {
    // @ts-ignore
    const url = new URL(window.location)
    url.searchParams.delete('tab')

    url.searchParams.append('tab', activeTab)
    const { pathname, search } = url
    navigate(`${pathname}${search}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // this useEffect is used for update chart settings when activeChartMetrics changed also using for perfomance tab
  useEffect(() => {
    if (activeTab === PROJECT_TABS.traffic) {
      if (
        (!isLoading && !_isEmpty(chartData) && !_isEmpty(mainChart)) ||
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
            forecasedChartData,
            rotateXAxis,
            chartType,
            customEventsChartData,
            dataChartCompare,
          )

          setMainChart(() => {
            // @ts-ignore
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
    } else if (!isLoading && !_isEmpty(chartDataPerf) && !_isEmpty(mainChart)) {
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
        // @ts-ignore
        const generate = bb.generate(bbSettings)
        generate.data.names(dataNamesPerf)
        return generate
      })
    }
  }, [isLoading, activeChartMetrics, chartData, chartDataPerf, activeChartMetricsPerf, dataChartCompare]) // eslint-disable-line

  // Initialising Swetrix SDK instance. Using for marketplace and extensions
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

      // @ts-ignore
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

  // Supplying 'timeupdate' event to the SDK after loading. Using for marketplace and extensions
  useEffect(() => {
    sdkInstance?._emitEvent('timeupdate', {
      period,
      timeBucket,
      dateRange: period === 'custom' ? dateRange : null,
    })
  }, [sdkInstance]) // eslint-disable-line

  // Supplying the 'clientinfo' event to the SDK that contains info about current language, theme, etc.
  useEffect(() => {
    sdkInstance?._emitEvent('clientinfo', {
      language,
      theme,
    })
  }, [sdkInstance, language, theme])

  // Supplying 'projectinfo' event to the SDK after loading. Using for marketplace and extensions
  useEffect(() => {
    if (_isEmpty(project)) {
      return
    }

    const { active: isActive, created, public: isPublic } = project

    sdkInstance?._emitEvent('projectinfo', {
      id,
      name,
      isActive,
      created,
      isPublic,
    })
  }, [sdkInstance, name]) // eslint-disable-line

  // when t update we update dropdowns translations
  useEffect(() => {
    setPeriodPairs(tbPeriodPairs(t, undefined, undefined, language))
    setPeriodPairsCompare(tbPeriodPairsCompare(t, undefined, language))
  }, [t, language])

  // Parsing initial filters from url also using for perfomance tab
  useEffect(() => {
    // using try/catch because new URL is not supported by browsers like IE, so at least analytics would work without parsing filters
    if (activeTab === PROJECT_TABS.performance) {
      try {
        // @ts-ignore
        const url = new URL(window.location)
        const { searchParams } = url
        const initialFilters: any[] = []
        // eslint-disable-next-line lodash/prefer-lodash-method
        searchParams.forEach((value, key) => {
          if (!_includes(key, '_perf')) {
            return
          }

          const keyPerf = _replace(key, '_perf', '')

          if (!_includes(validFilters, keyPerf)) {
            return
          }

          const isExclusive = _startsWith(value, '!')
          initialFilters.push({
            column: keyPerf,
            filter: isExclusive ? value.substring(1) : value,
            isExclusive,
          })
        })

        setFiltersPerf(initialFilters)
      } finally {
        setAreFiltersPerfParsed(true)
      }
    } else {
      try {
        // @ts-ignore
        const url = new URL(window.location)
        const { searchParams } = url
        const initialFilters: any[] = []
        // eslint-disable-next-line lodash/prefer-lodash-method
        searchParams.forEach((value, key) => {
          if (!_includes(validFilters, key)) {
            return
          }

          const isExclusive = _startsWith(value, '!')
          initialFilters.push({
            column: key,
            filter: isExclusive ? value.substring(1) : value,
            isExclusive,
          })
        })
        setFilters(initialFilters)
      } finally {
        setAreFiltersParsed(true)
      }
    }
  }, [activeTab])

  useEffect(() => {
    try {
      // @ts-ignore
      const url = new URL(window.location)
      const { searchParams } = url
      const initialFilters: any[] = []
      // eslint-disable-next-line lodash/prefer-lodash-method
      searchParams.forEach((value, key) => {
        if (!_includes(key, '_sess')) {
          return
        }

        const keySess = _replace(key, '_sess', '')

        if (!_includes(validFilters, keySess)) {
          return
        }

        const isExclusive = _startsWith(value, '!')
        initialFilters.push({
          column: keySess,
          filter: isExclusive ? value.substring(1) : value,
          isExclusive,
        })
      })

      setFiltersSessions(initialFilters)
    } catch (reason) {
      console.error(`[ERROR] useEffect - Parsing initial filters from url also using for sessions tab: ${reason}`)
    } finally {
      setAreFiltersSessionsParsed(true)
    }
  }, [])

  useEffect(() => {
    try {
      // @ts-ignore
      const url = new URL(window.location)
      const { searchParams } = url
      const initialFilters: any[] = []
      // eslint-disable-next-line lodash/prefer-lodash-method
      searchParams.forEach((value, key) => {
        if (!_includes(key, '_err')) {
          return
        }

        const keyErr = _replace(key, '_err', '')

        if (!_includes(validFilters, keyErr)) {
          return
        }

        const isExclusive = _startsWith(value, '!')
        initialFilters.push({
          column: keyErr,
          filter: isExclusive ? value.substring(1) : value,
          isExclusive,
        })
      })

      setFiltersErrors(initialFilters)
    } catch (reason) {
      console.error(`[ERROR] useEffect - Parsing initial filters from url also using for errors tab: ${reason}`)
    } finally {
      setAreFiltersErrorsParsed(true)
    }
  }, [])

  // Parsing timeBucket from url
  useEffect(() => {
    if (arePeriodParsed) {
      try {
        // @ts-ignore
        const url = new URL(window.location)
        const { searchParams } = url
        const intialTimeBucket = searchParams.get('timeBucket')
        // eslint-disable-next-line lodash/prefer-lodash-method
        if (!_includes(validTimeBacket, intialTimeBucket)) {
          return
        }
        const newPeriodFull = _find(periodPairs, (el) => el.period === period)
        if (!_includes(newPeriodFull?.tbs, intialTimeBucket)) {
          return
        }
        setTimebucket(intialTimeBucket || periodPairs[3].tbs[1])
      } finally {
        setAreTimeBucketParsed(true)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arePeriodParsed])

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

  // onRangeDateChange if is activeChartMetrics custom and we select custom date range
  // we update url and state
  const onRangeDateChange = (dates: Date[], onRender?: boolean) => {
    const days = Math.ceil(Math.abs(dates[1].getTime() - dates[0].getTime()) / (1000 * 3600 * 24))
    // @ts-ignore
    const url = new URL(window.location)

    // setting allowed time buckets for the specified date range (period)
    // eslint-disable-next-line no-restricted-syntax
    for (const index in timeBucketToDays) {
      if (timeBucketToDays[index].lt >= days) {
        let eventEmitTimeBucket = timeBucket

        if (!onRender && !_includes(timeBucketToDays[index].tb, timeBucket)) {
          // eslint-disable-next-line prefer-destructuring
          eventEmitTimeBucket = timeBucketToDays[index].tb[0]
          url.searchParams.delete('timeBucket')
          url.searchParams.append('timeBucket', eventEmitTimeBucket)
          const { pathname, search } = url
          navigate(`${pathname}${search}`)
          setTimebucket(eventEmitTimeBucket)
        }

        url.searchParams.delete('period')
        url.searchParams.delete('from')
        url.searchParams.delete('to')
        url.searchParams.append('period', 'custom')
        url.searchParams.append('from', dates[0].toISOString())
        url.searchParams.append('to', dates[1].toISOString())

        const { pathname, search } = url
        navigate(`${pathname}${search}`)

        setPeriodPairs(tbPeriodPairs(t, timeBucketToDays[index].tb, dates, language))
        setPeriod('custom')
        setProjectViewPrefs(id, 'custom', timeBucketToDays[index].tb[0], dates)

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
    if (period === KEY_FOR_ALL_TIME) {
      return
    }

    if (areFiltersParsed && areTimeBucketParsed && arePeriodParsed && activeTab === PROJECT_TABS.traffic) {
      loadAnalytics()
    }
    if (areFiltersPerfParsed && areTimeBucketParsed && arePeriodParsed && activeTab === PROJECT_TABS.performance) {
      loadAnalyticsPerf()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    project,
    period,
    chartType,
    filters,
    forecasedChartData,
    timeBucket,
    periodPairs,
    areFiltersParsed,
    areTimeBucketParsed,
    arePeriodParsed,
    t,
    activeTab,
    areFiltersPerfParsed,
  ])

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (activeTab === PROJECT_TABS.sessions && areFiltersSessionsParsed) {
      loadSessions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    dateRange,
    filtersSessions,
    id,
    period,
    projectPassword,
    timezone,
    areFiltersSessionsParsed,
    authLoading,
  ])

  useEffect(() => {
    if (activeTab === PROJECT_TABS.errors && areFiltersErrorsParsed) {
      loadErrors()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, errorOptions, dateRange, filtersErrors, id, period, projectPassword, timezone, areFiltersErrorsParsed])

  useEffect(() => {
    if (period !== KEY_FOR_ALL_TIME) {
      return
    }

    if (areFiltersParsed && areTimeBucketParsed && arePeriodParsed && activeTab === PROJECT_TABS.traffic) {
      loadAnalytics()
    }
    if (areFiltersPerfParsed && areTimeBucketParsed && arePeriodParsed && activeTab === PROJECT_TABS.performance) {
      loadAnalyticsPerf()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    project,
    period,
    chartType,
    filters,
    forecasedChartData,
    areFiltersParsed,
    areTimeBucketParsed,
    arePeriodParsed,
    activeTab,
    areFiltersPerfParsed,
  ])

  useEffect(() => {
    if (!project || !activeFunnel) {
      return
    }

    loadFunnelsData()
  }, [project, activeFunnel, loadFunnelsData, period, t])

  // using this for fix some bugs with update custom events data for chart
  useEffect(() => {
    if (!_isEmpty(activeChartMetricsCustomEvents)) {
      setActiveChartMetricsCustomEvents([])
    }
  }, [period, filters]) // eslint-disable-line

  useEffect(() => {
    if (dateRange && arePeriodParsed) {
      onRangeDateChange(dateRange)
    }
  }, [dateRange, t, arePeriodParsed]) // eslint-disable-line

  useEffect(() => {
    const updateLiveVisitors = async () => {
      const { id: pid } = project
      const result = await getLiveVisitors([pid], projectPassword)

      setLiveStatsForProject(pid, result[pid])
    }

    let interval: any = null
    if (project.uiHidden) {
      updateLiveVisitors()
      interval = setInterval(async () => {
        await updateLiveVisitors()
      }, LIVE_VISITORS_UPDATE_INTERVAL)
    }

    return () => clearInterval(interval)
  }, [project.id, setLiveStatsForProject]) // eslint-disable-line react-hooks/exhaustive-deps

  // loadProject if project is empty so more often it is need for public projects
  useEffect(() => {
    if (isLoading || !_isEmpty(project)) {
      return
    }

    getProject(id, false, projectPassword)
      .then((projectRes) => {
        if (_isEmpty(projectRes)) {
          onErrorLoading()
        }

        if (projectRes.isPasswordProtected && !projectRes.isOwner && _isEmpty(projectPassword)) {
          navigate({
            pathname: _replace(routes.project_protected_password, ':id', id),
            search: `?theme=${ssrTheme}&embedded=${embedded}`,
          })
          return
        }

        if ((projectRes.isPublic || projectRes?.isPasswordProtected) && !projectRes.isOwner) {
          setPublicProject(projectRes)
        } else {
          setProjects([...(projects as any[]), projectRes])
          getLiveVisitors([id], projectPassword)
            .then((res) => {
              setLiveStatsForProject(id, res[id])
            })
            .catch((e) => {
              console.error('[ERROR] (getProject -> getLiveVisitors)', e)
              onErrorLoading()
            })
        }
      })
      .catch((e) => {
        console.error('[ERROR] (getProject)', e)
        onErrorLoading()
      })
  }, [isLoading, project, id, setPublicProject]) // eslint-disable-line

  // updatePeriod using for update period and timeBucket also update url
  const updatePeriod = (newPeriod: { period: string; label?: string }) => {
    const newPeriodFull = _find(periodPairs, (el) => el.period === newPeriod.period)
    let tb = timeBucket
    // @ts-ignore
    const url = new URL(window.location)
    if (_isEmpty(newPeriodFull)) return

    if (!_includes(newPeriodFull.tbs, timeBucket)) {
      tb = _last(newPeriodFull.tbs) || 'day'
      url.searchParams.delete('timeBucket')
      url.searchParams.append('timeBucket', tb)
      setTimebucket(tb)
    }

    if (newPeriod.period !== 'custom') {
      url.searchParams.delete('period')
      url.searchParams.delete('from')
      url.searchParams.delete('to')
      url.searchParams.append('period', newPeriod.period)
      setProjectViewPrefs(id, newPeriod.period, tb)
      setPeriod(newPeriod.period)

      setCanLoadMoreSessions(false)
      resetSessions()
      resetErrors()

      setDateRange(null)
    }
    const { pathname, search } = url
    navigate(`${pathname}${search}`)
    sdkInstance?._emitEvent('timeupdate', {
      period: newPeriod.period,
      timeBucket: tb,
      dateRange: newPeriod.period === 'custom' ? dateRange : null,
    })
    setForecasedChartData({})
  }

  // updateTimebucket using for update timeBucket also update url
  const updateTimebucket = (newTimebucket: string) => {
    // @ts-ignore
    const url = new URL(window.location)
    url.searchParams.delete('timeBucket')
    url.searchParams.append('timeBucket', newTimebucket)
    const { pathname, search } = url
    navigate(`${pathname}${search}`)
    setTimebucket(newTimebucket)
    setProjectViewPrefs(id, period, newTimebucket, dateRange as Date[])
    sdkInstance?._emitEvent('timeupdate', {
      period,
      timeBucket: newTimebucket,
      dateRange,
    })
    setForecasedChartData({})
  }

  const onMeasureChange = (measure: string) => {
    setActivePerfMeasure(measure)
  }

  useEffect(() => {
    loadAnalyticsPerf()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePerfMeasure, activeChartMetricsPerf])

  const openSettingsHandler = () => {
    navigate(_replace(routes.project_settings, ':id', id))
  }

  // parse period from url when page is loaded
  useEffect(() => {
    try {
      // @ts-ignore
      const url = new URL(window.location)
      const { searchParams } = url
      const intialPeriod = projectViewPrefs
        ? searchParams.get('period') || projectViewPrefs[id]?.period
        : searchParams.get('period') || '7d'
      const tab = searchParams.get('tab')

      if (tab === PROJECT_TABS.performance) {
        setProjectTab(PROJECT_TABS.performance)
      }

      if (!_includes(validPeriods, intialPeriod)) {
        return
      }

      if (intialPeriod === 'custom') {
        // @ts-ignore
        const from = new Date(searchParams.get('from'))
        // @ts-ignore
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
    } finally {
      setArePeriodParsed(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // check for conflicts in chart metrics in dropdown if conflicted disable some column of dropdown
  const isConflicted = (conflicts: string[]) => {
    const conflicted =
      conflicts &&
      _some(conflicts, (conflict) => {
        const conflictPair = _find(chartMetrics, (metric) => metric.id === conflict)
        return conflictPair && conflictPair.active
      })
    return conflicted
  }

  // resetFilters using for reset filters and update url. Also using for components <NoEvents />
  // its need for fix bug: when you select filter and you have not data and you can not reset filters
  const resetFilters = () => {
    // @ts-ignore
    const url = new URL(window.location)
    const { searchParams } = url
    // eslint-disable-next-line lodash/prefer-lodash-method
    searchParams.forEach((value, key) => {
      if (!_includes(validFilters, key)) {
        return
      }
      searchParams.delete(key)
    })
    const { pathname, search } = url
    navigate(`${pathname}${search}`)
    setFilters([])
    setFiltersPerf([])
    setFiltersSessions([])
    setFiltersErrors([])
    if (activeTab === PROJECT_TABS.performance) {
      loadAnalyticsPerf(true, [])
    } else if (activeTab === PROJECT_TABS.traffic) {
      loadAnalytics(true, [])
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

  // function set chart type and save to local storage
  const setChartTypeOnClick = (type: string) => {
    setItem('chartType', type)
    setChartType(type)
  }

  // loadAnalytics when compare period change or compare selected
  useEffect(() => {
    setItem(IS_ACTIVE_COMPARE, JSON.stringify(isActiveCompare))
    if (activePeriodCompare === PERIOD_PAIRS_COMPARE.CUSTOM && !dateRangeCompare) {
      return
    }

    if (isActiveCompare) {
      if (activeTab === PROJECT_TABS.performance) {
        loadAnalyticsPerf()
      }

      if (activeTab === PROJECT_TABS.traffic) {
        loadAnalytics()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActiveCompare, activePeriodCompare, dateRangeCompare])

  /* KEYBOARD SHORTCUTS */
  const generalShortcutsActions = {
    B: () => setChartTypeOnClick(chartTypes.bar),
    '∫': () => setChartTypeOnClick(chartTypes.bar),
    L: () => setChartTypeOnClick(chartTypes.line),
    '¬': () => setChartTypeOnClick(chartTypes.line),
    S: () => setShowFiltersSearch(true),
    ß: () => setShowFiltersSearch(true),
    F: onForecastOpen,
    ƒ: onForecastOpen,
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

    // @ts-ignore
    const tab = SHORTCUTS_TABS_MAP[key]

    if (!tab) {
      return
    }

    setProjectTab(tab)
    setActiveTab(tab)
  })

  // 'General' shortcuts
  useHotkeys(SHORTCUTS_GENERAL_LISTENERS, ({ key }) => {
    // @ts-ignore
    generalShortcutsActions[key]?.()
  })

  // 'Timebuckets selection' shortcuts
  useHotkeys(SHORTCUTS_TIMEBUCKETS_LISTENERS, ({ key }) => {
    const pairs = tbPeriodPairs(t, undefined, undefined, language)
    // @ts-ignore
    const pair = _find(pairs, ({ period }) => period === timebucketShortcutsMap[key])

    if (!pair) {
      return
    }

    if (pair.isCustomDate) {
      // @ts-ignore
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
          onSelect={(label) => {
            const selected = _find(tabs, (tab) => tab.label === label)
            if (selected) {
              if (selected.id === 'settings') {
                openSettingsHandler()
                return
              }

              setProjectTab(selected?.id)
              setActiveTab(selected?.id)
            }
          }}
          title={activeTabLabel}
          capitalise
        />
      </div>
      <div className='hidden sm:block'>
        <div>
          <nav className='-mb-px flex space-x-4 overflow-x-auto' aria-label='Tabs'>
            {_map(tabs, (tab) => {
              const isCurrent = tab.id === activeTab
              const isSettings = tab.id === 'settings'

              const onClick = isSettings
                ? openSettingsHandler
                : () => {
                    setProjectTab(tab.id)
                    setActiveTab(tab.id)
                  }

              return (
                <div
                  key={tab.id}
                  onClick={onClick}
                  className={cx(
                    'group inline-flex items-center whitespace-nowrap py-2 px-1 border-b-2 font-bold text-md cursor-pointer',
                    {
                      'border-slate-900 text-slate-900 dark:text-gray-50 dark:border-gray-50': isCurrent,
                      'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:border-gray-300 dark:hover:text-gray-300':
                        !isCurrent,
                    },
                  )}
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  <tab.icon
                    className={cx(
                      isCurrent
                        ? 'text-slate-900 dark:text-gray-50'
                        : 'text-gray-500 group-hover:text-gray-500 dark:text-gray-400 dark:group-hover:text-gray-300',
                      '-ml-0.5 mr-2 h-5 w-5',
                    )}
                    aria-hidden='true'
                  />
                  <span>{tab.label}</span>
                </div>
              )
            })}
          </nav>
        </div>
      </div>
    </div>
  )

  if (isLoading) {
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
        {!embedded && <Footer authenticated={authenticated} minimal />}
      </>
    )
  }

  if (project.isLocked) {
    return (
      <>
        {!embedded && <Header ssrTheme={ssrTheme} authenticated={authenticated} />}
        <div
          className={cx('max-w-[1584px] bg-gray-50 dark:bg-slate-900 w-full mx-auto py-6 px-2 sm:px-4 lg:px-8', {
            'min-h-min-footer': !embedded,
            'min-h-[100vh]': embedded,
          })}
        >
          <TabsSelector />
          <h2 className='text-xl mt-2 font-bold text-gray-900 dark:text-gray-50 break-words break-all text-center sm:text-left'>
            {name}
          </h2>
          <LockedDashboard user={user} project={project} isSharedProject={isSharedProject} />
        </div>
        {!embedded && <Footer authenticated={authenticated} minimal />}
      </>
    )
  }

  if (!project.isDataExists && activeTab !== PROJECT_TABS.errors && !analyticsLoading) {
    return (
      <>
        {!embedded && <Header ssrTheme={ssrTheme} authenticated={authenticated} />}
        <div
          className={cx('max-w-[1584px] bg-gray-50 dark:bg-slate-900 w-full mx-auto py-6 px-2 sm:px-4 lg:px-8', {
            'min-h-min-footer': !embedded,
            'min-h-[100vh]': embedded,
          })}
        >
          <TabsSelector />
          <h2 className='text-xl mt-2 font-bold text-gray-900 dark:text-gray-50 break-words break-all text-center sm:text-left'>
            {name}
          </h2>
          <WaitingForAnEvent project={project} />
        </div>
        {!embedded && <Footer authenticated={authenticated} minimal />}
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
          className={cx('max-w-[1584px] bg-gray-50 dark:bg-slate-900 w-full mx-auto py-6 px-2 sm:px-4 lg:px-8', {
            'min-h-min-footer': !embedded,
            'min-h-[100vh]': embedded,
          })}
        >
          <TabsSelector />
          <h2 className='text-xl mt-2 font-bold text-gray-900 dark:text-gray-50 break-words break-all text-center sm:text-left'>
            {name}
          </h2>
          <WaitingForAnError />
        </div>
        {!embedded && <Footer authenticated={authenticated} minimal />}
      </>
    )
  }

  return (
    <ClientOnly>
      {() => (
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
              className={cx('max-w-[1584px] w-full mx-auto py-6 px-2 sm:px-4 lg:px-8', {
                'min-h-min-footer': !embedded,
                'min-h-[100vh]': embedded,
              })}
              ref={dashboardRef}
            >
              {/* Tabs selector */}
              <TabsSelector />
              {activeTab !== PROJECT_TABS.alerts &&
                (activeTab !== PROJECT_TABS.sessions || !activeSession) &&
                (activeFunnel || activeTab !== PROJECT_TABS.funnels) && (
                  <>
                    <div className='flex flex-col lg:flex-row items-center lg:items-start justify-between mt-2'>
                      <div className='flex items-center space-x-5 flex-wrap'>
                        <h2 className='text-xl font-bold text-gray-900 dark:text-gray-50 break-words break-all'>
                          {/* If tab is funnels - then display a funnel name, otherwise a project name */}
                          {activeTab === PROJECT_TABS.funnels ? activeFunnel?.name : name}
                        </h2>
                        {activeTab !== PROJECT_TABS.funnels && (
                          <LiveVisitorsDropdown
                            projectId={project.id}
                            live={liveStats[id]}
                            projectPassword={projectPassword}
                          />
                        )}
                      </div>
                      <div className='flex items-center mt-3 lg:mt-0 max-w-[420px] flex-wrap sm:flex-nowrap sm:max-w-none justify-center sm:justify-between w-full sm:w-auto mx-auto sm:mx-0 space-x-2 gap-y-1'>
                        {activeTab !== PROJECT_TABS.funnels && (
                          <>
                            <div>
                              <button
                                type='button'
                                title={t('project.refreshStats')}
                                onClick={refreshStats}
                                className={cx(
                                  'relative rounded-md p-2 bg-gray-50 text-sm font-medium hover:bg-white hover:shadow-sm dark:bg-slate-900 dark:hover:bg-slate-800 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:dark:ring-gray-200 focus:dark:border-gray-200',
                                  {
                                    'cursor-not-allowed opacity-50': isLoading || dataLoading,
                                  },
                                )}
                              >
                                <ArrowPathIcon className='w-5 h-5 stroke-2 text-gray-700 dark:text-gray-50' />
                              </button>
                            </div>
                            {!isSelfhosted && !isActiveCompare && (
                              <div
                                className={cx({
                                  hidden: activeTab !== PROJECT_TABS.traffic || _isEmpty(chartData),
                                })}
                              >
                                <button
                                  type='button'
                                  title={t('modals.forecast.title')}
                                  onClick={onForecastOpen}
                                  disabled={!_isEmpty(filters)}
                                  className={cx(
                                    'relative rounded-md p-2 bg-gray-50 text-sm font-medium hover:bg-white hover:shadow-sm dark:bg-slate-900 dark:hover:bg-slate-800 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:dark:ring-gray-200 focus:dark:border-gray-200',
                                    {
                                      'cursor-not-allowed opacity-50': isLoading || dataLoading || !_isEmpty(filters),
                                      '!bg-gray-200 dark:!bg-gray-600 !border dark:!border-gray-500 !border-gray-300':
                                        !_isEmpty(forecasedChartData),
                                    },
                                  )}
                                >
                                  <Robot
                                    theme={_theme}
                                    containerClassName='w-5 h-5'
                                    className='text-gray-700 dark:text-gray-50 stroke-2'
                                  />
                                </button>
                              </div>
                            )}
                            <div
                              className={cx('border-gray-200 dark:border-gray-600', {
                                'lg:border-r': activeTab === PROJECT_TABS.funnels,
                                hidden: activeTab === PROJECT_TABS.errors && activeError,
                              })}
                            >
                              <button
                                type='button'
                                title={t('project.search')}
                                onClick={() => setShowFiltersSearch(true)}
                                className={cx(
                                  'relative rounded-md p-2 bg-gray-50 text-sm font-medium hover:bg-white hover:shadow-sm dark:bg-slate-900 dark:hover:bg-slate-800 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:dark:ring-gray-200 focus:dark:border-gray-200',
                                  {
                                    'cursor-not-allowed opacity-50': isLoading || dataLoading,
                                  },
                                )}
                              >
                                <MagnifyingGlassIcon className='w-5 h-5 stroke-2 text-gray-700 dark:text-gray-50' />
                              </button>
                            </div>
                            {activeTab !== PROJECT_TABS.funnels &&
                              activeTab !== PROJECT_TABS.sessions &&
                              activeTab !== PROJECT_TABS.errors && (
                                <Dropdown
                                  header={t('project.exportData')}
                                  items={[
                                    ...exportTypes,
                                    ...customExportTypes,
                                    { label: t('project.lookingForMore'), lookingForMore: true, onClick: () => {} },
                                  ]}
                                  title={[<ArrowDownTrayIcon key='download-icon' className='w-5 h-5' />]}
                                  labelExtractor={(item) => {
                                    const { label } = item

                                    return label
                                  }}
                                  keyExtractor={(item) => item.label}
                                  onSelect={(item, e) => {
                                    if (item.lookingForMore) {
                                      e?.stopPropagation()
                                      window.open(MARKETPLACE_URL, '_blank')

                                      return
                                    }

                                    item.onClick(panelsData, t)
                                  }}
                                  chevron='mini'
                                  buttonClassName='!p-2 rounded-md hover:bg-white hover:shadow-sm dark:hover:bg-slate-800 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:dark:ring-gray-200 focus:dark:border-gray-200'
                                  headless
                                />
                              )}
                            <div
                              className={cx(
                                'border-gray-200 dark:border-gray-600 lg:px-3 sm:mr-3 space-x-2 lg:border-x',
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
                                  'relative fill-gray-700 dark:fill-gray-50 rounded-md p-2 text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:dark:ring-gray-200 focus:dark:border-gray-200',
                                  {
                                    'bg-white dark:bg-slate-800 stroke-white dark:stroke-slate-800 shadow-sm':
                                      chartType === chartTypes.bar,
                                    'bg-gray-50 stroke-gray-50 dark:bg-slate-900 dark:stroke-slate-900 [&_svg]:hover:fill-gray-500 [&_svg]:hover:dark:fill-gray-200':
                                      chartType !== chartTypes.bar,
                                  },
                                )}
                              >
                                <BarChart className='w-5 h-5 [&_path]:stroke-[3.5%]' />
                              </button>
                              <button
                                type='button'
                                title={t('project.lineChart')}
                                onClick={() => setChartTypeOnClick(chartTypes.line)}
                                className={cx(
                                  'relative fill-gray-700 dark:fill-gray-50 rounded-md p-2 text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:dark:ring-gray-200 focus:dark:border-gray-200',
                                  {
                                    'bg-white dark:bg-slate-800 stroke-white dark:stroke-slate-800 shadow-sm':
                                      chartType === chartTypes.line,
                                    'bg-gray-50 stroke-gray-50 dark:bg-slate-900 dark:stroke-slate-900 [&_svg]:hover:fill-gray-500 [&_svg]:hover:dark:fill-gray-200':
                                      chartType !== chartTypes.line,
                                  },
                                )}
                              >
                                <LineChart className='w-5 h-5 [&_path]:stroke-[3.5%]' />
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
                                    <span className='px-4 py-2 flex items-center cursor-not-allowed'>
                                      <NoSymbolIcon className='w-5 h-5 mr-1' />
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
                                        id={event.id}
                                        onChange={() => {}}
                                        checked={event.active}
                                      />
                                    )}
                                    buttonClassName='group-hover:bg-gray-200 dark:group-hover:bg-slate-700 px-4 py-2 inline-flex w-full bg-white text-sm font-medium text-gray-700 dark:text-gray-50 dark:border-gray-800 dark:bg-slate-800'
                                    keyExtractor={(event) => event.id}
                                    onSelect={(event, e) => {
                                      e?.stopPropagation()
                                      e?.preventDefault()

                                      setActiveChartMetricsCustomEvents((prev) => {
                                        const newActiveChartMetricsCustomEvents = [...prev]
                                        const index = _findIndex(prev, (item) => item === event.id)
                                        if (index === -1) {
                                          newActiveChartMetricsCustomEvents.push(event.id)
                                        } else {
                                          newActiveChartMetricsCustomEvents.splice(index, 1)
                                        }
                                        return newActiveChartMetricsCustomEvents
                                      })
                                    }}
                                    headless
                                  />
                                )
                              }

                              return (
                                <Checkbox
                                  className={cx('px-4 py-2', { hidden: isPanelsDataEmpty || analyticsLoading })}
                                  label={label}
                                  disabled={conflicted}
                                  id={pairID}
                                  checked={active}
                                />
                              )
                            }}
                            selectItemClassName='group text-gray-700 dark:text-gray-50 dark:border-gray-800 dark:bg-slate-800 block text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700'
                            keyExtractor={(pair) => pair.id}
                            onSelect={({ id: pairID, conflicts }) => {
                              if (isConflicted(conflicts)) {
                                generateAlert(t('project.conflictMetric'), 'error')
                                return
                              }

                              if (pairID === CHART_METRICS_MAPPING.customEvents) {
                                return
                              }

                              switchActiveChartMetric(pairID)
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
                              className={cx('text-sm p-2 font-medium text-gray-700 dark:text-gray-50', {
                                'cursor-not-allowed': isLoading || errorLoading,
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
                              className={cx('text-sm p-2 font-medium text-gray-700 dark:text-gray-50', {
                                'cursor-not-allowed': isLoading || errorLoading,
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
                              const { label, id: pairID, active } = pair

                              return <Checkbox className='px-4 py-2' label={label} id={pairID} checked={active} />
                            }}
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
                              'relative rounded-md p-2 bg-gray-50 text-sm font-medium hover:bg-white hover:shadow-sm dark:bg-slate-900 dark:hover:bg-slate-800 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:dark:ring-gray-200 focus:dark:border-gray-200',
                              {
                                'cursor-not-allowed opacity-50': isLoading || dataLoading,
                              },
                            )}
                          >
                            <ArrowPathIcon className='w-5 h-5 text-gray-700 dark:text-gray-50' />
                          </button>
                        )}
                        {activeTab === PROJECT_TABS.performance && !isPanelsDataEmptyPerf && (
                          <Dropdown
                            items={chartMetricsPerf}
                            className='min-w-[170px] xs:min-w-0'
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
                              switchActiveChartMetric(pairID)
                            }}
                            chevron='mini'
                            headless
                          />
                        )}
                        {activeTab === PROJECT_TABS.performance && !isPanelsDataEmptyPerf && (
                          <Dropdown
                            disabled={activeChartMetricsPerf === CHART_METRICS_MAPPING_PERF.quantiles}
                            items={chartMeasuresPerf}
                            className='min-w-[170px] xs:min-w-0'
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
                            chevron='mini'
                            headless
                          />
                        )}
                        <TBPeriodSelector
                          classes={{
                            timeBucket: activeTab === PROJECT_TABS.errors && !activeEID ? 'hidden' : '',
                          }}
                          activePeriod={activePeriod}
                          updateTimebucket={updateTimebucket}
                          timeBucket={timeBucket}
                          items={timeBucketSelectorItems}
                          title={activePeriod?.label}
                          onSelect={(pair) => {
                            if (pair.period === PERIOD_PAIRS_COMPARE.COMPARE) {
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
                                // @ts-ignore
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
                            <div className='mx-2 text-md font-medium text-gray-600 whitespace-pre-line dark:text-gray-200'>
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
                                    // @ts-ignore
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
                        onClick={() => setActiveFunnel(null)}
                        className='flex items-center text-base font-normal underline decoration-dashed hover:decoration-solid mb-4 mx-auto lg:mx-0 mt-2 lg:mt-0 text-gray-900 dark:text-gray-100'
                      >
                        <ChevronLeftIcon className='w-4 h-4' />
                        {t('project.backToFunnels')}
                      </button>
                    )}
                  </>
                )}
              {activeTab === PROJECT_TABS.alerts && (isSharedProject || !project?.isOwner || !authenticated) && (
                <div className='p-5 mt-5 bg-gray-700 rounded-xl'>
                  <div className='flex items-center text-gray-50'>
                    <BellIcon className='w-8 h-8 mr-2' />
                    <p className='font-bold text-3xl'>{t('dashboard.alerts')}</p>
                  </div>
                  <p className='text-lg whitespace-pre-wrap mt-2 text-gray-100'>{t('dashboard.alertsDesc')}</p>
                  <Link
                    to={routes.signup}
                    className='inline-block select-none mt-6 bg-white py-2 px-3 border border-transparent rounded-md text-base font-medium text-gray-700 hover:bg-indigo-50'
                    aria-label={t('titles.signup')}
                  >
                    {t('common.getStarted')}
                  </Link>
                </div>
              )}
              {activeTab === PROJECT_TABS.funnels && !activeFunnel && !_isEmpty(project.funnels) && (
                <FunnelsList
                  openFunnelSettings={(funnel?: IFunnel) => {
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
                <div className='p-5 mt-5 bg-gray-700 rounded-xl'>
                  <div className='flex items-center text-gray-50'>
                    <FunnelIcon className='w-8 h-8 mr-2' />
                    <p className='font-bold text-3xl'>{t('dashboard.funnels')}</p>
                  </div>
                  <p className='text-lg whitespace-pre-wrap mt-2 text-gray-100'>{t('dashboard.funnelsDesc')}</p>
                  {authenticated ? (
                    <button
                      type='button'
                      onClick={() => setIsNewFunnelOpened(true)}
                      className='inline-block select-none mt-6 bg-white py-2 px-3 border border-transparent rounded-md text-base font-medium text-gray-700 hover:bg-indigo-50'
                    >
                      {t('dashboard.newFunnel')}
                    </button>
                  ) : (
                    <Link
                      to={routes.signup}
                      className='inline-block select-none mt-6 bg-white py-2 px-3 border border-transparent rounded-md text-base font-medium text-gray-700 hover:bg-indigo-50'
                      aria-label={t('titles.signup')}
                    >
                      {t('common.getStarted')}
                    </Link>
                  )}
                </div>
              )}
              {activeTab === PROJECT_TABS.sessions && !activeSession && (
                <>
                  <Filters
                    filters={filtersSessions}
                    onRemoveFilter={filterHandler}
                    onChangeExclusive={onChangeExclusive}
                    tnMapping={tnMapping}
                  />
                  {sessionsLoading && _isEmpty(sessions) && <Loader />}
                  {!sessionsLoading && _isEmpty(sessions) && <NoEvents filters={filters} resetFilters={resetFilters} />}
                  <Sessions sessions={sessions} onClick={loadSession} timeFormat={timeFormat} />
                  {canLoadMoreSessions && (
                    <button
                      type='button'
                      title={t('project.refreshStats')}
                      onClick={() => loadSessions()}
                      className={cx(
                        'flex items-center mx-auto mt-2 text-gray-700 dark:text-gray-50 relative rounded-md p-2 bg-gray-50 text-sm font-medium hover:bg-white hover:shadow-sm dark:bg-slate-900 dark:hover:bg-slate-800 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:dark:ring-gray-200 focus:dark:border-gray-200',
                        {
                          'cursor-not-allowed opacity-50': sessionsLoading,
                          hidden: sessionsLoading && _isEmpty(sessions),
                        },
                      )}
                    >
                      <ArrowDownTrayIcon className='w-5 h-5 mr-2' />
                      {t('project.loadMore')}
                    </button>
                  )}
                </>
              )}
              {activeTab === PROJECT_TABS.sessions && activeSession && (
                <>
                  <button
                    onClick={() => {
                      setActiveSession(null)
                      const url = new URL(window.location.href)
                      url.searchParams.delete('psid')
                      window.history.pushState({}, '', url.toString())
                    }}
                    className='flex items-center text-base font-normal underline decoration-dashed hover:decoration-solid mb-4 mx-auto lg:mx-0 mt-2 text-gray-900 dark:text-gray-100'
                  >
                    <ChevronLeftIcon className='w-4 h-4' />
                    {t('project.backToSessions')}
                  </button>
                  {activeSession?.details && <SessionDetails details={activeSession?.details} />}
                  <SessionChart
                    chart={activeSession?.chart}
                    timeBucket={activeSession?.timeBucket}
                    timeFormat={timeFormat}
                    rotateXAxis={rotateXAxis}
                    chartType={chartType}
                    dataNames={dataNames}
                  />
                  <Pageflow pages={activeSession?.pages} timeFormat={timeFormat} />
                </>
              )}
              {activeTab === PROJECT_TABS.errors && !activeEID && (
                <>
                  <Filters
                    filters={filtersErrors}
                    onRemoveFilter={filterHandler}
                    onChangeExclusive={onChangeExclusive}
                    tnMapping={tnMapping}
                  />
                  {!errorsLoading && _isEmpty(errors) && (
                    <NoEvents filters={filtersErrors} resetFilters={resetFilters} />
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
                        'flex items-center mx-auto mt-2 text-gray-700 dark:text-gray-50 relative rounded-md p-2 bg-gray-50 text-sm font-medium hover:bg-white hover:shadow-sm dark:bg-slate-900 dark:hover:bg-slate-800 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:dark:ring-gray-200 focus:dark:border-gray-200',
                        {
                          'cursor-not-allowed opacity-50': errorsLoading,
                          hidden: errorsLoading && _isEmpty(errors),
                        },
                      )}
                    >
                      <ArrowDownTrayIcon className='w-5 h-5 mr-2' />
                      {t('project.loadMore')}
                    </button>
                  )}
                  {_isEmpty(errors) && errorsLoading && <Loader />}
                </>
              )}
              {activeTab === PROJECT_TABS.errors && activeEID && (
                <>
                  <button
                    onClick={() => {
                      setActiveError(null)
                      setActiveEID(null)
                      const url = new URL(window.location.href)
                      url.searchParams.delete('eid')
                      window.history.pushState({}, '', url.toString())
                    }}
                    className='flex items-center text-base font-normal underline decoration-dashed hover:decoration-solid mb-4 mx-auto lg:mx-0 mt-2 lg:mt-0 text-gray-900 dark:text-gray-100'
                  >
                    <ChevronLeftIcon className='w-4 h-4' />
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
                  <div className='mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
                    {!_isEmpty(activeError?.params) &&
                      _map(ERROR_PANELS_ORDER, (type: keyof typeof tnMapping) => {
                        const panelName = tnMapping[type]
                        // @ts-ignore
                        const panelIcon = panelIconMapping[type]

                        if (type === 'cc') {
                          const ccPanelName = tnMapping[countryActiveTab]

                          const rowMapper = (entry: ICountryEntry) => {
                            const { name: entryName, cc } = entry

                            if (cc) {
                              return <CCRow cc={cc} name={entryName} language={language} />
                            }

                            return <CCRow cc={entryName} language={language} />
                          }

                          return (
                            <Panel
                              projectPassword={projectPassword}
                              t={t}
                              key={countryActiveTab}
                              icon={panelIcon}
                              id={countryActiveTab}
                              onFilter={filterHandler}
                              activeTab={activeTab}
                              name={<CountryDropdown onSelect={setCountryActiveTab} title={ccPanelName} />}
                              data={activeError.params[countryActiveTab]}
                              rowMapper={rowMapper}
                            />
                          )
                        }

                        if (type === 'br') {
                          const rowMapper = (entry: any) => {
                            const { name: entryName } = entry
                            // @ts-ignore
                            const logoUrl = BROWSER_LOGO_MAP[entryName]

                            if (!logoUrl) {
                              return (
                                <>
                                  <GlobeAltIcon className='w-5 h-5' />
                                  &nbsp;
                                  {entryName}
                                </>
                              )
                            }

                            return (
                              <>
                                <img src={logoUrl} className='w-5 h-5' alt='' />
                                &nbsp;
                                {entryName}
                              </>
                            )
                          }

                          return (
                            <Panel
                              projectPassword={projectPassword}
                              t={t}
                              key={type}
                              icon={panelIcon}
                              id={type}
                              activeTab={activeTab}
                              onFilter={filterHandler}
                              name={panelName}
                              data={activeError.params[type]}
                              rowMapper={rowMapper}
                            />
                          )
                        }

                        if (type === 'os') {
                          const rowMapper = (entry: any) => {
                            const { name: entryName } = entry
                            // @ts-ignore
                            const logoPathLight = OS_LOGO_MAP[entryName]
                            // @ts-ignore
                            const logoPathDark = OS_LOGO_MAP_DARK[entryName]

                            let logoPath = _theme === 'dark' ? logoPathDark : logoPathLight
                            logoPath ||= logoPathLight

                            if (!logoPath) {
                              return (
                                <>
                                  <GlobeAltIcon className='w-5 h-5' />
                                  &nbsp;
                                  {entryName}
                                </>
                              )
                            }

                            const logoUrl = `/${logoPath}`

                            return (
                              <>
                                <img src={logoUrl} className='w-5 h-5 dark:fill-gray-50' alt='' />
                                &nbsp;
                                {entryName}
                              </>
                            )
                          }

                          return (
                            <Panel
                              projectPassword={projectPassword}
                              t={t}
                              key={type}
                              icon={panelIcon}
                              id={type}
                              activeTab={activeTab}
                              onFilter={filterHandler}
                              name={panelName}
                              data={activeError.params[type]}
                              rowMapper={rowMapper}
                            />
                          )
                        }

                        if (type === 'dv') {
                          return (
                            <Panel
                              projectPassword={projectPassword}
                              t={t}
                              key={type}
                              activeTab={activeTab}
                              icon={panelIcon}
                              id={type}
                              onFilter={filterHandler}
                              name={panelName}
                              data={activeError.params[type]}
                              capitalize
                            />
                          )
                        }

                        if (type === 'pg') {
                          return (
                            <Panel
                              projectPassword={projectPassword}
                              t={t}
                              key={type}
                              icon={panelIcon}
                              id={type}
                              onFilter={filterHandler}
                              onFragmentChange={setPgActiveFragment}
                              // @ts-ignore
                              rowMapper={({ name: entryName }) => {
                                if (!entryName) {
                                  return _toUpper(t('project.redactedPage'))
                                }

                                let decodedUri = entryName as string

                                try {
                                  decodedUri = decodeURIComponent(entryName)
                                } catch (_) {
                                  // do nothing
                                }

                                return decodedUri
                              }}
                              name={pgPanelNameMapping[pgActiveFragment]}
                              data={activeError.params[type]}
                              period={period}
                              activeTab={activeTab}
                              pid={id}
                              timeBucket={timeBucket}
                              filters={filters}
                              from={dateRange ? getFormatDate(dateRange[0]) : null}
                              to={dateRange ? getFormatDate(dateRange[1]) : null}
                              timezone={timezone}
                            />
                          )
                        }

                        if (type === 'lc') {
                          return (
                            <Panel
                              projectPassword={projectPassword}
                              t={t}
                              key={type}
                              icon={panelIcon}
                              id={type}
                              activeTab={activeTab}
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
                            projectPassword={projectPassword}
                            t={t}
                            key={type}
                            icon={panelIcon}
                            id={type}
                            activeTab={activeTab}
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
              {activeTab === PROJECT_TABS.alerts && !isSharedProject && project?.isOwner && authenticated && (
                <ProjectAlertsView projectId={id} />
              )}
              {analyticsLoading && (activeTab === PROJECT_TABS.traffic || activeTab === PROJECT_TABS.performance) && (
                <Loader />
              )}
              {isPanelsDataEmpty && activeTab === PROJECT_TABS.traffic && (
                <NoEvents filters={filters} resetFilters={resetFilters} />
              )}
              {isPanelsDataEmptyPerf && activeTab === PROJECT_TABS.performance && (
                <NoEvents filters={filtersPerf} resetFilters={resetFilters} />
              )}
              {activeTab === PROJECT_TABS.traffic && (
                <div className={cx('pt-2', { hidden: isPanelsDataEmpty || analyticsLoading })}>
                  {!_isEmpty(overall) && (
                    <MetricCards
                      overall={overall}
                      overallCompare={overallCompare}
                      activePeriodCompare={activePeriodCompare}
                    />
                  )}
                  <div
                    className={cx('h-80', {
                      hidden: checkIfAllMetricsAreDisabled,
                    })}
                  >
                    <div className='h-80 mt-5 md:mt-0 [&_svg]:!overflow-visible' id='dataChart' />
                  </div>
                  <Filters
                    filters={filters}
                    onRemoveFilter={filterHandler}
                    onChangeExclusive={onChangeExclusive}
                    tnMapping={tnMapping}
                  />
                  {dataLoading && (
                    <div className='!bg-transparent static mt-4' id='loader'>
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
                        // @ts-ignore
                        const panelIcon = panelIconMapping[type]
                        const customTabs = _filter(customPanelTabs, (tab) => tab.panelID === type)

                        if (type === 'cc') {
                          const ccPanelName = tnMapping[countryActiveTab]

                          const rowMapper = (entry: ICountryEntry) => {
                            const { name: entryName, cc } = entry

                            if (cc) {
                              return <CCRow cc={cc} name={entryName} language={language} />
                            }

                            return <CCRow cc={entryName} language={language} />
                          }

                          return (
                            <Panel
                              projectPassword={projectPassword}
                              t={t}
                              key={countryActiveTab}
                              icon={panelIcon}
                              id={countryActiveTab}
                              onFilter={filterHandler}
                              activeTab={activeTab}
                              name={<CountryDropdown onSelect={setCountryActiveTab} title={ccPanelName} />}
                              data={panelsData.data[countryActiveTab]}
                              customTabs={customTabs}
                              rowMapper={rowMapper}
                            />
                          )
                        }

                        if (type === 'br') {
                          const rowMapper = (entry: any) => {
                            const { name: entryName } = entry
                            // @ts-ignore
                            const logoUrl = BROWSER_LOGO_MAP[entryName]

                            if (!logoUrl) {
                              return (
                                <>
                                  <GlobeAltIcon className='w-5 h-5' />
                                  &nbsp;
                                  {entryName}
                                </>
                              )
                            }

                            return (
                              <>
                                <img src={logoUrl} className='w-5 h-5' alt='' />
                                &nbsp;
                                {entryName}
                              </>
                            )
                          }

                          return (
                            <Panel
                              projectPassword={projectPassword}
                              t={t}
                              key={type}
                              icon={panelIcon}
                              id={type}
                              activeTab={activeTab}
                              onFilter={filterHandler}
                              name={panelName}
                              data={panelsData.data[type]}
                              customTabs={customTabs}
                              rowMapper={rowMapper}
                            />
                          )
                        }

                        if (type === 'os') {
                          const rowMapper = (entry: any) => {
                            const { name: entryName } = entry
                            // @ts-ignore
                            const logoPathLight = OS_LOGO_MAP[entryName]
                            // @ts-ignore
                            const logoPathDark = OS_LOGO_MAP_DARK[entryName]

                            let logoPath = _theme === 'dark' ? logoPathDark : logoPathLight
                            logoPath ||= logoPathLight

                            if (!logoPath) {
                              return (
                                <>
                                  <GlobeAltIcon className='w-5 h-5' />
                                  &nbsp;
                                  {entryName}
                                </>
                              )
                            }

                            const logoUrl = `/${logoPath}`

                            return (
                              <>
                                <img src={logoUrl} className='w-5 h-5 dark:fill-gray-50' alt='' />
                                &nbsp;
                                {entryName}
                              </>
                            )
                          }

                          return (
                            <Panel
                              projectPassword={projectPassword}
                              t={t}
                              key={type}
                              icon={panelIcon}
                              id={type}
                              activeTab={activeTab}
                              onFilter={filterHandler}
                              name={panelName}
                              data={panelsData.data[type]}
                              customTabs={customTabs}
                              rowMapper={rowMapper}
                            />
                          )
                        }

                        if (type === 'dv') {
                          return (
                            <Panel
                              projectPassword={projectPassword}
                              t={t}
                              key={type}
                              activeTab={activeTab}
                              icon={panelIcon}
                              id={type}
                              onFilter={filterHandler}
                              name={panelName}
                              data={panelsData.data[type]}
                              customTabs={customTabs}
                              capitalize
                            />
                          )
                        }

                        if (type === 'ref') {
                          return (
                            <Panel
                              projectPassword={projectPassword}
                              t={t}
                              key={type}
                              icon={panelIcon}
                              id={type}
                              onFilter={filterHandler}
                              name={panelName}
                              activeTab={activeTab}
                              data={panelsData.data[type]}
                              customTabs={customTabs}
                              // @ts-ignore
                              rowMapper={({ name: entryName }) => <RefRow rowName={entryName} />}
                            />
                          )
                        }

                        if (type === 'so') {
                          const ccPanelName = tnMapping[utmActiveTab]

                          return (
                            <Panel
                              projectPassword={projectPassword}
                              t={t}
                              key={utmActiveTab}
                              icon={panelIcon}
                              id={utmActiveTab}
                              activeTab={activeTab}
                              onFilter={filterHandler}
                              name={<UTMDropdown onSelect={setUtmActiveTab} title={ccPanelName} />}
                              data={panelsData.data[utmActiveTab]}
                              customTabs={customTabs}
                              // @ts-ignore
                              rowMapper={({ name: entryName }) => decodeURIComponent(entryName)}
                            />
                          )
                        }

                        if (type === 'pg') {
                          return (
                            <Panel
                              projectPassword={projectPassword}
                              t={t}
                              key={type}
                              icon={panelIcon}
                              id={type}
                              onFilter={filterHandler}
                              onFragmentChange={setPgActiveFragment}
                              // @ts-ignore
                              rowMapper={({ name: entryName }) => {
                                if (!entryName) {
                                  return _toUpper(t('project.redactedPage'))
                                }

                                let decodedUri = entryName as string

                                try {
                                  decodedUri = decodeURIComponent(entryName)
                                } catch (_) {
                                  // do nothing
                                }

                                return decodedUri
                              }}
                              name={pgPanelNameMapping[pgActiveFragment]}
                              data={panelsData.data[type]}
                              customTabs={customTabs}
                              period={period}
                              activeTab={activeTab}
                              pid={id}
                              timeBucket={timeBucket}
                              filters={filters}
                              from={dateRange ? getFormatDate(dateRange[0]) : null}
                              to={dateRange ? getFormatDate(dateRange[1]) : null}
                              timezone={timezone}
                            />
                          )
                        }

                        if (type === 'lc') {
                          return (
                            <Panel
                              projectPassword={projectPassword}
                              t={t}
                              key={type}
                              icon={panelIcon}
                              id={type}
                              activeTab={activeTab}
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
                            projectPassword={projectPassword}
                            t={t}
                            key={type}
                            icon={panelIcon}
                            id={type}
                            activeTab={activeTab}
                            onFilter={filterHandler}
                            name={panelName}
                            data={panelsData.data[type]}
                            customTabs={customTabs}
                          />
                        )
                      })}
                    {!_isEmpty(panelsData.customs) && (
                      <CustomEvents
                        t={t}
                        customs={panelsData.customs}
                        onFilter={filterHandler}
                        chartData={chartData}
                        customTabs={_filter(customPanelTabs, (tab) => tab.panelID === 'ce')}
                        getCustomEventMetadata={getCustomEventMetadata}
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
                    filters={filtersPerf}
                    onRemoveFilter={filterHandler}
                    onChangeExclusive={onChangeExclusive}
                    tnMapping={tnMapping}
                  />
                  {dataLoading && (
                    <div className='!bg-transparent static mt-4' id='loader'>
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
                        // @ts-ignore
                        const panelIcon = panelIconMapping[type]
                        const customTabs = _filter(customPanelTabs, (tab) => tab.panelID === type)

                        if (type === 'cc') {
                          const ccPanelName = tnMapping[countryActiveTab]

                          const rowMapper = (entry: ICountryEntry) => {
                            const { name: entryName, cc } = entry

                            if (cc) {
                              return <CCRow cc={cc} name={entryName} language={language} />
                            }

                            return <CCRow cc={entryName} language={language} />
                          }

                          return (
                            <Panel
                              projectPassword={projectPassword}
                              t={t}
                              key={countryActiveTab}
                              icon={panelIcon}
                              id={countryActiveTab}
                              onFilter={filterHandler}
                              name={<CountryDropdown onSelect={setCountryActiveTab} title={ccPanelName} />}
                              activeTab={activeTab}
                              data={panelsDataPerf.data[countryActiveTab]}
                              customTabs={customTabs}
                              rowMapper={rowMapper}
                              // @ts-ignore
                              valueMapper={(value) => getStringFromTime(getTimeFromSeconds(value), true)}
                            />
                          )
                        }

                        if (type === 'dv') {
                          return (
                            <Panel
                              projectPassword={projectPassword}
                              t={t}
                              key={type}
                              icon={panelIcon}
                              id={type}
                              onFilter={filterHandler}
                              name={panelName}
                              activeTab={activeTab}
                              data={panelsDataPerf.data[type]}
                              customTabs={customTabs}
                              // @ts-ignore
                              valueMapper={(value) => getStringFromTime(getTimeFromSeconds(value), true)}
                              capitalize
                            />
                          )
                        }

                        if (type === 'pg') {
                          return (
                            <Panel
                              projectPassword={projectPassword}
                              t={t}
                              key={type}
                              icon={panelIcon}
                              id={type}
                              activeTab={activeTab}
                              onFilter={filterHandler}
                              name={panelName}
                              data={panelsDataPerf.data[type]}
                              customTabs={customTabs}
                              // @ts-ignore
                              valueMapper={(value) => getStringFromTime(getTimeFromSeconds(value), true)}
                              // @ts-ignore
                              rowMapper={({ name: entryName }) => {
                                // todo: add uppercase
                                return entryName || t('project.redactedPage')
                              }}
                            />
                          )
                        }

                        if (type === 'br') {
                          const rowMapper = (entry: any) => {
                            const { name: entryName } = entry
                            // @ts-ignore
                            const logoUrl = BROWSER_LOGO_MAP[entryName]

                            if (!logoUrl) {
                              return (
                                <>
                                  <GlobeAltIcon className='w-5 h-5' />
                                  &nbsp;
                                  {entryName}
                                </>
                              )
                            }

                            return (
                              <>
                                <img src={logoUrl} className='w-5 h-5' alt='' />
                                &nbsp;
                                {entryName}
                              </>
                            )
                          }

                          return (
                            <Panel
                              projectPassword={projectPassword}
                              t={t}
                              key={type}
                              icon={panelIcon}
                              id={type}
                              activeTab={activeTab}
                              onFilter={filterHandler}
                              name={panelName}
                              data={panelsDataPerf.data[type]}
                              customTabs={customTabs}
                              // @ts-ignore
                              valueMapper={(value) => getStringFromTime(getTimeFromSeconds(value), true)}
                              rowMapper={rowMapper}
                            />
                          )
                        }

                        return (
                          <Panel
                            projectPassword={projectPassword}
                            t={t}
                            key={type}
                            icon={panelIcon}
                            id={type}
                            activeTab={activeTab}
                            onFilter={filterHandler}
                            name={panelName}
                            data={panelsDataPerf.data[type]}
                            customTabs={customTabs}
                            // @ts-ignore
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
                    <div className='h-80 mt-5 md:mt-0' id='dataChart' />
                  </div>
                  {dataLoading && (
                    <div className='!bg-transparent static mt-4' id='loader'>
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
          <Forecast
            isOpened={isForecastOpened}
            onClose={() => setIsForecastOpened(false)}
            onSubmit={onForecastSubmit}
            activeTB={t(`project.${timeBucket}`)}
            tb={timeBucket}
          />
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
          {!embedded && <Footer authenticated={authenticated} minimal showDBIPMessage />}
        </>
      )}
    </ClientOnly>
  )
}

ViewProject.propTypes = {
  projects: PropTypes.arrayOf(PropTypes.object).isRequired,
  sharedProjects: PropTypes.arrayOf(PropTypes.object).isRequired,
  cache: PropTypes.objectOf(PropTypes.object).isRequired,
  showError: PropTypes.func.isRequired,
  setProjectCache: PropTypes.func.isRequired,
  setProjectViewPrefs: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
  setPublicProject: PropTypes.func.isRequired,
  setLiveStatsForProject: PropTypes.func.isRequired,
  authenticated: PropTypes.bool.isRequired,
  extensions: PropTypes.arrayOf(PropTypes.object).isRequired,
  timezone: PropTypes.string,
  embedded: PropTypes.bool.isRequired,
  ssrAuthenticated: PropTypes.bool.isRequired,
  authLoading: PropTypes.bool.isRequired,
  updateProject: PropTypes.func.isRequired,
  queryPassword: PropTypes.string,
}

ViewProject.defaultProps = {
  timezone: DEFAULT_TIMEZONE,
  queryPassword: null,
}

export default memo(withProjectProtected(ViewProject))

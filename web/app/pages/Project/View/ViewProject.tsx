import SwetrixSDK from '@swetrix/sdk'
import cx from 'clsx'
import dayjs from 'dayjs'
import { AnimatePresence, motion } from 'framer-motion'
import _filter from 'lodash/filter'
import _find from 'lodash/find'
import _includes from 'lodash/includes'
import _isEmpty from 'lodash/isEmpty'
import _isString from 'lodash/isString'
import _map from 'lodash/map'
import _replace from 'lodash/replace'
import _uniqBy from 'lodash/uniqBy'
import {
  MoonIcon,
  SunIcon,
  BugIcon,
  GaugeIcon,
  UsersIcon,
  UserIcon,
  BellRingIcon,
  ChartNoAxesColumnIcon,
  FilterIcon,
  SettingsIcon,
  KeyboardIcon,
  TargetIcon,
  PuzzleIcon,
  SparklesIcon,
  FlagIcon,
  FlaskConicalIcon,
} from 'lucide-react'
import React, { useState, useEffect, useMemo, useRef, useCallback, createContext, useContext, lazy } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useTranslation } from 'react-i18next'
import { useNavigate, Link, useSearchParams, LinkProps } from 'react-router'
import { ClientOnly } from 'remix-utils/client-only'
import { toast } from 'sonner'

import { getProjectViews, deleteProjectView } from '~/api'
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
  PROJECT_TABS,
  TimeFormat,
  chartTypes,
  isSelfhosted,
  tbPeriodPairsCompare,
  PERIOD_PAIRS_COMPARE,
  FILTERS_PERIOD_PAIRS,
  LS_IS_ACTIVE_COMPARE_KEY,
  TITLE_SUFFIX,
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
import ViewProjectHotkeys from '~/modals/ViewProjectHotkeys'
import { useAuth } from '~/providers/AuthProvider'
import { useTheme } from '~/providers/ThemeProvider'
import Dropdown from '~/ui/Dropdown'
import Flag from '~/ui/Flag'
import Loader from '~/ui/Loader'
import LoadingBar from '~/ui/LoadingBar'
import Select from '~/ui/Select'
import { removeDuplicates } from '~/utils/generic'
import { getItem, setItem } from '~/utils/localstorage'
import routes from '~/utils/routes'

import { useCurrentProject, useProjectPassword } from '../../../providers/CurrentProjectProvider'
import ProjectAlertsView from '../Alerts/View'
import AskAIView from '../AskAI'
import ErrorsView from '../Errors/View/ErrorsView'
import ExperimentsView from '../Experiments/View'
import FeatureFlagsView from '../FeatureFlags/View'
import FunnelsView from '../Funnels/View'
import GoalsView from '../Goals/View'
import PerformanceView from '../Performance/View/PerformanceView'
import ProfilesView from '../Profiles/View'
import SessionsView from '../Sessions/View/SessionsView'
import TrafficView from '../Traffic/View/TrafficView'

import AddAViewModal from './components/AddAViewModal'
import { ChartManagerProvider } from './components/ChartManager'
const CaptchaView = lazy(() => import('./components/CaptchaView'))
import DashboardHeader from './components/DashboardHeader'
// Keywords list now reuses shared Panel UI; dedicated component removed from render
import LockedDashboard from './components/LockedDashboard'
import ProjectSidebar from './components/ProjectSidebar'
import SearchFilters from './components/SearchFilters'
import TrafficHeaderActions from './components/TrafficHeaderActions'
import WaitingForAnEvent from './components/WaitingForAnEvent'
import {
  Customs,
  Filter,
  TrafficMeta,
  Params,
  ProjectView,
  ProjectViewCustomEvent,
  Properties,
} from './interfaces/traffic'
import { type CustomTab } from './Panels'
import { parseFilters } from './utils/filters'
import {
  onCSVExportClick,
  getFormatDate,
  typeNameMapping,
  CHART_METRICS_MAPPING,
  SHORTCUTS_TABS_LISTENERS,
  SHORTCUTS_TABS_MAP,
  SHORTCUTS_GENERAL_LISTENERS,
  SHORTCUTS_TIMEBUCKETS_LISTENERS,
} from './ViewProject.helpers'

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
  experimentsRefreshTrigger: number
  featureFlagsRefreshTrigger: number
  sessionsRefreshTrigger: number
  performanceRefreshTrigger: number
  trafficRefreshTrigger: number
  funnelsRefreshTrigger: number
  profilesRefreshTrigger: number

  // Comparison state
  isActiveCompare: boolean
  dateRangeCompare: Date[] | null
  activePeriodCompare: string
  setIsActiveCompare: (value: boolean) => void
  setDateRangeCompare: (value: Date[] | null) => void
  setActivePeriodCompare: (value: string) => void
  compareDisable: () => void

  // Chart state
  chartType: keyof typeof chartTypes
  setChartTypeOnClick: (type: keyof typeof chartTypes) => void
  rotateXAxis: boolean

  // Zoom state
  onMainChartZoom: (domain: [Date, Date] | null) => void
  shouldEnableZoom: boolean

  // Filter functions
  getFilterLink: (column: string, value: string | null) => LinkProps['to']
  getVersionFilterLink: (parent: string | null, version: string | null, panelType: 'br' | 'os') => string

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
  experimentsRefreshTrigger: 0,
  featureFlagsRefreshTrigger: 0,
  sessionsRefreshTrigger: 0,
  performanceRefreshTrigger: 0,
  trafficRefreshTrigger: 0,
  funnelsRefreshTrigger: 0,
  profilesRefreshTrigger: 0,

  // Comparison state defaults
  isActiveCompare: false,
  dateRangeCompare: null,
  activePeriodCompare: '',
  setIsActiveCompare: () => {},
  setDateRangeCompare: () => {},
  setActivePeriodCompare: () => {},
  compareDisable: () => {},

  // Chart state defaults
  chartType: chartTypes.line,
  setChartTypeOnClick: () => {},
  rotateXAxis: false,

  // Zoom state defaults
  onMainChartZoom: () => {},
  shouldEnableZoom: true,

  // Filter functions defaults
  getFilterLink: () => ({ search: '' }) as LinkProps['to'],
  getVersionFilterLink: () => '',

  updatePeriod: () => {},
  updateTimebucket: (_newTimebucket) => {},
  refCalendar: { current: null } as any,
}

export const ViewProjectContext = createContext<ViewProjectContextType>(defaultViewProjectContext)

export const useViewProjectContext = () => {
  const context = useContext(ViewProjectContext)
  return context
}

const ViewProjectContent = () => {
  const { id, project, preferences, updatePreferences, extensions, allowedToManage, liveVisitors } = useCurrentProject()
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

  // Traffic data state - now handled by TrafficView, kept for export compatibility
  const [_panelsData, _setPanelsData] = useState<{
    types: (keyof Params)[]
    data: Params
    customs: Customs
    properties: Properties
    meta?: TrafficMeta[]
    // @ts-expect-error
  }>({})
  const [customExportTypes, setCustomExportTypes] = useState<
    { label: string; onClick: (data: typeof _panelsData, tFunction: typeof t) => void }[]
  >([])
  const [isAddAViewOpened, setIsAddAViewOpened] = useState(false)
  const [analyticsLoading, _setAnalyticsLoading] = useState(true)

  // prevY2NeededRef removed - no longer needed with new chart management
  const [dataLoading, _setDataLoading] = useState(false)
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false)
  const [captchaRefreshTrigger, setCaptchaRefreshTrigger] = useState(0)
  const [goalsRefreshTrigger, setGoalsRefreshTrigger] = useState(0)
  const [experimentsRefreshTrigger, setExperimentsRefreshTrigger] = useState(0)
  const [featureFlagsRefreshTrigger, setFeatureFlagsRefreshTrigger] = useState(0)
  const [sessionsRefreshTrigger, setSessionsRefreshTrigger] = useState(0)
  const [performanceRefreshTrigger, setPerformanceRefreshTrigger] = useState(0)
  const [trafficRefreshTrigger, setTrafficRefreshTrigger] = useState(0)
  const [funnelsRefreshTrigger, setFunnelsRefreshTrigger] = useState(0)
  const [profilesRefreshTrigger, setProfilesRefreshTrigger] = useState(0)
  const [activeChartMetrics, _setActiveChartMetrics] = useState<Record<keyof typeof CHART_METRICS_MAPPING, boolean>>({
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
  const [customMetrics, setCustomMetrics] = useState<ProjectViewCustomEvent[]>([])
  const filters = useMemo<Filter[]>(() => {
    return parseFilters(searchParams)
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

  // Check if we're viewing a specific session detail
  const activePSID = useMemo(() => {
    return searchParams.get('psid')
  }, [searchParams])

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

    toast.success(t('apiNotifications.segmentDeleted'))
    await loadProjectViews(true)
    setProjectViewDeleting(false)
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

  const timeFormat = useMemo<'12-hour' | '24-hour'>(() => user?.timeFormat || TimeFormat['12-hour'], [user])
  const [ref, size] = useSize()
  const rotateXAxis = useMemo(() => size.width > 0 && size.width < 500, [size])
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
        id: PROJECT_TABS.experiments,
        label: t('dashboard.experiments'),
        icon: FlaskConicalIcon,
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

  const compareDisable = () => {
    setIsActiveCompare(false)
    setDateRangeCompare(null)
    setActivePeriodCompare(periodPairsCompare[0].period)
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

  const refreshStats = useCallback(
    async (isManual = true) => {
      if (!isManual) {
        setIsAutoRefreshing(true)
      }

      if (!authLoading && !dataLoading) {
        if (activeTab === PROJECT_TABS.funnels) {
          setFunnelsRefreshTrigger((prev) => prev + 1)
          return
        }

        if (activeTab === PROJECT_TABS.profiles) {
          setProfilesRefreshTrigger((prev) => prev + 1)
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

        if (activeTab === PROJECT_TABS.experiments) {
          setExperimentsRefreshTrigger((prev) => prev + 1)
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

        if (activeTab === PROJECT_TABS.performance) {
          setPerformanceRefreshTrigger((prev) => prev + 1)
          return
        }

        if (activeTab === PROJECT_TABS.traffic) {
          setTrafficRefreshTrigger((prev) => prev + 1)
          return
        }
      }
    },
    [authLoading, dataLoading, activeTab],
  )

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
        return onCSVExportClick(_panelsData, id, tnMapping, language)
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

  const contextValue = useMemo(
    () => ({
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
      experimentsRefreshTrigger,
      featureFlagsRefreshTrigger,
      sessionsRefreshTrigger,
      performanceRefreshTrigger,
      trafficRefreshTrigger,
      funnelsRefreshTrigger,
      profilesRefreshTrigger,

      // Comparison state
      isActiveCompare,
      dateRangeCompare,
      activePeriodCompare,
      setIsActiveCompare,
      setDateRangeCompare,
      setActivePeriodCompare,
      compareDisable,

      // Chart state
      chartType,
      setChartTypeOnClick,
      rotateXAxis,

      // Zoom state
      onMainChartZoom,
      shouldEnableZoom,

      // Filter functions
      getFilterLink,
      getVersionFilterLink,

      // Functions
      updatePeriod,
      updateTimebucket,

      // Refs
      refCalendar,
    }),
    [
      timezone,
      dateRange,
      authLoading,
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
      experimentsRefreshTrigger,
      featureFlagsRefreshTrigger,
      sessionsRefreshTrigger,
      performanceRefreshTrigger,
      trafficRefreshTrigger,
      funnelsRefreshTrigger,
      profilesRefreshTrigger,
      isActiveCompare,
      dateRangeCompare,
      activePeriodCompare,
      setIsActiveCompare,
      setDateRangeCompare,
      setActivePeriodCompare,
      compareDisable,
      chartType,
      setChartTypeOnClick,
      rotateXAxis,
      onMainChartZoom,
      shouldEnableZoom,
      getFilterLink,
      getVersionFilterLink,
      updatePeriod,
      updateTimebucket,
      refCalendar,
    ],
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
        <ViewProjectContext.Provider value={contextValue}>
          <>
            {dataLoading && !isAutoRefreshing ? <LoadingBar /> : null}
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
                    activeTab !== PROJECT_TABS.funnels &&
                    (activeTab !== PROJECT_TABS.sessions || !activePSID) ? (
                      <DashboardHeader
                        refreshStats={refreshStats}
                        timeBucketSelectorItems={timeBucketSelectorItems}
                        isActiveCompare={isActiveCompare}
                        setIsActiveCompare={setIsActiveCompare}
                        compareDisable={compareDisable}
                        maxRangeCompare={maxRangeCompare}
                        dateRangeCompare={dateRangeCompare}
                        setDateRangeCompare={setDateRangeCompare}
                        activePeriodCompare={activePeriodCompare}
                        setActivePeriodCompare={setActivePeriodCompare}
                        periodPairsCompare={periodPairsCompare}
                        setPeriodPairsCompare={setPeriodPairsCompare}
                        setShowFiltersSearch={setShowFiltersSearch}
                        resetDateRange={resetDateRange}
                        refCalendar={refCalendar}
                        refCalendarCompare={refCalendarCompare}
                        showSearchButton={activeTab !== PROJECT_TABS.errors}
                        hideTimeBucket={activeTab === PROJECT_TABS.errors}
                        rightContent={
                          activeTab === PROJECT_TABS.traffic ? (
                            <TrafficHeaderActions
                              projectViews={projectViews}
                              projectViewsLoading={projectViewsLoading}
                              projectViewDeleting={projectViewDeleting}
                              loadProjectViews={loadProjectViews}
                              onProjectViewDelete={onProjectViewDelete}
                              setProjectViewToUpdate={setProjectViewToUpdate}
                              setIsAddAViewOpened={setIsAddAViewOpened}
                              onCustomMetric={onCustomMetric}
                              filters={filters}
                              allowedToManage={allowedToManage}
                              dataLoading={dataLoading}
                              exportTypes={exportTypes}
                              customExportTypes={customExportTypes}
                              panelsData={_panelsData}
                            />
                          ) : null
                        }
                      />
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
                    {activeTab === PROJECT_TABS.funnels ? <FunnelsView /> : null}
                    {activeTab === PROJECT_TABS.profiles ? <ProfilesView chartType={chartType} /> : null}
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
                    {activeTab === PROJECT_TABS.experiments ? (
                      <ExperimentsView
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
                    {activeTab === PROJECT_TABS.traffic ? (
                      <TrafficView
                        tnMapping={tnMapping}
                        customMetrics={customMetrics}
                        onCustomMetric={onCustomMetric}
                        onRemoveCustomMetric={onRemoveCustomMetric}
                        resetCustomMetrics={resetCustomMetrics}
                        mode={mode}
                        sdkInstance={sdkInstance}
                      />
                    ) : null}
                    {activeTab === PROJECT_TABS.performance ? <PerformanceView tnMapping={tnMapping} /> : null}
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

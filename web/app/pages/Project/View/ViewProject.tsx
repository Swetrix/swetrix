import cx from 'clsx'
import dayjs from 'dayjs'
import { AnimatePresence, motion } from 'framer-motion'
import _filter from 'lodash/filter'
import _find from 'lodash/find'
import _includes from 'lodash/includes'
import _replace from 'lodash/replace'
import {
  MoonIcon,
  SunIcon,
  BugIcon,
  GaugeIcon,
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
  FileUser,
} from 'lucide-react'
import React, { useState, useEffect, useMemo, useRef, useCallback, createContext, useContext, lazy } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams, LinkProps, useFetcher } from 'react-router'
import { ClientOnly } from 'remix-utils/client-only'
import { toast } from 'sonner'

import EventsRunningOutBanner from '~/components/EventsRunningOutBanner'
import Footer from '~/components/Footer'
import Header from '~/components/Header'
import useSize from '~/hooks/useSize'
import { changeLanguage } from '~/i18n'
import {
  tbPeriodPairs,
  DEFAULT_TIMEZONE,
  timeBucketToDays,
  PROJECT_TABS,
  TimeFormat,
  chartTypes,
  isSelfhosted,
  tbPeriodPairsCompare,
  LS_IS_ACTIVE_COMPARE_KEY,
  TITLE_SUFFIX,
  TBPeriodPairsProps,
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
import { ProjectViewActionData } from '~/routes/projects.$id'
import Dropdown from '~/ui/Dropdown'
import Flag from '~/ui/Flag'
import Loader from '~/ui/Loader'
import { trackCustom } from '~/utils/analytics'
import { getItem, setItem } from '~/utils/localstorage'
import routes from '~/utils/routes'

import { useCurrentProject, useProjectPassword } from '../../../providers/CurrentProjectProvider'
import ProjectAlertsView from '../tabs/Alerts/ProjectAlertsView'
import AskAIView from '../tabs/AskAI'
import ErrorsView from '../tabs/Errors/ErrorsView'
import ExperimentsView from '../tabs/Experiments/ExperimentsView'
import FeatureFlagsView from '../tabs/FeatureFlags/FeatureFlagsView'
import FunnelsView from '../tabs/Funnels/FunnelsView'
import GoalsView from '../tabs/Goals/GoalsView'
import PerformanceView from '../tabs/Performance/PerformanceView'
import ProfilesView from '../tabs/Profiles/ProfilesView'
import SessionsView from '../tabs/Sessions/SessionsView'
import TrafficView from '../tabs/Traffic/TrafficView'

import AddAViewModal from './components/AddAViewModal'
import { ChartManagerProvider } from './components/ChartManager'
const CaptchaView = lazy(() => import('../tabs/Captcha/CaptchaView'))
import LockedDashboard from './components/LockedDashboard'
import PasswordRequiredModal from './components/PasswordRequiredModal'
import ProjectSidebar, { MobileSidebarTrigger } from './components/ProjectSidebar'
import SearchFilters from './components/SearchFilters'
import { Filter, ProjectView, ProjectViewCustomEvent } from './interfaces/traffic'
import { parseFilters } from './utils/filters'
import {
  getFormatDate,
  typeNameMapping,
  CHART_METRICS_MAPPING,
  SHORTCUTS_TABS_LISTENERS,
  SHORTCUTS_TABS_MAP,
  SHORTCUTS_GENERAL_LISTENERS,
  SHORTCUTS_TIMEBUCKETS_LISTENERS,
} from './ViewProject.helpers'

interface ViewProjectContextType {
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

  isActiveCompare: boolean
  dateRangeCompare: Date[] | null
  activePeriodCompare: string
  setIsActiveCompare: (value: boolean) => void
  setDateRangeCompare: (value: Date[] | null) => void
  setActivePeriodCompare: (value: string) => void
  compareDisable: () => void
  maxRangeCompare: number
  periodPairsCompare: { label: string; period: string }[]
  setPeriodPairsCompare: (value: { label: string; period: string }[]) => void

  chartType: keyof typeof chartTypes
  setChartTypeOnClick: (type: keyof typeof chartTypes) => void
  rotateXAxis: boolean

  onMainChartZoom: (domain: [Date, Date] | null) => void
  shouldEnableZoom: boolean

  getFilterLink: (column: string, value: string | null) => LinkProps['to']
  getVersionFilterLink: (parent: string | null, version: string | null, panelType: 'br' | 'os') => string

  updatePeriod: (newPeriod: { period: Period; label?: string }) => void
  updateTimebucket: (newTimebucket: TimeBucket) => void
  setShowFiltersSearch: (value: boolean) => void
  resetDateRange: () => void
  refreshStats: (isManual?: boolean) => Promise<void>

  refCalendar: React.RefObject<any>
  refCalendarCompare: React.RefObject<any>

  fullscreenMapRef: React.RefObject<HTMLDivElement | null>
  isMapFullscreen: boolean
  setIsMapFullscreen: (value: boolean) => void
}

interface RefreshTriggersContextType {
  captchaRefreshTrigger: number
  goalsRefreshTrigger: number
  experimentsRefreshTrigger: number
  featureFlagsRefreshTrigger: number
  sessionsRefreshTrigger: number
  errorsRefreshTrigger: number
  performanceRefreshTrigger: number
  trafficRefreshTrigger: number
  funnelsRefreshTrigger: number
  profilesRefreshTrigger: number
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

  isActiveCompare: false,
  dateRangeCompare: null,
  activePeriodCompare: '',
  setIsActiveCompare: () => {},
  setDateRangeCompare: () => {},
  setActivePeriodCompare: () => {},
  compareDisable: () => {},
  maxRangeCompare: 0,
  periodPairsCompare: [],
  setPeriodPairsCompare: () => {},

  chartType: chartTypes.line,
  setChartTypeOnClick: () => {},
  rotateXAxis: false,

  onMainChartZoom: () => {},
  shouldEnableZoom: true,

  getFilterLink: () => ({ search: '' }) as LinkProps['to'],
  getVersionFilterLink: () => '',

  updatePeriod: () => {},
  updateTimebucket: (_newTimebucket) => {},
  setShowFiltersSearch: () => {},
  resetDateRange: () => {},
  refreshStats: async () => {},
  refCalendar: { current: null } as any,
  refCalendarCompare: { current: null } as any,

  fullscreenMapRef: { current: null } as any,
  isMapFullscreen: false,
  setIsMapFullscreen: () => {},
}

const defaultRefreshTriggersContext: RefreshTriggersContextType = {
  captchaRefreshTrigger: 0,
  goalsRefreshTrigger: 0,
  experimentsRefreshTrigger: 0,
  featureFlagsRefreshTrigger: 0,
  sessionsRefreshTrigger: 0,
  errorsRefreshTrigger: 0,
  performanceRefreshTrigger: 0,
  trafficRefreshTrigger: 0,
  funnelsRefreshTrigger: 0,
  profilesRefreshTrigger: 0,
}

export const ViewProjectContext = createContext<ViewProjectContextType>(defaultViewProjectContext)
export const RefreshTriggersContext = createContext<RefreshTriggersContextType>(defaultRefreshTriggersContext)

export const useViewProjectContext = () => {
  const context = useContext(ViewProjectContext)
  return context
}

export const useRefreshTriggers = () => {
  const context = useContext(RefreshTriggersContext)
  return context
}

const ViewProjectContent = () => {
  const {
    id,
    project,
    preferences,
    updatePreferences,
    allowedToManage,
    liveVisitors,
    isPasswordRequired,
    submitPassword,
  } = useCurrentProject()
  const projectPassword = useProjectPassword(id)

  const { theme, setTheme } = useTheme()

  const { user, isLoading: authLoading } = useAuth()

  const { timezone = DEFAULT_TIMEZONE } = user || {}

  const {
    t,
    i18n: { language },
  } = useTranslation('common')

  const dashboardRef = useRef<HTMLDivElement>(null)
  const fullscreenMapRef = useRef<HTMLDivElement>(null)

  const [isMapFullscreen, setIsMapFullscreen] = useState(false)

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

  const [isAddAViewOpened, setIsAddAViewOpened] = useState(false)

  const [dataLoading] = useState(false)
  const [captchaRefreshTrigger, setCaptchaRefreshTrigger] = useState(0)
  const [goalsRefreshTrigger, setGoalsRefreshTrigger] = useState(0)
  const [experimentsRefreshTrigger, setExperimentsRefreshTrigger] = useState(0)
  const [featureFlagsRefreshTrigger, setFeatureFlagsRefreshTrigger] = useState(0)
  const [sessionsRefreshTrigger, setSessionsRefreshTrigger] = useState(0)
  const [errorsRefreshTrigger, setErrorsRefreshTrigger] = useState(0)
  const [performanceRefreshTrigger, setPerformanceRefreshTrigger] = useState(0)
  const [trafficRefreshTrigger, setTrafficRefreshTrigger] = useState(0)
  const [funnelsRefreshTrigger, setFunnelsRefreshTrigger] = useState(0)
  const [profilesRefreshTrigger, setProfilesRefreshTrigger] = useState(0)
  const [activeChartMetrics] = useState<Record<keyof typeof CHART_METRICS_MAPPING, boolean>>({
    [CHART_METRICS_MAPPING.unique]: true,
    [CHART_METRICS_MAPPING.views]: false,
    [CHART_METRICS_MAPPING.sessionDuration]: false,
    [CHART_METRICS_MAPPING.bounce]: false,
    [CHART_METRICS_MAPPING.viewsPerUnique]: false,
    [CHART_METRICS_MAPPING.trendlines]: false,
    [CHART_METRICS_MAPPING.cumulativeMode]: false,
    [CHART_METRICS_MAPPING.customEvents]: false,
    [CHART_METRICS_MAPPING.revenue]: false,
    ...(preferences.metricsVisualisation || {}),
  } as Record<keyof typeof CHART_METRICS_MAPPING, boolean>)
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

  // null -> not loaded yet
  const [projectViews, setProjectViews] = useState<ProjectView[]>([])
  const [projectViewsLoading, setProjectViewsLoading] = useState<boolean | null>(null) //  // null - not loaded, true - loading, false - loaded
  const [projectViewToUpdate, setProjectViewToUpdate] = useState<ProjectView | undefined>()

  const viewsLoadFetcher = useFetcher<ProjectViewActionData>()

  const mode = activeChartMetrics[CHART_METRICS_MAPPING.cumulativeMode] ? 'cumulative' : 'periodical'

  const loadProjectViews = useCallback(
    (forced?: boolean) => {
      if (!forced && projectViewsLoading !== null) {
        return
      }

      if (viewsLoadFetcher.state !== 'idle') {
        return
      }

      setProjectViewsLoading(true)

      const formData = new FormData()
      formData.append('intent', 'get-project-views')
      if (projectPassword) {
        formData.append('password', projectPassword)
      }

      viewsLoadFetcher.submit(formData, { method: 'POST' })
    },
    [projectViewsLoading, viewsLoadFetcher, projectPassword],
  )

  // Handle views load fetcher response
  useEffect(() => {
    if (viewsLoadFetcher.state === 'idle') {
      setProjectViewsLoading(false)

      if (viewsLoadFetcher.data) {
        if (viewsLoadFetcher.data.success && viewsLoadFetcher.data.data) {
          setProjectViews((viewsLoadFetcher.data.data as ProjectView[]) || [])
        } else if (viewsLoadFetcher.data.error) {
          console.error('[ERROR] (loadProjectViews)', viewsLoadFetcher.data.error)
          toast.error(viewsLoadFetcher.data.error)
        }
      }
    }
  }, [viewsLoadFetcher.state, viewsLoadFetcher.data])

  const getVersionFilterLink = useCallback(
    (parent: string | null, version: string | null, panelType: 'br' | 'os') => {
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
    },
    [searchParams],
  )

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

  const [showFiltersSearch, setShowFiltersSearch] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

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
        icon: FileUser,
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
      {
        id: PROJECT_TABS.captcha,
        label: t('common.captcha'),
        icon: PuzzleIcon,
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
        id: PROJECT_TABS.experiments,
        label: t('dashboard.experiments'),
        icon: FlaskConicalIcon,
      },
      ...adminTabs,
    ].filter((x) => !!x)

    if (projectQueryTabs && projectQueryTabs.length) {
      return _filter(newTabs, (tab) => _includes(projectQueryTabs, tab.id))
    }

    return newTabs
  }, [t, projectQueryTabs, allowedToManage])

  const activeTabLabel = useMemo(() => _find(tabs, (tab) => tab.id === activeTab)?.label, [tabs, activeTab])

  const compareDisable = useCallback(() => {
    setIsActiveCompare(false)
    setDateRangeCompare(null)
    setActivePeriodCompare(periodPairsCompare[0].period)
  }, [periodPairsCompare])

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

  const setDashboardTab = useCallback(
    (key: keyof typeof PROJECT_TABS) => {
      if (dataLoading) {
        return
      }

      setIsMapFullscreen(false)

      const newSearchParams = new URLSearchParams(searchParams.toString())
      newSearchParams.set('tab', key)
      setSearchParams(newSearchParams)
      trackCustom('DASHBOARD_TAB_CHANGED', { tab: key })
    },
    [dataLoading, searchParams, setSearchParams],
  )

  const refreshStats = useCallback(
    async (_isManual = true) => {
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

        if (activeTab === PROJECT_TABS.errors) {
          setErrorsRefreshTrigger((prev) => prev + 1)
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
    setPeriodPairsCompare(tbPeriodPairsCompare(t, undefined, language))
  }, [t, language])

  // We can assume period provided is never custom, as it's handled separately in the Datepicker callback function
  const updatePeriod = useCallback(
    ({ period: newPeriod }: { period: Period }) => {
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

      setSearchParams(newSearchParams)
    },
    [period, searchParams, setSearchParams, updatePreferences],
  )

  const updateTimebucket = useCallback(
    (newTimebucket: TimeBucket) => {
      if (dataLoading) {
        return
      }

      const newSearchParams = new URLSearchParams(searchParams.toString())
      newSearchParams.set('timeBucket', newTimebucket)
      setSearchParams(newSearchParams)

      updatePreferences({
        timeBucket: newTimebucket,
      })
    },
    [dataLoading, searchParams, setSearchParams, updatePreferences],
  )

  const openSettingsHandler = () => {
    navigate(_replace(routes.project_settings, ':id', id))
  }

  const onMainChartZoom = useCallback(
    (domain: [Date, Date] | null) => {
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
    },
    [searchParams, setSearchParams],
  )

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

  const getFilterLink = useCallback(
    (column: string, value: string | null): LinkProps['to'] => {
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
    },
    [filters, searchParams],
  )

  const setChartTypeOnClick = useCallback((type: keyof typeof chartTypes) => {
    setItem('chartType', type)
    setChartType(type)
  }, [])

  const resetDateRange = useCallback(() => {
    const newSearchParams = new URLSearchParams(searchParams.toString())
    newSearchParams.delete('from')
    newSearchParams.delete('to')
    setSearchParams(newSearchParams)
  }, [searchParams, setSearchParams])

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

  const openMobileSidebar = useCallback(() => setIsMobileSidebarOpen(true), [])
  const closeMobileSidebar = useCallback(() => setIsMobileSidebarOpen(false), [])

  const contextValue = useMemo(
    () => ({
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

      isActiveCompare,
      dateRangeCompare,
      activePeriodCompare,
      setIsActiveCompare,
      setDateRangeCompare,
      setActivePeriodCompare,
      compareDisable,
      maxRangeCompare,
      periodPairsCompare,
      setPeriodPairsCompare,

      chartType,
      setChartTypeOnClick,
      rotateXAxis,

      onMainChartZoom,
      shouldEnableZoom,

      getFilterLink,
      getVersionFilterLink,

      updatePeriod,
      updateTimebucket,
      setShowFiltersSearch,
      resetDateRange,
      refreshStats,

      refCalendar,
      refCalendarCompare,
      fullscreenMapRef,
      isMapFullscreen,
      setIsMapFullscreen,
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
      isActiveCompare,
      dateRangeCompare,
      activePeriodCompare,
      setIsActiveCompare,
      setDateRangeCompare,
      setActivePeriodCompare,
      compareDisable,
      maxRangeCompare,
      periodPairsCompare,
      setPeriodPairsCompare,
      chartType,
      setChartTypeOnClick,
      rotateXAxis,
      onMainChartZoom,
      shouldEnableZoom,
      getFilterLink,
      getVersionFilterLink,
      updatePeriod,
      updateTimebucket,
      setShowFiltersSearch,
      resetDateRange,
      refreshStats,
      refCalendar,
      refCalendarCompare,
      fullscreenMapRef,
      isMapFullscreen,
      setIsMapFullscreen,
    ],
  )

  const refreshTriggersValue = useMemo(
    () => ({
      captchaRefreshTrigger,
      goalsRefreshTrigger,
      experimentsRefreshTrigger,
      featureFlagsRefreshTrigger,
      sessionsRefreshTrigger,
      errorsRefreshTrigger,
      performanceRefreshTrigger,
      trafficRefreshTrigger,
      funnelsRefreshTrigger,
      profilesRefreshTrigger,
    }),
    [
      captchaRefreshTrigger,
      goalsRefreshTrigger,
      experimentsRefreshTrigger,
      featureFlagsRefreshTrigger,
      sessionsRefreshTrigger,
      errorsRefreshTrigger,
      performanceRefreshTrigger,
      trafficRefreshTrigger,
      funnelsRefreshTrigger,
      profilesRefreshTrigger,
    ],
  )

  if (isPasswordRequired) {
    return (
      <>
        {!isEmbedded ? <Header /> : null}
        <div className='flex min-h-screen flex-col bg-gray-50 dark:bg-slate-900'>
          <div className='mx-auto w-full max-w-7xl flex-1 px-4 py-2 sm:px-6 lg:px-8'>
            <div className='relative flex gap-4'>
              <ProjectSidebar
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={() => {}}
                projectId={id}
                projectName=''
                websiteUrl={null}
                dataLoading={false}
                searchParams={searchParams}
                allowedToManage={false}
                className='hidden md:flex'
              />

              <div className='flex min-w-0 flex-1 flex-col'>
                {/* Skeleton header */}
                <div className='mb-6 flex items-center justify-between'>
                  <div className='h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-slate-700' />
                  <div className='flex gap-2'>
                    <div className='h-10 w-24 animate-pulse rounded bg-gray-200 dark:bg-slate-700' />
                    <div className='h-10 w-32 animate-pulse rounded bg-gray-200 dark:bg-slate-700' />
                  </div>
                </div>

                {/* Skeleton metric cards */}
                <div className='mb-6 grid grid-cols-2 gap-4 md:grid-cols-4'>
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className='h-24 animate-pulse rounded-lg bg-gray-200 dark:bg-slate-700' />
                  ))}
                </div>

                {/* Skeleton chart */}
                <div className='mb-6 h-80 animate-pulse rounded-lg bg-gray-200 dark:bg-slate-700' />

                {/* Skeleton panels */}
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className='h-48 animate-pulse rounded-lg bg-gray-200 dark:bg-slate-700' />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {!isEmbedded ? <Footer /> : null}
        </div>

        {/* Password Modal */}
        <PasswordRequiredModal isOpen={isPasswordRequired} onSubmit={submitPassword} />
      </>
    )
  }

  if (authLoading || !project) {
    return (
      <>
        {!isEmbedded ? <Header /> : null}
        <div
          className={cx('flex flex-col bg-gray-50 dark:bg-slate-900', {
            'min-h-including-header': !isEmbedded,
            'min-h-screen': isEmbedded,
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
          className={cx('flex min-h-screen flex-col bg-gray-50 dark:bg-slate-900', {
            'min-h-including-header': !isEmbedded,
            'min-h-screen': isEmbedded,
          })}
        >
          <div className='mx-auto w-full max-w-7xl flex-1 px-4 py-2 sm:px-6 lg:px-8'>
            <div className='relative flex gap-4'>
              {/* Desktop Sidebar */}
              <ProjectSidebar
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setDashboardTab}
                projectId={id}
                projectName={project.name}
                websiteUrl={project.websiteUrl}
                dataLoading={dataLoading}
                searchParams={searchParams}
                allowedToManage={allowedToManage}
                className='hidden md:flex'
              />
              {/* Mobile Sidebar */}
              {isMobileSidebarOpen ? (
                <div className='pointer-events-auto'>
                  <ProjectSidebar
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabChange={setDashboardTab}
                    projectId={id}
                    projectName={project.name}
                    websiteUrl={project.websiteUrl}
                    dataLoading={dataLoading}
                    searchParams={searchParams}
                    allowedToManage={allowedToManage}
                    isMobileOpen={isMobileSidebarOpen}
                    onMobileClose={closeMobileSidebar}
                  />
                </div>
              ) : null}

              {/* Main Content */}
              <div className='flex min-w-0 flex-1 flex-col'>
                <div className='pointer-events-auto'>
                  <MobileSidebarTrigger onClick={openMobileSidebar} activeTabLabel={activeTabLabel} />
                </div>
                <LockedDashboard />
              </div>
            </div>
          </div>

          {!isEmbedded ? <Footer /> : null}
        </div>
      </>
    )
  }

  return (
    <ClientOnly>
      {() => (
        <ViewProjectContext.Provider value={contextValue}>
          <RefreshTriggersContext.Provider value={refreshTriggersValue}>
            <>
              <div
                className={cx('flex min-h-screen flex-col bg-gray-50 dark:bg-slate-900', {
                  'min-h-including-header': !isEmbedded,
                  'min-h-screen': isEmbedded,
                })}
              >
                {!isEmbedded ? <Header /> : null}

                <div className='grid flex-1 grid-cols-1'>
                  <div ref={fullscreenMapRef} className='z-0 col-start-1 row-start-1 min-h-full w-full empty:hidden' />

                  <div
                    className={cx(
                      'z-10 col-start-1 row-start-1 mx-auto w-full max-w-7xl px-4 py-2 sm:px-6 lg:px-8',
                      isMapFullscreen ? 'pointer-events-none' : 'pointer-events-auto',
                    )}
                  >
                    <div ref={ref} className='relative flex gap-4'>
                      <ProjectSidebar
                        tabs={tabs}
                        activeTab={activeTab}
                        onTabChange={setDashboardTab}
                        projectId={id}
                        projectName={project.name}
                        websiteUrl={project.websiteUrl}
                        dataLoading={dataLoading}
                        searchParams={searchParams}
                        allowedToManage={allowedToManage}
                        className='pointer-events-auto z-20 hidden md:flex'
                      />
                      {isMobileSidebarOpen ? (
                        <div className='pointer-events-auto'>
                          <ProjectSidebar
                            tabs={tabs}
                            activeTab={activeTab}
                            onTabChange={setDashboardTab}
                            projectId={id}
                            projectName={project.name}
                            websiteUrl={project.websiteUrl}
                            dataLoading={dataLoading}
                            searchParams={searchParams}
                            allowedToManage={allowedToManage}
                            isMobileOpen={isMobileSidebarOpen}
                            onMobileClose={closeMobileSidebar}
                          />
                        </div>
                      ) : null}
                      {/* Main Content */}
                      <div
                        className={cx(
                          'pointer-events-auto flex min-w-0 flex-1 flex-col',
                          isMapFullscreen ? 'pointer-events-none' : 'pointer-events-auto',
                        )}
                        ref={dashboardRef}
                      >
                        <EventsRunningOutBanner />
                        <div className='pointer-events-auto'>
                          <MobileSidebarTrigger onClick={openMobileSidebar} activeTabLabel={activeTabLabel} />
                        </div>
                        <AnimatePresence mode='wait'>
                          <motion.div
                            key={activeTab}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                          >
                            {activeTab === PROJECT_TABS.ai ? <AskAIView projectId={id} /> : null}
                            {activeTab === PROJECT_TABS.traffic ? (
                              <TrafficView
                                tnMapping={tnMapping}
                                customMetrics={customMetrics}
                                onRemoveCustomMetric={onRemoveCustomMetric}
                                resetCustomMetrics={resetCustomMetrics}
                                mode={mode}
                                projectViews={projectViews}
                                projectViewsLoading={projectViewsLoading}
                                loadProjectViews={loadProjectViews}
                                setProjectViewToUpdate={setProjectViewToUpdate}
                                setIsAddAViewOpened={setIsAddAViewOpened}
                                onCustomMetric={onCustomMetric}
                              />
                            ) : null}
                            {activeTab === PROJECT_TABS.performance ? <PerformanceView tnMapping={tnMapping} /> : null}
                            {activeTab === PROJECT_TABS.funnels ? <FunnelsView /> : null}
                            {activeTab === PROJECT_TABS.alerts ? <ProjectAlertsView /> : null}
                            {activeTab === PROJECT_TABS.profiles ? <ProfilesView tnMapping={tnMapping} /> : null}
                            {activeTab === PROJECT_TABS.sessions ? (
                              <SessionsView tnMapping={tnMapping} rotateXAxis={rotateXAxis} />
                            ) : null}
                            {activeTab === PROJECT_TABS.errors ? <ErrorsView /> : null}
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
                            {activeTab === PROJECT_TABS.captcha ? <CaptchaView projectId={id} /> : null}
                          </motion.div>
                        </AnimatePresence>

                        {isEmbedded ? null : (
                          <>
                            <div className='flex-1' />
                            <div className='pointer-events-auto mt-4 flex w-full items-center justify-between gap-2'>
                              <Dropdown
                                items={whitelist}
                                buttonClassName='relative rounded-md border border-transparent bg-gray-50 p-2 hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden ring-inset dark:bg-slate-900 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200 inline-flex items-center [&>svg]:w-4 [&>svg]:h-4 [&>svg]:mr-0 [&>svg]:ml-1 font-medium !text-sm text-slate-900 dark:text-gray-50'
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
                                  className='relative rounded-md border border-transparent bg-gray-50 p-2 transition-colors ring-inset hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:bg-slate-900 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200'
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
                                  buttonClassName='relative rounded-md border border-transparent bg-gray-50 p-2 md:px-2 hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden ring-inset dark:bg-slate-900 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200'
                                  menuItemsClassName='top-5'
                                  selectItemClassName='font-semibold'
                                />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {isEmbedded ? null : <Footer showDBIPMessage />}
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
            </>
          </RefreshTriggersContext.Provider>
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

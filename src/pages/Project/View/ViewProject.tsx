/* eslint-disable react/forbid-prop-types, react/no-unstable-nested-components, react/display-name */
import React, {
  useState, useEffect, useMemo, memo, useRef, Fragment, useCallback,
} from 'react'
import useSize from 'hooks/useSize'
import { useHistory, useParams, Link } from 'react-router-dom'
// @ts-ignore
import domToImage from 'dom-to-image'
// @ts-ignore
import { saveAs } from 'file-saver'
import bb from 'billboard.js'
import {
  ArrowDownTrayIcon, Cog8ToothIcon, ArrowPathIcon, ChartBarIcon, BoltIcon, BellIcon,
  PresentationChartBarIcon, PresentationChartLineIcon, NoSymbolIcon,
} from '@heroicons/react/24/outline'
import cx from 'clsx'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import _includes from 'lodash/includes'
import _last from 'lodash/last'
import _isEmpty from 'lodash/isEmpty'
import _replace from 'lodash/replace'
import _find from 'lodash/find'
import _filter from 'lodash/filter'
import _findIndex from 'lodash/findIndex'
import _startsWith from 'lodash/startsWith'
import _debounce from 'lodash/debounce'
import _some from 'lodash/some'
import _pickBy from 'lodash/pickBy'
import _every from 'lodash/every'
import _size from 'lodash/size'
import _truncate from 'lodash/truncate'
import PropTypes from 'prop-types'
import * as SwetrixSDK from '@swetrix/sdk'

import { withProjectProtected } from 'hoc/projectProtected'

import { getTimeFromSeconds, getStringFromTime } from 'utils/generic'
import { getItem, setItem } from 'utils/localstorage'
import Title from 'components/Title'
import EventsRunningOutBanner from 'components/EventsRunningOutBanner'
import {
  tbPeriodPairs, getProjectCacheKey, LIVE_VISITORS_UPDATE_INTERVAL, DEFAULT_TIMEZONE, CDN_URL, isDevelopment,
  timeBucketToDays, getProjectCacheCustomKey, roleViewer, MAX_MONTHS_IN_PAST, PROJECT_TABS,
  TimeFormat, getProjectForcastCacheKey, chartTypes, roleAdmin, TRAFFIC_PANELS_ORDER, PERFORMANCE_PANELS_ORDER, isSelfhosted,
  PROJECTS_PROTECTED_PASSWORD,
} from 'redux/constants'
import { IUser } from 'redux/models/IUser'
import { IProject, ILiveStats } from 'redux/models/IProject'
import { IProjectForShared, ISharedProject } from 'redux/models/ISharedProject'
import Button from 'ui/Button'
import Loader from 'ui/Loader'
import Dropdown from 'ui/Dropdown'
import Checkbox from 'ui/Checkbox'
import Select from 'ui/Select'
import FlatPicker from 'ui/Flatpicker'
import Robot from 'ui/icons/Robot'
import Forecast from 'modals/Forecast'
import routes from 'routes'
import {
  getProjectData, getProject, getOverallStats, getLiveVisitors, getPerfData, getProjectDataCustomEvents,
} from 'api'
import { getChartPrediction } from 'api/ai'
import {
  Panel, Overview, CustomEvents,
} from './Panels'
import {
  onCSVExportClick, getFormatDate, panelIconMapping, typeNameMapping, validFilters, validPeriods,
  validTimeBacket, noRegionPeriods, getSettings, getColumns, CHART_METRICS_MAPPING,
  CHART_METRICS_MAPPING_PERF, getSettingsPerf, transformAIChartData,
} from './ViewProject.helpers'
import CCRow from './components/CCRow'
import RefRow from './components/RefRow'
import NoEvents from './components/NoEvents'
import Filters from './components/Filters'
import ProjectAlertsView from '../Alerts/View'
import './styles.css'

const CUSTOM_EV_DROPDOWN_MAX_VISIBLE_LENGTH = 32

interface IProjectView extends IProject {
  isPublicVisitors?: boolean,
}

const ViewProject = ({
  projects, isLoading: _isLoading, showError, cache, cachePerf, setProjectCache, projectViewPrefs, setProjectViewPrefs, setPublicProject,
  setLiveStatsForProject, authenticated, timezone, user, sharedProjects, extensions, generateAlert, setProjectCachePerf,
  projectTab, setProjectTab, setProjects, setProjectForcastCache, customEventsPrefs, setCustomEventsPrefs, liveStats, passwordHash,
}: {
  projects: IProjectView[],
  extensions: any,
  isLoading: boolean,
  showError: (message: string) => void,
  cache: any,
  cachePerf: any,
  setProjectCache: (pid: string, data: any, key: string) => void,
  projectViewPrefs: {
    [key: string]: {
      period: string,
      timeBucket: string,
      rangeDate?: Date[],
    },
  } | null,
  setProjectViewPrefs: (pid: string, period: string, timeBucket: string, rangeDate?: Date[]) => void,
  setPublicProject: (project: Partial<IProject | ISharedProject>) => void,
  setLiveStatsForProject: (id: string, count: number) => void,
  generateAlert: (message: string, type: string) => void,
  setProjectCachePerf: (pid: string, data: any, key: string) => void,
  setProjectForcastCache: (pid: string, data: any, key: string) => void,
  authenticated: boolean,
  user: IUser,
  timezone: string,
  sharedProjects: ISharedProject[],
  projectTab: string,
  setProjectTab: (tab: string) => void,
  // eslint-disable-next-line no-unused-vars, no-shadow
  setProjects: (projects: Partial<IProject | ISharedProject>[]) => void,
  customEventsPrefs: any,
  setCustomEventsPrefs: (pid: string, data: any) => void,
  liveStats: ILiveStats,
  passwordHash: {
    [key: string]: string,
  },
}) => {
  const { t, i18n: { language } }: {
    t: (key: string, options?: {
      [key: string]: string | number | null,
    }) => string,
    i18n: {
      language: string,
    },
  } = useTranslation('common')
  const [periodPairs, setPeriodPairs] = useState<{
    label: string
    period: string
    tbs: string[]
    dropdownLabel?: string
    isCustomDate?: boolean
  }[]>(tbPeriodPairs(t))
  const [customExportTypes, setCustomExportTypes] = useState<any[]>([])
  const [customPanelTabs, setCustomPanelTabs] = useState<any[]>([])
  const [sdkInstance, setSdkInstance] = useState<any>(null)
  const [activeChartMetricsCustomEvents, setActiveChartMetricsCustomEvents] = useState<any[]>([])
  const dashboardRef = useRef<HTMLDivElement>(null)
  const { id }: {
    id: string
  } = useParams()
  const history = useHistory()
  const project: IProjectForShared = useMemo(() => _find([...projects, ..._map(sharedProjects, (item) => ({ ...item.project, role: item.role }))], p => p.id === id) || {} as IProjectForShared, [projects, id, sharedProjects])
  const projectPassword: string = useMemo(() => passwordHash[id] || getItem(PROJECTS_PROTECTED_PASSWORD)?.[id] || '', [id, passwordHash])
  const isSharedProject = useMemo(() => {
    const foundProject = _find([..._map(sharedProjects, (item) => item.project)], p => p.id === id)
    return !_isEmpty(foundProject)
  }, [id, sharedProjects])
  const [areFiltersParsed, setAreFiltersParsed] = useState<boolean>(false)
  const [areFiltersPerfParsed, setAreFiltersPerfParsed] = useState<boolean>(false)
  const [areTimeBucketParsed, setAreTimeBucketParsed] = useState<boolean>(false)
  const [arePeriodParsed, setArePeriodParsed] = useState<boolean>(false)
  const [panelsData, setPanelsData] = useState<any>({})
  const [isPanelsDataEmpty, setIsPanelsDataEmpty] = useState<boolean>(false)
  const [isForecastOpened, setIsForecastOpened] = useState<boolean>(false)
  const [analyticsLoading, setAnalyticsLoading] = useState<boolean>(true)
  const [period, setPeriod] = useState<string>(projectViewPrefs ? projectViewPrefs[id]?.period || periodPairs[3].period : periodPairs[3].period)
  const [timeBucket, setTimebucket] = useState<string>(projectViewPrefs ? projectViewPrefs[id]?.timeBucket || periodPairs[3].tbs[1] : periodPairs[3].tbs[1])
  const activePeriod = useMemo(() => _find(periodPairs, p => p.period === period), [period, periodPairs])
  const [chartData, setChartData] = useState<any>({})
  const [mainChart, setMainChart] = useState<any>(null)
  const [dataLoading, setDataLoading] = useState<boolean>(false)
  const [activeChartMetrics, setActiveChartMetrics] = useState<{
    [key: string]: boolean
  }>({
    [CHART_METRICS_MAPPING.unique]: true,
    [CHART_METRICS_MAPPING.views]: false,
    [CHART_METRICS_MAPPING.sessionDuration]: false,
    [CHART_METRICS_MAPPING.bounce]: false,
    [CHART_METRICS_MAPPING.viewsPerUnique]: false,
    [CHART_METRICS_MAPPING.trendlines]: false,
  })
  const [activeChartMetricsPerf, setActiveChartMetricsPerf] = useState<string>(CHART_METRICS_MAPPING_PERF.timing)
  const [sessionDurationAVG, setSessionDurationAVG] = useState<any>(null)
  const checkIfAllMetricsAreDisabled = useMemo(() => !_some({ ...activeChartMetrics, ...activeChartMetricsCustomEvents }, (value) => value), [activeChartMetrics, activeChartMetricsCustomEvents])
  const [filters, setFilters] = useState<any[]>([])
  const [filtersPerf, setFiltersPerf] = useState<any[]>([])
  // That is needed when using 'Export as image' feature,
  // Because headless browser cannot do a request to the DDG API due to absense of The Same Origin Policy header
  const [showIcons, setShowIcons] = useState<boolean>(true)
  const isLoading = authenticated ? _isLoading : false
  const tnMapping = typeNameMapping(t)
  const refCalendar = useRef(null)
  const localStorageDateRange = projectViewPrefs ? projectViewPrefs[id]?.rangeDate : null
  const [dateRange, setDateRange] = useState<null | Date[]>(localStorageDateRange ? [new Date(localStorageDateRange[0]), new Date(localStorageDateRange[1])] : null)
  const [activeTab, setActiveTab] = useState<string>(() => {
    // @ts-ignore
    const url = new URL(window.location)
    const { searchParams } = url
    const tab = searchParams.get('tab') as string

    if (PROJECT_TABS[tab]) {
      return tab || 'traffic'
    }

    return projectTab || PROJECT_TABS.traffic
  })

  // TODO: THIS SHOULD BE MOVED TO REDUCERS WITH CACHE FUNCTIONALITY
  // I PUT IT HERE JUST TO SEE IF IT WORKS WELL
  const [forecasedChartData, setForecasedChartData] = useState<any>({})

  const [chartDataPerf, setChartDataPerf] = useState<any>({})
  const [isPanelsDataEmptyPerf, setIsPanelsDataEmptyPerf] = useState<boolean>(false)
  const [panelsDataPerf, setPanelsDataPerf] = useState<any>({})
  const timeFormat = useMemo(() => user.timeFormat || TimeFormat['12-hour'], [user])
  const [ref, size] = useSize() as any
  const rotateXAxias = useMemo(() => (size.width > 0 && size.width < 500), [size])
  const customEventsChartData = useMemo(() => _pickBy(customEventsPrefs[id], (value, keyCustomEvents) => _includes(activeChartMetricsCustomEvents, keyCustomEvents)), [customEventsPrefs, id, activeChartMetricsCustomEvents])
  const [chartType, setChartType] = useState<string>(getItem('chartType') as string || chartTypes.line)

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

    if (isSelfhosted) {
      return selfhostedOnly
    }

    return [
      ...selfhostedOnly,
      {
        id: PROJECT_TABS.alerts,
        label: t('dashboard.alerts'),
        icon: BellIcon,
      },
    ]
  }, [t])

  const activeTabLabel = useMemo(() => _find(tabs, tab => tab.id === activeTab)?.label, [tabs, activeTab])

  const { name } = project

  const sharedRoles = useMemo(() => _find(user.sharedProjects, p => p.project.id === id)?.role || {}, [user, id])

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
        id: CHART_METRICS_MAPPING.customEvents,
        label: t('project.customEv'),
        active: activeChartMetrics[CHART_METRICS_MAPPING.customEvents],
      },
    ]
  }, [t, activeChartMetrics])

  const chartMetricsPerf = useMemo(() => {
    return [
      {
        id: CHART_METRICS_MAPPING_PERF.full,
        label: t('dashboard.timingFull'),
        active: _includes(activeChartMetricsPerf, CHART_METRICS_MAPPING_PERF.full),
      },
      {
        id: CHART_METRICS_MAPPING_PERF.timing,
        label: t('dashboard.timing'),
        active: _includes(activeChartMetricsPerf, CHART_METRICS_MAPPING_PERF.timing),
      },
      {
        id: CHART_METRICS_MAPPING_PERF.network,
        label: t('dashboard.network'),
        active: _includes(activeChartMetricsPerf, CHART_METRICS_MAPPING_PERF.network),
      },
      {
        id: CHART_METRICS_MAPPING_PERF.frontend,
        label: t('dashboard.frontend'),
        active: _includes(activeChartMetricsPerf, CHART_METRICS_MAPPING_PERF.frontend),
      },
      {
        id: CHART_METRICS_MAPPING_PERF.backend,
        label: t('dashboard.backend'),
        active: _includes(activeChartMetricsPerf, CHART_METRICS_MAPPING_PERF.backend),
      },
    ]
  }, [t, activeChartMetricsPerf])

  const chartMetricsCustomEvents = useMemo(() => {
    if (!_isEmpty(panelsData.customs)) {
      return _map(_keys(panelsData.customs), key => ({
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

  const dataNames = useMemo(() => {
    return {
      unique: t('project.unique'),
      total: t('project.total'),
      bounce: `${t('dashboard.bounceRate')} (%)`,
      viewsPerUnique: t('dashboard.viewsPerUnique'),
      trendlineTotal: t('project.trendlineTotal'),
      trendlineUnique: t('project.trendlineUnique'),
      sessionDuration: t('dashboard.sessionDuration'),
      ...dataNamesCustomEvents,
    }
  }, [t, dataNamesCustomEvents])

  const dataNamesPerf = useMemo(() => {
    return {
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
    }
  }, [t])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const switchActiveChartMetric = useCallback(_debounce((pairID) => {
    if (activeTab === PROJECT_TABS.performance) {
      setActiveChartMetricsPerf(pairID)
    } else {
      setActiveChartMetrics(prev => ({ ...prev, [pairID]: !prev[pairID] }))
    }
  }, 0), [activeTab])

  const onErrorLoading = () => {
    showError(t('project.noExist'))
    history.push(routes.dashboard)
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

      // write if customEventsChartData includes all activeChartMetricsCustomEvents return true if not false
      const isAllActiveChartMetricsCustomEvents = _every(activeChartMetricsCustomEvents, (metric) => {
        return _includes(_keys(customEventsChartData), metric)
      })

      if (!isAllActiveChartMetricsCustomEvents) {
        if (period === 'custom' && dateRange) {
          data = await getProjectDataCustomEvents(id, timeBucket, '', filters, from, to, timezone, activeChartMetricsCustomEvents)
        } else {
          data = await getProjectDataCustomEvents(id, timeBucket, period, filters, '', '', timezone, activeChartMetricsCustomEvents)
        }
      }

      const events = data?.chart ? data.chart.events : customEventsChartData

      setCustomEventsPrefs(id, events)

      const applyRegions = !_includes(noRegionPeriods, activePeriod?.period)
      const bbSettings = getSettings(chartData, timeBucket, activeChartMetrics, applyRegions, timeFormat, forecasedChartData, rotateXAxias, chartType, events)
      setMainChart(() => {
        // @ts-ignore
        const generete = bb.generate(bbSettings)
        generete.data.names(dataNames)
        return generete
      })
    } catch (e) {
      console.error('[ERROR] FAILED TO LOAD CUSTOM EVENTS', e)
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

  // this function is used for requesting the data from the API
  const loadAnalytics = async (forced = false, newFilters: any[] | null = null) => {
    if (!forced && (isLoading || _isEmpty(project) || dataLoading)) {
      return
    }

    setDataLoading(true)
    try {
      let data
      let key
      let from
      let to
      let customEventsChart = customEventsChartData

      if (dateRange) {
        from = getFormatDate(dateRange[0])
        to = getFormatDate(dateRange[1])
        key = getProjectCacheCustomKey(from, to, timeBucket)
      } else {
        key = getProjectCacheKey(period, timeBucket)
      }

      if (!forced && !_isEmpty(cache[id]) && !_isEmpty(cache[id][key])) {
        data = cache[id][key]
      } else {
        if (period === 'custom' && dateRange) {
          data = await getProjectData(id, timeBucket, '', newFilters || filters, from, to, timezone)
          customEventsChart = await getProjectDataCustomEvents(id, timeBucket, '', filters, from, to, timezone, activeChartMetricsCustomEvents)
        } else {
          data = await getProjectData(id, timeBucket, period, newFilters || filters, '', '', timezone)
          customEventsChart = await getProjectDataCustomEvents(id, timeBucket, period, filters, '', '', timezone, activeChartMetricsCustomEvents)
        }

        customEventsChart = customEventsChart?.chart ? customEventsChart.chart.events : customEventsChartData

        setCustomEventsPrefs(id, customEventsChart)

        setProjectCache(id, data || {}, key)
      }

      const sdkData = {
        ...(data || {}),
        filters: newFilters || filters,
        timezone,
        timeBucket,
        period,
        from,
        to,
      }

      if (_isEmpty(data)) {
        setAnalyticsLoading(false)
        setDataLoading(false)
        setIsPanelsDataEmpty(true)
        sdkInstance?._emitEvent('load', sdkData)
        return
      }

      const {
        chart, params, customs, appliedFilters, avgSdur,
      } = data
      sdkInstance?._emitEvent('load', sdkData)
      const processedSdur = getTimeFromSeconds(avgSdur)

      setSessionDurationAVG(getStringFromTime(processedSdur))

      if (!_isEmpty(appliedFilters)) {
        setFilters(appliedFilters)
      }

      if (_isEmpty(params)) {
        setIsPanelsDataEmpty(true)
      } else {
        const applyRegions = !_includes(noRegionPeriods, activePeriod?.period)
        const bbSettings = getSettings(chart, timeBucket, activeChartMetrics, applyRegions, timeFormat, forecasedChartData, rotateXAxias, chartType, customEventsChart)
        setChartData(chart)

        setPanelsData({
          types: _keys(params),
          data: params,
          customs,
        })

        if (activeTab === PROJECT_TABS.traffic) {
          setMainChart(() => {
            // @ts-ignore
            const generete = bb.generate(bbSettings)
            generete.data.names(dataNames)
            return generete
          })
        }

        setIsPanelsDataEmpty(false)
      }

      setAnalyticsLoading(false)
      setDataLoading(false)
    } catch (e) {
      setAnalyticsLoading(false)
      setDataLoading(false)
      console.error('[ERROR](loadAnalytics) Loading analytics data failed')
      console.error(e)
    }
  }

  const loadAnalyticsPerf = async (forced = false, newFilters: any[] | null = null) => {
    if (!forced && (isLoading || _isEmpty(project) || dataLoading)) {
      return
    }

    setDataLoading(true)
    try {
      let dataPerf
      let key
      let from
      let to

      if (dateRange) {
        from = getFormatDate(dateRange[0])
        to = getFormatDate(dateRange[1])
        key = getProjectCacheCustomKey(from, to, timeBucket)
      } else {
        key = getProjectCacheKey(period, timeBucket)
      }

      if (!forced && !_isEmpty(cachePerf[id]) && !_isEmpty(cachePerf[id][key])) {
        dataPerf = cachePerf[id][key]
      } else {
        if (period === 'custom' && dateRange) {
          dataPerf = await getPerfData(id, timeBucket, '', newFilters || filtersPerf, from, to, timezone)
        } else {
          dataPerf = await getPerfData(id, timeBucket, period, newFilters || filtersPerf, '', '', timezone)
        }

        setProjectCachePerf(id, dataPerf || {}, key)
      }

      const {
        appliedFilters,
      } = dataPerf

      if (!_isEmpty(appliedFilters)) {
        setFilters(appliedFilters)
      }

      if (_isEmpty(dataPerf)) {
        setIsPanelsDataEmptyPerf(true)
        setDataLoading(false)
        setAnalyticsLoading(false)
        return
      }

      if (_isEmpty(dataPerf.params)) {
        setIsPanelsDataEmptyPerf(true)
      } else {
        const { chart: chartPerf } = dataPerf
        const bbSettings = getSettingsPerf(chartPerf, timeBucket, activeChartMetricsPerf, rotateXAxias, chartType)
        setChartDataPerf(chartPerf)

        setPanelsDataPerf({
          types: _keys(dataPerf.params),
          data: dataPerf.params,
        })

        if (activeTab === PROJECT_TABS.performance) {
          setMainChart(() => {
            // @ts-ignore
            const generete = bb.generate(bbSettings)
            generete.data.names(dataNamesPerf)
            return generete
          })
        }

        setIsPanelsDataEmptyPerf(false)
      }

      setAnalyticsLoading(false)
      setDataLoading(false)
    } catch (e) {
      setAnalyticsLoading(false)
      setDataLoading(false)
      console.error('[ERROR](loadAnalytics) Loading analytics data failed')
      console.error(e)
    }
  }

  // this funtion is used for requesting the data from the API when the filter is changed
  const filterHandler = (column: string, filter: any, isExclusive = false) => {
    let newFilters
    let newFiltersPerf
    const columnPerf = `${column}_perf`

    if (activeTab === PROJECT_TABS.performance) {
      if (_find(filtersPerf, (f) => f.column === column)) {
        newFiltersPerf = _filter(filtersPerf, (f) => f.column !== column)

        // @ts-ignore
        const url = new URL(window.location)
        url.searchParams.delete(columnPerf)
        const { pathname, search } = url
        history.push({
          pathname,
          search,
          state: {
            scrollToTopDisable: true,
          },
        })
        setFiltersPerf(newFiltersPerf)
      } else {
        newFiltersPerf = [
          ...filtersPerf,
          { column, filter, isExclusive },
        ]

        // @ts-ignore
        const url = new URL(window.location)
        url.searchParams.append(columnPerf, filter)
        const { pathname, search } = url
        history.push({
          pathname,
          search,
          state: {
            scrollToTopDisable: true,
          },
        })
        setFiltersPerf(newFiltersPerf)
      }
    } else {
      // eslint-disable-next-line no-lonely-if
      if (_find(filters, (f) => f.column === column) /* && f.filter === filter) */) {
        // selected filter is already included into the filters array -> removing it
        // removing filter from the state
        newFilters = _filter(filters, (f) => f.column !== column)
        setFilters(newFilters)

        // removing filter from the page URL

        // @ts-ignore
        const url = new URL(window.location)
        url.searchParams.delete(column)
        const { pathname, search } = url
        history.push({
          pathname,
          search,
          state: {
            scrollToTopDisable: true,
          },
        })
      } else {
        // selected filter is not present in the filters array -> applying it
        // sroting filter in the state
        newFilters = [
          ...filters,
          { column, filter, isExclusive },
        ]
        setFilters(newFilters)

        // storing filter in the page URL

        // @ts-ignore
        const url = new URL(window.location)
        url.searchParams.append(column, filter)
        const { pathname, search } = url
        history.push({
          pathname,
          search,
          state: {
            scrollToTopDisable: true,
          },
        })
      }
    }

    sdkInstance?._emitEvent('filtersupdate', newFilters)
    if (activeTab === PROJECT_TABS.performance) {
      loadAnalyticsPerf(true, newFiltersPerf)
    } else {
      loadAnalytics(true, newFilters)
    }
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
    history.push({
      pathname,
      search,
      state: {
        scrollToTopDisable: true,
      },
    })
    sdkInstance?._emitEvent('filtersupdate', newFilters)
  }

  const refreshStats = () => {
    if (!isLoading && !dataLoading) {
      if (activeTab === PROJECT_TABS.performance) {
        loadAnalyticsPerf(true)
      } else {
        loadAnalytics(true)
      }
    }
  }

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

  const onForecastSubmit = async (periodToForecast: string) => {
    setIsForecastOpened(false)
    setDataLoading(true)
    const key = getProjectForcastCacheKey(period, timeBucket, periodToForecast)
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
  }, [forecasedChartData])

  useEffect(() => {
    // @ts-ignore
    const url = new URL(window.location)
    url.searchParams.delete('tab')

    url.searchParams.append('tab', activeTab)
    const { pathname, search } = url
    history.push({
      pathname,
      search,
      state: {
        scrollToTopDisable: true,
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  useEffect(() => {
    if (activeTab === PROJECT_TABS.traffic) {
      if (!isLoading && !_isEmpty(chartData) && !_isEmpty(mainChart)) {
        if (activeChartMetrics.views || activeChartMetrics.unique || activeChartMetrics.viewsPerUnique || activeChartMetrics.trendlines) {
          mainChart.load({
            columns: getColumns(chartData, activeChartMetrics),
          })
        }

        if (activeChartMetrics.bounce || activeChartMetrics.sessionDuration || activeChartMetrics.views || activeChartMetrics.unique || !activeChartMetrics.bounce || !activeChartMetrics.sessionDuration) {
          const applyRegions = !_includes(noRegionPeriods, activePeriod?.period)
          const bbSettings = getSettings(chartData, timeBucket, activeChartMetrics, applyRegions, timeFormat, forecasedChartData, rotateXAxias, chartType, customEventsChartData)

          setMainChart(() => {
            // @ts-ignore
            const generete = bb.generate(bbSettings)
            generete.data.names(dataNames)
            return generete
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
      const bbSettings = getSettingsPerf(chartDataPerf, timeBucket, activeChartMetricsPerf, rotateXAxias, chartType)

      setMainChart(() => {
        // @ts-ignore
        const generete = bb.generate(bbSettings)
        generete.data.names(dataNamesPerf)
        return generete
      })
    }
  }, [isLoading, activeChartMetrics, chartData, chartDataPerf, activeChartMetricsPerf]) // eslint-disable-line

  // Initialising Swetrix SDK instance
  useEffect(() => {
    let sdk: any | null = null
    if (!_isEmpty(extensions)) {
      const processedExtensions = _map(extensions, (ext) => {
        const { id: extId, fileURL } = ext
        return {
          id: extId,
          cdnURL: `${CDN_URL}file/${fileURL}`,
        }
      })

      // @ts-ignore
      sdk = new SwetrixSDK(processedExtensions, {
        debug: isDevelopment,
      }, {
        onAddExportDataRow: (label: any, onClick: (e: any) => void) => {
          setCustomExportTypes((prev) => [
            ...prev,
            {
              label,
              onClick,
            },
          ])
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
        onRemovePanelTab: (extensionID: string, panelID: string) => {
          setCustomPanelTabs((prev) => _filter(prev, (row) => row.extensionID !== extensionID && row.panelID !== panelID))
        },
      })
      setSdkInstance(sdk)
    }

    return () => {
      if (sdk) {
        sdk._destroy()
      }
    }
  }, [extensions])

  // Supplying 'timeupdate' event to the SDK after loading
  useEffect(() => {
    sdkInstance?._emitEvent('timeupdate', {
      period,
      timeBucket,
      dateRange: period === 'custom' ? dateRange : null,
    })
  }, [sdkInstance]) // eslint-disable-line

  // Supplying 'projectinfo' event to the SDK after loading
  useEffect(() => {
    if (_isEmpty(project)) {
      return
    }

    const {
      active: isActive, created, public: isPublic,
    } = project

    sdkInstance?._emitEvent('projectinfo', {
      id, name, isActive, created, isPublic,
    })
  }, [sdkInstance, name]) // eslint-disable-line

  useEffect(() => {
    setPeriodPairs(tbPeriodPairs(t))
  }, [t])

  // Parsing initial filters from the address bar
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
          history.push({
            pathname,
            search,
            state: {
              scrollToTopDisable: true,
            },
          })
          setTimebucket(eventEmitTimeBucket)
        }

        url.searchParams.delete('period')
        url.searchParams.delete('from')
        url.searchParams.delete('to')
        url.searchParams.append('period', 'custom')
        url.searchParams.append('from', dates[0].toISOString())
        url.searchParams.append('to', dates[1].toISOString())

        const { pathname, search } = url
        history.push({
          pathname,
          search,
          state: {
            scrollToTopDisable: true,
          },
        })

        setPeriodPairs(tbPeriodPairs(t, timeBucketToDays[index].tb, dates))
        setPeriod('custom')
        setProjectViewPrefs(id, 'custom', timeBucketToDays[index].tb[0], dates)

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
    if (areFiltersParsed && areTimeBucketParsed && arePeriodParsed) {
      if (activeTab === PROJECT_TABS.traffic) {
        loadAnalytics()
      }
    }
    if (areFiltersPerfParsed) {
      if (activeTab === PROJECT_TABS.performance) {
        loadAnalyticsPerf()
      }
    }
  }, [project, period, timeBucket, periodPairs, areFiltersParsed, areTimeBucketParsed, arePeriodParsed, t, activeTab, areFiltersPerfParsed]) // eslint-disable-line

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
      const result = await getLiveVisitors([pid])

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

  useEffect(() => {
    if (!isLoading && _isEmpty(project)) {
      getProject(id)
        .then(projectRes => {
          if (!_isEmpty(projectRes)) {
            if (projectRes.isPublic && !projectRes.isOwner) {
              getOverallStats([id])
                .then(res => {
                  setPublicProject({
                    ...projectRes,
                    overall: res[id],
                    isPublicVisitors: true,
                  })
                })
                .catch(e => {
                  console.error(e)
                  onErrorLoading()
                })
            } else {
              getOverallStats([id])
                .then(res => {
                  setProjects([...(projects as any[]), {
                    ...projectRes,
                    overall: res[id],
                  }])
                })
                .then(() => {
                  return getLiveVisitors([id])
                })
                .then(res => {
                  setLiveStatsForProject(id, res[id])
                })
                .catch(e => {
                  console.error(e)
                  onErrorLoading()
                })
            }
          } else {
            onErrorLoading()
          }
        })
        .catch(e => {
          console.error(e)
          onErrorLoading()
        })
    }
  }, [isLoading, project, id, setPublicProject]) // eslint-disable-line

  const updatePeriod = (newPeriod: {
    period: string
    label?: string
  }) => {
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
      setDateRange(null)
    }
    const { pathname, search } = url
    history.push({
      pathname,
      search,
      state: {
        scrollToTopDisable: true,
      },
    })
    sdkInstance?._emitEvent('timeupdate', {
      period: newPeriod.period,
      timeBucket: tb,
      dateRange: newPeriod.period === 'custom' ? dateRange : null,
    })
    setForecasedChartData({})
  }

  const updateTimebucket = (newTimebucket: string) => {
    // @ts-ignore
    const url = new URL(window.location)
    url.searchParams.delete('timeBucket')
    url.searchParams.append('timeBucket', newTimebucket)
    const { pathname, search } = url
    history.push({
      pathname,
      search,
      state: {
        scrollToTopDisable: true,
      },
    })
    setTimebucket(newTimebucket)
    setProjectViewPrefs(id, period, newTimebucket, dateRange as Date[])
    sdkInstance?._emitEvent('timeupdate', {
      period,
      timeBucket: newTimebucket,
      dateRange,
    })
    setForecasedChartData({})
  }

  const openSettingsHandler = () => {
    history.push(_replace(routes.project_settings, ':id', id))
  }

  const exportAsImageHandler = async () => {
    setShowIcons(false)
    try {
      const blob = await domToImage.toBlob(dashboardRef.current)
      saveAs(blob, `swetrix-${dayjs().format('YYYY-MM-DD-HH-mm-ss')}.png`)
    } catch (e) {
      showError(t('project.exportImgError'))
      console.error('[ERROR] Error while generating export image.')
      console.error(e)
    } finally {
      setShowIcons(true)
    }
  }

  useEffect(() => {
    try {
      // @ts-ignore
      const url = new URL(window.location)
      const { searchParams } = url
      const intialPeriod = projectViewPrefs ? searchParams.get('period') || projectViewPrefs[id]?.period : searchParams.get('period') || '7d'
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

      setPeriodPairs(tbPeriodPairs(t))
      setDateRange(null)
      updatePeriod({
        period: intialPeriod,
      })
    } finally {
      setArePeriodParsed(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isConflicted = (conflicts: string[]) => {
    const conflicted = conflicts && _some(conflicts, (conflict) => {
      const conflictPair = _find(chartMetrics, (metric) => metric.id === conflict)
      return conflictPair && conflictPair.active
    })
    return conflicted
  }

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
    history.push({
      pathname,
      search,
      state: {
        scrollToTopDisable: true,
      },
    })
    setFilters([])
    setFiltersPerf([])
    if (activeTab === PROJECT_TABS.performance) {
      loadAnalyticsPerf(true, [])
    } else {
      loadAnalytics(true, [])
    }
  }

  const exportTypes = [
    { label: t('project.asImage'), onClick: exportAsImageHandler },
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

  // useEffect to change chart if we change chart type
  useEffect(() => {
    if (activeTab === PROJECT_TABS.performance) {
      loadAnalyticsPerf()
    } else {
      loadAnalytics()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartType])

  if (!isLoading) {
    return (
      <Title title={name}>
        <EventsRunningOutBanner />
        <div ref={ref} className='bg-gray-50 dark:bg-slate-900'>
          <div
            className={cx(
              'max-w-[1584px] w-full mx-auto py-6 px-2 sm:px-4 lg:px-8',
              {
                'min-h-min-footer': authenticated || activeTab === PROJECT_TABS.alerts,
                'min-h-min-footer-ad': !authenticated && activeTab !== PROJECT_TABS.alerts,
              },
            )}
            ref={dashboardRef}
          >
            {/* Tabs selector */}
            <div>
              <div className='sm:hidden'>
                <Select
                  items={tabs}
                  keyExtractor={(item) => item.id}
                  labelExtractor={(item) => item.label}
                  onSelect={(label) => {
                    const selected = _find(tabs, (tab) => tab.label === label)
                    if (selected) {
                      setProjectTab(selected?.id)
                      setActiveTab(selected?.id)
                    }
                  }}
                  title={activeTabLabel}
                />
              </div>
              <div className='hidden sm:block'>
                <div>
                  <nav className='-mb-px flex space-x-4' aria-label='Tabs'>
                    {_map(tabs, tab => {
                      const isCurrent = tab.id === activeTab

                      return (
                        <div
                          key={tab.id}
                          onClick={() => {
                            setProjectTab(tab.id)
                            setActiveTab(tab.id)
                          }}
                          className={cx(
                            isCurrent
                              ? 'border-indigo-700 text-indigo-700 dark:text-gray-50 dark:border-gray-50'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:border-gray-300 dark:hover:text-gray-300',
                            'group inline-flex items-center whitespace-nowrap py-2 px-1 border-b-2 font-bold text-md cursor-pointer',
                          )}
                          aria-current={isCurrent ? 'page' : undefined}
                        >
                          <tab.icon
                            className={cx(
                              isCurrent ? 'text-indigo-700 dark:text-gray-50' : 'text-gray-500 group-hover:text-gray-500 dark:text-gray-400 dark:group-hover:text-gray-300',
                              '-ml-0.5 mr-2 h-5 w-5',
                            )}
                            aria-hidden='true'
                          />
                          <span>
                            {tab.label}
                          </span>
                        </div>
                      )
                    })}
                  </nav>
                </div>
              </div>
            </div>
            {activeTab !== PROJECT_TABS.alerts && (
              <>
                <div className='flex flex-col md:flex-row items-center md:items-start justify-between mt-2'>
                  <h2 className='text-3xl font-bold text-gray-900 dark:text-gray-50 break-words break-all'>
                    {name}
                  </h2>
                  <div className='flex mt-3 md:mt-0 max-w-[420px] flex-wrap sm:flex-nowrap items-center sm:max-w-none justify-center sm:justify-between w-full sm:w-auto mx-auto sm:mx-0 custom-space-x-style'>
                    <div className='md:border-r border-gray-200 dark:border-gray-600 md:pr-3 sm:mr-3'>
                      <button
                        type='button'
                        onClick={refreshStats}
                        className={cx('relative shadow-sm rounded-md mt-[1px] px-3 md:px-4 py-2 bg-white text-sm font-medium hover:bg-gray-50 dark:bg-slate-800 dark:hover:bg-slate-700 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:dark:ring-gray-200 focus:dark:border-gray-200', {
                          'cursor-not-allowed opacity-50': isLoading || dataLoading,
                        })}
                      >
                        <ArrowPathIcon className='w-5 h-5 text-gray-700 dark:text-gray-50' />
                      </button>
                    </div>
                    {!isSelfhosted && (
                      <div
                        className={cx('md:border-r border-gray-200 dark:border-gray-600 md:pr-3 sm:mr-3', {
                          hidden: activeTab !== PROJECT_TABS.traffic || _isEmpty(chartData),
                        })}
                      >
                        <button
                          type='button'
                          onClick={onForecastOpen}
                          disabled={!_isEmpty(filters)}
                          className={cx('relative shadow-sm rounded-md mt-[1px] px-3 md:px-4 py-2 bg-white text-sm font-medium hover:bg-gray-50 dark:bg-slate-800 dark:hover:bg-slate-700 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:dark:ring-gray-200 focus:dark:border-gray-200', {
                            'cursor-not-allowed opacity-50': isLoading || dataLoading || !_isEmpty(filters),
                            '!bg-gray-200 dark:!bg-gray-600 !border dark:!border-gray-500 !border-gray-300': !_isEmpty(forecasedChartData),
                          })}
                        >
                          <Robot containerClassName='w-5 h-5' className='text-gray-700 dark:text-gray-50' />
                        </button>
                      </div>
                    )}
                    <div className='md:border-r border-gray-200 dark:border-gray-600 md:pr-3 sm:mr-3'>
                      <span className='relative z-0 inline-flex shadow-sm rounded-md'>
                        {_map(activePeriod?.tbs, (tb, index, { length }) => (
                          <button
                            key={tb}
                            type='button'
                            onClick={() => updateTimebucket(tb)}
                            className={cx(
                              'relative capitalize inline-flex items-center px-3 md:px-4 py-2 border bg-white text-sm font-medium hover:bg-gray-50 dark:bg-slate-800 dark:hover:bg-slate-700 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:dark:ring-gray-200 focus:dark:border-gray-200',
                              {
                                '-ml-px': index > 0,
                                'rounded-l-md': index === 0,
                                'rounded-r-md': 1 + index === length,
                                'z-10 border-indigo-500 text-indigo-600 dark:border-slate-200 dark:text-gray-50': timeBucket === tb,
                                'text-gray-700 dark:text-gray-50 border-gray-300 dark:border-slate-800 ': timeBucket !== tb,
                              },
                            )}
                          >
                            {t(`project.${tb}`)}
                          </button>
                        ))}
                      </span>
                    </div>
                    <Dropdown
                      items={periodPairs}
                      title={activePeriod?.label}
                      labelExtractor={(pair) => pair.dropdownLabel || pair.label}
                      keyExtractor={(pair) => pair.label}
                      onSelect={(pair) => {
                        if (pair.isCustomDate) {
                          setTimeout(() => {
                            // @ts-ignore
                            refCalendar.current.openCalendar()
                          }, 100)
                        } else {
                          setPeriodPairs(tbPeriodPairs(t))
                          setDateRange(null)
                          updatePeriod(pair)
                        }
                      }}
                    />
                    <FlatPicker
                      ref={refCalendar}
                      onChange={(date) => setDateRange(date)}
                      value={dateRange || []}
                      maxDateMonths={MAX_MONTHS_IN_PAST}
                    />
                  </div>
                </div>
                <div>
                  <div className='flex flex-row flex-wrap items-center justify-center md:justify-end h-10 mt-2 md:mt-5 mb-4'>
                    {activeTab === PROJECT_TABS.traffic ? (
                      !isPanelsDataEmpty && (
                        <Dropdown
                          items={chartMetrics}
                          title={t('project.metricVis')}
                          labelExtractor={(pair) => {
                            const {
                              label, id: pairID, active, conflicts,
                            } = pair

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
                                      label={_size(event.label) > CUSTOM_EV_DROPDOWN_MAX_VISIBLE_LENGTH ? (
                                        <span title={event.label}>
                                          {_truncate(event.label, { length: CUSTOM_EV_DROPDOWN_MAX_VISIBLE_LENGTH })}
                                        </span>
                                      ) : event.label}
                                      id={event.id}
                                      onChange={() => { }}
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
                        />
                      )) : (
                      !isPanelsDataEmptyPerf && (
                        <Dropdown
                          items={chartMetricsPerf}
                          className='min-w-[170px] xs:min-w-0'
                          title={(
                            <p>
                              {_find(chartMetricsPerf, ({ id: chartId }) => chartId === activeChartMetricsPerf)?.label}
                            </p>
                          )}
                          labelExtractor={(pair) => {
                            const {
                              label,
                            } = pair

                            return label
                          }}
                          keyExtractor={(pair) => pair.id}
                          onSelect={({ id: pairID }) => {
                            switchActiveChartMetric(pairID)
                          }}
                        />
                      )
                    )}
                    <Dropdown
                      items={[...exportTypes, ...customExportTypes]}
                      title={[
                        <ArrowDownTrayIcon key='download-icon' className='w-5 h-5 mr-2' />,
                        <Fragment key='export-data'>
                          {t('project.exportData')}
                        </Fragment>,
                      ]}
                      labelExtractor={item => item.label}
                      keyExtractor={item => item.label}
                      onSelect={item => item.onClick(panelsData, t)}
                      className={cx('ml-3', { hidden: isPanelsDataEmpty || analyticsLoading })}
                    />
                    {(!project?.isPublicVisitors && !(sharedRoles === roleViewer.role)) && (
                      <Button
                        onClick={openSettingsHandler}
                        className='relative flex justify-center items-center !pr-3 pl-2 py-2 md:pr-4 ml-3 text-sm dark:text-gray-50 dark:border-gray-800 dark:bg-slate-800 dark:hover:bg-slate-700'
                        secondary
                      >
                        <>
                          <Cog8ToothIcon className='w-5 h-5 mr-1' />
                          {t('common.settings')}
                        </>
                      </Button>
                    )}
                  </div>
                </div>
                <div
                  className={cx({
                    hidden: isPanelsDataEmpty || analyticsLoading,
                  })}
                >
                  <div className={cx('xs:mt-0', {
                    'mt-14': project.public || (isSharedProject && project?.role === roleAdmin.role) || project.isOwner,
                  })}
                  />
                  <div className={cx('relative', {
                    hidden: checkIfAllMetricsAreDisabled,
                  })}
                  >
                    <div className={cx('absolute right-0 z-10 -top-2 max-sm:top-6 space-x-2', {
                      'right-[90px]': activeChartMetrics[CHART_METRICS_MAPPING.sessionDuration],
                      'right-[60px]': activeChartMetrics[CHART_METRICS_MAPPING.bounce],
                    })}
                    >
                      <button
                        type='button'
                        onClick={() => setChartTypeOnClick(chartTypes.bar)}
                        className={cx('px-2.5 py-1.5 text-xs rounded-md text-gray-700 bg-white hover:bg-gray-50 border-transparent !border-0 dark:text-gray-50 dark:bg-slate-800 dark:hover:bg-slate-700 focus:outline-none focus:!ring-0 focus:!ring-offset-0 focus:!ring-transparent', {
                          'text-indigo-600 dark:text-indigo-500 shadow-md': chartType === chartTypes.bar,
                          'text-gray-400 dark:text-gray-500': chartType !== chartTypes.bar,
                        })}
                      >
                        <PresentationChartBarIcon className='w-6 h-6' />
                      </button>
                      <button
                        type='button'
                        onClick={() => setChartTypeOnClick(chartTypes.line)}
                        className={cx('px-2.5 py-1.5 text-xs rounded-md text-gray-700 bg-white hover:bg-gray-50 border-transparent !border-0 dark:text-gray-50 dark:bg-slate-800 dark:hover:bg-slate-700 focus:!outline-0 focus:!ring-0 focus:!ring-offset-0 focus:!ring-transparent', {
                          'text-indigo-600 dark:text-indigo-500 shadow-md': chartType === chartTypes.line,
                          'text-gray-400 dark:text-gray-500': chartType !== chartTypes.line,
                        })}
                      >
                        <PresentationChartLineIcon className='w-6 h-6' />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
            {(activeTab === PROJECT_TABS.alerts && (isSharedProject || project?.isPublicVisitors || !authenticated)) && (
              <div className='p-5 mt-5 bg-gray-700 rounded-xl'>
                <div className='flex items-center text-gray-50'>
                  <BellIcon className='w-8 h-8 mr-2' />
                  <p className='font-bold text-3xl'>
                    {t('dashboard.alerts')}
                  </p>
                </div>
                <p className='text-lg whitespace-pre-wrap mt-2 text-gray-100'>
                  {t('dashboard.alertsDesc')}
                </p>
                <Link to={routes.signup} className='inline-block select-none mt-6 bg-white py-2 px-3 md:px-4 border border-transparent rounded-md text-base font-medium text-gray-700 hover:bg-indigo-50' aria-label={t('titles.signup')}>
                  {t('common.getStarted')}
                </Link>
              </div>
            )}
            {(activeTab === PROJECT_TABS.alerts && !isSharedProject && !project?.isPublicVisitors && authenticated) && (
              <ProjectAlertsView projectId={id} />
            )}
            {(analyticsLoading && activeTab !== PROJECT_TABS.alerts) && (
              <Loader />
            )}
            {(isPanelsDataEmpty && activeTab === PROJECT_TABS.traffic) && (
              <NoEvents filters={filters} resetFilters={resetFilters} />
            )}
            {(isPanelsDataEmptyPerf && activeTab === PROJECT_TABS.performance) && (
              <NoEvents filters={filters} resetFilters={resetFilters} />
            )}
            {activeTab === PROJECT_TABS.traffic && (
              <div className={cx('pt-4 md:pt-0', { hidden: isPanelsDataEmpty || analyticsLoading })}>
                <div
                  className={cx('h-80', {
                    hidden: checkIfAllMetricsAreDisabled,
                  })}
                >
                  <div className='h-80 mt-8' id='dataChart' />
                </div>
                <Filters
                  filters={filters}
                  onRemoveFilter={filterHandler}
                  onChangeExclusive={onChangeExclusive}
                  tnMapping={tnMapping}
                />
                {dataLoading && (
                  <div className='loader bg-transparent static mt-4' id='loader'>
                    <div className='loader-head'>
                      <div className='first' />
                      <div className='second' />
                    </div>
                  </div>
                )}
                <div className='mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
                  {!_isEmpty(project.overall) && (
                    <Overview
                      t={t}
                      overall={project.overall}
                      chartData={chartData}
                      activePeriod={activePeriod}
                      sessionDurationAVG={sessionDurationAVG}
                      live={liveStats[id]}
                      projectId={id}
                    />
                  )}
                  {!_isEmpty(panelsData.types) && _map(TRAFFIC_PANELS_ORDER, (type: keyof typeof tnMapping) => {
                    const panelName = tnMapping[type]
                    // @ts-ignore
                    const panelIcon = panelIconMapping[type]
                    const customTabs = _filter(customPanelTabs, tab => tab.panelID === type)

                    if (type === 'cc') {
                      return (
                        <Panel
                          t={t}
                          key={type}
                          icon={panelIcon}
                          id={type}
                          onFilter={filterHandler}
                          name={panelName}
                          data={panelsData.data[type]}
                          customTabs={customTabs}
                          rowMapper={(rowName) => (
                            <CCRow rowName={rowName} language={language} />
                          )}
                        />
                      )
                    }

                    if (type === 'dv') {
                      return (
                        <Panel
                          t={t}
                          key={type}
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
                          t={t}
                          key={type}
                          icon={panelIcon}
                          id={type}
                          onFilter={filterHandler}
                          name={panelName}
                          data={panelsData.data[type]}
                          customTabs={customTabs}
                          rowMapper={(rowName) => (
                            <RefRow rowName={rowName} showIcons={showIcons} />
                          )}
                        />
                      )
                    }

                    if (type === 'so' || type === 'me' || type === 'ca') {
                      return (
                        <Panel
                          t={t}
                          key={type}
                          icon={panelIcon}
                          id={type}
                          onFilter={filterHandler}
                          name={panelName}
                          data={panelsData.data[type]}
                          customTabs={customTabs}
                          rowMapper={(row) => decodeURIComponent(row)}
                        />
                      )
                    }

                    if (type === 'pg') {
                      return (
                        <Panel
                          t={t}
                          key={type}
                          icon={panelIcon}
                          id={type}
                          onFilter={filterHandler}
                          name={panelName}
                          data={panelsData.data[type]}
                          customTabs={customTabs}
                          period={period}
                          pid={id}
                          timeBucket={timeBucket}
                          from={dateRange ? getFormatDate(dateRange[0]) : null}
                          to={dateRange ? getFormatDate(dateRange[1]) : null}
                          timezone={timezone}
                        />
                      )
                    }

                    return (
                      <Panel
                        t={t}
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
                  {!_isEmpty(panelsData.customs) && (
                    <CustomEvents
                      t={t}
                      customs={panelsData.customs}
                      onFilter={filterHandler}
                      chartData={chartData}
                    />
                  )}
                </div>
              </div>
            )}
            {activeTab === PROJECT_TABS.performance && (
              <div className={cx('pt-8 md:pt-4', { hidden: isPanelsDataEmptyPerf || analyticsLoading })}>
                <div
                  className={cx('h-80', {
                    hidden: checkIfAllMetricsAreDisabled,
                  })}
                >
                  <div className='h-80' id='dataChart' />
                </div>
                <Filters
                  filters={filtersPerf}
                  onRemoveFilter={filterHandler}
                  onChangeExclusive={onChangeExclusive}
                  tnMapping={tnMapping}
                />
                {dataLoading && (
                  <div className='loader bg-transparent static mt-4' id='loader'>
                    <div className='loader-head'>
                      <div className='first' />
                      <div className='second' />
                    </div>
                  </div>
                )}
                <div className='mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
                  {!_isEmpty(panelsDataPerf.types) && _map(PERFORMANCE_PANELS_ORDER, (type: keyof typeof tnMapping) => {
                    const panelName = tnMapping[type]
                    // @ts-ignore
                    const panelIcon = panelIconMapping[type]
                    const customTabs = _filter(customPanelTabs, tab => tab.panelID === type)

                    if (type === 'cc') {
                      return (
                        <Panel
                          t={t}
                          key={type}
                          icon={panelIcon}
                          id={type}
                          onFilter={filterHandler}
                          name={panelName}
                          data={panelsDataPerf.data[type]}
                          customTabs={customTabs}
                          rowMapper={(rowName) => (
                            <CCRow rowName={rowName} language={language} />
                          )}
                          valueMapper={(value) => getStringFromTime(getTimeFromSeconds(value), true)}
                        />
                      )
                    }

                    if (type === 'dv') {
                      return (
                        <Panel
                          t={t}
                          key={type}
                          icon={panelIcon}
                          id={type}
                          onFilter={filterHandler}
                          name={panelName}
                          data={panelsDataPerf.data[type]}
                          customTabs={customTabs}
                          valueMapper={(value) => getStringFromTime(getTimeFromSeconds(value), true)}
                          capitalize
                        />
                      )
                    }

                    return (
                      <Panel
                        t={t}
                        key={type}
                        icon={panelIcon}
                        id={type}
                        activeTab={activeTab}
                        onFilter={filterHandler}
                        name={panelName}
                        data={panelsDataPerf.data[type]}
                        customTabs={customTabs}
                        valueMapper={(value) => getStringFromTime(getTimeFromSeconds(value), true)}
                      />
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
        {!authenticated && activeTab !== PROJECT_TABS.alerts && (
          <div className='bg-indigo-600'>
            <div className='w-11/12 mx-auto pb-16 pt-12 px-4 sm:px-6 lg:px-8 lg:flex lg:items-center lg:justify-between'>
              <h2 className='text-3xl sm:text-4xl font-bold tracking-tight text-gray-900'>
                <span className='block text-white'>{t('project.ad')}</span>
                <span className='block text-gray-300'>
                  {t('main.exploreService')}
                </span>
              </h2>
              <div className='mt-6 space-y-4 sm:space-y-0 sm:flex sm:space-x-5'>
                <Link
                  to={routes.signup}
                  className='flex items-center justify-center px-3 py-2 border border-transparent text-lg font-medium rounded-md shadow-sm text-indigo-800 bg-indigo-50 hover:bg-indigo-100'
                  aria-label={t('titles.signup')}
                >
                  {t('common.getStarted')}
                </Link>
                <Link
                  to={routes.main}
                  className='flex items-center justify-center px-3 py-2 border border-transparent text-lg font-medium rounded-md shadow-sm text-indigo-800 bg-indigo-50 hover:bg-indigo-100'
                >
                  {t('common.explore')}
                </Link>
              </div>
            </div>
          </div>
        )}
        <Forecast
          isOpened={isForecastOpened}
          onClose={() => setIsForecastOpened(false)}
          onSubmit={onForecastSubmit}
          activeTB={t(`project.${timeBucket}`)}
          tb={timeBucket}
        />
      </Title>
    )
  }

  return (
    <Title title={name}>
      <div className='min-h-min-footer bg-gray-50 dark:bg-slate-900'>
        <Loader />
      </div>
    </Title>
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
}

ViewProject.defaultProps = {
  timezone: DEFAULT_TIMEZONE,
}

export default memo(withProjectProtected(ViewProject))

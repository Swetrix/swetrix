/* eslint-disable react/forbid-prop-types, react/no-unstable-nested-components, react/display-name */
import React, {
  useState, useEffect, useMemo, memo, useRef, Fragment, useCallback,
} from 'react'
import { useHistory, useParams, Link } from 'react-router-dom'
import domToImage from 'dom-to-image'
import { saveAs } from 'file-saver'
import bb from 'billboard.js'
import {
  ArrowDownTrayIcon, Cog8ToothIcon, ArrowPathIcon, CurrencyDollarIcon, ChartBarIcon, BoltIcon, BellIcon,
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
import _values from 'lodash/values'
import _find from 'lodash/find'
import _filter from 'lodash/filter'
import _startsWith from 'lodash/startsWith'
import _debounce from 'lodash/debounce'
import _some from 'lodash/some'
import PropTypes from 'prop-types'
import * as SwetrixSDK from '@swetrix/sdk'

import { SWETRIX_PID } from 'utils/analytics'
import { getTimeFromSeconds, getStringFromTime } from 'utils/generic'
import Title from 'components/Title'
import EventsRunningOutBanner from 'components/EventsRunningOutBanner'
import {
  tbPeriodPairs, getProjectCacheKey, LIVE_VISITORS_UPDATE_INTERVAL, DEFAULT_TIMEZONE, CDN_URL, isDevelopment,
  timeBucketToDays, getProjectCacheCustomKey, roleViewer, MAX_MONTHS_IN_PAST, MAX_MONTHS_IN_PAST_FREE, PROJECT_TABS, TimeFormat, getProjectForcastCacheKey,
} from 'redux/constants'
import Button from 'ui/Button'
import Loader from 'ui/Loader'
import Dropdown from 'ui/Dropdown'
import Checkbox from 'ui/Checkbox'
import Select from 'ui/Select'
import FlatPicker from 'ui/Flatpicker'
import Robot from 'ui/icons/Robot'
import PaidFeature from 'modals/PaidFeature'
import Forecast from 'modals/Forecast'
import routes from 'routes'
import {
  getProjectData, getProject, getOverallStats, getLiveVisitors, getPerfData,
} from 'api'
import { getChartPrediction } from 'api/ai'
import {
  Panel, Overview, CustomEvents,
} from './Panels'
import {
  onCSVExportClick, getFormatDate, panelIconMapping, typeNameMapping, validFilters, validPeriods,
  validTimeBacket, paidPeriods, noRegionPeriods, getSettings, getColumns, CHART_METRICS_MAPPING,
  CHART_METRICS_MAPPING_PERF, getSettingsPerf, transformAIChartData,
} from './ViewProject.helpers'
import CCRow from './components/CCRow'
import RefRow from './components/RefRow'
import NoEvents from './components/NoEvents'
import Filters from './components/Filters'
import ProjectAlertsView from '../Alerts/View'
import './styles.css'

const PROJECT_TABS_VALUES = _values(PROJECT_TABS)

const ViewProject = ({
  projects, isLoading: _isLoading, showError, cache, cachePerf, setProjectCache, projectViewPrefs, setProjectViewPrefs, setPublicProject,
  setLiveStatsForProject, authenticated, timezone, user, sharedProjects, isPaidTierUsed, extensions, generateAlert, setProjectCachePerf,
  projectTab, setProjectTab, setProjects, setProjectForcastCache,
}) => {
  const { t, i18n: { language } } = useTranslation('common')
  const [periodPairs, setPeriodPairs] = useState(tbPeriodPairs(t))
  const [customExportTypes, setCustomExportTypes] = useState([])
  const [customPanelTabs, setCustomPanelTabs] = useState([])
  const [sdkInstance, setSdkInstance] = useState(null)
  const dashboardRef = useRef(null)
  const { id } = useParams()
  const history = useHistory()
  const project = useMemo(() => _find([...projects, ..._map(sharedProjects, (item) => item.project)], p => p.id === id) || {}, [projects, id, sharedProjects])
  const isSharedProject = useMemo(() => {
    const foundProject = _find([..._map(sharedProjects, (item) => item.project)], p => p.id === id)
    return !_isEmpty(foundProject)
  }, [id, sharedProjects])
  const [areFiltersParsed, setAreFiltersParsed] = useState(false)
  const [areFiltersPerfParsed, setAreFiltersPerfParsed] = useState(false)
  const [areTimeBucketParsed, setAreTimeBucketParsed] = useState(false)
  const [arePeriodParsed, setArePeriodParsed] = useState(false)
  const [panelsData, setPanelsData] = useState({})
  const [isPanelsDataEmpty, setIsPanelsDataEmpty] = useState(false)
  const [isPaidFeatureOpened, setIsPaidFeatureOpened] = useState(false)
  const [isForecastOpened, setIsForecastOpened] = useState(false)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [period, setPeriod] = useState(projectViewPrefs[id]?.period || periodPairs[3].period)
  const [timeBucket, setTimebucket] = useState(projectViewPrefs[id]?.timeBucket || periodPairs[3].tbs[1])
  const activePeriod = useMemo(() => _find(periodPairs, p => p.period === period), [period, periodPairs])
  const [chartData, setChartData] = useState({})
  const [mainChart, setMainChart] = useState(null)
  const [dataLoading, setDataLoading] = useState(false)
  const [activeChartMetrics, setActiveChartMetrics] = useState({
    [CHART_METRICS_MAPPING.unique]: true,
    [CHART_METRICS_MAPPING.views]: false,
    [CHART_METRICS_MAPPING.sessionDuration]: false,
    [CHART_METRICS_MAPPING.bounce]: false,
    [CHART_METRICS_MAPPING.viewsPerUnique]: false,
    [CHART_METRICS_MAPPING.trendlines]: false,
  })
  const [activeChartMetricsPerf, setActiveChartMetricsPerf] = useState(CHART_METRICS_MAPPING_PERF.timing)
  const [sessionDurationAVG, setSessionDurationAVG] = useState(null)
  const checkIfAllMetricsAreDisabled = useMemo(() => !_some(activeChartMetrics, (value) => value), [activeChartMetrics])
  const [filters, setFilters] = useState([])
  const [filtersPerf, setFiltersPerf] = useState([])
  // That is needed when using 'Export as image' feature,
  // Because headless browser cannot do a request to the DDG API due to absense of The Same Origin Policy header
  const [showIcons, setShowIcons] = useState(true)
  const isLoading = authenticated ? _isLoading : false
  const tnMapping = typeNameMapping(t)
  const refCalendar = useRef(null)
  const localStorageDateRange = projectViewPrefs[id]?.rangeDate
  const [dateRange, setDateRange] = useState(localStorageDateRange ? [new Date(localStorageDateRange[0]), new Date(localStorageDateRange[1])] : null)
  const [activeTab, setActiveTab] = useState(() => {
    const url = new URL(window.location)
    const { searchParams } = url
    const tab = searchParams.get('tab')

    if (_includes(PROJECT_TABS_VALUES, tab)) {
      return tab
    }

    return projectTab || PROJECT_TABS.traffic
  })

  // TODO: THIS SHOULD BE MOVED TO REDUCERS WITH CACHE FUNCTIONALITY
  // I PUT IT HERE JUST TO SEE IF IT WORKS WELL
  const [forecasedChartData, setForecasedChartData] = useState({})

  const [chartDataPerf, setChartDataPerf] = useState({})
  const [isPanelsDataEmptyPerf, setIsPanelsDataEmptyPerf] = useState(false)
  const [panelsDataPerf, setPanelsDataPerf] = useState({})
  const timeFormat = useMemo(() => user.timeFormat || TimeFormat['12-hour'], [user])

  const tabs = useMemo(() => {
    return [
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

  const dataNames = useMemo(() => {
    return {
      unique: t('project.unique'),
      total: t('project.total'),
      bounce: `${t('dashboard.bounceRate')} (%)`,
      viewsPerUnique: t('dashboard.viewsPerUnique'),
      trendlineTotal: t('project.trendlineTotal'),
      trendlineUnique: t('project.trendlineUnique'),
      sessionDuration: t('dashboard.sessionDuration'),
    }
  }, [t])

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

  // this function is used for requesting the data from the API
  const loadAnalytics = async (forced = false, newFilters = null) => {
    if (!forced && (isLoading || _isEmpty(project) || dataLoading)) {
      return
    }

    setDataLoading(true)
    try {
      let data
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

      if (!forced && !_isEmpty(cache[id]) && !_isEmpty(cache[id][key])) {
        data = cache[id][key]
      } else {
        if (period === 'custom' && dateRange) {
          data = await getProjectData(id, timeBucket, '', newFilters || filters, from, to, timezone)
        } else {
          data = await getProjectData(id, timeBucket, period, newFilters || filters, '', '', timezone)
        }

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
        const applyRegions = !_includes(noRegionPeriods, activePeriod.period)
        const bbSettings = getSettings(chart, timeBucket, activeChartMetrics, applyRegions, timeFormat, forecasedChartData)
        setChartData(chart)

        setPanelsData({
          types: _keys(params),
          data: params,
          customs,
        })

        if (activeTab === PROJECT_TABS.traffic) {
          if (!_isEmpty(mainChart)) {
            mainChart.destroy()
          }

          setMainChart(() => {
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

  const loadAnalyticsPerf = async (forced = false, newFilters = null) => {
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
      } else {
        const { chart: chartPerf } = dataPerf
        const bbSettings = getSettingsPerf(chartPerf, timeBucket, activeChartMetricsPerf)
        setChartDataPerf(chartPerf)

        setPanelsDataPerf({
          types: _keys(dataPerf.params),
          data: dataPerf.params,
        })

        if (activeTab === PROJECT_TABS.performance) {
          if (!_isEmpty(mainChart)) {
            mainChart.destroy()
          }

          setMainChart(() => {
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
  const filterHandler = (column, filter, isExclusive = false) => {
    let newFilters
    let newFiltersPerf
    const columnPerf = `${column}_perf`

    if (activeTab === PROJECT_TABS.performance) {
      if (_find(filtersPerf, (f) => f.column === column)) {
        newFiltersPerf = _filter(filtersPerf, (f) => f.column !== column)

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
  const onChangeExclusive = (column, filter, isExclusive) => {
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

  const onForecastSubmit = async (periodToForecast) => {
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
        mainChart.data.names(dataNames)

        if (activeChartMetrics.views || activeChartMetrics.unique || activeChartMetrics.viewsPerUnique || activeChartMetrics.trendlines) {
          mainChart.load({
            columns: getColumns(chartData, activeChartMetrics),
          })
        }

        if (activeChartMetrics.bounce || activeChartMetrics.sessionDuration || activeChartMetrics.views || activeChartMetrics.unique) {
          const applyRegions = !_includes(noRegionPeriods, activePeriod.period)
          const bbSettings = getSettings(chartData, timeBucket, activeChartMetrics, applyRegions, timeFormat, forecasedChartData)

          if (!_isEmpty(mainChart)) {
            mainChart.destroy()
          }

          setMainChart(() => {
            const generete = bb.generate(bbSettings)
            generete.data.names(dataNames)
            return generete
          })
        }

        if (!activeChartMetrics.bounce || !activeChartMetrics.sessionDuration || activeChartMetrics.views || activeChartMetrics.unique) {
          const applyRegions = !_includes(noRegionPeriods, activePeriod.period)
          const bbSettings = getSettings(chartData, timeBucket, activeChartMetrics, applyRegions, timeFormat, forecasedChartData)

          if (!_isEmpty(mainChart)) {
            mainChart.destroy()
          }

          setMainChart(() => {
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
      const bbSettings = getSettingsPerf(chartDataPerf, timeBucket, activeChartMetricsPerf)

      if (!_isEmpty(mainChart)) {
        mainChart.destroy()
      }

      setMainChart(() => {
        const generete = bb.generate(bbSettings)
        generete.data.names(dataNamesPerf)
        return generete
      })
    }
  }, [isLoading, activeChartMetrics, chartData, chartDataPerf, activeChartMetricsPerf]) // eslint-disable-line

  // Initialising Swetrix SDK instance
  useEffect(() => {
    let sdk = null
    if (!_isEmpty(extensions)) {
      const processedExtensions = _map(extensions, (ext) => {
        const { id: extId, fileURL } = ext
        return {
          id: extId,
          cdnURL: `${CDN_URL}file/${fileURL}`,
        }
      })

      sdk = new SwetrixSDK(processedExtensions, {
        debug: isDevelopment,
      }, {
        onAddExportDataRow: (label, onClick) => {
          setCustomExportTypes((prev) => [
            ...prev,
            {
              label,
              onClick,
            },
          ])
        },
        onRemoveExportDataRow: (label) => {
          setCustomExportTypes((prev) => _filter(prev, (row) => row.label !== label))
        },
        onAddPanelTab: (extensionID, panelID, tabContent, onOpen) => {
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
        onRemovePanelTab: (extensionID, panelID) => {
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
        const url = new URL(window.location)
        const { searchParams } = url
        const initialFilters = []
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
        const url = new URL(window.location)
        const { searchParams } = url
        const initialFilters = []
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
        const url = new URL(window.location)
        const { searchParams } = url
        const intialTimeBucket = searchParams.get('timeBucket')
        // eslint-disable-next-line lodash/prefer-lodash-method
        if (!_includes(validTimeBacket, intialTimeBucket)) {
          return
        }
        const newPeriodFull = _find(periodPairs, (el) => el.period === period)
        if (!_includes(newPeriodFull.tbs, intialTimeBucket)) {
          return
        }
        setTimebucket(intialTimeBucket)
      } finally {
        setAreTimeBucketParsed(true)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arePeriodParsed])

  const onRangeDateChange = (dates, onRender) => {
    const days = Math.ceil(Math.abs(dates[1].getTime() - dates[0].getTime()) / (1000 * 3600 * 24))
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

    let interval
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
                    live: 'N/A',
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
                  setProjects([...projects, {
                    ...projectRes,
                    overall: res[id],
                    live: 'N/A',
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

  const updatePeriod = (newPeriod) => {
    const newPeriodFull = _find(periodPairs, (el) => el.period === newPeriod.period)
    let tb = timeBucket
    const url = new URL(window.location)
    if (_isEmpty(newPeriodFull)) return

    if (!_includes(newPeriodFull.tbs, timeBucket)) {
      tb = _last(newPeriodFull.tbs)
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
  }

  const updateTimebucket = (newTimebucket) => {
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
    setProjectViewPrefs(id, period, newTimebucket, dateRange)
    sdkInstance?._emitEvent('timeupdate', {
      period,
      timeBucket: newTimebucket,
      dateRange,
    })
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
      const url = new URL(window.location)
      const { searchParams } = url
      const intialPeriod = searchParams.get('period')
      const tab = searchParams.get('tab')

      if (tab === PROJECT_TABS.performance) {
        setProjectTab(PROJECT_TABS.performance)
      }

      if (!_includes(validPeriods, intialPeriod) || (!isSharedProject && id !== SWETRIX_PID && !isPaidTierUsed && _includes(paidPeriods, intialPeriod))) {
        return
      }

      if (intialPeriod === 'custom') {
        const from = new Date(searchParams.get('from'))
        const to = new Date(searchParams.get('to'))
        if (from.getDate() && to.getDate()) {
          onRangeDateChange([from, to], true)
          setDateRange([from, to])
        }
        return
      }

      setPeriodPairs(tbPeriodPairs(t))
      setDateRange(null)
      updatePeriod({ period: intialPeriod })
    } finally {
      setArePeriodParsed(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isConflicted = (conflicts) => {
    const conflicted = conflicts && _some(conflicts, (conflict) => {
      const conflictPair = _find(chartMetrics, (metric) => metric.id === conflict)
      return conflictPair && conflictPair.active
    })
    return conflicted
  }

  const resetFilters = () => {
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

  if (!isLoading) {
    return (
      <Title title={name}>
        <EventsRunningOutBanner />
        <div
          className={cx(
            'bg-gray-50 dark:bg-gray-800 py-6 px-4 sm:px-6 lg:px-8',
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
                  setProjectTab(selected.id)
                  setActiveTab(selected.id)
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
                            ? 'border-indigo-700 text-indigo-700 dark:text-indigo-500 dark:border-indigo-500'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:border-gray-300 dark:hover:text-gray-300',
                          'group inline-flex items-center whitespace-nowrap py-2 px-1 border-b-2 font-bold text-md cursor-pointer',
                        )}
                        aria-current={isCurrent ? 'page' : undefined}
                      >
                        <tab.icon
                          className={cx(
                            isCurrent ? 'text-indigo-700 dark:text-indigo-500' : 'text-gray-500 group-hover:text-gray-500 dark:text-gray-400 dark:group-hover:text-gray-300',
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
              <div className='flex flex-col md:flex-row items-center md:items-start justify-between h-10 mt-2'>
                <h2 className='text-3xl font-bold text-gray-900 dark:text-gray-50 break-words'>
                  {name}
                </h2>
                <div className='flex mt-3 md:mt-0'>
                  <div className='md:border-r border-gray-200 dark:border-gray-600 md:pr-3 mr-3'>
                    <button
                      type='button'
                      onClick={refreshStats}
                      className={cx('relative shadow-sm rounded-md mt-[1px] px-3 md:px-4 py-2 bg-white text-sm font-medium hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:dark:ring-gray-200 focus:dark:border-gray-200', {
                        'cursor-not-allowed opacity-50': isLoading || dataLoading,
                      })}
                    >
                      <ArrowPathIcon className='w-5 h-5 text-gray-700 dark:text-gray-50' />
                    </button>
                  </div>
                  <div
                    className={cx('md:border-r border-gray-200 dark:border-gray-600 md:pr-3 mr-3', {
                      hidden: activeTab !== PROJECT_TABS.traffic,
                    })}
                  >
                    <button
                      type='button'
                      onClick={onForecastOpen}
                      className={cx('relative shadow-sm rounded-md mt-[1px] px-3 md:px-4 py-2 bg-white text-sm font-medium hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:dark:ring-gray-200 focus:dark:border-gray-200', {
                        'cursor-not-allowed opacity-50': isLoading || dataLoading,
                        '!bg-gray-200 dark:!bg-gray-600 !border dark:!border-gray-500 !border-gray-300': !_isEmpty(forecasedChartData),
                      })}
                    >
                      <Robot containerClassName='w-5 h-5' className='text-gray-700 dark:text-gray-50' />
                    </button>
                  </div>
                  <div className='md:border-r border-gray-200 dark:border-gray-600 md:pr-3 mr-3'>
                    <span className='relative z-0 inline-flex shadow-sm rounded-md'>
                      {_map(activePeriod.tbs, (tb, index, { length }) => (
                        <button
                          key={tb}
                          type='button'
                          onClick={() => updateTimebucket(tb)}
                          className={cx(
                            'relative capitalize inline-flex items-center px-3 md:px-4 py-2 border bg-white text-sm font-medium hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:dark:ring-gray-200 focus:dark:border-gray-200',
                            {
                              '-ml-px': index > 0,
                              'rounded-l-md': index === 0,
                              'rounded-r-md': 1 + index === length,
                              'z-10 border-indigo-500 text-indigo-600 dark:border-gray-200 dark:text-gray-50': timeBucket === tb,
                              'text-gray-700 dark:text-gray-50 border-gray-300 dark:border-gray-800 ': timeBucket !== tb,
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
                    title={activePeriod.label}
                    labelExtractor={(pair) => {
                      const label = pair.dropdownLabel || pair.label

                      // disable limitation for shared projects as project hosts already have a paid plan
                      // disable limitation for Swetrix public project (for demonstration purposes)
                      if (!isSharedProject && id !== SWETRIX_PID && !isPaidTierUsed && pair.access === 'paid') {
                        return (
                          <span className='flex items-center'>
                            <CurrencyDollarIcon className='w-4 h-4 mr-1' />
                            {label}
                          </span>
                        )
                      }

                      return label
                    }}
                    keyExtractor={(pair) => pair.label}
                    onSelect={(pair) => {
                      if (!isSharedProject && id !== SWETRIX_PID && !isPaidTierUsed && pair.access === 'paid') {
                        setIsPaidFeatureOpened(true)
                        return
                      }

                      if (pair.isCustomDate) {
                        setTimeout(() => {
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
                    value={dateRange}
                    maxDateMonths={(isPaidTierUsed || id === SWETRIX_PID || isSharedProject) ? MAX_MONTHS_IN_PAST : MAX_MONTHS_IN_PAST_FREE}
                  />
                </div>
              </div>
              <div className='flex flex-row flex-wrap items-center justify-center md:justify-end h-10 mt-16 md:mt-5 mb-4'>
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

                        return (
                          <Checkbox
                            className={cx({ hidden: isPanelsDataEmpty || analyticsLoading })}
                            label={label}
                            disabled={conflicted}
                            id={pairID}
                            checked={active}
                          />
                        )
                      }}
                      keyExtractor={(pair) => pair.id}
                      onSelect={({ id: pairID, conflicts }) => {
                        if (isConflicted(conflicts)) {
                          generateAlert(t('project.conflictMetric'), 'error')
                          return
                        }
                        switchActiveChartMetric(pairID)
                      }}
                    />
                  )) : (
                  !isPanelsDataEmptyPerf && (
                    <Dropdown
                      items={chartMetricsPerf}
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
                    className='relative flex justify-center items-center py-2 !pr-3 !pl-1 md:pr-4 md:pl-2 ml-3 text-sm dark:text-gray-50 dark:border-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600'
                    secondary
                  >
                    <Cog8ToothIcon className='w-5 h-5 mr-1' />
                    {t('common.settings')}
                  </Button>
                )}
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
          {(isPanelsDataEmpty && activeTab !== PROJECT_TABS.alerts) && (
            <NoEvents filters={filters} resetFilters={resetFilters} pid={id} />
          )}
          {activeTab === PROJECT_TABS.traffic && (
            <div className={cx('pt-4 md:pt-0', { hidden: isPanelsDataEmpty || analyticsLoading })}>
              <div
                className={cx('h-80', {
                  hidden: checkIfAllMetricsAreDisabled,
                })}
              >
                <div className='h-80' id='dataChart' />
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
                    live={project.live}
                    projectId={id}
                  />
                )}
                {_map(panelsData.types, (type) => {
                  const panelName = tnMapping[type]
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
            <div className={cx('pt-4 md:pt-0', { hidden: isPanelsDataEmpty || analyticsLoading })}>
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
                {_map(panelsDataPerf.types, (type) => {
                  const panelName = tnMapping[type]
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
        <PaidFeature
          isOpened={isPaidFeatureOpened}
          onClose={() => setIsPaidFeatureOpened(false)}
        />
        <Forecast
          isOpened={isForecastOpened}
          onClose={() => setIsForecastOpened(false)}
          onSubmit={onForecastSubmit}
          activeTB={t(`project.${timeBucket}`)}
        />
      </Title>
    )
  }

  return (
    <Title title={name}>
      <div className='min-h-min-footer bg-gray-50 dark:bg-gray-800'>
        <Loader />
      </div>
    </Title>
  )
}

ViewProject.propTypes = {
  projects: PropTypes.arrayOf(PropTypes.object).isRequired,
  sharedProjects: PropTypes.arrayOf(PropTypes.object).isRequired,
  cache: PropTypes.objectOf(PropTypes.object).isRequired,
  projectViewPrefs: PropTypes.objectOf(PropTypes.object).isRequired,
  showError: PropTypes.func.isRequired,
  setProjectCache: PropTypes.func.isRequired,
  setProjectViewPrefs: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
  setPublicProject: PropTypes.func.isRequired,
  setLiveStatsForProject: PropTypes.func.isRequired,
  authenticated: PropTypes.bool.isRequired,
  extensions: PropTypes.arrayOf(PropTypes.object).isRequired,
  isPaidTierUsed: PropTypes.bool.isRequired,
  timezone: PropTypes.string,
}

ViewProject.defaultProps = {
  timezone: DEFAULT_TIMEZONE,
}

export default memo(ViewProject)

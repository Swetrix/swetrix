import cx from 'clsx'
import dayjs from 'dayjs'
import _filter from 'lodash/filter'
import _find from 'lodash/find'
import _includes from 'lodash/includes'
import _isEmpty from 'lodash/isEmpty'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import _some from 'lodash/some'
import { BanIcon, ChartColumnBigIcon, ChartLineIcon, EyeIcon } from 'lucide-react'
import React, { useState, useEffect, useMemo, useRef, lazy, Suspense, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import {
  getProjectData,
  getOverallStats,
  getProjectDataCustomEvents,
  getTrafficCompareData,
  getCustomEventsMetadata,
  getPropertyMetadata,
  getGSCKeywords,
} from '~/api'
import { useAnnotations } from '~/hooks/useAnnotations'
import { TRAFFIC_PANELS_ORDER, chartTypes, PERIOD_PAIRS_COMPARE, isSelfhosted, type TimeBucket } from '~/lib/constants'
import { CountryEntry, Entry } from '~/lib/models/Entry'
import { OverallObject } from '~/lib/models/Project'
import AnnotationModal from '~/modals/AnnotationModal'
import CCRow from '~/pages/Project/View/components/CCRow'
import DashboardHeader from '~/pages/Project/View/components/DashboardHeader'
import { ChartContextMenu } from '~/pages/Project/View/components/ChartContextMenu'
import CustomMetrics from '~/pages/Project/View/components/CustomMetrics'
import Filters from '~/pages/Project/View/components/Filters'
import { MetricCard, MetricCards } from '~/pages/Project/View/components/MetricCards'
import NoEvents from '~/pages/Project/View/components/NoEvents'
import RefRow from '~/pages/Project/View/components/RefRow'
import { TrafficChart } from '~/pages/Project/View/components/TrafficChart'
import UserFlow from '~/pages/Project/View/components/UserFlow'
import {
  Customs,
  TrafficMeta,
  Params,
  ProjectViewCustomEvent,
  Properties,
  TrafficLogResponse,
} from '~/pages/Project/View/interfaces/traffic'
import { Panel, Metadata as MetadataGeneric } from '~/pages/Project/View/Panels'
import { FILTER_CHART_METRICS_MAPPING_FOR_COMPARE } from '~/pages/Project/View/utils/filters'
import { useViewProjectContext } from '~/pages/Project/View/ViewProject'
import {
  getFormatDate,
  panelIconMapping,
  noRegionPeriods,
  CHART_METRICS_MAPPING,
  getDeviceRowMapper,
} from '~/pages/Project/View/ViewProject.helpers'
import { useCurrentProject, useProjectPassword } from '~/providers/CurrentProjectProvider'
import { useTheme } from '~/providers/ThemeProvider'
import Checkbox from '~/ui/Checkbox'
import Dropdown from '~/ui/Dropdown'
import Loader from '~/ui/Loader'
import { periodToCompareDate } from '~/utils/compareConvertDate'
import { getLocaleDisplayName, nLocaleFormatter } from '~/utils/generic'
import { groupRefEntries } from '~/utils/referrers'
import routes from '~/utils/routes'

import CustomEventsSubmenu from '../../View/components/CustomEventsSubmenu'

const InteractiveMap = lazy(() => import('~/pages/Project/View/components/InteractiveMap'))

interface PanelsData {
  types?: string[]
  data: Params
  customs?: Customs
  properties?: Properties
  meta?: TrafficMeta[]
}

type KeywordEntry = Entry & { impressions: number; position: number; ctr: number }

interface TrafficViewProps {
  tnMapping: Record<string, string>
  customMetrics: ProjectViewCustomEvent[]
  onCustomMetric: (metrics: ProjectViewCustomEvent[]) => void
  onRemoveCustomMetric: (metricId: string) => void
  resetCustomMetrics: () => void
  mode: 'periodical' | 'cumulative'
  sdkInstance: any
  headerRightContent?: React.ReactNode
}

const TrafficView = ({
  tnMapping,
  customMetrics,
  onCustomMetric,
  onRemoveCustomMetric,
  resetCustomMetrics,
  mode,
  sdkInstance,
  headerRightContent,
}: TrafficViewProps) => {
  const { id, project, allowedToManage } = useCurrentProject()
  const projectPassword = useProjectPassword(id)
  const {
    trafficRefreshTrigger,
    timezone,
    period,
    dateRange,
    filters,
    timeFormat,
    timeBucket,
    activePeriod,
    // Comparison state from context
    isActiveCompare,
    dateRangeCompare,
    activePeriodCompare,
    compareDisable,
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
  } = useViewProjectContext()
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const { theme } = useTheme()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

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
  } = useAnnotations({ allowedToManage })

  // Traffic-specific state
  const [dataLoading, setDataLoading] = useState(false)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [isPanelsDataEmpty, setIsPanelsDataEmpty] = useState(false)
  const [panelsData, setPanelsData] = useState<PanelsData>({ data: {} })
  const [chartData, setChartData] = useState<any>({})
  const [overall, setOverall] = useState<Partial<OverallObject>>({})
  const [overallCompare, setOverallCompare] = useState<Partial<OverallObject>>({})
  const [dataChartCompare, setDataChartCompare] = useState<any>({})
  const [customEventsChartData, setCustomEventsChartData] = useState<any>({})

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
  })
  const [activeChartMetricsCustomEvents, setActiveChartMetricsCustomEvents] = useState<string[]>([])

  // Panel active tabs
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
    () => [
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
    ],
    [t, activeChartMetrics],
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
      ...dataNamesCustomEvents,
    }),
    [t, dataNamesCustomEvents],
  )

  const checkIfAllMetricsAreDisabled = useMemo(
    () => !_some({ ...activeChartMetrics, ...activeChartMetricsCustomEvents }, (value) => value),
    [activeChartMetrics, activeChartMetricsCustomEvents],
  )

  const isConflicted = useCallback(
    (conflicts: string[] | undefined) => {
      if (!conflicts) return false
      return conflicts.some((id) => activeChartMetrics[id as keyof typeof activeChartMetrics])
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

  const switchCustomEventChart = useCallback((id: string) => {
    setActiveChartMetricsCustomEvents((prev) => {
      if (_includes(prev, id)) {
        return _filter(prev, (item) => item !== id)
      }
      return [...prev, id]
    })
  }, [])

  const setPanelTab = (panel: keyof typeof panelsActiveTabs, tab: string) => {
    setPanelsActiveTabs((prev) => ({
      ...prev,
      [panel]: tab,
    }))
  }

  const loadAnalytics = async () => {
    if (!project) return

    setDataLoading(true)

    try {
      let data: TrafficLogResponse & { overall?: OverallObject }
      let dataCompare: (TrafficLogResponse & { overall?: OverallObject }) | null = null
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

      if (isMountedRef.current) {
        setCustomEventsChartData(customEventsChart)
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
      }
    } catch (reason) {
      if (isMountedRef.current) {
        setAnalyticsLoading(false)
        setDataLoading(false)
        setIsPanelsDataEmpty(true)
        console.error('[ERROR](loadAnalytics) Loading analytics data failed')
        console.error(reason)
      }
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

  const _getPropertyMetadata = async (property: string) => {
    if (period === 'custom' && dateRange) {
      return getPropertyMetadata(
        id,
        property,
        timeBucket,
        '',
        getFormatDate(dateRange[0]),
        getFormatDate(dateRange[1]),
        filters,
        timezone,
        projectPassword,
      )
    }

    return getPropertyMetadata(id, property, timeBucket, period, '', '', filters, timezone, projectPassword)
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
            ? await getGSCKeywords(id, '', from, to, timezone, projectPassword)
            : await getGSCKeywords(id, period, '', '', timezone, projectPassword)

        if (isMountedRef.current) {
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

  // Load analytics on mount and when dependencies change
  useEffect(() => {
    if (!project) return
    loadAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mode,
    customMetrics,
    filters,
    project,
    isActiveCompare,
    dateRange,
    period,
    timeBucket,
    dateRangeCompare,
    activePeriodCompare,
  ])

  // Handle custom events chart loading
  useEffect(() => {
    if (!project) return
    if (activeChartMetricsCustomEvents.length === 0) {
      setCustomEventsChartData({})
      return
    }
    loadAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChartMetricsCustomEvents])

  // Handle refresh trigger
  useEffect(() => {
    if (trafficRefreshTrigger > 0) {
      loadAnalytics()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trafficRefreshTrigger])

  // Show loader during initial load
  if (analyticsLoading) {
    return <Loader />
  }

  // Show no events if data is empty
  if (isPanelsDataEmpty) {
    return <NoEvents filters={filters} />
  }

  const ChartTypeSwitcher = ({ type, onSwitch }: { type: string; onSwitch: (type: 'line' | 'bar') => void }) => {
    if (type === chartTypes.bar) {
      return (
        <button
          type='button'
          title={t('project.lineChart')}
          onClick={() => onSwitch('line')}
          className='rounded-md border border-transparent bg-gray-50 p-2 text-sm font-medium transition-colors hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:bg-slate-900 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200'
        >
          <ChartLineIcon className='h-5 w-5 text-gray-700 dark:text-gray-50' />
        </button>
      )
    }

    return (
      <button
        type='button'
        title={t('project.barChart')}
        onClick={() => onSwitch('bar')}
        className='rounded-md border border-transparent bg-gray-50 p-2 text-sm font-medium transition-colors hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:bg-slate-900 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200'
      >
        <ChartColumnBigIcon className='h-5 w-5 text-gray-700 dark:text-gray-50' />
      </button>
    )
  }

  return (
    <>
      <DashboardHeader rightContent={headerRightContent} />
      <div className={cx({ hidden: isPanelsDataEmpty || analyticsLoading })}>
        <div className='relative overflow-hidden rounded-lg border border-gray-300 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-800/25'>
          <div className='mb-3 flex w-full items-center justify-end gap-2 lg:absolute lg:top-2 lg:right-2 lg:mb-0 lg:w-auto lg:justify-normal'>
            <Dropdown
              header={t('project.metricVis')}
              items={
                isActiveCompare
                  ? _filter(chartMetrics, (el) => !_includes(FILTER_CHART_METRICS_MAPPING_FOR_COMPARE, el.id))
                  : chartMetrics
              }
              title={[<EyeIcon key='eye-icon' aria-label={t('project.metricVis')} className='h-5 w-5' />]}
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
                className='mt-5 h-80 md:mt-0 [&_svg]:overflow-visible!'
                annotations={annotations}
              />
            </div>
          ) : null}
        </div>
        {!isPanelsDataEmpty ? <Filters tnMapping={tnMapping} /> : null}
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
                      const displayName = getLocaleDisplayName(entryName, language)

                      return (
                        <CCRow cc={entryNameArray[entryNameArray.length - 1]} name={displayName} language={language} />
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
                      onTabChange={(tab) => setPanelTab('location', tab)}
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
                                    onClick={(mapType, key) => {
                                      const link = getFilterLink(mapType, key)
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
                      onTabChange={(tab) => setPanelTab('device', tab)}
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
                        getVersionFilterLink(parent, version, panelsActiveTabs.device === 'br' ? 'br' : 'os')
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
                              {panelsActiveTabs.page === 'host' ? t('project.unknownHost') : t('common.notSet')}
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
                      onTabChange={(tab) => setPanelTab('page', tab)}
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
                          return getFilterLink(hasRefNameFilter || value === null ? 'ref' : 'refn', value)
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
                                  : (groupRefEntries(raw as any) as unknown as Entry[])
                              })()
                            : (panelsData.data[panelsActiveTabs.source] as unknown as Entry[])
                      }
                      valuesHeaderName={panelsActiveTabs.source === 'keywords' ? t('project.clicks') : undefined}
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
              onTabChange={(tab) => setPanelTab('metadata', tab)}
              activeTabId={panelsActiveTabs.metadata}
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
      </div>
    </>
  )
}

export default TrafficView

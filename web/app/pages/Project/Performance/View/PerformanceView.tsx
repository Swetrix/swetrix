import cx from 'clsx'
import dayjs from 'dayjs'
import _find from 'lodash/find'
import _isEmpty from 'lodash/isEmpty'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import _some from 'lodash/some'
import { EyeIcon, PercentIcon } from 'lucide-react'
import { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { getPerfData, getPerformanceCompareData, getPerformanceOverallStats, getOverallStats } from '~/api'
import { useAnnotations } from '~/hooks/useAnnotations'
import { PERFORMANCE_PANELS_ORDER, chartTypes, PERIOD_PAIRS_COMPARE, type TimeBucket } from '~/lib/constants'
import { CountryEntry } from '~/lib/models/Entry'
import { OverallPerformanceObject } from '~/lib/models/Project'
import AnnotationModal from '~/modals/AnnotationModal'
import CCRow from '~/pages/Project/View/components/CCRow'
import { ChartContextMenu } from '~/pages/Project/View/components/ChartContextMenu'
import Filters from '~/pages/Project/View/components/Filters'
import { PerformanceMetricCards } from '~/pages/Project/View/components/MetricCards'
import NoEvents from '~/pages/Project/View/components/NoEvents'
import { PerformanceChart } from '~/pages/Project/View/components/PerformanceChart'
import { Panel } from '~/pages/Project/View/Panels'
import {
  getFormatDate,
  panelIconMapping,
  CHART_METRICS_MAPPING_PERF,
  CHART_MEASURES_MAPPING_PERF,
} from '~/pages/Project/View/ViewProject.helpers'
import { useViewProjectContext } from '~/pages/Project/View/ViewProject'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import { useProjectPassword } from '~/providers/CurrentProjectProvider'
import { useTheme } from '~/providers/ThemeProvider'
import Dropdown from '~/ui/Dropdown'
import Loader from '~/ui/Loader'
import { getStringFromTime, getTimeFromSeconds } from '~/utils/generic'

const InteractiveMap = lazy(() => import('~/pages/Project/View/components/InteractiveMap'))

// Period to compare date mapping
const periodToCompareDate = [
  {
    period: '1d',
    formula: (date?: Date[]) =>
      date
        ? { from: getFormatDate(dayjs(date[0]).subtract(1, 'day').toDate()), to: getFormatDate(date[0]) }
        : {
            from: dayjs().subtract(2, 'day').format('YYYY-MM-DD'),
            to: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
          },
  },
  {
    period: '1h',
    formula: () => ({
      from: dayjs().subtract(2, 'hour').format('YYYY-MM-DD HH:mm:ss'),
      to: dayjs().subtract(1, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    }),
  },
  {
    period: 'today',
    formula: () => ({ from: dayjs().subtract(1, 'day').format('YYYY-MM-DD'), to: dayjs().format('YYYY-MM-DD') }),
  },
  {
    period: 'yesterday',
    formula: () => ({
      from: dayjs().subtract(2, 'day').format('YYYY-MM-DD'),
      to: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
    }),
  },
  {
    period: '7d',
    formula: (date?: Date[]) =>
      date
        ? { from: getFormatDate(dayjs(date[0]).subtract(7, 'day').toDate()), to: getFormatDate(date[0]) }
        : {
            from: dayjs().subtract(14, 'day').format('YYYY-MM-DD'),
            to: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
          },
  },
  {
    period: '4w',
    formula: (date?: Date[]) =>
      date
        ? { from: getFormatDate(dayjs(date[0]).subtract(4, 'week').toDate()), to: getFormatDate(date[0]) }
        : {
            from: dayjs().subtract(8, 'week').format('YYYY-MM-DD'),
            to: dayjs().subtract(4, 'week').format('YYYY-MM-DD'),
          },
  },
  {
    period: '3M',
    formula: (date?: Date[]) =>
      date
        ? { from: getFormatDate(dayjs(date[0]).subtract(3, 'month').toDate()), to: getFormatDate(date[0]) }
        : {
            from: dayjs().subtract(6, 'month').format('YYYY-MM-DD'),
            to: dayjs().subtract(3, 'month').format('YYYY-MM-DD'),
          },
  },
  {
    period: '12M',
    formula: (date?: Date[]) =>
      date
        ? { from: getFormatDate(dayjs(date[0]).subtract(12, 'month').toDate()), to: getFormatDate(date[0]) }
        : {
            from: dayjs().subtract(24, 'month').format('YYYY-MM-DD'),
            to: dayjs().subtract(12, 'month').format('YYYY-MM-DD'),
          },
  },
  {
    period: '24M',
    formula: (date?: Date[]) =>
      date
        ? { from: getFormatDate(dayjs(date[0]).subtract(24, 'month').toDate()), to: getFormatDate(date[0]) }
        : {
            from: dayjs().subtract(48, 'month').format('YYYY-MM-DD'),
            to: dayjs().subtract(24, 'month').format('YYYY-MM-DD'),
          },
  },
]

// Device row mapper
const getDeviceRowMapper = (activeTabId: string, theme: string, t: any) => {
  return (entry: { name: string }) => entry.name || t('project.unknown')
}

interface PerformanceViewProps {
  tnMapping: Record<string, string>
}

const PerformanceView = ({ tnMapping }: PerformanceViewProps) => {
  const { id, project, allowedToManage } = useCurrentProject()
  const projectPassword = useProjectPassword(id)
  const {
    performanceRefreshTrigger,
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
  } = useViewProjectContext()

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
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const { theme } = useTheme()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Performance-specific state
  const [dataLoading, setDataLoading] = useState(false)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [isPanelsDataEmpty, setIsPanelsDataEmpty] = useState(false)
  const [panelsData, setPanelsData] = useState<any>({})
  const [chartData, setChartData] = useState<any>({})
  const [overall, setOverall] = useState<Partial<OverallPerformanceObject>>({})
  const [overallCompare, setOverallCompare] = useState<Partial<OverallPerformanceObject>>({})
  const [chartDataCompare, setChartDataCompare] = useState<any>({})

  // Chart metrics and measures
  const [activeChartMetrics, setActiveChartMetrics] = useState(CHART_METRICS_MAPPING_PERF.timing)
  const [activeMeasure, setActiveMeasure] = useState(CHART_MEASURES_MAPPING_PERF.median)

  // Panel active tabs
  const [activeTabs, setActiveTabs] = useState<{
    location: 'cc' | 'rg' | 'ct' | 'map'
    page: 'pg' | 'host'
    device: 'br' | 'dv'
  }>({
    location: 'cc',
    page: 'pg',
    device: 'br',
  })

  const isMountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const chartMetrics = useMemo(
    () => [
      {
        id: CHART_METRICS_MAPPING_PERF.quantiles,
        label: t('dashboard.allocation'),
        active: activeChartMetrics === CHART_METRICS_MAPPING_PERF.quantiles,
      },
      {
        id: CHART_METRICS_MAPPING_PERF.full,
        label: t('dashboard.timingFull'),
        active: activeChartMetrics === CHART_METRICS_MAPPING_PERF.full,
      },
      {
        id: CHART_METRICS_MAPPING_PERF.timing,
        label: t('dashboard.timing'),
        active: activeChartMetrics === CHART_METRICS_MAPPING_PERF.timing,
      },
      {
        id: CHART_METRICS_MAPPING_PERF.network,
        label: t('dashboard.network'),
        active: activeChartMetrics === CHART_METRICS_MAPPING_PERF.network,
      },
      {
        id: CHART_METRICS_MAPPING_PERF.frontend,
        label: t('dashboard.frontend'),
        active: activeChartMetrics === CHART_METRICS_MAPPING_PERF.frontend,
      },
      {
        id: CHART_METRICS_MAPPING_PERF.backend,
        label: t('dashboard.backend'),
        active: activeChartMetrics === CHART_METRICS_MAPPING_PERF.backend,
      },
    ],
    [t, activeChartMetrics],
  )

  const chartMeasures = useMemo(
    () => [
      {
        id: CHART_MEASURES_MAPPING_PERF.p95,
        label: t('dashboard.xPercentile', { x: 95 }),
        active: activeMeasure === CHART_MEASURES_MAPPING_PERF.p95,
      },
      {
        id: CHART_MEASURES_MAPPING_PERF.p75,
        label: t('dashboard.xPercentile', { x: 75 }),
        active: activeMeasure === CHART_MEASURES_MAPPING_PERF.p75,
      },
      {
        id: CHART_MEASURES_MAPPING_PERF.median,
        label: t('dashboard.median'),
        active: activeMeasure === CHART_MEASURES_MAPPING_PERF.median,
      },
      {
        id: CHART_MEASURES_MAPPING_PERF.average,
        label: t('dashboard.average'),
        active: activeMeasure === CHART_MEASURES_MAPPING_PERF.average,
      },
    ],
    [t, activeMeasure],
  )

  const dataNames = useMemo(
    () => ({
      full: t('dashboard.timing'),
      dns: t('dashboard.dns'),
      tls: t('dashboard.tls'),
      conn: t('dashboard.conn'),
      response: t('dashboard.response'),
      render: t('dashboard.render'),
      domLoad: t('dashboard.domLoad'),
      ttfb: t('dashboard.ttfb'),
      p50: t('dashboard.xPercentile', { x: 50 }),
      p75: t('dashboard.xPercentile', { x: 75 }),
      p95: t('dashboard.xPercentile', { x: 95 }),
    }),
    [t],
  )

  const checkIfAllMetricsAreDisabled = useMemo(
    () => !_some({ activeChartMetrics }, (value) => value),
    [activeChartMetrics],
  )

  const loadAnalytics = async () => {
    if (!project) return

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
        activeChartMetrics === CHART_METRICS_MAPPING_PERF.quantiles
          ? CHART_METRICS_MAPPING_PERF.quantiles
          : activeMeasure

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

      if (isMountedRef.current) {
        setOverall(rawOverall[id])

        if (_keys(dataPerf).length < 2) {
          setIsPanelsDataEmpty(true)
          setDataLoading(false)
          setAnalyticsLoading(false)
          return
        }

        let newTimebucket = timeBucket

        if (period === 'all' && !_isEmpty(dataPerf.timeBucket)) {
          newTimebucket = dataPerf.timeBucket?.includes(timeBucket) ? timeBucket : (dataPerf.timeBucket?.[0] as string)
          const newSearchParams = new URLSearchParams(searchParams.toString())
          newSearchParams.set('timeBucket', newTimebucket)
          setSearchParams(newSearchParams)
        }

        if (!_isEmpty(dataCompare)) {
          if (!_isEmpty(dataCompare?.chart)) {
            setChartDataCompare(dataCompare.chart)
          }

          if (!_isEmpty(dataCompare?.overall)) {
            setOverallCompare(dataCompare.overall)
          }
        }

        if (_isEmpty(dataPerf.params)) {
          setIsPanelsDataEmpty(true)
        } else {
          const { chart: chartPerf } = dataPerf
          setChartData(chartPerf)

          setPanelsData({
            types: _keys(dataPerf.params),
            data: dataPerf.params,
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
        console.error('[ERROR](loadAnalytics) Loading analytics data failed:', reason)
      }
    }
  }

  // Load analytics on mount and when dependencies change
  useEffect(() => {
    if (!project) return
    loadAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeMeasure,
    activeChartMetrics,
    filters,
    project,
    isActiveCompare,
    dateRange,
    period,
    timeBucket,
    dateRangeCompare,
    activePeriodCompare,
  ])

  // Handle refresh trigger
  useEffect(() => {
    if (performanceRefreshTrigger > 0) {
      loadAnalytics()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [performanceRefreshTrigger])

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
          <svg
            className='h-5 w-5 text-gray-700 dark:text-gray-50'
            fill='none'
            viewBox='0 0 24 24'
            strokeWidth='1.5'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              d='M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z'
            />
          </svg>
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
        <svg
          className='h-5 w-5 text-gray-700 dark:text-gray-50'
          fill='none'
          viewBox='0 0 24 24'
          strokeWidth='1.5'
          stroke='currentColor'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            d='M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z'
          />
        </svg>
      </button>
    )
  }

  return (
    <div className={cx('pt-2', { hidden: isPanelsDataEmpty || analyticsLoading })}>
      <div className='relative overflow-hidden rounded-lg border border-gray-300 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-800/25'>
        <div className='mb-3 flex w-full items-center justify-end gap-2 lg:absolute lg:top-2 lg:right-2 lg:mb-0 lg:w-auto lg:justify-normal'>
          <Dropdown
            items={chartMetrics}
            className='xs:min-w-0'
            header={t('main.metric')}
            title={[<EyeIcon key='eye-icon' aria-label={t('project.metricVis')} className='h-5 w-5' />]}
            labelExtractor={(pair) => pair.label}
            keyExtractor={(pair) => pair.id}
            onSelect={({ id: pairID }) => {
              setActiveChartMetrics(pairID)
            }}
            buttonClassName='!px-2 bg-gray-50 rounded-md border border-transparent hover:border-gray-300 hover:bg-white dark:bg-slate-900 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200'
            chevron='mini'
            headless
          />
          <Dropdown
            disabled={activeChartMetrics === CHART_METRICS_MAPPING_PERF.quantiles}
            items={chartMeasures}
            className='xs:min-w-0'
            header={t('project.aggregation')}
            title={[<PercentIcon key='percent-icon' aria-label={t('project.aggregation')} className='h-5 w-5' />]}
            labelExtractor={(pair) => pair.label}
            keyExtractor={(pair) => pair.id}
            onSelect={({ id: pairID }) => {
              setActiveMeasure(pairID)
            }}
            buttonClassName='!px-2 bg-gray-50 rounded-md border border-transparent hover:border-gray-300 hover:bg-white dark:bg-slate-900 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200'
            chevron='mini'
            headless
          />
          <ChartTypeSwitcher onSwitch={setChartTypeOnClick} type={chartType} />
        </div>

        {!_isEmpty(overall) ? (
          <PerformanceMetricCards
            overall={overall}
            overallCompare={overallCompare}
            activePeriodCompare={activePeriodCompare}
          />
        ) : null}
        {!checkIfAllMetricsAreDisabled && !_isEmpty(chartData) ? (
          <div onContextMenu={(e) => handleChartContextMenu(e, chartData?.x)} className='relative'>
            <PerformanceChart
              chart={chartData}
              timeBucket={timeBucket}
              activeChartMetrics={activeChartMetrics}
              rotateXAxis={rotateXAxis}
              chartType={chartType}
              timeFormat={timeFormat}
              compareChart={chartDataCompare}
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
      <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
        {!_isEmpty(panelsData.types)
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
                    key={activeTabs.location}
                    icon={panelIconMapping.cc}
                    id={activeTabs.location}
                    getFilterLink={getFilterLink}
                    name={t('project.location')}
                    tabs={locationTabs}
                    onTabChange={(tab) =>
                      setActiveTabs({
                        ...activeTabs,
                        location: tab as 'cc' | 'rg' | 'ct' | 'map',
                      })
                    }
                    activeTabId={activeTabs.location}
                    data={panelsData.data[activeTabs.location]}
                    rowMapper={rowMapper}
                    // @ts-expect-error
                    valueMapper={(value) => getStringFromTime(getTimeFromSeconds(value), true)}
                    customRenderer={
                      activeTabs.location === 'map'
                        ? () => {
                            const countryData = panelsData.data?.cc || []
                            const regionData = panelsData.data?.rg || []
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
                    key={activeTabs.device}
                    icon={panelIconMapping.os}
                    id={activeTabs.device}
                    getFilterLink={getFilterLink}
                    name={t('project.devices')}
                    tabs={deviceTabs}
                    onTabChange={(tab) =>
                      setActiveTabs({
                        ...activeTabs,
                        device: tab as 'br' | 'dv',
                      })
                    }
                    activeTabId={activeTabs.device}
                    data={panelsData.data[activeTabs.device]}
                    rowMapper={getDeviceRowMapper(activeTabs.device, theme, t)}
                    capitalize={activeTabs.device === 'dv'}
                    // @ts-expect-error
                    valueMapper={(value) => getStringFromTime(getTimeFromSeconds(value), true)}
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
                    key={activeTabs.page}
                    icon={panelIconMapping.pg}
                    id={activeTabs.page}
                    getFilterLink={getFilterLink}
                    rowMapper={({ name: entryName }) => {
                      if (!entryName) {
                        return (
                          <span className='italic'>
                            {activeTabs.page === 'pg' ? t('common.notSet') : t('project.unknownHost')}
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
                      setActiveTabs({
                        ...activeTabs,
                        page: tab as 'pg' | 'host',
                      })
                    }
                    activeTabId={activeTabs.page}
                    data={panelsData.data[activeTabs.page]}
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
  )
}

export default PerformanceView

import cx from 'clsx'
import _isEmpty from 'lodash/isEmpty'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import { EyeIcon, PercentIcon } from 'lucide-react'
import {
  useState,
  useEffect,
  useMemo,
  useRef,
  lazy,
  Suspense,
  use,
} from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  useNavigate,
  useSearchParams,
  useLoaderData,
  useRevalidator,
} from 'react-router'

import type {
  PerformanceDataResponse,
  PerformanceOverallObject,
} from '~/api/api.server'
import { useAnnotations } from '~/hooks/useAnnotations'
import { PERFORMANCE_PANELS_ORDER, chartTypes } from '~/lib/constants'
import { CountryEntry } from '~/lib/models/Entry'
import { OverallPerformanceObject } from '~/lib/models/Project'
import AnnotationModal from '~/modals/AnnotationModal'
import { PerformanceChart } from '~/pages/Project/tabs/Performance/PerformanceChart'
import { PerformanceMetricCards } from '~/pages/Project/tabs/Traffic/MetricCards'
import PageLinkRow from '~/pages/Project/tabs/Traffic/PageLinkRow'
import CCRow from '~/pages/Project/View/components/CCRow'
import { ChartContextMenu } from '~/pages/Project/View/components/ChartContextMenu'
import DashboardHeader from '~/pages/Project/View/components/DashboardHeader'
import Filters from '~/pages/Project/View/components/Filters'
import NoEvents from '~/pages/Project/View/components/NoEvents'
import { Panel } from '~/pages/Project/View/Panels'
import {
  useViewProjectContext,
  useRefreshTriggers,
} from '~/pages/Project/View/ViewProject'
import {
  panelIconMapping,
  CHART_METRICS_MAPPING_PERF,
  CHART_MEASURES_MAPPING_PERF,
  getDeviceRowMapper,
} from '~/pages/Project/View/ViewProject.helpers'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import { useTheme } from '~/providers/ThemeProvider'
import type { ProjectLoaderData } from '~/routes/projects.$id'
import Dropdown from '~/ui/Dropdown'
import Loader from '~/ui/Loader'
import LoadingBar from '~/ui/LoadingBar'
import { getStringFromTime, getTimeFromSeconds } from '~/utils/generic'

const InteractiveMap = lazy(
  () => import('~/pages/Project/View/components/InteractiveMap'),
)

interface PerformanceViewProps {
  tnMapping: Record<string, string>
}

interface DeferredPerfData {
  perfData: PerformanceDataResponse | null
  perfOverallStats: Record<string, PerformanceOverallObject> | null
}

function PerfDataResolver({
  children,
}: {
  children: (data: DeferredPerfData) => React.ReactNode
}) {
  const {
    perfData: perfDataPromise,
    perfOverallStats: perfOverallStatsPromise,
  } = useLoaderData<ProjectLoaderData>()

  const perfData = perfDataPromise ? use(perfDataPromise) : null
  const perfOverallStats = perfOverallStatsPromise
    ? use(perfOverallStatsPromise)
    : null

  return <>{children({ perfData, perfOverallStats })}</>
}

function PerformanceViewWrapper(props: PerformanceViewProps) {
  return (
    <Suspense fallback={<Loader />}>
      <PerfDataResolver>
        {(deferredData) => (
          <PerformanceViewInner {...props} deferredData={deferredData} />
        )}
      </PerfDataResolver>
    </Suspense>
  )
}

interface PerformanceViewInnerProps extends PerformanceViewProps {
  deferredData: DeferredPerfData
}

const PerformanceViewInner = ({
  tnMapping,
  deferredData,
}: PerformanceViewInnerProps) => {
  const { id, project, allowedToManage } = useCurrentProject()
  const revalidator = useRevalidator()
  const { performanceRefreshTrigger } = useRefreshTriggers()
  const {
    filters,
    timeFormat,
    timeBucket,
    // Comparison state from context (not implemented via SSR yet)
    activePeriodCompare,
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
    isMapFullscreen,
    setIsMapFullscreen,
    fullscreenMapRef,
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
  } = useAnnotations()
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const { theme } = useTheme()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // State for data - initialized from loader, can be overridden by client-side fetches
  const [dataLoading, setDataLoading] = useState(false)
  const [panelsData, setPanelsData] = useState<any>(() => {
    if (deferredData.perfData?.params) {
      return {
        types: _keys(deferredData.perfData.params),
        data: deferredData.perfData.params,
      }
    }
    return { data: {} }
  })
  const [chartData, setChartData] = useState<any>(
    () => deferredData.perfData?.chart || {},
  )
  const [overall, setOverall] = useState<Partial<OverallPerformanceObject>>(
    () => {
      if (deferredData.perfOverallStats && id) {
        return deferredData.perfOverallStats[id] || {}
      }
      return {}
    },
  )

  // Track if we've ever shown actual content to prevent NoEvents flash during exit animation
  const hasShownContentRef = useRef(false)

  const isPanelsDataEmptyRaw = _isEmpty(panelsData.data)

  // Track when we've shown content to prevent NoEvents flash during exit animation
  if (!isPanelsDataEmptyRaw) {
    hasShownContentRef.current = true
  }

  // Don't show NoEvents if we've previously shown content (prevents flash during tab switch)
  const isPanelsDataEmpty = isPanelsDataEmptyRaw && !hasShownContentRef.current

  // Sync state when loader provides new data (e.g., after URL changes)
  useEffect(() => {
    if (revalidator.state === 'idle' && deferredData.perfData) {
      const { chart, params } = deferredData.perfData
      setChartData(chart || {})
      setPanelsData({
        types: _keys(params),
        data: params,
      })
      if (deferredData.perfOverallStats && id) {
        setOverall(deferredData.perfOverallStats[id] || {})
      }
      setDataLoading(false)
    } else if (revalidator.state === 'loading') {
      setDataLoading(true)
    }
  }, [revalidator.state, deferredData, id])

  // Get chart metrics and measure from URL params (SSR-friendly)
  const activeChartMetrics =
    searchParams.get('perfMetric') || CHART_METRICS_MAPPING_PERF.timing
  const activeMeasure =
    searchParams.get('measure') || CHART_MEASURES_MAPPING_PERF.median

  // Update URL when changing chart metrics or measure
  const setActiveChartMetrics = (metric: string) => {
    const newParams = new URLSearchParams(searchParams.toString())
    newParams.set('perfMetric', metric)
    setSearchParams(newParams)
  }

  const setActiveMeasure = (measure: string) => {
    const newParams = new URLSearchParams(searchParams.toString())
    newParams.set('measure', measure)
    setSearchParams(newParams)
  }

  // Compare mode not implemented via SSR yet - use empty defaults
  const overallCompare: Partial<OverallPerformanceObject> = {}
  const chartDataCompare: any = {}

  // Panel active tabs
  const [activeTabs, setActiveTabs] = useState<{
    location: 'cc' | 'rg' | 'ct' | 'map'
    page: 'pg' | 'host'
    device: 'br' | 'os' | 'dv'
  }>({
    location: 'cc',
    page: 'pg',
    device: 'br',
  })

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
      frontend: t('dashboard.frontend'),
      backend: t('dashboard.backend'),
      network: t('dashboard.network'),
      p50: t('dashboard.xPercentile', { x: 50 }),
      p75: t('dashboard.xPercentile', { x: 75 }),
      p95: t('dashboard.xPercentile', { x: 95 }),
    }),
    [t],
  )

  // Version data mapping for browser/OS versions
  const createVersionDataMapping = useMemo(() => {
    const browserDataSource = panelsData.data?.brv

    const browserVersions: {
      [key: string]: { name: string; count: number }[]
    } = {}

    if (browserDataSource) {
      browserDataSource.forEach((entry: any) => {
        const { br, name, count } = entry
        if (!browserVersions[br]) {
          browserVersions[br] = []
        }
        browserVersions[br].push({ name, count })
      })
    }

    return { browserVersions }
  }, [panelsData.data?.brv])

  // Handle refresh trigger
  useEffect(() => {
    if (performanceRefreshTrigger > 0) {
      revalidator.revalidate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [performanceRefreshTrigger])

  // Show no events if data is empty
  if (isPanelsDataEmpty) {
    return (
      <>
        <DashboardHeader />
        <NoEvents filters={filters} />
      </>
    )
  }

  const ChartTypeSwitcher = ({
    type,
    onSwitch,
  }: {
    type: string
    onSwitch: (type: 'line' | 'bar') => void
  }) => {
    if (type === chartTypes.bar) {
      return (
        <button
          type='button'
          title={t('project.lineChart')}
          onClick={() => onSwitch('line')}
          className='rounded-md border border-transparent bg-gray-50 p-2 text-sm font-medium transition-colors ring-inset hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:bg-slate-900 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200'
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
        className='rounded-md border border-transparent bg-gray-50 p-2 text-sm font-medium transition-colors ring-inset hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:bg-slate-900 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200'
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

  // Fullscreen map view - takes over the entire content area
  if (isMapFullscreen && fullscreenMapRef.current) {
    const countryData = panelsData.data?.cc || []
    const regionData = panelsData.data?.rg || []
    const total = countryData.reduce(
      (acc: number, curr: any) => acc + curr.count,
      0,
    )

    return createPortal(
      <Suspense
        fallback={
          <div className='flex h-full flex-1 items-center justify-center'>
            <div className='flex flex-col items-center gap-2'>
              <div className='h-8 w-8 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent' />
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
          onFullscreenToggle={setIsMapFullscreen}
          isFullscreen={true}
        />
      </Suspense>,
      fullscreenMapRef.current,
    )
  }

  return (
    <>
      <DashboardHeader />
      {dataLoading && !isPanelsDataEmpty ? <LoadingBar /> : null}
      <div className={cx({ hidden: isPanelsDataEmpty })}>
        {!isPanelsDataEmpty ? (
          <Filters className='mb-3' tnMapping={tnMapping} />
        ) : null}
        <div className='relative overflow-hidden rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-800/25'>
          <div className='mb-3 flex w-full items-center justify-end gap-2 lg:absolute lg:top-2 lg:right-2 lg:mb-0 lg:w-auto lg:justify-normal'>
            <Dropdown
              items={chartMetrics}
              className='xs:min-w-0'
              header={t('main.metric')}
              title={[
                <EyeIcon
                  key='eye-icon'
                  aria-label={t('project.metricVis')}
                  className='h-5 w-5'
                />,
              ]}
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
              disabled={
                activeChartMetrics === CHART_METRICS_MAPPING_PERF.quantiles
              }
              items={chartMeasures}
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
                setActiveMeasure(pairID)
              }}
              buttonClassName='!px-2 bg-gray-50 rounded-md border border-transparent hover:border-gray-300 hover:bg-white dark:bg-slate-900 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200'
              chevron='mini'
              headless
            />
            <ChartTypeSwitcher
              onSwitch={setChartTypeOnClick}
              type={chartType}
            />
          </div>

          {!_isEmpty(overall) ? (
            <PerformanceMetricCards
              overall={overall}
              overallCompare={overallCompare}
              activePeriodCompare={activePeriodCompare}
            />
          ) : null}
          {activeChartMetrics && !_isEmpty(chartData) ? (
            <div
              onContextMenu={(e) => handleChartContextMenu(e, chartData?.x)}
              className='relative'
            >
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
                      return (
                        <CCRow
                          cc={cc}
                          name={entryName || undefined}
                          language={language}
                        />
                      )
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
                      valueMapper={(value) =>
                        getStringFromTime(getTimeFromSeconds(value), true)
                      }
                      customRenderer={
                        activeTabs.location === 'map'
                          ? () => {
                              const countryData = panelsData.data?.cc || []
                              const regionData = panelsData.data?.rg || []
                              // @ts-expect-error
                              const total = countryData.reduce(
                                (acc, curr) => acc + curr.count,
                                0,
                              )

                              return (
                                <Suspense
                                  fallback={
                                    <div className='flex h-full items-center justify-center'>
                                      <div className='flex flex-col items-center gap-2'>
                                        <div className='h-8 w-8 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent'></div>
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
                                    onFullscreenToggle={setIsMapFullscreen}
                                    isFullscreen={false}
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
                      rowMapper={getDeviceRowMapper(
                        activeTabs.device,
                        theme,
                        t,
                      )}
                      capitalize={activeTabs.device === 'dv'}
                      versionData={
                        activeTabs.device === 'br'
                          ? createVersionDataMapping.browserVersions
                          : undefined
                      }
                      getVersionFilterLink={(parent, version) =>
                        getVersionFilterLink(parent, version, 'br')
                      }
                      // @ts-expect-error
                      valueMapper={(value) =>
                        getStringFromTime(getTimeFromSeconds(value), true)
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
                      key={activeTabs.page}
                      icon={panelIconMapping.pg}
                      id={activeTabs.page}
                      getFilterLink={getFilterLink}
                      rowMapper={({ name: entryName }) => {
                        if (!entryName) {
                          return (
                            <span className='italic'>
                              {activeTabs.page === 'pg'
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

                        // For page paths (pg tab), show with clickable link
                        if (activeTabs.page === 'pg' && project?.websiteUrl) {
                          return (
                            <PageLinkRow
                              pagePath={decodedUri}
                              websiteUrl={project.websiteUrl}
                            />
                          )
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
                      valueMapper={(value) =>
                        getStringFromTime(getTimeFromSeconds(value), true)
                      }
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
              ? () =>
                  openAnnotationModal(
                    contextMenu.annotation?.date,
                    contextMenu.annotation!,
                  )
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

const PerformanceView = PerformanceViewWrapper

export default PerformanceView

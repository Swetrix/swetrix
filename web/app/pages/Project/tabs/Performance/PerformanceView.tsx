import cx from 'clsx'
import dayjs from 'dayjs'
import _isEmpty from 'lodash/isEmpty'
import { EyeIcon, PercentIcon } from '@phosphor-icons/react'
import React, { useState, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import {
  useCompareSummaryQuery,
  useCompareTimeseriesQuery,
  useSummaryQuery,
  useTimeseriesQuery,
} from '~/hooks/v2/useV2Queries'
import { useAnnotations } from '~/hooks/useAnnotations'
import { Entry } from '~/lib/models/Entry'
import AnnotationModal from '~/modals/AnnotationModal'
import { PerformanceChart } from '~/pages/Project/tabs/Performance/PerformanceChart'
import { PerformanceMap } from '~/pages/Project/tabs/Performance/PerformanceMap'
import {
  perfSummaryToOverall,
  pivotPerformanceTimeseries,
} from '~/pages/Project/tabs/Performance/perfAdapters'
import { PerformanceMetricCards } from '~/pages/Project/tabs/Traffic/MetricCards'
import { SessionsDrawer } from '~/pages/Project/tabs/Traffic/SessionsDrawer'
import PageLinkRow from '~/pages/Project/tabs/Traffic/PageLinkRow'
import CCRow from '~/pages/Project/View/components/CCRow'
import { ChartContextMenu } from '~/pages/Project/View/components/ChartContextMenu'
import DashboardHeader from '~/pages/Project/View/components/DashboardHeader'
import Filters from '~/pages/Project/View/components/Filters'
import NoEvents from '~/pages/Project/View/components/NoEvents'
import ProjectViewHeaderActions from '~/pages/Project/View/components/ProjectViewHeaderActions'
import TabErrorBoundary from '~/pages/Project/View/components/TabErrorBoundary'
import {
  BreakdownPanel,
  BreakdownSubTab,
} from '~/pages/Project/View/v2/BreakdownPanel'
import { useViewProjectContext } from '~/pages/Project/View/ViewProject'
import {
  panelIconMapping,
  CHART_METRICS_MAPPING_PERF,
  CHART_MEASURES_MAPPING_PERF,
  getDeviceRowMapper,
  getUsageTypeLabel,
  getConnectionTypeLabel,
} from '~/pages/Project/View/ViewProject.helpers'
import { getChartPointWindow } from '~/pages/Project/View/utils/chartPoint'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import { useTheme } from '~/providers/ThemeProvider'
import Dropdown from '~/ui/Dropdown'
import Loader from '~/ui/Loader'
import { getStringFromTime, getTimeFromSeconds } from '~/utils/generic'
import { ChartTypeSwitcher } from '../../View/components/ChartTypeSwitcher'
import WaitingForAnEvent from '../../View/components/WaitingForAnEvent'

interface PerformanceViewProps {
  tnMapping: Record<string, string>
}

function PerformanceViewWrapper(props: PerformanceViewProps) {
  const [searchParams] = useSearchParams()
  const resetKey = `performance:${searchParams.toString()}`

  return (
    <TabErrorBoundary
      titleKey='dashboard.failedToLoadPerformance'
      resetKey={resetKey}
    >
      <PerformanceViewInner {...props} />
    </TabErrorBoundary>
  )
}

const PerformanceViewInner = ({ tnMapping }: PerformanceViewProps) => {
  const { id, project, allowedToManage } = useCurrentProject()
  const {
    timezone,
    filters,
    timeFormat,
    timeBucket,
    // Chart state from context
    chartType,
    setChartTypeOnClick,
    rotateXAxis,
    // Zoom state from context
    onMainChartZoom,
    shouldEnableZoom,
    // Filter functions from context
    getVersionFilterLink,
    isMapFullscreen,
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
  const [searchParams, setSearchParams] = useSearchParams()

  const [sessionsDrawer, setSessionsDrawer] = useState<{
    from: string
    to: string
    label: string
  } | null>(null)

  const hasShownContentRef = useRef(false)

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

  const effectiveMeasure =
    activeChartMetrics === CHART_METRICS_MAPPING_PERF.quantiles
      ? CHART_MEASURES_MAPPING_PERF.quantiles
      : activeMeasure
  const panelsMeasure =
    effectiveMeasure === CHART_MEASURES_MAPPING_PERF.quantiles
      ? CHART_MEASURES_MAPPING_PERF.median
      : activeMeasure

  const summaryQuery = useSummaryQuery('performance', {
    measure: activeMeasure,
  })
  const compareSummaryQuery = useCompareSummaryQuery('performance', {
    measure: activeMeasure,
  })
  const timeseriesQuery = useTimeseriesQuery('performance', {
    measure: effectiveMeasure,
  })
  const compareTimeseriesQuery = useCompareTimeseriesQuery('performance', {
    measure: effectiveMeasure,
  })

  const overall = useMemo(
    () => perfSummaryToOverall(summaryQuery.data?.data),
    [summaryQuery.data],
  )
  const overallCompare = useMemo(
    () => perfSummaryToOverall(compareSummaryQuery.data?.data),
    [compareSummaryQuery.data],
  )

  const chartData = useMemo(
    () =>
      pivotPerformanceTimeseries(timeseriesQuery.data?.data, effectiveMeasure),
    [timeseriesQuery.data, effectiveMeasure],
  )
  const chartDataCompare = useMemo(
    () =>
      compareTimeseriesQuery.data
        ? pivotPerformanceTimeseries(
            compareTimeseriesQuery.data.data,
            effectiveMeasure,
          )
        : undefined,
    [compareTimeseriesQuery.data, effectiveMeasure],
  )

  const summaryLoaded = Boolean(summaryQuery.data)

  const isPanelsDataEmptyRaw =
    summaryLoaded &&
    !overall.current?.frontend &&
    !overall.current?.network &&
    !overall.current?.backend

  if (summaryLoaded && !isPanelsDataEmptyRaw) {
    hasShownContentRef.current = true
  }

  const isPanelsDataEmpty = isPanelsDataEmptyRaw && !hasShownContentRef.current

  // Queries keep previous data across period/filter changes, so `isLoading` only
  // ever means "nothing cached to show yet" — exactly when a spinner is wanted.
  const isChartLoading = summaryQuery.isLoading || timeseriesQuery.isLoading

  const handleDataPointClick = useCallback(
    (d: { x: Date; index: number; xValue?: string }) => {
      setSessionsDrawer(
        getChartPointWindow({
          x: d.x,
          xValue: d.xValue,
          timeBucket,
          timezone,
          timeFormat,
        }),
      )
    },
    [timeBucket, timeFormat, timezone],
  )

  // Filter annotations to only those within the chart's visible x-axis range
  const filteredAnnotations = useMemo(() => {
    const xAxis = chartData?.x
    if (!annotations?.length || !xAxis?.length) return annotations || []

    const rangeStart = dayjs(xAxis[0]).startOf('day')
    const rangeEnd = dayjs(xAxis[xAxis.length - 1]).endOf('day')

    return annotations.filter((a) => {
      const d = dayjs(a.date)
      return (
        (d.isAfter(rangeStart) || d.isSame(rangeStart, 'day')) &&
        (d.isBefore(rangeEnd) || d.isSame(rangeEnd, 'day'))
      )
    })
  }, [annotations, chartData])

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

  const locationSubTabs = useMemo<BreakdownSubTab[]>(
    () => [
      { id: 'country', label: t('project.mapping.cc'), dimension: 'country' },
      { id: 'region', label: t('project.mapping.rg'), dimension: 'region' },
      { id: 'city', label: t('project.mapping.ct'), dimension: 'city' },
      {
        id: 'map',
        label: t('project.mapping.map'),
        render: () => (
          <PerformanceMap isFullscreen={false} measure={panelsMeasure} />
        ),
      },
    ],
    [t, panelsMeasure],
  )

  const pagesSubTabs = useMemo<BreakdownSubTab[]>(
    () => [
      { id: 'page', label: t('project.mapping.pg'), dimension: 'page' },
      { id: 'host', label: t('project.mapping.host'), dimension: 'host' },
    ],
    [t],
  )

  const devicesSubTabs = useMemo<BreakdownSubTab[]>(
    () => [
      {
        id: 'browser',
        label: t('project.mapping.br'),
        dimension: 'browser',
        versionsDimension: 'browser_version' as const,
        versionsParentField: 'browser' as const,
      },
      { id: 'device', label: t('project.mapping.dv'), dimension: 'device' },
    ],
    [t],
  )

  const networkSubTabs = useMemo<(BreakdownSubTab | BreakdownSubTab[])[]>(
    () => [
      [
        { id: 'isp', label: t('project.mapping.isp'), dimension: 'isp' },
        {
          id: 'organization',
          label: t('project.mapping.og'),
          dimension: 'organization',
        },
        {
          id: 'user_type',
          label: t('project.mapping.ut'),
          dimension: 'user_type',
        },
        {
          id: 'connection_type',
          label: t('project.mapping.ctp'),
          dimension: 'connection_type',
        },
      ],
    ],
    [t],
  )

  const locationRowMapper = useCallback(
    (entry: Entry) => {
      const { name: entryName, cc } = entry

      if (cc !== undefined) {
        return (
          <CCRow cc={cc} name={entryName || undefined} language={language} />
        )
      }

      return <CCRow cc={entryName} language={language} />
    },
    [language],
  )

  const pagesRowMapper = useCallback(
    (entry: Entry, subTabId: string) => {
      const { name: entryName } = entry

      if (!entryName) {
        return (
          <span className='italic'>
            {subTabId === 'host'
              ? t('project.unknownHost')
              : t('common.notSet')}
          </span>
        )
      }

      let decodedUri = entryName

      try {
        decodedUri = decodeURIComponent(entryName)
      } catch {
        // ignore
      }

      if (subTabId === 'page' && project?.websiteUrl) {
        return (
          <PageLinkRow pagePath={decodedUri} websiteUrl={project.websiteUrl} />
        )
      }

      return decodedUri
    },
    [t, project?.websiteUrl],
  )

  const devicesRowMapper = useCallback(
    (entry: Entry, subTabId: string) => {
      const v1Tab = subTabId === 'browser' ? 'br' : 'dv'
      const mapper = getDeviceRowMapper(v1Tab, theme, t) as
        | ((entry: Entry) => React.ReactNode)
        | undefined
      return mapper ? mapper(entry) : entry.name
    },
    [theme, t],
  )

  const networkRowMapper = useCallback(
    (entry: Entry, subTabId: string) => {
      const { name: entryName } = entry
      if (!entryName) {
        return <span className='italic'>{t('common.notSet')}</span>
      }
      if (subTabId === 'user_type') {
        return getUsageTypeLabel(entryName, t)
      }
      if (subTabId === 'connection_type') {
        return getConnectionTypeLabel(entryName, t)
      }
      return entryName
    },
    [t],
  )

  const loadTimeValueMapper = useCallback(
    (value: number) =>
      getStringFromTime(getTimeFromSeconds(value), true) as unknown as number,
    [],
  )

  // Show waiting state if project has no traffic data yet
  if (!project?.isDataExists) {
    return <WaitingForAnEvent />
  }

  const headerRightContent = <ProjectViewHeaderActions tnMapping={tnMapping} />

  if (isPanelsDataEmpty) {
    return (
      <>
        <DashboardHeader rightContent={headerRightContent} />
        <NoEvents filters={filters} />
      </>
    )
  }

  // Fullscreen map view - takes over the entire content area
  if (isMapFullscreen && fullscreenMapRef.current) {
    return createPortal(
      <PerformanceMap isFullscreen measure={panelsMeasure} />,
      fullscreenMapRef.current,
    )
  }

  return (
    <>
      <DashboardHeader rightContent={headerRightContent} />
      <div className={cx({ hidden: isPanelsDataEmpty })}>
        {!isPanelsDataEmpty ? (
          <Filters className='mb-3' tnMapping={tnMapping} />
        ) : null}
        <div className='relative overflow-hidden rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-900/25'>
          <div className='mb-3 flex w-full items-center justify-end gap-1.5 lg:absolute lg:top-2 lg:right-2 lg:mb-0 lg:w-auto lg:justify-normal'>
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
              buttonClassName='!p-1.5 rounded-md border border-transparent hover:border-gray-300 hover:bg-white hover:dark:border-slate-700/80 hover:dark:bg-slate-950 dark:focus:ring-slate-300'
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
              buttonClassName='!p-1.5 rounded-md border border-transparent hover:border-gray-300 hover:bg-white hover:dark:border-slate-700/80 hover:dark:bg-slate-950 dark:focus:ring-slate-300'
              chevron='mini'
              headless
            />
            <ChartTypeSwitcher
              onSwitch={setChartTypeOnClick}
              type={chartType}
            />
          </div>

          {/* Always rendered: the cards read zero until the summary lands and
              then roll up to it, so the row holds its height instead of
              appearing late and shoving the chart and panels down. */}
          <PerformanceMetricCards
            overall={overall}
            overallCompare={overallCompare}
          />
          {isChartLoading ? (
            // Same box as PerformanceChart below (incl. its mobile mt-5) so the
            // chart drops straight into the spinner's place.
            <div className='mt-5 flex h-80 items-center justify-center md:mt-0'>
              <Loader className='pt-0!' />
            </div>
          ) : activeChartMetrics && !_isEmpty(chartData.x) ? (
            <div
              onContextMenu={(e) => handleChartContextMenu(e, chartData.x)}
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
                annotations={filteredAnnotations}
                onDataPointClick={handleDataPointClick}
              />
            </div>
          ) : null}
        </div>
        <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
          <BreakdownPanel
            dataType='performance'
            highlightColour='orange'
            panelId='location'
            name={t('project.location')}
            icon={panelIconMapping.country}
            subTabs={locationSubTabs}
            primaryMetric='load_time'
            metrics={['load_time']}
            measure={panelsMeasure}
            rowMapper={locationRowMapper}
            valueMapper={loadTimeValueMapper}
            valuesHeaderName={t('project.loadTime')}
          />
          <BreakdownPanel
            dataType='performance'
            highlightColour='orange'
            panelId='pages'
            name={t('project.pages')}
            icon={panelIconMapping.page}
            subTabs={pagesSubTabs}
            primaryMetric='load_time'
            metrics={['load_time']}
            measure={panelsMeasure}
            rowMapper={pagesRowMapper}
            valueMapper={loadTimeValueMapper}
            valuesHeaderName={t('project.loadTime')}
          />
          <BreakdownPanel
            dataType='performance'
            highlightColour='orange'
            panelId='devices'
            name={t('project.devices')}
            icon={panelIconMapping.os}
            subTabs={devicesSubTabs}
            primaryMetric='load_time'
            metrics={['load_time']}
            measure={panelsMeasure}
            rowMapper={devicesRowMapper}
            valueMapper={loadTimeValueMapper}
            capitalize={['device']}
            getVersionFilterLink={(parent, version) =>
              getVersionFilterLink(parent, version, 'browser')
            }
            valuesHeaderName={t('project.loadTime')}
          />
          <BreakdownPanel
            dataType='performance'
            highlightColour='orange'
            panelId='network'
            name={t('project.network')}
            icon={panelIconMapping.isp}
            subTabs={networkSubTabs}
            primaryMetric='load_time'
            metrics={['load_time']}
            measure={panelsMeasure}
            rowMapper={networkRowMapper}
            valueMapper={loadTimeValueMapper}
            valuesHeaderName={t('project.loadTime')}
          />
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
        <SessionsDrawer
          isOpen={!!sessionsDrawer}
          onClose={() => setSessionsDrawer(null)}
          from={sessionsDrawer?.from || ''}
          to={sessionsDrawer?.to || ''}
          label={sessionsDrawer?.label || ''}
          projectId={id}
          timezone={timezone}
          timeFormat={timeFormat as '12-hour' | '24-hour'}
          filters={filters}
          sessionEvent='performance'
        />
      </div>
    </>
  )
}

const PerformanceView = PerformanceViewWrapper

export default PerformanceView

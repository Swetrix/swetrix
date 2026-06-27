import {
  ArrowClockwiseIcon,
  EyeIcon,
  InfoIcon,
  LinkIcon,
  PlugIcon,
  RobotIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  TargetIcon,
  ChartBarIcon,
  TrendUpIcon,
} from '@phosphor-icons/react'
import dayjs from 'dayjs'
import _isEmpty from 'lodash/isEmpty'
import _round from 'lodash/round'
import React, {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  use,
  useState,
} from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from '~/ui/Link'
import { useLoaderData, useSearchParams } from 'react-router'

import { useGSCDashboardProxy } from '~/hooks/useAnalyticsProxy'
import { useAnnotations } from '~/hooks/useAnnotations'
import { DOCS_URL } from '~/lib/constants'
import type { TimeBucket } from '~/lib/constants'
import type { Entry } from '~/lib/models/Entry'
import BillboardChart from '~/ui/BillboardChart'
import AnnotationModal from '~/modals/AnnotationModal'
import { ChartContextMenu } from '~/pages/Project/View/components/ChartContextMenu'
import DashboardHeader from '~/pages/Project/View/components/DashboardHeader'
import { MainChart } from '~/pages/Project/View/components/MainChart'
import Filters from '~/pages/Project/View/components/Filters'
import ProjectViewHeaderActions from '~/pages/Project/View/components/ProjectViewHeaderActions'
import TabErrorBoundary from '~/pages/Project/View/components/TabErrorBoundary'
import {
  Panel,
  PanelContainer,
  PanelEmptyState,
} from '~/pages/Project/View/Panels'
import {
  useViewProjectContext,
  useRefreshTriggers,
} from '~/pages/Project/View/ViewProject'
import {
  noRegionPeriods,
  panelIconMapping,
  getDeviceRowMapper,
} from '~/pages/Project/View/ViewProject.helpers'
import { MetricCard } from '~/pages/Project/tabs/Traffic/MetricCards'
import RefRow from '~/pages/Project/tabs/Traffic/RefRow'
import CCRow from '~/pages/Project/View/components/CCRow'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import { useTheme } from '~/providers/ThemeProvider'
import type { ProjectLoaderData } from '~/routes/projects.$id'
import Checkbox from '~/ui/Checkbox'
import Dropdown from '~/ui/Dropdown'
import Loader from '~/ui/Loader'
import LoadingBar from '~/ui/LoadingBar'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'
import { nFormatter } from '~/utils/generic'
import countries from '~/utils/isoCountries'
import { getSearchEngineReferrals, getAIReferrals } from '~/utils/referrers'
import routes from '~/utils/routes'

import CompactReferralPanel from './CompactReferralPanel'
import {
  SEO_METRICS,
  type SEOMetricKey,
  aggregateDateSeries,
  getGSCCompatibleFilters,
  hasOrganicPositionData,
} from './seo-utils'
import type { QuadrantData } from './seo-chart-options'
import {
  buildMainChartOptions,
  buildQuadrantChartOptions,
  buildDonutChartOptions,
  buildImpressionsByPositionChartOptions,
  buildOrganicPositionsChartOptions,
} from './seo-chart-options'

interface SEOViewProps {
  projectId: string
  tnMapping: Record<string, string>
}

const SEO_DOCS_URL = `${DOCS_URL}/analytics-dashboard/seo`

const SEOViewInner = ({ projectId, tnMapping }: SEOViewProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const { theme } = useTheme()
  const { id, allowedToManage } = useCurrentProject()
  const {
    period,
    timezone,
    timeFormat,
    timeBucket,
    periodPairs,
    filters,
    getFilterLink,
    isActiveCompare,
  } = useViewProjectContext()
  const { seoRefreshTrigger } = useRefreshTriggers()
  const { fetchDashboard, data, error, isLoading } = useGSCDashboardProxy()
  const {
    fetchDashboard: fetchCompareDashboard,
    data: compareData,
    error: compareError,
    isLoading: isCompareLoading,
    resetData: resetCompareData,
  } = useGSCDashboardProxy()
  const [searchParams, setSearchParams] = useSearchParams()
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

  const [activeMetrics, setActiveMetrics] = useState<
    Record<SEOMetricKey, boolean>
  >({
    clicks: true,
    impressions: true,
    position: false,
    ctr: false,
  })

  const seoPeriodPairs = useMemo(
    () =>
      periodPairs
        .filter(
          (p) =>
            p.period !== '1h' &&
            p.period !== 'today' &&
            p.period !== 'yesterday',
        )
        .map((p) => {
          const tbs = p.tbs.filter((tb): tb is TimeBucket => tb !== 'minute')
          return { ...p, tbs: tbs.length ? tbs : (['day'] as TimeBucket[]) }
        }),
    [periodPairs],
  )

  const activeSeoPeriod = useMemo(
    () => seoPeriodPairs.find((p) => p.period === period),
    [seoPeriodPairs, period],
  )

  const urlTimeBucket = searchParams.get('timeBucket') as TimeBucket | null

  const seoTimeBucket = useMemo<TimeBucket>(() => {
    if (!urlTimeBucket && activeSeoPeriod?.tbs.includes('day')) {
      return 'day'
    }

    if (activeSeoPeriod?.tbs.includes(timeBucket as TimeBucket)) {
      return timeBucket as TimeBucket
    }

    return activeSeoPeriod?.tbs[0] || (timeBucket as TimeBucket)
  }, [activeSeoPeriod, timeBucket, urlTimeBucket])

  useEffect(() => {
    if (
      urlTimeBucket ||
      !activeSeoPeriod?.tbs.includes('day') ||
      timeBucket === 'day'
    ) {
      return
    }

    const newSearchParams = new URLSearchParams(searchParams.toString())
    newSearchParams.set('timeBucket', 'day')
    setSearchParams(newSearchParams, { replace: true })
  }, [
    activeSeoPeriod,
    searchParams,
    setSearchParams,
    timeBucket,
    urlTimeBucket,
  ])

  const metricItems = useMemo(
    () => [
      {
        id: SEO_METRICS.clicks,
        label: t('project.seo.clicks'),
        active: activeMetrics.clicks,
      },
      {
        id: SEO_METRICS.impressions,
        label: t('project.seo.impressions'),
        active: activeMetrics.impressions,
      },
      {
        id: SEO_METRICS.position,
        label: t('project.seo.avgPosition'),
        active: activeMetrics.position,
      },
      {
        id: SEO_METRICS.ctr,
        label: t('project.seo.avgCTR'),
        active: activeMetrics.ctr,
      },
    ],
    [t, activeMetrics],
  )

  const toggleMetric = useCallback((metricId: string) => {
    setActiveMetrics((prev) => ({
      ...prev,
      [metricId]: !prev[metricId as SEOMetricKey],
    }))
  }, [])

  const { trafficData: trafficDataPromise } = useLoaderData<ProjectLoaderData>()

  const trafficData = trafficDataPromise ? use(trafficDataPromise) : null

  const refEntries: Entry[] = useMemo(() => {
    const refParams = trafficData?.params?.ref
    if (!refParams) return []
    return refParams.map((r: { name: string; count: number }) => ({
      name: r.name,
      count: r.count,
    }))
  }, [trafficData])

  const searchEngineEntries = useMemo(
    () => getSearchEngineReferrals(refEntries),
    [refEntries],
  )
  const aiReferralEntries = useMemo(
    () => getAIReferrals(refEntries),
    [refEntries],
  )

  const refRowMapper = useCallback(
    ({ name: entryName }: any) => <RefRow rowName={entryName} />,
    [],
  )

  const noopFilterLink = useCallback(() => '#', [])
  const gscFilters = useMemo(() => getGSCCompatibleFilters(filters), [filters])
  const gscLoading = isLoading || isCompareLoading
  const gscError = error || compareError

  const [isManualRefreshing, setIsManualRefreshing] = useState(false)

  const prevTrigger = useRef(seoRefreshTrigger)

  const from = searchParams.get('from') || undefined
  const to = searchParams.get('to') || undefined
  const compareEnabled = searchParams.get('compare') === 'true'
  const compareFrom = searchParams.get('compareFrom') || undefined
  const compareTo = searchParams.get('compareTo') || undefined

  const loadData = useCallback(async () => {
    const params = {
      period,
      from,
      to,
      timezone,
      timeBucket: seoTimeBucket,
      filters: gscFilters,
    }

    const currentPromise = fetchDashboard(projectId, params)

    if (isActiveCompare && compareEnabled && compareFrom && compareTo) {
      resetCompareData()
      await Promise.all([
        currentPromise,
        fetchCompareDashboard(projectId, {
          ...params,
          period: 'custom',
          from: compareFrom,
          to: compareTo,
        }),
      ])
      return
    }

    resetCompareData()
    await currentPromise
  }, [
    fetchDashboard,
    fetchCompareDashboard,
    resetCompareData,
    projectId,
    period,
    from,
    to,
    compareEnabled,
    compareFrom,
    compareTo,
    timezone,
    seoTimeBucket,
    gscFilters,
    isActiveCompare,
  ])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (seoRefreshTrigger !== prevTrigger.current) {
      prevTrigger.current = seoRefreshTrigger
      loadData()
    }
  }, [seoRefreshTrigger, loadData])

  const handleManualRefresh = useCallback(async () => {
    if (isManualRefreshing) return
    setIsManualRefreshing(true)
    try {
      await loadData()
    } finally {
      setIsManualRefreshing(false)
    }
  }, [isManualRefreshing, loadData])

  const manualRefreshButton = useMemo(
    () => (
      <button
        type='button'
        title={t('project.refreshStats')}
        onClick={handleManualRefresh}
        className='relative rounded-md border border-transparent p-2 transition-all ring-inset hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-slate-900 focus:outline-hidden hover:dark:border-slate-700/80 dark:hover:bg-slate-900 dark:focus:ring-slate-300'
      >
        <ArrowClockwiseIcon
          className={`h-5 w-5 text-gray-700 dark:text-gray-50 ${isManualRefreshing ? 'animate-spin' : ''}`}
        />
      </button>
    ),
    [t, handleManualRefresh, isManualRefreshing],
  )

  const aggregatedSeries = useMemo(
    () => aggregateDateSeries(data?.dateSeries || [], seoTimeBucket),
    [data?.dateSeries, seoTimeBucket],
  )

  const aggregatedCompareSeries = useMemo(
    () => aggregateDateSeries(compareData?.dateSeries || [], seoTimeBucket),
    [compareData?.dateSeries, seoTimeBucket],
  )

  const chartXAxisData = useMemo(
    () => aggregatedSeries.map((entry) => entry.date),
    [aggregatedSeries],
  )

  const filteredAnnotations = useMemo(() => {
    if (!annotations?.length || !chartXAxisData.length) return annotations || []

    const rangeStart = dayjs(chartXAxisData[0]).startOf('day')
    const rangeEnd = dayjs(chartXAxisData[chartXAxisData.length - 1]).endOf(
      'day',
    )

    return annotations.filter((annotation) => {
      const date = dayjs(annotation.date)
      return (
        (date.isAfter(rangeStart) || date.isSame(rangeStart, 'day')) &&
        (date.isBefore(rangeEnd) || date.isSame(rangeEnd, 'day'))
      )
    })
  }, [annotations, chartXAxisData])

  const topPagesAsEntries: Entry[] = useMemo(
    () =>
      (data?.topPages || []).map(
        (p) =>
          ({
            name: p.page,
            count: p.clicks,
            impressions: p.impressions,
            ctr: p.ctr,
            position: p.position,
          }) as Entry & { impressions: number; ctr: number; position: number },
      ),
    [data?.topPages],
  )

  const topQueriesAsEntries: (Entry & {
    impressions: number
    ctr: number
    position: number
  })[] = useMemo(
    () =>
      (data?.topQueries || []).map(
        (q) =>
          ({
            name: q.name,
            count: q.count,
            impressions: q.impressions,
            ctr: q.ctr,
            position: q.position,
          }) as Entry & { impressions: number; ctr: number; position: number },
      ),
    [data?.topQueries],
  )

  const topCountriesAsEntries: Entry[] = useMemo(
    () =>
      (data?.topCountries || []).map((c) => {
        const alpha2 =
          countries.alpha3ToAlpha2(c.country.toUpperCase())?.toLowerCase() ||
          c.country
        return {
          name: alpha2,
          count: c.clicks,
          impressions: c.impressions,
          ctr: c.ctr,
          position: c.position,
        } as Entry & { impressions: number; ctr: number; position: number }
      }),
    [data?.topCountries],
  )

  const topDevicesAsEntries: Entry[] = useMemo(
    () =>
      (data?.topDevices || []).map(
        (d) =>
          ({
            name: d.device,
            count: d.clicks,
            impressions: d.impressions,
            ctr: d.ctr,
            position: d.position,
          }) as Entry & { impressions: number; ctr: number; position: number },
      ),
    [data?.topDevices],
  )

  const isBrandedTrafficSkipped = data?.brandedTraffic?.skipped === true

  const brandedTraffic = useMemo(() => {
    if (!data?.brandedTraffic || data.brandedTraffic.skipped) {
      return { branded: 0, nonBranded: 0 }
    }

    return data.brandedTraffic
  }, [data?.brandedTraffic])

  const donutChartOptions = useMemo(
    () =>
      buildDonutChartOptions(
        brandedTraffic.branded,
        brandedTraffic.nonBranded,
        theme,
        t,
      ),
    [brandedTraffic, t, theme],
  )

  const impressionsByPosition = useMemo(
    () => data?.impressionsByPosition || [],
    [data?.impressionsByPosition],
  )

  const organicPositions = useMemo(
    () => data?.organicPositions || [],
    [data?.organicPositions],
  )

  const isPositionAnalyticsSkipped =
    data?.positionAnalyticsSkipped === true ||
    data?.impressionsByPosition === null ||
    data?.organicPositions === null

  const hasImpressionsByPositionData = useMemo(
    () => impressionsByPosition.some((bucket) => bucket.impressions > 0),
    [impressionsByPosition],
  )

  const hasOrganicPositions = useMemo(
    () => hasOrganicPositionData(organicPositions),
    [organicPositions],
  )

  const impressionsByPositionOptions = useMemo(
    () =>
      buildImpressionsByPositionChartOptions(impressionsByPosition, theme, t),
    [impressionsByPosition, theme, t],
  )

  const organicPositionsOptions = useMemo(
    () => buildOrganicPositionsChartOptions(organicPositions, theme, t),
    [organicPositions, theme, t],
  )

  const countryRowMapper = useCallback(
    (entry: any) => <CCRow cc={entry.name} language={language} />,
    [language],
  )

  const deviceRowMapper = useMemo(
    () => getDeviceRowMapper('dv', theme, t),
    [theme, t],
  )

  const anyMetricActive = Object.values(activeMetrics).some(Boolean)

  const quadrantData: QuadrantData | null = useMemo(() => {
    if (!topQueriesAsEntries.length) return null
    const positions = topQueriesAsEntries.map((q) => q.position)
    const ctrs = topQueriesAsEntries.map((q) => q.ctr)
    const impressions = topQueriesAsEntries.map((q) => q.impressions)
    const names = topQueriesAsEntries.map((q) => q.name ?? '')

    const maxImp = Math.max(...impressions) || 1
    const minImp = Math.min(...impressions) || 0

    return { positions, ctrs, impressions, names, maxImp, minImp }
  }, [topQueriesAsEntries])

  const quadrantChartOptions = useMemo(() => {
    if (!quadrantData) return {}
    const avgCtr = data?.summary?.ctr ?? 5
    const avgPos = data?.summary?.position ?? 10
    return buildQuadrantChartOptions(quadrantData, avgCtr, avgPos, theme, t)
  }, [quadrantData, data?.summary, theme, t])

  const comparisonSummary =
    isActiveCompare && compareEnabled
      ? compareData?.summary
      : data?.previousSummary

  const chartOptions = useMemo(
    () =>
      buildMainChartOptions(
        aggregatedSeries,
        activeMetrics,
        seoTimeBucket,
        t,
        !noRegionPeriods.includes(period),
        filteredAnnotations,
        isActiveCompare && compareEnabled && aggregatedCompareSeries.length
          ? aggregatedCompareSeries
          : undefined,
      ),
    [
      aggregatedSeries,
      activeMetrics,
      seoTimeBucket,
      t,
      isActiveCompare,
      compareEnabled,
      aggregatedCompareSeries,
      period,
      filteredAnnotations,
    ],
  )

  const detailsExtraColumns = useMemo(
    () => [
      {
        header: t('project.seo.impressions'),
        render: (entry: any) => nFormatter(entry.impressions ?? 0, 1),
        sortLabel: 'impressions',
        getSortValue: (entry: any) => entry.impressions ?? 0,
      },
      {
        header: t('project.seo.ctr'),
        render: (entry: any) => `${entry.ctr ?? 0}%`,
        sortLabel: 'ctr',
        getSortValue: (entry: any) => entry.ctr ?? 0,
      },
      {
        header: t('project.seo.position'),
        render: (entry: any) => entry.position ?? 0,
        sortLabel: 'position',
        getSortValue: (entry: any) => entry.position ?? 0,
      },
    ],
    [t],
  )

  const seoGscRowTooltip = useCallback(
    (entry: any) => {
      const pos = entry.position ?? 0
      const posDisplay = Number(pos).toFixed(1)

      return (
        <ul className='m-0 max-h-[250px] list-none overflow-y-auto p-0 md:max-h-[350px]'>
          <li className='sticky top-0 mb-1 border-b border-gray-200 bg-gray-50 pb-1 dark:border-slate-800 dark:bg-slate-900'>
            <Text
              as='div'
              size='xs'
              weight='semibold'
              colour='primary'
              truncate
              className='max-w-[220px] md:text-sm'
            >
              {entry.name}
            </Text>
          </li>
          <li className='flex items-center justify-between py-px leading-snug'>
            <div className='mr-4 flex min-w-0 items-center'>
              <Text
                as='span'
                size='xs'
                colour='secondary'
                truncate
                className='md:text-sm'
              >
                {t('project.seo.position')}
              </Text>
            </div>
            <Text
              as='span'
              size='xs'
              weight='semibold'
              colour='primary'
              className='font-mono whitespace-nowrap tabular-nums md:text-sm'
            >
              {posDisplay}
            </Text>
          </li>
          <li className='flex items-center justify-between py-px leading-snug'>
            <div className='mr-4 flex min-w-0 items-center'>
              <Text
                as='span'
                size='xs'
                colour='secondary'
                truncate
                className='md:text-sm'
              >
                {t('project.seo.impressions')}
              </Text>
            </div>
            <Text
              as='span'
              size='xs'
              colour='primary'
              className='font-mono whitespace-nowrap tabular-nums md:text-sm'
            >
              {nFormatter(entry.impressions ?? 0, 1)}
            </Text>
          </li>
          <li className='flex items-center justify-between py-px leading-snug'>
            <div className='mr-4 flex min-w-0 items-center'>
              <Text
                as='span'
                size='xs'
                colour='secondary'
                truncate
                className='md:text-sm'
              >
                {t('project.seo.clicks')}
              </Text>
            </div>
            <Text
              as='span'
              size='xs'
              colour='primary'
              className='font-mono whitespace-nowrap tabular-nums md:text-sm'
            >
              {nFormatter(entry.count ?? 0, 1)}
            </Text>
          </li>
          <li className='flex items-center justify-between py-px leading-snug'>
            <div className='mr-4 flex min-w-0 items-center'>
              <Text
                as='span'
                size='xs'
                colour='secondary'
                truncate
                className='md:text-sm'
              >
                {t('project.seo.ctr')}
              </Text>
            </div>
            <Text
              as='span'
              size='xs'
              colour='primary'
              className='font-mono whitespace-nowrap tabular-nums md:text-sm'
            >
              {entry.ctr ?? 0}%
            </Text>
          </li>
        </ul>
      )
    },
    [t],
  )

  if (gscLoading && !data) {
    return (
      <>
        <DashboardHeader
          showSearchButton={false}
          showRefreshButton={false}
          rightContent={
            <ProjectViewHeaderActions
              tnMapping={tnMapping}
              extraActions={manualRefreshButton}
            />
          }
          timeBucketSelectorItems={seoPeriodPairs}
        />
        <div className='flex min-h-[400px] items-center justify-center'>
          <Loader />
        </div>
      </>
    )
  }

  if (gscError && !data) {
    return (
      <>
        <DashboardHeader
          showSearchButton={false}
          showRefreshButton={false}
          rightContent={
            <ProjectViewHeaderActions
              tnMapping={tnMapping}
              extraActions={manualRefreshButton}
            />
          }
          timeBucketSelectorItems={seoPeriodPairs}
        />
        <div className='mx-auto flex min-h-[400px] max-w-xl flex-col items-center justify-center px-4 text-center'>
          <Text as='h3' size='lg' weight='medium'>
            {t('apiNotifications.somethingWentWrong')}
          </Text>
          <Text as='p' size='sm' colour='secondary' className='mt-2'>
            {gscError}
          </Text>
        </div>
      </>
    )
  }

  if (data?.notConnected) {
    return (
      <>
        <DashboardHeader
          showSearchButton={false}
          showRefreshButton={false}
          rightContent={
            <ProjectViewHeaderActions
              tnMapping={tnMapping}
              extraActions={manualRefreshButton}
            />
          }
          timeBucketSelectorItems={seoPeriodPairs}
        />
        <div className='mx-auto w-full max-w-2xl py-16 text-center'>
          <div className='mx-auto mb-6 flex size-14 items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-900'>
            <PlugIcon
              className='size-7 text-gray-700 dark:text-gray-200'
              weight='duotone'
            />
          </div>
          <Text as='h3' size='xl' weight='medium' className='tracking-tight'>
            {t('project.seo.connectGSC')}
          </Text>
          <Text
            as='p'
            size='sm'
            colour='secondary'
            className='mx-auto mt-2 max-w-md'
          >
            <Trans
              t={t}
              i18nKey='project.seo.connectGSCDesc'
              components={{
                docs: (
                  <a
                    href={SEO_DOCS_URL}
                    aria-label={t('ariaLabels.openSeoGuide')}
                    className='font-medium underline decoration-dashed hover:decoration-solid'
                    target='_blank'
                    rel='noreferrer noopener'
                  />
                ),
              }}
            />
          </Text>
          {data?.noProperty ? (
            <Text
              as='p'
              size='sm'
              className='mx-auto mt-2 max-w-md text-amber-600 dark:text-amber-400'
            >
              {t('project.seo.noProperty')}
            </Text>
          ) : null}
          <Link
            to={`${routes.project_settings.replace(':id', id)}?tab=integrations`}
            className='mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200'
          >
            <LinkIcon className='size-4' />
            {t('project.seo.connectButton')}
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      <DashboardHeader
        showSearchButton={false}
        showRefreshButton={false}
        rightContent={
          <ProjectViewHeaderActions
            tnMapping={tnMapping}
            extraActions={manualRefreshButton}
          />
        }
        timeBucketSelectorItems={seoPeriodPairs}
      />
      {filters.length > 0 ? (
        <Filters className='mb-3' tnMapping={tnMapping} />
      ) : null}
      {gscLoading && data ? <LoadingBar /> : null}

      <div className='relative overflow-hidden rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-900/25'>
        <div className='mb-3 flex w-full items-center justify-end gap-1 lg:absolute lg:top-2 lg:right-2 lg:mb-0 lg:w-auto lg:justify-normal'>
          <Dropdown
            header={t('project.metricVis')}
            items={metricItems}
            title={[
              <EyeIcon
                key='eye-icon'
                aria-label={t('project.metricVis')}
                className='h-5 w-5'
              />,
            ]}
            labelExtractor={(pair) => {
              if (!pair) return null
              return (
                <Checkbox
                  classes={{ label: 'p-2' }}
                  label={pair.label}
                  checked={pair.active}
                  onChange={() => toggleMetric(pair.id)}
                />
              )
            }}
            buttonClassName='!p-1.5 rounded-md border border-transparent hover:border-gray-300 hover:bg-white hover:dark:border-slate-700/80 hover:dark:bg-slate-950 dark:focus:ring-slate-300'
            selectItemClassName='p-0'
            keyExtractor={(pair) => pair?.id || ''}
            onSelect={(pair, e) => {
              if (!pair) return
              e?.stopPropagation()
              e?.preventDefault()
              toggleMetric(pair.id)
            }}
            chevron='mini'
            headless
          />
        </div>
        <div className='mb-5 flex flex-wrap justify-center gap-5 lg:justify-start'>
          <MetricCard
            label={t('project.seo.clicks')}
            value={data?.summary?.clicks ?? 0}
            change={
              comparisonSummary
                ? (data?.summary?.clicks ?? 0) - comparisonSummary.clicks
                : undefined
            }
            goodChangeDirection='down'
            valueMapper={(value, type) =>
              `${type === 'badge' && value > 0 ? '+' : ''}${nFormatter(value, 1)}`
            }
          />
          <MetricCard
            label={t('project.seo.impressions')}
            value={data?.summary?.impressions ?? 0}
            change={
              comparisonSummary
                ? (data?.summary?.impressions ?? 0) -
                  comparisonSummary.impressions
                : undefined
            }
            goodChangeDirection='down'
            valueMapper={(value, type) =>
              `${type === 'badge' && value > 0 ? '+' : ''}${nFormatter(value, 1)}`
            }
          />
          <MetricCard
            label={t('project.seo.avgCTR')}
            value={_round(data?.summary?.ctr ?? 0, 2)}
            change={
              comparisonSummary
                ? _round((data?.summary?.ctr ?? 0) - comparisonSummary.ctr, 2)
                : undefined
            }
            type='percent'
            goodChangeDirection='down'
            valueMapper={(value, type) =>
              `${type === 'badge' && value > 0 ? '+' : ''}${value}%`
            }
          />
          <MetricCard
            label={t('project.seo.avgPosition')}
            value={_round(data?.summary?.position ?? 0, 1)}
            change={
              comparisonSummary
                ? _round(
                    (data?.summary?.position ?? 0) - comparisonSummary.position,
                    1,
                  )
                : undefined
            }
            goodChangeDirection='up'
            valueMapper={(value, type) =>
              `${type === 'badge' && value > 0 ? '+' : ''}${value}`
            }
          />
        </div>
        {anyMetricActive && !_isEmpty(aggregatedSeries) ? (
          <div
            onContextMenu={(event) =>
              handleChartContextMenu(event, chartXAxisData)
            }
            className='relative'
          >
            <MainChart
              chartId='seo-main-chart'
              options={chartOptions}
              className='h-80 [&_svg]:overflow-visible!'
              deps={[
                aggregatedSeries,
                aggregatedCompareSeries,
                activeMetrics,
                seoTimeBucket,
                timeFormat,
                period,
                filteredAnnotations,
              ]}
            />
          </div>
        ) : null}
      </div>

      <div className='mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_minmax(0,0.7fr)]'>
        <CompactReferralPanel
          title={t('project.seo.searchEngines')}
          data={searchEngineEntries}
          icon={panelIconMapping.ref}
          rowMapper={refRowMapper}
        />
        <CompactReferralPanel
          title={t('project.seo.aiReferrals')}
          data={aiReferralEntries}
          icon={<RobotIcon className='h-5 w-5' />}
          rowMapper={refRowMapper}
        />
        <div className='overflow-hidden rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-slate-800/60 dark:bg-slate-900/25'>
          <div className='mb-1 flex items-center gap-1 text-gray-900 dark:text-gray-50'>
            <MagnifyingGlassIcon className='size-5' />
            <Text size='sm' weight='semibold'>
              {t('project.seo.brandedTraffic')}
            </Text>
          </div>
          {isBrandedTrafficSkipped ? (
            <PanelEmptyState message={t('project.seo.analyticsSkipped')} />
          ) : brandedTraffic.branded + brandedTraffic.nonBranded > 0 ? (
            <BillboardChart
              options={donutChartOptions}
              className='[&_.bb-chart-arc]:text-xs [&_.bb-chart-arcs-title]:fill-gray-900 [&_.bb-chart-arcs-title]:text-lg [&_.bb-chart-arcs-title]:font-semibold dark:[&_.bb-chart-arcs-title]:fill-gray-100'
              deps={[brandedTraffic, theme]}
            />
          ) : (
            <PanelEmptyState message={t('project.seo.noBrandData')} />
          )}
        </div>
      </div>

      <div className='mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)]'>
        <PanelContainer
          name={t('project.seo.impressionsByPosition')}
          icon={<ChartBarIcon className='size-5' />}
          type='impressionsByPosition'
          contentClassName='relative flex min-h-[21rem] flex-col overflow-hidden'
        >
          {isPositionAnalyticsSkipped ? (
            <PanelEmptyState message={t('project.seo.analyticsSkipped')} />
          ) : hasImpressionsByPositionData ? (
            <BillboardChart
              options={impressionsByPositionOptions}
              className='seo-impressions-position-chart min-h-72 flex-1 [&_svg]:overflow-visible!'
              deps={[impressionsByPosition, theme, t]}
            />
          ) : (
            <PanelEmptyState message={t('project.seo.noPositionData')} />
          )}
        </PanelContainer>

        <PanelContainer
          name={t('project.seo.organicPositions')}
          icon={<TrendUpIcon className='size-5' />}
          type='organicPositions'
          contentClassName='relative flex min-h-[21rem] flex-col overflow-hidden'
        >
          {isPositionAnalyticsSkipped ? (
            <PanelEmptyState message={t('project.seo.analyticsSkipped')} />
          ) : hasOrganicPositions ? (
            <BillboardChart
              options={organicPositionsOptions}
              className='min-h-80 flex-1 [&_svg]:overflow-visible!'
              deps={[organicPositions, theme, t]}
            />
          ) : (
            <PanelEmptyState message={t('project.seo.noPositionData')} />
          )}
        </PanelContainer>
      </div>

      <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
        <Panel
          name={t('project.seo.topPages')}
          data={topPagesAsEntries}
          icon={panelIconMapping.pg}
          id='pg'
          activeTabId='pg'
          disableRowClick={false}
          getFilterLink={getFilterLink}
          valuesHeaderName={t('project.seo.clicks')}
          detailsExtraColumns={detailsExtraColumns}
          hidePercentageInDetails
          dataLoading={gscLoading}
          rowTooltipRenderer={seoGscRowTooltip}
          rowTooltipFollowCursor
        />
        <Panel
          name={t('project.seo.topQueries')}
          data={topQueriesAsEntries}
          icon={<MagnifyingGlassIcon className='h-5 w-5' />}
          id='keywords'
          activeTabId='keywords'
          disableRowClick={false}
          getFilterLink={getFilterLink}
          valuesHeaderName={t('project.seo.clicks')}
          detailsExtraColumns={detailsExtraColumns}
          hidePercentageInDetails
          dataLoading={gscLoading}
          rowTooltipRenderer={seoGscRowTooltip}
          rowTooltipFollowCursor
        />
      </div>

      <div className='mt-3'>
        <PanelContainer
          name={t('project.seo.quadrant')}
          icon={<TargetIcon className='size-5' />}
          type='quadrant'
          tooltip={
            <Tooltip
              text={
                <span className='whitespace-pre-line'>
                  <Trans
                    i18nKey='project.seo.quadrantTooltip'
                    components={{
                      highlight: <span className='font-semibold' />,
                    }}
                  />
                </span>
              }
              tooltipNode={
                <InfoIcon className='size-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300' />
              }
            />
          }
          contentClassName=''
        >
          {quadrantData ? (
            <BillboardChart
              options={quadrantChartOptions}
              className='h-[400px] [&_.bb-circle]:fill-indigo-500/60 [&_.bb-circle]:stroke-indigo-600 [&_.bb-circle]:stroke-1 dark:[&_.bb-circle]:fill-indigo-400/60 dark:[&_.bb-circle]:stroke-indigo-300'
              deps={[quadrantData, theme, t]}
            />
          ) : (
            <PanelEmptyState message={t('project.noParamData')} />
          )}
        </PanelContainer>
      </div>

      <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
        <Panel
          name={t('project.location')}
          data={topCountriesAsEntries}
          icon={<MapPinIcon className='h-5 w-5' />}
          id='country'
          activeTabId='cc'
          disableRowClick
          getFilterLink={noopFilterLink}
          rowMapper={countryRowMapper}
          valuesHeaderName={t('project.seo.clicks')}
          detailsExtraColumns={detailsExtraColumns}
          hidePercentageInDetails
          dataLoading={gscLoading}
        />
        <Panel
          name={t('project.devices')}
          data={topDevicesAsEntries}
          icon={panelIconMapping.dv}
          id='device'
          activeTabId='dv'
          disableRowClick
          getFilterLink={noopFilterLink}
          rowMapper={deviceRowMapper}
          capitalize
          valuesHeaderName={t('project.seo.clicks')}
          detailsExtraColumns={detailsExtraColumns}
          hidePercentageInDetails
          dataLoading={gscLoading}
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
    </>
  )
}

const SEOView = ({ projectId, tnMapping }: SEOViewProps) => {
  const [searchParams] = useSearchParams()
  const { seoRefreshTrigger } = useRefreshTriggers()
  const resetKey = `seo:${projectId}:${searchParams.toString()}:${seoRefreshTrigger}`

  return (
    <TabErrorBoundary titleKey='dashboard.failedToLoadSeo' resetKey={resetKey}>
      <React.Suspense
        fallback={
          <div className='flex min-h-[400px] items-center justify-center'>
            <Loader />
          </div>
        }
      >
        <SEOViewInner projectId={projectId} tnMapping={tnMapping} />
      </React.Suspense>
    </TabErrorBoundary>
  )
}

export default SEOView

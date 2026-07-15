import {
  ArrowsClockwiseIcon,
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
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from '~/ui/Link'
import { useSearchParams } from 'react-router'

import { useAnnotations } from '~/hooks/useAnnotations'
import { useInViewOnce } from '~/hooks/useInViewOnce'
import {
  useBreakdownQuery,
  useCompareSummaryQuery,
  useCompareTimeseriesQuery,
  useSeoBrandedTrafficQuery,
  useSeoPositionsQuery,
  useSeoStatusQuery,
  useSummaryQuery,
  useTimeseriesQuery,
} from '~/hooks/v2/useV2Queries'
import { DOCS_URL } from '~/lib/constants'
import type { TimeBucket } from '~/lib/constants'
import type { Entry } from '~/lib/models/Entry'
import AnnotationModal from '~/modals/AnnotationModal'
import { ChartContextMenu } from '~/pages/Project/View/components/ChartContextMenu'
import DashboardHeader from '~/pages/Project/View/components/DashboardHeader'
import Filters from '~/pages/Project/View/components/Filters'
import { MainChart } from '~/pages/Project/View/components/MainChart'
import ProjectViewHeaderActions from '~/pages/Project/View/components/ProjectViewHeaderActions'
import TabErrorBoundary from '~/pages/Project/View/components/TabErrorBoundary'
import CCRow from '~/pages/Project/View/components/CCRow'
import {
  PanelContainer,
  PanelEmptyState,
  PanelLoadingState,
} from '~/pages/Project/View/Panels'
import {
  BreakdownPanel,
  type BreakdownSubTab,
} from '~/pages/Project/View/v2/BreakdownPanel'
import { mapBreakdownRows } from '~/pages/Project/View/v2/adapters'
import { useViewProjectContext } from '~/pages/Project/View/ViewProject'
import {
  noRegionPeriods,
  panelIconMapping,
  getDeviceRowMapper,
} from '~/pages/Project/View/ViewProject.helpers'
import { MetricCard } from '~/pages/Project/tabs/Traffic/MetricCards'
import RefRow from '~/pages/Project/tabs/Traffic/RefRow'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import { useTheme } from '~/providers/ThemeProvider'
import BillboardChart from '~/ui/BillboardChart'
import Button from '~/ui/Button'
import Checkbox from '~/ui/Checkbox'
import Dropdown from '~/ui/Dropdown'
import Loader from '~/ui/Loader'
import { CompactNumberFlow, PercentFlow } from '~/ui/NumberFlow'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'
import { nFormatter } from '~/utils/generic'
import { getSearchEngineReferrals, getAIReferrals } from '~/utils/referrers'
import routes from '~/utils/routes'

import CompactReferralPanel from './CompactReferralPanel'
import {
  SEO_METRICS,
  type SEOMetricKey,
  hasOrganicPositionData,
  seoTimeseriesToDateSeries,
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

// Every metric the seo endpoints expose. Panels ask for all four so impressions,
// CTR and position are available for the extra columns and row tooltips.
const SEO_BREAKDOWN_METRICS = ['clicks', 'impressions', 'ctr', 'position']

// Search Console orders rows by clicks descending and offers no sort control.
const SEO_SORT = 'clicks:desc'

const QUADRANT_QUERY_LIMIT = 50

const SEOViewInner = ({ tnMapping }: SEOViewProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const { theme } = useTheme()
  const { id, allowedToManage } = useCurrentProject()
  const {
    period,
    timeFormat,
    timeBucket,
    periodPairs,
    filters,
    getFilterLink,
    isActiveCompare,
  } = useViewProjectContext()
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

  const statusQuery = useSeoStatusQuery()
  const status = statusQuery.data?.data
  const isConnected = Boolean(status?.connected && status?.property)

  // The expensive rollups and the quadrant only fetch once scrolled to, so an
  // SEO page load costs Search Console nothing it does not display. The panels
  // below gate their spinner on isPending rather than isLoading: a query that
  // is disabled (not yet scrolled to) or paused (offline) is pending but not
  // fetching, and isLoading would call that "no data" instead of "not yet".
  const { ref: brandedRef, hasBeenInView: brandedInView } = useInViewOnce()
  const { ref: positionsRef, hasBeenInView: positionsInView } = useInViewOnce()
  const { ref: quadrantRef, hasBeenInView: quadrantInView } = useInViewOnce()

  const summaryQuery = useSummaryQuery('seo', { enabled: isConnected })
  const compareSummaryQuery = useCompareSummaryQuery('seo', {
    enabled: isConnected,
  })
  const timeseriesQuery = useTimeseriesQuery('seo', {
    timeBucket: seoTimeBucket,
    enabled: isConnected,
  })
  const compareTimeseriesQuery = useCompareTimeseriesQuery('seo', {
    timeBucket: seoTimeBucket,
    enabled: isConnected,
  })
  const brandedQuery = useSeoBrandedTrafficQuery({
    enabled: isConnected && brandedInView,
  })
  const positionsQuery = useSeoPositionsQuery({
    enabled: isConnected && positionsInView,
  })
  const quadrantQuery = useBreakdownQuery('seo', {
    dimension: 'query',
    metrics: SEO_BREAKDOWN_METRICS,
    limit: QUADRANT_QUERY_LIMIT,
    sort: SEO_SORT,
    enabled: isConnected && quadrantInView,
  })

  const referrerQuery = useBreakdownQuery('traffic', {
    dimension: 'referrer',
    limit: 100,
    sort: 'visitors:desc',
  })

  const refEntries: Entry[] = useMemo(
    () => mapBreakdownRows(referrerQuery.data?.data),
    [referrerQuery.data],
  )

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

  const summary = summaryQuery.data?.data.current
  const comparisonSummary = isActiveCompare
    ? compareSummaryQuery.data?.data.current
    : summaryQuery.data?.data.previous

  const series = useMemo(
    () => seoTimeseriesToDateSeries(timeseriesQuery.data?.data, seoTimeBucket),
    [timeseriesQuery.data, seoTimeBucket],
  )

  const compareSeries = useMemo(
    () =>
      seoTimeseriesToDateSeries(
        compareTimeseriesQuery.data?.data,
        seoTimeBucket,
      ),
    [compareTimeseriesQuery.data, seoTimeBucket],
  )

  const chartXAxisData = useMemo(
    () => series.map((entry) => entry.date),
    [series],
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

  const isBrandedTrafficSkipped = brandedQuery.data?.meta.skipped === true

  const brandedTraffic = useMemo(
    () => brandedQuery.data?.data ?? { branded: 0, nonBranded: 0 },
    [brandedQuery.data],
  )

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

  const isPositionAnalyticsSkipped = positionsQuery.data?.meta.skipped === true

  const impressionsByPosition = useMemo(
    () => positionsQuery.data?.data?.impressionsByPosition ?? [],
    [positionsQuery.data],
  )

  const organicPositions = useMemo(
    () => positionsQuery.data?.data?.organicPositions ?? [],
    [positionsQuery.data],
  )

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

  const deviceRowMapper = useCallback(
    (entry: Entry) => {
      const mapper = getDeviceRowMapper('dv', theme, t) as
        | ((entry: Entry) => React.ReactNode)
        | undefined
      return mapper ? mapper(entry) : entry.name
    },
    [theme, t],
  )

  const anyMetricActive = Object.values(activeMetrics).some(Boolean)

  const quadrantData: QuadrantData | null = useMemo(() => {
    const entries = mapBreakdownRows(
      quadrantQuery.data?.data,
      'clicks',
      SEO_BREAKDOWN_METRICS,
    ) as (Entry & { impressions: number; ctr: number; position: number })[]

    if (!entries.length) return null

    const positions = entries.map((q) => q.position)
    const ctrs = entries.map((q) => q.ctr)
    const impressions = entries.map((q) => q.impressions)
    const names = entries.map((q) => q.name ?? '')

    const maxImp = Math.max(...impressions) || 1
    const minImp = Math.min(...impressions) || 0

    return { positions, ctrs, impressions, names, maxImp, minImp }
  }, [quadrantQuery.data])

  const quadrantChartOptions = useMemo(() => {
    if (!quadrantData) return {}
    const avgCtr = summary?.ctr ?? 5
    const avgPos = summary?.position ?? 10
    return buildQuadrantChartOptions(quadrantData, avgCtr, avgPos, theme, t)
  }, [quadrantData, summary, theme, t])

  const chartOptions = useMemo(
    () =>
      buildMainChartOptions(
        series,
        activeMetrics,
        seoTimeBucket,
        t,
        !noRegionPeriods.includes(period),
        filteredAnnotations,
        isActiveCompare && compareSeries.length ? compareSeries : undefined,
      ),
    [
      series,
      activeMetrics,
      seoTimeBucket,
      t,
      isActiveCompare,
      compareSeries,
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

  const pagesSubTabs = useMemo<BreakdownSubTab[]>(
    () => [{ id: 'page', label: t('project.seo.page'), dimension: 'page' }],
    [t],
  )

  const queriesSubTabs = useMemo<BreakdownSubTab[]>(
    () => [{ id: 'query', label: t('project.seo.query'), dimension: 'query' }],
    [t],
  )

  const countriesSubTabs = useMemo<BreakdownSubTab[]>(
    () => [
      { id: 'country', label: t('project.mapping.cc'), dimension: 'country' },
    ],
    [t],
  )

  const devicesSubTabs = useMemo<BreakdownSubTab[]>(
    () => [
      { id: 'device', label: t('project.mapping.dv'), dimension: 'device' },
    ],
    [t],
  )

  const header = (
    <DashboardHeader
      showSearchButton={false}
      rightContent={<ProjectViewHeaderActions tnMapping={tnMapping} />}
      timeBucketSelectorItems={seoPeriodPairs}
    />
  )

  if (statusQuery.isLoading) {
    return (
      <>
        {header}
        <div className='flex min-h-[400px] items-center justify-center'>
          <Loader />
        </div>
      </>
    )
  }

  if (statusQuery.isError) {
    return (
      <>
        {header}
        <div className='mx-auto flex min-h-[400px] max-w-xl flex-col items-center justify-center px-4 text-center'>
          <Text as='h3' size='lg' weight='medium'>
            {t('apiNotifications.somethingWentWrong')}
          </Text>
          <Button
            className='mt-3 gap-1.5'
            onClick={() => statusQuery.refetch()}
            variant='secondary'
            size='sm'
          >
            <ArrowsClockwiseIcon className='size-4' />
            {t('project.refreshStats')}
          </Button>
        </div>
      </>
    )
  }

  if (!isConnected) {
    return (
      <>
        {header}
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
          {status?.connected && !status?.property ? (
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

  const isHeroLoading = summaryQuery.isPending || timeseriesQuery.isPending
  const isHeroError = summaryQuery.isError || timeseriesQuery.isError

  return (
    <>
      {header}
      {filters.length > 0 ? (
        <Filters className='mb-3' tnMapping={tnMapping} />
      ) : null}

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
            value={summary?.clicks ?? 0}
            change={
              comparisonSummary
                ? (summary?.clicks ?? 0) - comparisonSummary.clicks
                : undefined
            }
            goodChangeDirection='down'
            valueMapper={(value, type) =>
              type === 'badge' ? (
                `${value > 0 ? '+' : ''}${nFormatter(value, 1)}`
              ) : (
                <CompactNumberFlow value={value} />
              )
            }
          />
          <MetricCard
            label={t('project.seo.impressions')}
            value={summary?.impressions ?? 0}
            change={
              comparisonSummary
                ? (summary?.impressions ?? 0) - comparisonSummary.impressions
                : undefined
            }
            goodChangeDirection='down'
            valueMapper={(value, type) =>
              type === 'badge' ? (
                `${value > 0 ? '+' : ''}${nFormatter(value, 1)}`
              ) : (
                <CompactNumberFlow value={value} />
              )
            }
          />
          <MetricCard
            label={t('project.seo.avgCTR')}
            value={_round(summary?.ctr ?? 0, 2)}
            change={
              comparisonSummary
                ? _round((summary?.ctr ?? 0) - comparisonSummary.ctr, 2)
                : undefined
            }
            type='percent'
            goodChangeDirection='down'
            valueMapper={(value, type) =>
              type === 'badge' ? (
                `${value > 0 ? '+' : ''}${value}%`
              ) : (
                <PercentFlow value={value} />
              )
            }
          />
          <MetricCard
            label={t('project.seo.avgPosition')}
            value={_round(summary?.position ?? 0, 1)}
            change={
              comparisonSummary
                ? _round(
                    (summary?.position ?? 0) - comparisonSummary.position,
                    1,
                  )
                : undefined
            }
            goodChangeDirection='up'
            valueMapper={(value, type) =>
              type === 'badge' ? (
                `${value > 0 ? '+' : ''}${value}`
              ) : (
                <CompactNumberFlow value={value} />
              )
            }
          />
        </div>
        {isHeroError ? (
          <div className='flex h-80 flex-col items-center justify-center text-center'>
            <Text as='p' size='sm' colour='secondary'>
              {t('apiNotifications.somethingWentWrong')}
            </Text>
            <Button
              className='mt-3 gap-1.5'
              onClick={() => {
                summaryQuery.refetch()
                timeseriesQuery.refetch()
              }}
              variant='secondary'
              size='sm'
            >
              <ArrowsClockwiseIcon className='size-4' />
              {t('project.refreshStats')}
            </Button>
          </div>
        ) : isHeroLoading ? (
          <div className='flex h-80 items-center justify-center'>
            <Loader className='pt-0!' />
          </div>
        ) : anyMetricActive && !_isEmpty(series) ? (
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
                series,
                compareSeries,
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
          icon={panelIconMapping.referrer}
          rowMapper={refRowMapper}
          isLoading={referrerQuery.isLoading}
        />
        <CompactReferralPanel
          title={t('project.seo.aiReferrals')}
          data={aiReferralEntries}
          icon={<RobotIcon className='h-5 w-5' />}
          rowMapper={refRowMapper}
          isLoading={referrerQuery.isLoading}
        />
        <div
          ref={brandedRef}
          className='overflow-hidden rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-slate-800/60 dark:bg-slate-900/25'
        >
          <div className='mb-1 flex items-center gap-1 text-gray-900 dark:text-gray-50'>
            <MagnifyingGlassIcon className='size-5' />
            <Text size='sm' weight='semibold'>
              {t('project.seo.brandedTraffic')}
            </Text>
          </div>
          {brandedQuery.isPending ? (
            <PanelLoadingState />
          ) : brandedQuery.isError ? (
            <PanelEmptyState
              message={t('apiNotifications.somethingWentWrong')}
            />
          ) : isBrandedTrafficSkipped ? (
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

      <div
        ref={positionsRef}
        className='mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)]'
      >
        <PanelContainer
          name={t('project.seo.impressionsByPosition')}
          icon={<ChartBarIcon className='size-5' />}
          type='impressionsByPosition'
          contentClassName='relative flex min-h-[21rem] flex-col overflow-hidden'
          isLoading={positionsQuery.isPending}
          isRefetching={positionsQuery.isFetching && !positionsQuery.isPending}
        >
          {positionsQuery.isError ? (
            <PanelEmptyState
              message={t('apiNotifications.somethingWentWrong')}
            />
          ) : isPositionAnalyticsSkipped ? (
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
          isLoading={positionsQuery.isPending}
          isRefetching={positionsQuery.isFetching && !positionsQuery.isPending}
        >
          {positionsQuery.isError ? (
            <PanelEmptyState
              message={t('apiNotifications.somethingWentWrong')}
            />
          ) : isPositionAnalyticsSkipped ? (
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
        <BreakdownPanel
          dataType='seo'
          panelId='pages'
          name={t('project.seo.topPages')}
          icon={panelIconMapping.page}
          subTabs={pagesSubTabs}
          primaryMetric='clicks'
          metrics={SEO_BREAKDOWN_METRICS}
          sort={SEO_SORT}
          getFilterLink={getFilterLink}
          valuesHeaderName={t('project.seo.clicks')}
          detailsExtraColumns={detailsExtraColumns}
          hidePercentageInDetails
          rowTooltipRenderer={seoGscRowTooltip}
          rowTooltipFollowCursor
        />
        <BreakdownPanel
          dataType='seo'
          panelId='queries'
          name={t('project.seo.topQueries')}
          icon={<MagnifyingGlassIcon className='h-5 w-5' />}
          subTabs={queriesSubTabs}
          primaryMetric='clicks'
          metrics={SEO_BREAKDOWN_METRICS}
          sort={SEO_SORT}
          getFilterLink={getFilterLink}
          valuesHeaderName={t('project.seo.clicks')}
          detailsExtraColumns={detailsExtraColumns}
          hidePercentageInDetails
          rowTooltipRenderer={seoGscRowTooltip}
          rowTooltipFollowCursor
        />
      </div>

      <div className='mt-3' ref={quadrantRef}>
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
          {quadrantQuery.isPending ? (
            <div className='flex h-[400px] items-center justify-center'>
              <Loader className='pt-0!' />
            </div>
          ) : quadrantQuery.isError ? (
            <PanelEmptyState
              message={t('apiNotifications.somethingWentWrong')}
            />
          ) : quadrantData ? (
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
        <BreakdownPanel
          dataType='seo'
          panelId='location'
          name={t('project.location')}
          icon={<MapPinIcon className='h-5 w-5' />}
          subTabs={countriesSubTabs}
          primaryMetric='clicks'
          metrics={SEO_BREAKDOWN_METRICS}
          sort={SEO_SORT}
          getFilterLink={getFilterLink}
          rowMapper={countryRowMapper}
          valuesHeaderName={t('project.seo.clicks')}
          detailsExtraColumns={detailsExtraColumns}
          hidePercentageInDetails
        />
        <BreakdownPanel
          dataType='seo'
          panelId='devices'
          name={t('project.devices')}
          icon={panelIconMapping.device}
          subTabs={devicesSubTabs}
          primaryMetric='clicks'
          metrics={SEO_BREAKDOWN_METRICS}
          sort={SEO_SORT}
          getFilterLink={getFilterLink}
          rowMapper={deviceRowMapper}
          capitalize={['device']}
          valuesHeaderName={t('project.seo.clicks')}
          detailsExtraColumns={detailsExtraColumns}
          hidePercentageInDetails
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
  const resetKey = `seo:${projectId}:${searchParams.toString()}`

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

import {
  ArrowClockwiseIcon,
  EyeIcon,
  LinkIcon,
  PlugIcon,
  RobotIcon,
  MagnifyingGlassIcon,
} from '@phosphor-icons/react'
import type { ChartOptions } from 'billboard.js'
import { area } from 'billboard.js'
import * as d3 from 'd3'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import quarterOfYear from 'dayjs/plugin/quarterOfYear'
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
import { useTranslation } from 'react-i18next'
import { Link, useLoaderData, useSearchParams } from 'react-router'

dayjs.extend(isoWeek)
dayjs.extend(quarterOfYear)

import { useGSCDashboardProxy } from '~/hooks/useAnalyticsProxy'
import type { TimeBucket } from '~/lib/constants'
import type { Entry } from '~/lib/models/Entry'
import DashboardHeader from '~/pages/Project/View/components/DashboardHeader'
import { MainChart } from '~/pages/Project/View/components/MainChart'
import Filters from '~/pages/Project/View/components/Filters'
import { Panel } from '~/pages/Project/View/Panels'
import {
  useViewProjectContext,
  useRefreshTriggers,
} from '~/pages/Project/View/ViewProject'
import { panelIconMapping } from '~/pages/Project/View/ViewProject.helpers'
import { MetricCard } from '~/pages/Project/tabs/Traffic/MetricCards'
import RefRow from '~/pages/Project/tabs/Traffic/RefRow'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import type { ProjectLoaderData } from '~/routes/projects.$id'
import Checkbox from '~/ui/Checkbox'
import Dropdown from '~/ui/Dropdown'
import Loader from '~/ui/Loader'
import { Text } from '~/ui/Text'
import { nFormatter } from '~/utils/generic'
import { getSearchEngineReferrals, getAIReferrals } from '~/utils/referrers'
import routes from '~/utils/routes'

interface SEOViewProps {
  projectId: string
  tnMapping: Record<string, string>
}

const SEO_METRICS = {
  clicks: 'clicks',
  impressions: 'impressions',
  position: 'position',
  ctr: 'ctr',
} as const

type SEOMetricKey = keyof typeof SEO_METRICS

interface DateSeriesEntry {
  date: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

const getBucketKey = (date: string, bucket: string): string => {
  const d = dayjs(date)
  switch (bucket) {
    case 'hour':
    case 'day':
      return date
    case 'week':
      return d.startOf('isoWeek').format('YYYY-MM-DD')
    case 'month':
      return d.startOf('month').format('YYYY-MM-DD')
    case 'quarter':
      return d.startOf('quarter').format('YYYY-MM-DD')
    case 'year':
      return d.startOf('year').format('YYYY-MM-DD')
    default:
      return date
  }
}

const aggregateDateSeries = (
  series: DateSeriesEntry[],
  bucket: string,
): DateSeriesEntry[] => {
  if (!series.length || bucket === 'day' || bucket === 'hour') return series

  const buckets = new Map<
    string,
    {
      clicks: number
      impressions: number
      ctr: number
      position: number
      count: number
    }
  >()
  const orderedKeys: string[] = []

  for (const entry of series) {
    const key = getBucketKey(entry.date, bucket)
    const existing = buckets.get(key)
    if (existing) {
      existing.clicks += entry.clicks
      existing.impressions += entry.impressions
      existing.ctr += entry.ctr
      existing.position += entry.position
      existing.count += 1
    } else {
      orderedKeys.push(key)
      buckets.set(key, {
        clicks: entry.clicks,
        impressions: entry.impressions,
        ctr: entry.ctr,
        position: entry.position,
        count: 1,
      })
    }
  }

  return orderedKeys.map((key) => {
    const b = buckets.get(key)!
    return {
      date: key,
      clicks: b.clicks,
      impressions: b.impressions,
      ctr: Number((b.ctr / b.count).toFixed(2)),
      position: Number((b.position / b.count).toFixed(1)),
    }
  })
}

const SEOViewInner = ({ projectId, tnMapping }: SEOViewProps) => {
  const { t } = useTranslation('common')
  const { id } = useCurrentProject()
  const {
    period,
    timezone,
    timeFormat,
    timeBucket,
    periodPairs,
    filters,
    getFilterLink,
  } = useViewProjectContext()
  const { seoRefreshTrigger } = useRefreshTriggers()
  const { fetchDashboard, data, isLoading } = useGSCDashboardProxy()
  const [searchParams] = useSearchParams()

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

  const metricItems = useMemo(
    () => [
      {
        id: SEO_METRICS.clicks,
        label: t('dashboard.seoClicks'),
        active: activeMetrics.clicks,
      },
      {
        id: SEO_METRICS.impressions,
        label: t('dashboard.seoImpressions'),
        active: activeMetrics.impressions,
      },
      {
        id: SEO_METRICS.position,
        label: t('dashboard.seoAvgPosition'),
        active: activeMetrics.position,
      },
      {
        id: SEO_METRICS.ctr,
        label: t('dashboard.seoAvgCTR'),
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

  const [isManualRefreshing, setIsManualRefreshing] = useState(false)

  const prevTrigger = useRef(seoRefreshTrigger)

  const from = searchParams.get('from') || undefined
  const to = searchParams.get('to') || undefined

  const loadData = useCallback(async () => {
    await fetchDashboard(projectId, {
      period,
      from,
      to,
      timezone,
      timeBucket,
      filters,
    })
  }, [
    fetchDashboard,
    projectId,
    period,
    from,
    to,
    timezone,
    timeBucket,
    filters,
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
    await loadData()
    setIsManualRefreshing(false)
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
    () => aggregateDateSeries(data?.dateSeries || [], timeBucket),
    [data?.dateSeries, timeBucket],
  )

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

  const topQueriesAsEntries: Entry[] = useMemo(
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

  const anyMetricActive = Object.values(activeMetrics).some(Boolean)

  const chartOptions: ChartOptions = useMemo(() => {
    if (!aggregatedSeries.length) return {}

    const dates = aggregatedSeries.map((d) => d.date)
    const columns: any[] = [['x', ...dates]]
    const colors: Record<string, string> = {}
    const axes: Record<string, string> = {}
    let needsY2 = false

    if (activeMetrics.clicks) {
      const label = t('dashboard.seoClicks')
      columns.push([label, ...aggregatedSeries.map((d) => d.clicks)])
      colors[label] = '#3b82f6' // blue-500 - matching GSC
    }

    if (activeMetrics.impressions) {
      const label = t('dashboard.seoImpressions')
      columns.push([label, ...aggregatedSeries.map((d) => d.impressions)])
      colors[label] = '#5b21b6' // violet-800 - matching GSC
      if (activeMetrics.clicks) {
        axes[label] = 'y2'
        needsY2 = true
      }
    }

    if (activeMetrics.position) {
      const label = t('dashboard.seoAvgPosition')
      columns.push([label, ...aggregatedSeries.map((d) => d.position)])
      colors[label] = '#d97706' // amber-600 - matching GSC
      if (activeMetrics.clicks || activeMetrics.impressions) {
        axes[label] = 'y2'
        needsY2 = true
      }
    }

    if (activeMetrics.ctr) {
      const label = t('dashboard.seoAvgCTR')
      columns.push([label, ...aggregatedSeries.map((d) => d.ctr)])
      colors[label] = '#0d9488' // teal-600 - matching GSC
      if (activeMetrics.clicks || activeMetrics.impressions) {
        axes[label] = 'y2'
        needsY2 = true
      }
    }

    const tickFormatMap: Record<string, string> = {
      hour: '%b %d %H:%M',
      day: '%b %d',
      week: '%b %d',
      month: '%b %Y',
      quarter: '%b %Y',
      year: '%Y',
    }
    const tickFormat = tickFormatMap[timeBucket] || '%b %d'

    return {
      data: {
        x: 'x',
        xFormat: timeBucket === 'hour' ? '%Y-%m-%d %H:%M:%S' : '%Y-%m-%d',
        columns,
        type: area(),
        axes,
        colors,
      },
      area: {
        linearGradient: true,
      },
      transition: {
        duration: 200,
      },
      resize: {
        auto: true,
        timer: false,
      },
      axis: {
        x: {
          clipPath: false,
          type: 'timeseries',
          tick: {
            fit: true,
            format: tickFormat,
            rotate: 0,
          },
        },
        y: {
          tick: {
            format: (d: number) => nFormatter(d, 1),
          },
          show: true,
          inner: true,
          min: 0,
          padding: { bottom: 0 },
        },
        y2: {
          show: needsY2,
          tick: {
            format: (d: number) => nFormatter(d, 1),
          },
          inner: true,
          min: 0,
          padding: { bottom: 0 },
        },
      },
      point: {
        focus: {
          only: dates.length > 1,
        },
        pattern: ['circle'],
        r: 2,
      },
      grid: {
        y: {
          show: true,
        },
      },
      legend: {
        item: {
          tile: {
            type: 'circle',
            width: 10,
            r: 3,
          },
        },
      },
      tooltip: {
        contents: (items, _defaultTitleFormat, _defaultValueFormat, color) => {
          const tooltipFormatMap: Record<string, string> = {
            hour: '%b %d, %Y %H:%M',
            day: '%b %d, %Y',
            week: 'Week of %b %d, %Y',
            month: '%B %Y',
            quarter: '%B %Y',
            year: '%Y',
          }
          const tooltipFmt = tooltipFormatMap[timeBucket] || '%b %d, %Y'
          const headerLabel = d3.timeFormat(tooltipFmt)(items[0].x)
          return `<ul class='bg-gray-50 dark:text-gray-50 dark:bg-slate-900 rounded-md ring-1 ring-black/10 px-2 py-1 text-xs md:text-sm max-h-[250px] md:max-h-[350px] overflow-y-auto shadow-md z-50'>
            <li class='font-semibold pb-1 mb-1 border-b border-gray-200 dark:border-slate-800 sticky top-0 bg-gray-50 dark:bg-slate-900'>${headerLabel}</li>
            ${items
              .map((el: any) => {
                const isCtr = el.name === t('dashboard.seoAvgCTR')
                const isPos = el.name === t('dashboard.seoAvgPosition')
                let formatted = nFormatter(el.value, 1)
                if (isCtr) formatted = `${Number(el.value).toFixed(1)}%`
                else if (isPos) formatted = Number(el.value).toFixed(1)

                return `
            <li class='flex justify-between items-center py-px leading-snug'>
              <div class='flex items-center min-w-0 mr-4'>
                <div class='w-2.5 h-2.5 rounded-xs mr-1.5 shrink-0' style=background-color:${color(el.id)}></div>
                <span class="truncate">${el.name}</span>
              </div>
              <span class='font-mono whitespace-nowrap'>${formatted}</span>
            </li>`
              })
              .join('')}
          </ul>`
        },
      },
      padding: { right: needsY2 ? 20 : undefined },
    }
  }, [aggregatedSeries, activeMetrics, timeBucket, t])

  const detailsExtraColumns = useMemo(
    () => [
      {
        header: t('dashboard.seoImpressions'),
        render: (entry: any) => nFormatter(entry.impressions ?? 0, 1),
        sortLabel: 'impressions',
        getSortValue: (entry: any) => entry.impressions ?? 0,
      },
      {
        header: t('dashboard.seoCTR'),
        render: (entry: any) => `${entry.ctr ?? 0}%`,
        sortLabel: 'ctr',
        getSortValue: (entry: any) => entry.ctr ?? 0,
      },
      {
        header: t('dashboard.seoPosition'),
        render: (entry: any) => entry.position ?? 0,
        sortLabel: 'position',
        getSortValue: (entry: any) => entry.position ?? 0,
      },
    ],
    [t],
  )

  if (isLoading && !data) {
    return (
      <>
        <DashboardHeader
          showSearchButton={false}
          showRefreshButton={false}
          rightContent={manualRefreshButton}
          timeBucketSelectorItems={seoPeriodPairs}
        />
        <div className='flex min-h-[400px] items-center justify-center'>
          <Loader />
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
          rightContent={manualRefreshButton}
          timeBucketSelectorItems={seoPeriodPairs}
        />
        <div className='mx-auto flex max-w-lg flex-col items-center justify-center py-16 text-center'>
          <div className='mb-4 flex size-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-slate-800'>
            <PlugIcon
              className='size-8 text-gray-400 dark:text-gray-500'
              weight='duotone'
            />
          </div>
          <Text size='xl' weight='bold' className='mb-2'>
            {t('dashboard.seoConnectGSC')}
          </Text>
          <Text size='sm' className='mb-6 text-gray-500 dark:text-gray-400'>
            {t('dashboard.seoConnectGSCDesc')}
          </Text>
          {data?.noProperty ? (
            <Text size='sm' className='mb-4 text-amber-600 dark:text-amber-400'>
              {t('dashboard.seoNoProperty')}
            </Text>
          ) : null}
          <Link
            to={`${routes.project_settings.replace(':id', id)}?tab=integrations`}
            className='inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200'
          >
            <LinkIcon className='size-4' />
            {t('dashboard.seoConnectButton')}
          </Link>

          {refEntries.length > 0 ? (
            <div className='mt-10 grid w-full grid-cols-1 gap-3 sm:grid-cols-2'>
              <Panel
                name={t('dashboard.seoSearchEngines')}
                data={searchEngineEntries}
                icon={panelIconMapping.ref}
                id='seo-search-engines'
                activeTabId='searchEngine'
                disableRowClick
                rowMapper={refRowMapper}
                getFilterLink={noopFilterLink}
                valuesHeaderName={t('project.visitors')}
              />
              <Panel
                name={t('dashboard.seoAIReferrals')}
                data={aiReferralEntries}
                icon={<RobotIcon className='h-5 w-5' />}
                id='seo-ai-referrals'
                activeTabId='aiReferral'
                disableRowClick
                rowMapper={refRowMapper}
                getFilterLink={noopFilterLink}
                valuesHeaderName={t('project.visitors')}
              />
            </div>
          ) : null}
        </div>
      </>
    )
  }

  return (
    <>
      <DashboardHeader
        showSearchButton={false}
        showRefreshButton={false}
        rightContent={manualRefreshButton}
        timeBucketSelectorItems={seoPeriodPairs}
      />
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
            label={t('dashboard.seoClicks')}
            value={data?.summary?.clicks ?? 0}
            change={
              data?.previousSummary
                ? (data.summary?.clicks ?? 0) - data.previousSummary.clicks
                : undefined
            }
            goodChangeDirection='down'
            valueMapper={(value, type) =>
              `${type === 'badge' && value > 0 ? '+' : ''}${nFormatter(value, 1)}`
            }
          />
          <MetricCard
            label={t('dashboard.seoImpressions')}
            value={data?.summary?.impressions ?? 0}
            change={
              data?.previousSummary
                ? (data.summary?.impressions ?? 0) -
                  data.previousSummary.impressions
                : undefined
            }
            goodChangeDirection='down'
            valueMapper={(value, type) =>
              `${type === 'badge' && value > 0 ? '+' : ''}${nFormatter(value, 1)}`
            }
          />
          <MetricCard
            label={t('dashboard.seoAvgCTR')}
            value={_round(data?.summary?.ctr ?? 0, 2)}
            change={
              data?.previousSummary
                ? _round((data.summary?.ctr ?? 0) - data.previousSummary.ctr, 2)
                : undefined
            }
            type='percent'
            goodChangeDirection='down'
            valueMapper={(value, type) =>
              `${type === 'badge' && value > 0 ? '+' : ''}${value}%`
            }
          />
          <MetricCard
            label={t('dashboard.seoAvgPosition')}
            value={_round(data?.summary?.position ?? 0, 1)}
            change={
              data?.previousSummary
                ? _round(
                    (data.summary?.position ?? 0) -
                      data.previousSummary.position,
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
          <MainChart
            chartId='seo-main-chart'
            options={chartOptions}
            className='h-80 [&_svg]:overflow-visible!'
            deps={[aggregatedSeries, activeMetrics, timeBucket, timeFormat]}
          />
        ) : null}
      </div>

      <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
        <Panel
          name={t('dashboard.seoSearchEngines')}
          data={searchEngineEntries}
          icon={panelIconMapping.ref}
          id='seo-search-engines'
          activeTabId='searchEngine'
          disableRowClick
          rowMapper={refRowMapper}
          getFilterLink={noopFilterLink}
          valuesHeaderName={t('project.visitors')}
        />
        <Panel
          name={t('dashboard.seoAIReferrals')}
          data={aiReferralEntries}
          icon={<RobotIcon className='h-5 w-5' />}
          id='seo-ai-referrals'
          activeTabId='aiReferral'
          disableRowClick
          rowMapper={refRowMapper}
          getFilterLink={noopFilterLink}
          valuesHeaderName={t('project.visitors')}
        />
      </div>

      <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
        <Panel
          name={t('dashboard.seoTopPages')}
          data={topPagesAsEntries}
          icon={panelIconMapping.pg}
          id='pg'
          activeTabId='pg'
          disableRowClick={false}
          getFilterLink={getFilterLink}
          valuesHeaderName={t('dashboard.seoClicks')}
          detailsExtraColumns={detailsExtraColumns}
          hidePercentageInDetails
          dataLoading={isLoading}
        />
        <Panel
          name={t('dashboard.seoTopQueries')}
          data={topQueriesAsEntries}
          icon={<MagnifyingGlassIcon className='h-5 w-5' />}
          id='keywords'
          activeTabId='keywords'
          disableRowClick={false}
          getFilterLink={getFilterLink}
          valuesHeaderName={t('dashboard.seoClicks')}
          detailsExtraColumns={detailsExtraColumns}
          hidePercentageInDetails
          dataLoading={isLoading}
        />
      </div>
    </>
  )
}

const SEOView = ({ projectId, tnMapping }: SEOViewProps) => {
  return (
    <React.Suspense
      fallback={
        <div className='flex min-h-[400px] items-center justify-center'>
          <Loader />
        </div>
      }
    >
      <SEOViewInner projectId={projectId} tnMapping={tnMapping} />
    </React.Suspense>
  )
}

export default SEOView

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
} from '@phosphor-icons/react'
import type { ChartOptions } from 'billboard.js'
import { area, donut, scatter } from 'billboard.js'
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
import { Trans, useTranslation } from 'react-i18next'
import { Link, useLoaderData, useSearchParams } from 'react-router'

dayjs.extend(isoWeek)
dayjs.extend(quarterOfYear)

import { useGSCDashboardProxy } from '~/hooks/useAnalyticsProxy'
import type { TimeBucket } from '~/lib/constants'
import type { Entry } from '~/lib/models/Entry'
import type { Project } from '~/lib/models/Project'
import BillboardChart from '~/ui/BillboardChart'
import DashboardHeader from '~/pages/Project/View/components/DashboardHeader'
import { MainChart } from '~/pages/Project/View/components/MainChart'
import Filters from '~/pages/Project/View/components/Filters'
import { Panel, PanelContainer } from '~/pages/Project/View/Panels'
import {
  useViewProjectContext,
  useRefreshTriggers,
} from '~/pages/Project/View/ViewProject'
import {
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
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'
import { nFormatter } from '~/utils/generic'
import countries from '~/utils/isoCountries'
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

const deriveBrandKeywords = (project: Project): string[] => {
  if (project.brandKeywords?.length) {
    return project.brandKeywords.map((k) => k.toLowerCase().trim())
  }

  const keywords: string[] = []

  if (project.websiteUrl) {
    try {
      const url = new URL(project.websiteUrl)
      const domain = url.hostname.replace(/^www\./, '')
      const parts = domain.split('.')
      if (parts.length >= 2) {
        const main = parts[parts.length - 2]
        if (main && main.length >= 3) keywords.push(main.toLowerCase())
      }
    } catch {
      // invalid URL, skip
    }
  }

  if (project.name) {
    const name = project.name.toLowerCase().trim()
    if (name.length >= 3 && !keywords.includes(name)) {
      keywords.push(name)
    }
  }

  return keywords
}

const classifyBrandedTraffic = (
  queries: Array<{ name: string; count: number; impressions?: number }>,
  brandKeywords: string[],
): { branded: number; nonBranded: number } => {
  let branded = 0
  let nonBranded = 0

  for (const q of queries) {
    const lower = q.name.toLowerCase()
    const isBranded = brandKeywords.some((kw) => lower.includes(kw))
    if (isBranded) {
      branded += q.count
    } else {
      nonBranded += q.count
    }
  }

  return { branded, nonBranded }
}

const COMPACT_MAX_ENTRIES = 10
const COMPACT_ENTRIES_PER_COL = 5

interface CompactReferralPanelProps {
  title: string
  data: Entry[]
  icon: React.ReactNode
  rowMapper: (entry: any) => React.ReactNode
}

const CompactReferralPanel = ({
  title,
  data,
  icon,
  rowMapper,
}: CompactReferralPanelProps) => {
  const { t } = useTranslation('common')
  const total = useMemo(() => data.reduce((sum, e) => sum + e.count, 0), [data])

  const { displayEntries, othersCount } = useMemo(() => {
    if (data.length <= COMPACT_MAX_ENTRIES) {
      return { displayEntries: data, othersCount: 0 }
    }
    const top = data.slice(0, COMPACT_MAX_ENTRIES - 1)
    const rest = data.slice(COMPACT_MAX_ENTRIES - 1)
    return {
      displayEntries: top,
      othersCount: rest.reduce((sum, e) => sum + e.count, 0),
    }
  }, [data])

  const allRows: Array<{ entry: Entry; isOther: boolean }> = useMemo(() => {
    const rows = displayEntries.map((e) => ({ entry: e, isOther: false }))
    if (othersCount > 0) {
      rows.push({
        entry: { name: t('project.seo.others'), count: othersCount },
        isOther: true,
      })
    }
    return rows
  }, [displayEntries, othersCount, t])

  const col1 = allRows.slice(0, COMPACT_ENTRIES_PER_COL)
  const col2 = allRows.slice(COMPACT_ENTRIES_PER_COL)

  if (_isEmpty(data)) {
    return (
      <div className='overflow-hidden rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-slate-800/60 dark:bg-slate-900/25'>
        <div className='flex items-center gap-1 text-gray-900 dark:text-gray-50'>
          {icon}
          <Text size='sm' weight='semibold'>
            {title}
          </Text>
        </div>
        <div className='flex h-32 items-center justify-center'>
          <Text size='xs' colour='inherit'>
            {t('project.noParamData')}
          </Text>
        </div>
      </div>
    )
  }

  const renderRow = (
    { entry, isOther }: { entry: Entry; isOther: boolean },
    idx: number,
  ) => {
    const perc = total > 0 ? _round((entry.count / total) * 100, 0) : 0
    return (
      <div
        key={isOther ? 'others' : `${entry.name}-${idx}`}
        className='group relative flex h-7 items-center justify-between rounded-sm px-1.5 hover:bg-gray-50 dark:hover:bg-slate-900/60'
      >
        <div
          className='absolute inset-0 rounded-sm bg-blue-50 dark:bg-blue-900/30'
          style={{ width: `${perc}%` }}
        />
        <div className='relative z-10 flex min-w-0 flex-1 items-center gap-1.5'>
          {isOther ? (
            <div className='size-5 shrink-0' />
          ) : (
            <div className='min-w-0'>{rowMapper(entry)}</div>
          )}
          {isOther ? (
            <Text size='xs' colour='inherit' truncate>
              {entry.name}
            </Text>
          ) : null}
        </div>
        <div className='relative z-10 flex min-w-fit items-center justify-end pl-2'>
          <Text
            size='xs'
            colour='inherit'
            className='mr-1.5 hidden group-hover:inline'
          >
            ({perc}%)
          </Text>
          <Text size='xs' weight='medium'>
            {nFormatter(entry.count, 1)}
          </Text>
        </div>
      </div>
    )
  }

  return (
    <div className='overflow-hidden rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-slate-800/60 dark:bg-slate-900/25'>
      <div className='mb-2 flex items-center justify-between'>
        <div className='flex items-center gap-1 text-gray-900 dark:text-gray-50'>
          {icon}
          <Text size='sm' weight='semibold'>
            {title}
          </Text>
        </div>
        <Text size='sm' weight='medium' className='tabular-nums'>
          {nFormatter(total, 1)}
        </Text>
      </div>
      <div className='grid grid-cols-2 gap-x-3'>
        <div className='space-y-0.5'>
          {col1.map((row, i) => renderRow(row, i))}
        </div>
        <div className='space-y-0.5'>
          {col2.map((row, i) => renderRow(row, i + COMPACT_ENTRIES_PER_COL))}
        </div>
      </div>
    </div>
  )
}

const SEOViewInner = ({ projectId, tnMapping }: SEOViewProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const { theme } = useTheme()
  const { id, project } = useCurrentProject()
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

  const brandKeywords = useMemo(
    () => (project ? deriveBrandKeywords(project) : []),
    [project],
  )

  const brandedTraffic = useMemo(
    () => classifyBrandedTraffic(data?.topQueries || [], brandKeywords),
    [data?.topQueries, brandKeywords],
  )

  const donutChartOptions: ChartOptions = useMemo(() => {
    const total = brandedTraffic.branded + brandedTraffic.nonBranded
    if (total === 0) return {}

    const brandedLabel = t('project.seo.branded')
    const nonBrandedLabel = t('project.seo.nonBranded')

    return {
      data: {
        columns: [
          [brandedLabel, brandedTraffic.branded],
          [nonBrandedLabel, brandedTraffic.nonBranded],
        ],
        type: donut(),
        colors: {
          [brandedLabel]: theme === 'dark' ? '#818cf8' : '#6366f1',
          [nonBrandedLabel]: theme === 'dark' ? '#475569' : '#94a3b8',
        },
      },
      donut: {
        title: `${total > 0 ? _round((brandedTraffic.branded / total) * 100, 0) : 0}%`,
        label: {
          show: false,
        },
        width: 16,
      },
      transition: { duration: 200 },
      resize: { auto: true },
      legend: {
        show: true,
        position: 'bottom',
        item: {
          tile: { type: 'circle', width: 8, r: 4 },
        },
      },
      tooltip: {
        format: {
          value: (value: number, ratio: number) => {
            const pct = (ratio * 100).toFixed(1)
            return `${nFormatter(value, 1)} (${pct}%)`
          },
        },
      },
      size: {
        height: 180,
      },
    }
  }, [brandedTraffic, t, theme])

  const countryRowMapper = useCallback(
    (entry: any) => <CCRow cc={entry.name} language={language} />,
    [language],
  )

  const deviceRowMapper = useMemo(
    () => getDeviceRowMapper('dv', theme, t),
    [theme, t],
  )

  const anyMetricActive = Object.values(activeMetrics).some(Boolean)

  const quadrantData = useMemo(() => {
    if (!topQueriesAsEntries.length) return null
    const positions = topQueriesAsEntries.map((q) => q.position)
    const ctrs = topQueriesAsEntries.map((q) => q.ctr)
    const impressions = topQueriesAsEntries.map((q) => q.impressions)
    const names = topQueriesAsEntries.map((q) => q.name)

    const maxImp = Math.max(...impressions) || 1
    const minImp = Math.min(...impressions) || 0

    return { positions, ctrs, impressions, names, maxImp, minImp }
  }, [topQueriesAsEntries])

  const quadrantChartOptions: ChartOptions = useMemo(() => {
    if (!quadrantData) return {}

    const { positions, ctrs, impressions, names, maxImp } = quadrantData
    const avgCtr = data?.summary?.ctr ?? 5
    const avgPos = data?.summary?.position ?? 10

    return {
      data: {
        x: 'x',
        columns: [
          ['x', ...positions],
          ['CTR', ...ctrs],
        ],
        type: scatter(),
        colors: {
          CTR: theme === 'dark' ? '#818cf8' : '#6366f1',
        },
      },
      axis: {
        x: {
          min: 0,
          label: {
            text: t('project.seo.avgPosition'),
            position: 'outer-center',
          },
          tick: {
            fit: false,
            format: (d: number) => Number(d).toFixed(0),
          },
        },
        y: {
          min: 0,
          max: 100,
          padding: { top: 0, bottom: 0 },
          label: { text: t('project.seo.avgCTR'), position: 'outer-middle' },
          tick: {
            format: (d: number) => `${d}%`,
          },
        },
      },
      point: {
        r: (d: any) => {
          if (!d || d.index === undefined) return 4
          const imp = impressions[d.index]
          if (!imp) return 4
          return 4 + 16 * Math.sqrt(imp / maxImp)
        },
      },
      grid: {
        x: {
          lines: [
            {
              value: avgPos,
              text: `${t('project.seo.avgPosition')}: ${avgPos.toFixed(1)}`,
              position: 'start',
              class: 'annotation-line',
            },
          ],
        },
        y: {
          lines: [
            {
              value: avgCtr,
              text: `${t('project.seo.avgCTR')}: ${avgCtr.toFixed(1)}%`,
              position: 'start',
              class: 'annotation-line',
            },
          ],
        },
      },
      tooltip: {
        contents: (items: any) => {
          const d = items[0]
          const name = names[d.index]
          const imp = impressions[d.index]

          return `<ul class='bg-gray-50 dark:text-gray-50 dark:bg-slate-900 rounded-md ring-1 ring-black/10 px-2 py-1 text-xs md:text-sm shadow-md z-50'>
            <li class='font-semibold pb-1 mb-1 border-b border-gray-200 dark:border-slate-800 break-all'>${name}</li>
            <li class='flex justify-between items-center py-px leading-snug'>
              <span class='mr-4'>${t('project.seo.position')}:</span>
              <span class='font-mono whitespace-nowrap'>${d.x.toFixed(1)}</span>
            </li>
            <li class='flex justify-between items-center py-px leading-snug'>
              <span class='mr-4'>${t('project.seo.ctr')}:</span>
              <span class='font-mono whitespace-nowrap'>${d.value.toFixed(1)}%</span>
            </li>
            <li class='flex justify-between items-center py-px leading-snug'>
              <span class='mr-4'>${t('project.seo.impressions')}:</span>
              <span class='font-mono whitespace-nowrap'>${nFormatter(imp, 1)}</span>
            </li>
          </ul>`
        },
      },
      legend: {
        show: false,
      },
      transition: {
        duration: 200,
      },
    }
  }, [quadrantData, data?.summary, theme, t])

  const chartOptions: ChartOptions = useMemo(() => {
    if (!aggregatedSeries.length) return {}

    const dates = aggregatedSeries.map((d) => d.date)
    const columns: any[] = [['x', ...dates]]
    const colors: Record<string, string> = {}
    const axes: Record<string, string> = {}
    let needsY2 = false

    if (activeMetrics.clicks) {
      const label = t('project.seo.clicks')
      columns.push([label, ...aggregatedSeries.map((d) => d.clicks)])
      colors[label] = '#3b82f6' // blue-500 - matching GSC
    }

    if (activeMetrics.impressions) {
      const label = t('project.seo.impressions')
      columns.push([label, ...aggregatedSeries.map((d) => d.impressions)])
      colors[label] = '#5b21b6' // violet-800 - matching GSC
      if (activeMetrics.clicks) {
        axes[label] = 'y2'
        needsY2 = true
      }
    }

    if (activeMetrics.position) {
      const label = t('project.seo.avgPosition')
      columns.push([label, ...aggregatedSeries.map((d) => d.position)])
      colors[label] = '#d97706' // amber-600 - matching GSC
      if (activeMetrics.clicks || activeMetrics.impressions) {
        axes[label] = 'y2'
        needsY2 = true
      }
    }

    if (activeMetrics.ctr) {
      const label = t('project.seo.avgCTR')
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
                const isCtr = el.name === t('project.seo.avgCTR')
                const isPos = el.name === t('project.seo.avgPosition')
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
            {t('project.seo.connectGSC')}
          </Text>
          <Text size='sm' className='mb-6 text-gray-500 dark:text-gray-400'>
            {t('project.seo.connectGSCDesc')}
          </Text>
          {data?.noProperty ? (
            <Text size='sm' className='mb-4 text-amber-600 dark:text-amber-400'>
              {t('project.seo.noProperty')}
            </Text>
          ) : null}
          <Link
            to={`${routes.project_settings.replace(':id', id)}?tab=integrations`}
            className='inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200'
          >
            <LinkIcon className='size-4' />
            {t('project.seo.connectButton')}
          </Link>

          {refEntries.length > 0 ? (
            <div className='mt-10 grid w-full grid-cols-1 gap-3 sm:grid-cols-2'>
              <Panel
                name={t('project.seo.searchEngines')}
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
                name={t('project.seo.aiReferrals')}
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
            label={t('project.seo.clicks')}
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
            label={t('project.seo.impressions')}
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
            label={t('project.seo.avgCTR')}
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
            label={t('project.seo.avgPosition')}
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
          {brandedTraffic.branded + brandedTraffic.nonBranded > 0 ? (
            <BillboardChart
              options={donutChartOptions}
              className='[&_.bb-chart-arc]:text-xs [&_.bb-chart-arcs-title]:fill-gray-900 [&_.bb-chart-arcs-title]:text-lg [&_.bb-chart-arcs-title]:font-semibold dark:[&_.bb-chart-arcs-title]:fill-gray-100'
              deps={[brandedTraffic, theme]}
            />
          ) : (
            <div className='flex h-32 items-center justify-center'>
              <Text size='xs' colour='inherit'>
                {t('project.seo.noBrandData')}
              </Text>
            </div>
          )}
        </div>
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
          dataLoading={isLoading}
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
          dataLoading={isLoading}
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
            <div className='flex h-80 items-center justify-center'>
              <Text size='xs' colour='inherit'>
                {t('project.noParamData')}
              </Text>
            </div>
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
          dataLoading={isLoading}
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

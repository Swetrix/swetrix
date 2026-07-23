import {
  ArrowClockwiseIcon,
  LinkIcon,
  MegaphoneIcon,
} from '@phosphor-icons/react'
import _isEmpty from 'lodash/isEmpty'
import _round from 'lodash/round'
import React, { useEffect, useCallback, useMemo, useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import type { AdsCampaign } from '~/api/api.server'
import { useAdsDashboardProxy } from '~/hooks/useAnalyticsProxy'
import { DOCS_URL } from '~/lib/constants'
import type { TimeBucket } from '~/lib/constants'
import type { Entry } from '~/lib/models/Entry'
import { formatCurrencyAmount } from '~/lib/pricing/format'
import DashboardHeader from '~/pages/Project/View/components/DashboardHeader'
import { MainChart } from '~/pages/Project/View/components/MainChart'
import ProjectViewHeaderActions from '~/pages/Project/View/components/ProjectViewHeaderActions'
import TabErrorBoundary from '~/pages/Project/View/components/TabErrorBoundary'
import { Panel } from '~/pages/Project/View/Panels'
import {
  useViewProjectContext,
  useRefreshTriggers,
} from '~/pages/Project/View/ViewProject'
import { MetricCard } from '~/pages/Project/tabs/Traffic/MetricCards'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import { Link } from '~/ui/Link'
import Loader from '~/ui/Loader'
import LoadingBar from '~/ui/LoadingBar'
import { Text } from '~/ui/Text'
import { nFormatter } from '~/utils/generic'
import routes from '~/utils/routes'

import { buildAdsChartOptions } from './ads-chart-options'

interface AdsViewProps {
  projectId: string
  tnMapping: Record<string, string>
}

const ADS_DOCS_URL = `${DOCS_URL}/analytics-dashboard/ads`

type CampaignEntry = Entry & { campaign: AdsCampaign }

const AdsViewInner = ({ projectId, tnMapping }: AdsViewProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const { id } = useCurrentProject()
  const { period, timezone, timeFormat, timeBucket, periodPairs } =
    useViewProjectContext()
  const { adsRefreshTrigger } = useRefreshTriggers()
  const { fetchDashboard, data, campaigns, error, isLoading } =
    useAdsDashboardProxy()
  const [searchParams, setSearchParams] = useSearchParams()

  // Ad metrics are daily-grain, so sub-day periods and buckets are unavailable
  const adsPeriodPairs = useMemo(
    () =>
      periodPairs
        .filter(
          (p) =>
            p.period !== '1h' &&
            p.period !== 'today' &&
            p.period !== 'yesterday',
        )
        .map((p) => {
          const tbs = p.tbs.filter(
            (tb): tb is TimeBucket => tb !== 'minute' && tb !== 'hour',
          )
          return { ...p, tbs: tbs.length ? tbs : (['day'] as TimeBucket[]) }
        }),
    [periodPairs],
  )

  const activeAdsPeriod = useMemo(
    () => adsPeriodPairs.find((p) => p.period === period),
    [adsPeriodPairs, period],
  )

  const urlTimeBucket = searchParams.get('timeBucket') as TimeBucket | null

  const adsTimeBucket = useMemo<TimeBucket>(() => {
    if (!urlTimeBucket && activeAdsPeriod?.tbs.includes('day')) {
      return 'day'
    }

    if (activeAdsPeriod?.tbs.includes(timeBucket as TimeBucket)) {
      return timeBucket as TimeBucket
    }

    return activeAdsPeriod?.tbs[0] || 'day'
  }, [activeAdsPeriod, timeBucket, urlTimeBucket])

  useEffect(() => {
    if (
      urlTimeBucket ||
      !activeAdsPeriod?.tbs.includes('day') ||
      timeBucket === 'day'
    ) {
      return
    }

    const newSearchParams = new URLSearchParams(searchParams.toString())
    newSearchParams.set('timeBucket', 'day')
    setSearchParams(newSearchParams, { replace: true })
  }, [
    activeAdsPeriod,
    searchParams,
    setSearchParams,
    timeBucket,
    urlTimeBucket,
  ])

  const [isManualRefreshing, setIsManualRefreshing] = useState(false)
  const prevTrigger = useRef(adsRefreshTrigger)

  const from = searchParams.get('from') || undefined
  const to = searchParams.get('to') || undefined

  const loadData = useCallback(async () => {
    await fetchDashboard(projectId, {
      period,
      from,
      to,
      timezone,
      timeBucket: adsTimeBucket,
    })
  }, [fetchDashboard, projectId, period, from, to, timezone, adsTimeBucket])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (adsRefreshTrigger !== prevTrigger.current) {
      prevTrigger.current = adsRefreshTrigger
      loadData()
    }
  }, [adsRefreshTrigger, loadData])

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

  const currency = data?.currency || 'USD'
  const stats = data?.stats

  const formatMoney = useCallback(
    (value: number) => formatCurrencyAmount(value, currency, language),
    [currency, language],
  )

  const chartOptions = useMemo(() => {
    if (!data?.chart) return {}
    return buildAdsChartOptions(
      data.chart,
      adsTimeBucket,
      currency,
      language,
      t,
    )
  }, [data?.chart, adsTimeBucket, currency, language, t])

  const campaignEntries: CampaignEntry[] = useMemo(
    () =>
      (campaigns || []).map(
        (campaign) =>
          ({
            name: campaign.campaignName,
            count: campaign.clicks,
            campaign,
          }) as CampaignEntry,
      ),
    [campaigns],
  )

  const noopFilterLink = useCallback(() => '#', [])

  const campaignDetailsColumns = useMemo(
    () => [
      {
        header: t('project.ads.spend'),
        render: (entry: any) => formatMoney(entry.campaign?.cost ?? 0),
        sortLabel: 'cost',
        getSortValue: (entry: any) => entry.campaign?.cost ?? 0,
      },
      {
        header: t('project.ads.cpc'),
        render: (entry: any) => formatMoney(entry.campaign?.cpc ?? 0),
        sortLabel: 'cpc',
        getSortValue: (entry: any) => entry.campaign?.cpc ?? 0,
      },
      {
        header: t('project.ads.adSessions'),
        render: (entry: any) => nFormatter(entry.campaign?.sessions ?? 0, 1),
        sortLabel: 'sessions',
        getSortValue: (entry: any) => entry.campaign?.sessions ?? 0,
      },
      {
        header: t('project.ads.attributedRevenue'),
        render: (entry: any) => formatMoney(entry.campaign?.revenue ?? 0),
        sortLabel: 'revenue',
        getSortValue: (entry: any) => entry.campaign?.revenue ?? 0,
      },
      {
        header: t('project.ads.roas'),
        render: (entry: any) =>
          entry.campaign?.roas == null ? '-' : `${entry.campaign.roas}x`,
        sortLabel: 'roas',
        getSortValue: (entry: any) => entry.campaign?.roas ?? 0,
      },
    ],
    [t, formatMoney],
  )

  const campaignRowTooltip = useCallback(
    (entry: any) => {
      const campaign: AdsCampaign | undefined = entry.campaign
      if (!campaign) return null

      const rows: { label: string; value: string }[] = [
        { label: t('project.ads.spend'), value: formatMoney(campaign.cost) },
        {
          label: t('project.ads.impressions'),
          value: nFormatter(campaign.impressions, 1),
        },
        {
          label: t('project.ads.clicks'),
          value: nFormatter(campaign.clicks, 1),
        },
        { label: t('project.ads.ctr'), value: `${campaign.ctr}%` },
        { label: t('project.ads.cpc'), value: formatMoney(campaign.cpc) },
        {
          label: t('project.ads.conversions'),
          value: nFormatter(campaign.conversions, 1),
        },
        {
          label: t('project.ads.adSessions'),
          value: nFormatter(campaign.sessions, 1),
        },
        {
          label: t('project.ads.attributedRevenue'),
          value: formatMoney(campaign.revenue),
        },
        {
          label: t('project.ads.roas'),
          value: campaign.roas == null ? '-' : `${campaign.roas}x`,
        },
        {
          label: t('project.ads.cpa'),
          value: campaign.cpa == null ? '-' : formatMoney(campaign.cpa),
        },
      ]

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
              {campaign.campaignName}
            </Text>
          </li>
          {rows.map((row) => (
            <li
              key={row.label}
              className='flex items-center justify-between py-px leading-snug'
            >
              <div className='mr-4 flex min-w-0 items-center'>
                <Text
                  as='span'
                  size='xs'
                  colour='secondary'
                  truncate
                  className='md:text-sm'
                >
                  {row.label}
                </Text>
              </div>
              <Text
                as='span'
                size='xs'
                weight='semibold'
                colour='primary'
                className='font-mono whitespace-nowrap tabular-nums md:text-sm'
              >
                {row.value}
              </Text>
            </li>
          ))}
        </ul>
      )
    },
    [t, formatMoney],
  )

  if (isLoading && !data) {
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
          timeBucketSelectorItems={adsPeriodPairs}
        />
        <div className='flex min-h-[400px] items-center justify-center'>
          <Loader />
        </div>
      </>
    )
  }

  if (error && !data) {
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
          timeBucketSelectorItems={adsPeriodPairs}
        />
        <div className='mx-auto flex min-h-[400px] max-w-xl flex-col items-center justify-center px-4 text-center'>
          <Text as='h3' size='lg' weight='medium'>
            {t('apiNotifications.somethingWentWrong')}
          </Text>
          <Text as='p' size='sm' colour='secondary' className='mt-2'>
            {error}
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
          timeBucketSelectorItems={adsPeriodPairs}
        />
        <div className='mx-auto w-full max-w-2xl py-16 text-center'>
          <div className='mx-auto mb-6 flex size-14 items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-900'>
            <MegaphoneIcon
              className='size-7 text-gray-700 dark:text-gray-200'
              weight='duotone'
            />
          </div>
          <Text as='h3' size='xl' weight='medium' className='tracking-tight'>
            {t('project.ads.connectAds')}
          </Text>
          <Text
            as='p'
            size='sm'
            colour='secondary'
            className='mx-auto mt-2 max-w-md'
          >
            <Trans
              t={t}
              i18nKey='project.ads.connectAdsDesc'
              components={{
                docs: (
                  <a
                    href={ADS_DOCS_URL}
                    aria-label={t('ariaLabels.openAdsGuide')}
                    className='font-medium underline decoration-dashed hover:decoration-solid'
                    target='_blank'
                    rel='noreferrer noopener'
                  />
                ),
              }}
            />
          </Text>
          <Link
            to={`${routes.project_settings.replace(':id', id)}?tab=integrations`}
            className='mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200'
          >
            <LinkIcon className='size-4' />
            {t('project.ads.connectButton')}
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
        timeBucketSelectorItems={adsPeriodPairs}
      />
      {isLoading && data ? <LoadingBar /> : null}

      <div className='relative overflow-hidden rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-900/25'>
        <div className='mb-5 flex flex-wrap justify-center gap-5 lg:justify-start'>
          <MetricCard
            label={t('project.ads.spend')}
            value={stats?.cost ?? 0}
            change={
              stats ? _round(stats.cost - stats.previous.cost, 2) : undefined
            }
            goodChangeDirection='up'
            valueMapper={(value, type) =>
              `${type === 'badge' && value > 0 ? '+' : ''}${formatMoney(value)}`
            }
          />
          <MetricCard
            label={t('project.ads.clicks')}
            value={stats?.clicks ?? 0}
            change={stats ? stats.clicks - stats.previous.clicks : undefined}
            goodChangeDirection='down'
            valueMapper={(value, type) =>
              `${type === 'badge' && value > 0 ? '+' : ''}${nFormatter(value, 1)}`
            }
          />
          <MetricCard
            label={t('project.ads.cpc')}
            value={stats?.cpc ?? 0}
            valueMapper={(value) => formatMoney(value)}
          />
          <MetricCard
            label={t('project.ads.ctr')}
            value={stats?.ctr ?? 0}
            valueMapper={(value) => `${value}%`}
          />
          <MetricCard
            label={t('project.ads.adSessions')}
            value={stats?.sessions ?? 0}
            change={
              stats ? stats.sessions - stats.previous.sessions : undefined
            }
            goodChangeDirection='down'
            valueMapper={(value, type) =>
              `${type === 'badge' && value > 0 ? '+' : ''}${nFormatter(value, 1)}`
            }
          />
          <MetricCard
            label={t('project.ads.attributedRevenue')}
            value={stats?.revenue ?? 0}
            change={
              stats
                ? _round(stats.revenue - stats.previous.revenue, 2)
                : undefined
            }
            goodChangeDirection='down'
            valueMapper={(value, type) =>
              `${type === 'badge' && value > 0 ? '+' : ''}${formatMoney(value)}`
            }
          />
          <MetricCard
            label={t('project.ads.roas')}
            value={stats?.roas ?? 0}
            valueMapper={(value) => (stats?.roas == null ? '-' : `${value}x`)}
          />
          <MetricCard
            label={t('project.ads.cpa')}
            value={stats?.cpa ?? 0}
            valueMapper={(value) =>
              stats?.cpa == null ? '-' : formatMoney(value)
            }
          />
        </div>
        {data?.chart && !_isEmpty(data.chart.x) ? (
          <MainChart
            chartId='ads-main-chart'
            options={chartOptions}
            className='h-80 [&_svg]:overflow-visible!'
            deps={[data.chart, adsTimeBucket, timeFormat, period]}
          />
        ) : null}
      </div>

      <div className='mt-3'>
        <Panel
          name={t('project.ads.campaigns')}
          data={campaignEntries}
          icon={<MegaphoneIcon className='h-5 w-5' />}
          id='campaigns'
          activeTabId='campaigns'
          disableRowClick
          getFilterLink={noopFilterLink}
          valuesHeaderName={t('project.ads.clicks')}
          detailsExtraColumns={campaignDetailsColumns}
          hidePercentageInDetails
          dataLoading={isLoading}
          rowTooltipRenderer={campaignRowTooltip}
          rowTooltipFollowCursor
        />
      </div>

      <Text as='p' size='xs' colour='secondary' className='mt-3'>
        {t('project.ads.attributionNote')}
      </Text>
    </>
  )
}

const AdsView = ({ projectId, tnMapping }: AdsViewProps) => {
  const [searchParams] = useSearchParams()
  const { adsRefreshTrigger } = useRefreshTriggers()
  const resetKey = `ads:${projectId}:${searchParams.toString()}:${adsRefreshTrigger}`

  return (
    <TabErrorBoundary titleKey='dashboard.failedToLoadAds' resetKey={resetKey}>
      <React.Suspense
        fallback={
          <div className='flex min-h-[400px] items-center justify-center'>
            <Loader />
          </div>
        }
      >
        <AdsViewInner projectId={projectId} tnMapping={tnMapping} />
      </React.Suspense>
    </TabErrorBoundary>
  )
}

export default AdsView

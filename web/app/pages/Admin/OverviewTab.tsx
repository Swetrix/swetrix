import type { ChartOptions } from 'billboard.js'
import { area } from 'billboard.js'
import dayjs from 'dayjs'
import { useMemo } from 'react'

import BillboardChart from '~/ui/BillboardChart'
import { Badge } from '~/ui/Badge'
import Select from '~/ui/Select'
import { Text } from '~/ui/Text'
import { nFormatter, nLocaleFormatter } from '~/utils/generic'

import { StatCard } from './components'
import type { AdminCharts, AdminOverview, SeriesPoint } from './types'

const CHART_DAYS_OPTIONS = [30, 90, 180, 365]

const buildTimeseriesOptions = (
  series: { id: string; name: string; color: string; data: SeriesPoint[] }[],
): ChartOptions => {
  const dates = Array.from(
    new Set(series.flatMap(({ data }) => data.map(({ date }) => date))),
  ).sort()

  const columns: [string, ...(Date | number)[]][] = [
    ['x', ...dates.map((date) => dayjs(date).toDate())],
  ]

  for (const { id, data } of series) {
    const countByDate = new Map(data.map(({ date, count }) => [date, count]))
    columns.push([id, ...dates.map((date) => countByDate.get(date) || 0)])
  }

  return {
    data: {
      x: 'x',
      columns,
      types: Object.fromEntries(series.map(({ id }) => [id, area()])),
      colors: Object.fromEntries(series.map(({ id, color }) => [id, color])),
      names: Object.fromEntries(series.map(({ id, name }) => [id, name])),
    },
    grid: {
      y: {
        show: true,
      },
    },
    transition: {
      duration: 200,
    },
    resize: {
      auto: true,
      timer: true,
    },
    axis: {
      x: {
        type: 'timeseries',
        tick: {
          fit: false,
          format: '%b %d',
        },
      },
      y: {
        tick: {
          // Counts are integers - hide the fractional gridline labels
          format: (d: number) => (Number.isInteger(d) ? nFormatter(d, 1) : ''),
        },
        show: true,
        inner: true,
      },
    },
    point: {
      focus: {
        only: true,
      },
      pattern: ['circle'],
      r: 2,
    },
    legend: {
      show: true,
    },
  }
}

const MRR_CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£' } as const

interface OverviewTabProps {
  overview: AdminOverview
  charts: AdminCharts
  chartDays: number
  onChartDaysChange: (days: number) => void
}

export const OverviewTab = ({
  overview,
  charts,
  chartDays,
  onChartDaysChange,
}: OverviewTabProps) => {
  const growthOptions = useMemo(
    () =>
      buildTimeseriesOptions([
        {
          id: 'signups',
          name: 'Signups',
          color: '#2563eb',
          data: charts.signups,
        },
        {
          id: 'projects',
          name: 'Projects created',
          color: '#16a34a',
          data: charts.projects,
        },
        {
          id: 'organisations',
          name: 'Organisations created',
          color: '#9333ea',
          data: charts.organisations,
        },
      ]),
    [charts],
  )

  const eventsOptions = useMemo(
    () =>
      buildTimeseriesOptions([
        {
          id: 'events',
          name: 'Events',
          color: '#f59e0b',
          data: charts.events,
        },
      ]),
    [charts],
  )

  const mrrBreakdown = (
    Object.entries(overview.mrr.byCurrency) as [
      keyof typeof MRR_CURRENCY_SYMBOLS,
      number,
    ][]
  )
    .filter(([, amount]) => amount > 0)
    .map(
      ([currency, amount]) =>
        `${MRR_CURRENCY_SYMBOLS[currency]}${nLocaleFormatter(Math.round(amount))}`,
    )
    .join(' + ')

  const maxPlanCount = Math.max(
    ...overview.planDistribution.map(({ count }) => count),
    1,
  )

  return (
    <div className='flex flex-col gap-6'>
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <StatCard
          label='MRR (est., USD list price)'
          value={`$${nLocaleFormatter(Math.round(overview.mrr.usdEquivalent))}`}
          hint={
            overview.mrr.unpricedSubscriptions > 0
              ? `${mrrBreakdown} · ${overview.mrr.unpricedSubscriptions} unpriced`
              : mrrBreakdown
          }
        />
        <StatCard
          label='Paying users'
          value={nLocaleFormatter(overview.mrr.payingUsers)}
          hint={`${nLocaleFormatter(overview.users.trial)} on trial · ${nLocaleFormatter(overview.users.cancelling)} cancelling`}
        />
        <StatCard
          label='Users'
          value={nLocaleFormatter(overview.users.total)}
          hint={`+${overview.users.signups24h} today · +${overview.users.signups7d} this week · +${overview.users.signups30d} this month`}
        />
        <StatCard
          label='Events (30d)'
          value={nFormatter(overview.events.last30d, 1)}
          hint={`${nFormatter(overview.events.last24h, 1)} in 24h · ${nFormatter(overview.events.total, 1)} all-time`}
        />
      </div>

      <div className='rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-800/60 dark:bg-slate-900/25'>
        <div className='mb-4 flex items-center justify-between'>
          <Text as='h3' size='lg' weight='semibold'>
            Growth
          </Text>
          <Select<number>
            label='Period'
            fieldLabelClassName='sr-only'
            title={`Last ${chartDays} days`}
            items={CHART_DAYS_OPTIONS}
            labelExtractor={(days) => `Last ${days} days`}
            keyExtractor={(days) => days.toString()}
            selectedItem={chartDays}
            onSelect={onChartDaysChange}
          />
        </div>
        <BillboardChart
          options={growthOptions}
          className='h-72'
          deps={[charts]}
        />
      </div>

      <div className='rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-800/60 dark:bg-slate-900/25'>
        <Text as='h3' size='lg' weight='semibold' className='mb-4'>
          Events processed
        </Text>
        <BillboardChart
          options={eventsOptions}
          className='h-72'
          deps={[charts]}
        />
      </div>

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        <div className='rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-800/60 dark:bg-slate-900/25'>
          <Text as='h3' size='lg' weight='semibold' className='mb-4'>
            Plan distribution
          </Text>
          <div className='flex flex-col gap-2'>
            {overview.planDistribution.map(({ planCode, count }) => (
              <div key={planCode} className='flex items-center gap-3'>
                <Text
                  as='span'
                  size='sm'
                  className='w-24 shrink-0 font-mono'
                  truncate
                >
                  {planCode}
                </Text>
                <div className='h-4 flex-1 overflow-hidden rounded-sm bg-gray-200 dark:bg-slate-800'>
                  <div
                    className='h-full rounded-sm bg-indigo-500'
                    style={{ width: `${(count / maxPlanCount) * 100}%` }}
                  />
                </div>
                <Text
                  as='span'
                  size='sm'
                  colour='secondary'
                  className='w-16 shrink-0 text-right tabular-nums'
                >
                  {nLocaleFormatter(count)}
                </Text>
              </div>
            ))}
          </div>
        </div>

        <div className='rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-800/60 dark:bg-slate-900/25'>
          <Text as='h3' size='lg' weight='semibold' className='mb-4'>
            At a glance
          </Text>
          <dl className='grid grid-cols-2 gap-x-4 gap-y-3'>
            {[
              {
                label: 'Verified users',
                value: nLocaleFormatter(overview.users.active),
              },
              {
                label: 'Projects',
                value: nLocaleFormatter(overview.projects.total),
              },
              {
                label: 'Live projects',
                value: nLocaleFormatter(overview.projects.live),
              },
              {
                label: 'Organisations',
                value: nLocaleFormatter(overview.organisations.total),
              },
              {
                label: 'Events (7d)',
                value: nFormatter(overview.events.last7d, 1),
              },
              {
                label: 'Billing suspended',
                value: (
                  <span className='inline-flex items-center gap-2'>
                    {nLocaleFormatter(overview.users.suspended)}
                    {overview.users.suspended > 0 ? (
                      <Badge colour='red' label='attention' />
                    ) : null}
                  </span>
                ),
              },
            ].map(({ label, value }) => (
              <div key={label}>
                <dt>
                  <Text as='span' size='xs' colour='secondary'>
                    {label}
                  </Text>
                </dt>
                <dd>
                  <Text
                    as='span'
                    size='base'
                    weight='semibold'
                    className='tabular-nums'
                  >
                    {value}
                  </Text>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}

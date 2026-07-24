import dayjs from 'dayjs'
import { motion } from 'motion/react'

import {
  MetricCard,
  metricCardsContainerVariants,
} from '~/pages/Project/tabs/Traffic/MetricCards'
import { Badge } from '~/ui/Badge'
import Select from '~/ui/Select'
import { Text } from '~/ui/Text'
import { nFormatter, nLocaleFormatter } from '~/utils/generic'

import { AdminChart, ADMIN_CHART_COLORS } from './AdminChart'
import { ChangeBadge, StatCard } from './components'
import type { AdminCharts, AdminOverview, AdminRevenue } from './types'

const CHART_DAYS_OPTIONS = [30, 90, 180, 365]

const MRR_CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
}

const formatCurrencyBreakdown = (byCurrency: Record<string, number>): string =>
  Object.entries(byCurrency)
    .filter(([, amount]) => amount > 0)
    .sort(([, a], [, b]) => b - a)
    .map(
      ([currency, amount]) =>
        `${MRR_CURRENCY_SYMBOLS[currency] || `${currency} `}${nLocaleFormatter(Math.round(amount))}`,
    )
    .join(' + ')

const countMetricMapper = (value: number, type: 'main' | 'badge') =>
  type === 'badge'
    ? `${value > 0 ? '+' : ''}${nFormatter(value, 1)}`
    : nLocaleFormatter(value)

const RevenueCard = ({
  overview,
  revenue,
}: {
  overview: AdminOverview
  revenue: AdminRevenue | null | undefined
}) => {
  if (!revenue?.available || !revenue.currentMonth) {
    const mrrBreakdown = formatCurrencyBreakdown(overview.mrr.byCurrency)

    return (
      <StatCard
        label='MRR (est., USD list price)'
        value={`$${nLocaleFormatter(Math.round(overview.mrr.usdEquivalent))}`}
        hint={
          overview.mrr.unpricedSubscriptions > 0
            ? `${mrrBreakdown} · ${overview.mrr.unpricedSubscriptions} unpriced · Paddle data unavailable`
            : `${mrrBreakdown} · Paddle data unavailable`
        }
      />
    )
  }

  const { currentMonth, previousMonth, previousMonthToDate, upcoming } = revenue

  const change = previousMonthToDate
    ? Math.round(currentMonth.approxUsd - previousMonthToDate.approxUsd)
    : null

  const hints = [formatCurrencyBreakdown(currentMonth.byCurrency)].filter(
    Boolean,
  )

  if (previousMonth) {
    hints.push(
      `$${nLocaleFormatter(Math.round(previousMonth.approxUsd))} last month`,
    )
  }

  if (upcoming && upcoming.approxUsd > 0) {
    hints.push(`$${nLocaleFormatter(Math.round(upcoming.approxUsd))} scheduled`)
  }

  return (
    <StatCard
      label={`Revenue (${dayjs().format('MMMM')}, Paddle)`}
      value={`$${nLocaleFormatter(Math.round(currentMonth.approxUsd))}`}
      badge={
        <ChangeBadge
          change={change}
          formatter={(value) => `$${nFormatter(Math.abs(value), 1)}`}
        />
      }
      hint={hints.join(' · ')}
    />
  )
}

const FUNNEL_STAGES: {
  key: keyof AdminCharts['funnel']
  label: string
}[] = [
  { key: 'signups', label: 'Signed up' },
  { key: 'verified', label: 'Verified email' },
  { key: 'createdProject', label: 'Created a project' },
  { key: 'sentData', label: 'Sent data' },
  { key: 'paid', label: 'Paying now' },
]

// Cohort funnel: everyone who signed up in the selected window and how far
// they got (current state)
const ActivationFunnel = ({
  funnel,
  chartDays,
}: {
  funnel: AdminCharts['funnel']
  chartDays: number
}) => (
  <div className='rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-900/25'>
    <Text as='h3' size='lg' weight='semibold'>
      Activation funnel
    </Text>
    <Text as='p' size='sm' colour='secondary' className='mt-0.5'>
      Users who signed up in the last {chartDays} days, by how far they got
    </Text>
    <div className='mt-4 flex flex-col gap-2.5'>
      {FUNNEL_STAGES.map(({ key, label }, index) => {
        const count = funnel[key]
        const pctOfSignups =
          funnel.signups > 0 ? (count / funnel.signups) * 100 : 0
        const prevCount =
          index === 0 ? null : funnel[FUNNEL_STAGES[index - 1].key]
        const stepPct =
          prevCount === null
            ? null
            : prevCount > 0
              ? Math.round((count / prevCount) * 100)
              : 0

        return (
          <div key={key} className='flex items-center gap-3'>
            <Text as='span' size='sm' className='w-36 shrink-0' truncate>
              {label}
            </Text>
            <div className='h-5 flex-1 overflow-hidden rounded-sm bg-gray-100 dark:bg-slate-800/60'>
              <div
                className='h-full rounded-sm bg-indigo-500 transition-[width] duration-300'
                style={{ width: `${pctOfSignups}%` }}
              />
            </div>
            <Text
              as='span'
              size='sm'
              weight='semibold'
              className='w-14 shrink-0 text-right tabular-nums'
            >
              {nLocaleFormatter(count)}
            </Text>
            <Text
              as='span'
              size='xs'
              colour='secondary'
              className='w-24 shrink-0 text-right tabular-nums'
            >
              {Math.round(pctOfSignups)}% of signups
            </Text>
            <Text
              as='span'
              size='xs'
              colour='secondary'
              className='hidden w-20 shrink-0 text-right tabular-nums sm:block'
            >
              {stepPct === null ? '' : `${stepPct}% of prev`}
            </Text>
          </div>
        )
      })}
    </div>
  </div>
)

interface OverviewTabProps {
  overview: AdminOverview
  charts: AdminCharts
  chartDays: number
  revenue?: AdminRevenue | null
  onChartDaysChange: (days: number) => void
}

export const OverviewTab = ({
  overview,
  charts,
  chartDays,
  revenue,
  onChartDaysChange,
}: OverviewTabProps) => {
  const maxPlanCount = Math.max(
    ...overview.planDistribution.map(({ count }) => count),
    1,
  )

  const payersChange =
    revenue?.available && revenue.currentMonth && revenue.previousMonthToDate
      ? revenue.currentMonth.payers - revenue.previousMonthToDate.payers
      : null

  const { totals } = charts

  return (
    <div className='flex flex-col gap-6'>
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <RevenueCard overview={overview} revenue={revenue} />
        <StatCard
          label='Paying users'
          value={nLocaleFormatter(overview.mrr.payingUsers)}
          badge={<ChangeBadge change={payersChange} />}
          hint={`${nLocaleFormatter(overview.users.trial)} on trial · ${nLocaleFormatter(overview.users.cancelling)} cancelling`}
        />
        <StatCard
          label='Users'
          value={nLocaleFormatter(overview.users.total)}
          badge={
            <ChangeBadge
              change={overview.users.signups30d - overview.users.signupsPrev30d}
            />
          }
          hint={`+${overview.users.signups24h} today · +${overview.users.signups7d} this week · +${overview.users.signups30d} this month`}
        />
        <StatCard
          label='Events (30d)'
          value={nFormatter(overview.events.last30d, 1)}
          badge={
            <ChangeBadge
              change={overview.events.last30d - overview.events.prev30d}
            />
          }
          hint={`${nFormatter(overview.events.last24h, 1)} in 24h · ${nFormatter(overview.events.total, 1)} all-time`}
        />
      </div>

      <div className='relative rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-900/25'>
        <div className='mb-4 flex items-center justify-between gap-3'>
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
            menuClassName='right-0 w-max min-w-full'
          />
        </div>
        <motion.div
          initial='hidden'
          animate='visible'
          variants={metricCardsContainerVariants}
          className='mb-5 flex flex-wrap justify-center gap-5 lg:justify-start'
        >
          <MetricCard
            label='Signups'
            value={totals.signups.current}
            change={totals.signups.current - totals.signups.previous}
            goodChangeDirection='down'
            valueMapper={countMetricMapper}
          />
          <MetricCard
            label='Projects created'
            value={totals.projects.current}
            change={totals.projects.current - totals.projects.previous}
            goodChangeDirection='down'
            valueMapper={countMetricMapper}
          />
          <MetricCard
            label='Organisations created'
            value={totals.organisations.current}
            change={
              totals.organisations.current - totals.organisations.previous
            }
            goodChangeDirection='down'
            valueMapper={countMetricMapper}
          />
        </motion.div>
        <AdminChart
          className='h-72'
          series={[
            {
              id: 'signups',
              name: 'Signups',
              color: ADMIN_CHART_COLORS.blue,
              data: charts.signups,
            },
            {
              id: 'projects',
              name: 'Projects created',
              color: ADMIN_CHART_COLORS.amber,
              data: charts.projects,
            },
            {
              id: 'organisations',
              name: 'Organisations created',
              color: ADMIN_CHART_COLORS.purple,
              data: charts.organisations,
            },
          ]}
        />
      </div>

      <div className='relative rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-900/25'>
        <Text as='h3' size='lg' weight='semibold' className='mb-4'>
          Events processed
        </Text>
        <motion.div
          initial='hidden'
          animate='visible'
          variants={metricCardsContainerVariants}
          className='mb-5 flex flex-wrap justify-center gap-5 lg:justify-start'
        >
          <MetricCard
            label={`Events (${chartDays}d)`}
            value={totals.events.current}
            change={totals.events.current - totals.events.previous}
            goodChangeDirection='down'
            valueMapper={countMetricMapper}
          />
        </motion.div>
        <AdminChart
          className='h-72'
          series={[
            {
              id: 'events',
              name: 'Events',
              color: ADMIN_CHART_COLORS.teal,
              data: charts.events,
            },
          ]}
        />
      </div>

      <ActivationFunnel funnel={charts.funnel} chartDays={chartDays} />

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        <div className='rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-800/60 dark:bg-slate-900/25'>
          <Text as='h3' size='lg' weight='semibold' className='mb-4'>
            Plan distribution
          </Text>
          <div className='flex flex-col gap-2'>
            {overview.planDistribution.map(({ planCode, count }) => (
              <div key={planCode} className='flex items-center gap-3'>
                <Text as='span' size='sm' className='w-24 shrink-0' truncate>
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
                label: 'MRR (est., USD list price)',
                value: `$${nLocaleFormatter(Math.round(overview.mrr.usdEquivalent))}`,
              },
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

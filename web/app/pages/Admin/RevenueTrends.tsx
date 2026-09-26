import dayjs from 'dayjs'
import { useMemo } from 'react'

import { Badge } from '~/ui/Badge'
import Select from '~/ui/Select'
import { Text } from '~/ui/Text'
import { cn, nFormatter, nLocaleFormatter } from '~/utils/generic'

import type { AdminChartSeries } from './AdminChart'
import { AdminChart, ADMIN_CHART_COLORS } from './AdminChart'
import { AdminTable, EmptyState, StatCard, Td } from './components'
import type { AdminRevenueTrends, AdminRevenueTrendMonth } from './types'
import { TREND_MONTHS_OPTIONS } from './types'

const usd = (amount: number): string =>
  `$${nLocaleFormatter(Math.round(amount))}`

// One decimal keeps neighbouring axis ticks distinct ($1.2k, $1.4k) instead of
// rounding a whole cluster of them to the same "$1k"
const shortUsd = (amount: number): string =>
  amount < 1000 ? `$${Math.round(amount)}` : `$${nFormatter(amount, 1)}`

const monthLabel = (month: string): string =>
  dayjs(`${month}-01`).format('MMM YYYY')

const CHART_FORMAT = {
  xTick: '%b %Y',
  xTooltip: '%B %Y',
  value: usd,
  axis: shortUsd,
}

// Percentage moves are the point of this whole panel, so they get their own
// colour treatment rather than the generic ChangeBadge
const PercentBadge = ({
  percent,
  size = 'md',
}: {
  percent: number | null | undefined
  size?: 'sm' | 'md'
}) => {
  if (percent === null || percent === undefined || Number.isNaN(percent)) {
    return <span className='text-gray-400 dark:text-gray-500'>—</span>
  }

  if (percent === 0) {
    return <Badge colour='slate' label='±0%' size={size} />
  }

  return (
    <Badge
      colour={percent > 0 ? 'green' : 'red'}
      label={`${percent > 0 ? '+' : ''}${percent}%`}
      size={size}
    />
  )
}

const describeStreak = (streak: number): string => {
  if (streak === 0) {
    return 'flat vs the month before'
  }

  const months = Math.abs(streak)
  const noun = months === 1 ? 'month' : 'months'

  return streak > 0
    ? `${months} ${noun} of growth in a row`
    : `${months} ${noun} of decline in a row`
}

interface RevenueTrendsProps {
  trends: AdminRevenueTrends | null | undefined
  months: number
  onMonthsChange: (months: number) => void
}

export const RevenueTrends = ({
  trends,
  months,
  onMonthsChange,
}: RevenueTrendsProps) => {
  const rows = trends?.months

  // A stable series identity keeps unrelated parent re-renders from
  // regenerating the billboard.js chart
  const series = useMemo<AdminChartSeries[]>(
    () =>
      rows
        ? [
            {
              id: 'cash',
              name: 'Cash collected',
              color: ADMIN_CHART_COLORS.blue,
              type: 'bar',
              data: rows.map((row) => ({
                date: `${row.month}-01`,
                count: row.cashUsd,
              })),
            },
            {
              id: 'recognised',
              name: 'Recurring revenue',
              color: ADMIN_CHART_COLORS.green,
              type: 'line',
              data: rows.map((row) => ({
                date: `${row.month}-01`,
                count: row.recognisedUsd,
              })),
            },
          ]
        : [],
    [rows],
  )

  if (!trends?.available || !rows?.length || !trends.summary) {
    return (
      <section>
        <Text as='h3' size='lg' weight='semibold'>
          Revenue trend
        </Text>
        <div className='mt-3'>
          <EmptyState message='Paddle payment history unavailable' />
        </div>
      </section>
    )
  }

  const { summary, currentMonth } = trends
  const rowsDesc = [...rows].reverse()

  const paceVsLastMonth =
    currentMonth && rows.length > 0
      ? currentMonth.projectedUsd - rows[rows.length - 1].cashUsd
      : null

  return (
    <div className='flex flex-col gap-6'>
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <StatCard
          label={`Recurring revenue (${summary.lastCompleteMonth ? monthLabel(summary.lastCompleteMonth) : '—'})`}
          value={usd(summary.recognisedUsd)}
          badge={<PercentBadge percent={summary.momPercent} />}
          hint={`${describeStreak(summary.streak)} · ${usd(summary.runRateUsd)} annual run rate`}
        />
        <StatCard
          label='Avg. MoM growth (3 mo)'
          value={
            summary.avgMomPercent === null
              ? '—'
              : `${summary.avgMomPercent > 0 ? '+' : ''}${summary.avgMomPercent}%`
          }
          hint={`Cash last month moved ${summary.cashMomPercent === null ? '—' : `${summary.cashMomPercent > 0 ? '+' : ''}${summary.cashMomPercent}%`}`}
        />
        <StatCard
          label='Cash collected (12 mo)'
          value={usd(summary.ttmCashUsd)}
          hint={
            summary.bestMonth
              ? `Best month: ${monthLabel(summary.bestMonth.month)} at ${usd(summary.bestMonth.cashUsd)}`
              : undefined
          }
        />
        <StatCard
          label={`This month so far (${currentMonth ? monthLabel(currentMonth.month) : '—'})`}
          value={currentMonth ? usd(currentMonth.cashUsd) : '—'}
          badge={
            paceVsLastMonth === null ? null : (
              <Badge
                colour={paceVsLastMonth >= 0 ? 'green' : 'yellow'}
                label={`on pace for ${usd(currentMonth!.projectedUsd)}`}
              />
            )
          }
          hint={
            currentMonth
              ? `Day ${currentMonth.dayOfMonth} of ${currentMonth.daysInMonth} · ${currentMonth.payments} payments from ${currentMonth.payers} accounts`
              : undefined
          }
        />
      </div>

      <div className='relative rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-900/25'>
        <div className='mb-1 flex items-start justify-between gap-3'>
          <div>
            <Text as='h3' size='lg' weight='semibold'>
              Revenue trend
            </Text>
            <Text as='p' size='sm' colour='secondary' className='mt-0.5'>
              Complete months only. Yearly payments are spread across the twelve
              months they buy, so the recurring line is not distorted by renewal
              spikes.
            </Text>
          </div>
          <Select<number>
            label='Period'
            fieldLabelClassName='sr-only'
            title={`Last ${months} months`}
            items={TREND_MONTHS_OPTIONS}
            labelExtractor={(value) => `Last ${value} months`}
            keyExtractor={(value) => value.toString()}
            selectedItem={months}
            onSelect={onMonthsChange}
            menuClassName='right-0 w-max min-w-full'
          />
        </div>
        <AdminChart
          className='mt-4 h-72'
          format={CHART_FORMAT}
          series={series}
        />
      </div>

      <MonthTable rows={rowsDesc} />
    </div>
  )
}

const MonthTable = ({ rows }: { rows: AdminRevenueTrendMonth[] }) => (
  <AdminTable
    columns={[
      { key: 'month', label: 'Month' },
      { key: 'recognised', label: 'Recurring' },
      { key: 'mom', label: 'MoM' },
      { key: 'cash', label: 'Cash in' },
      { key: 'subs', label: 'Subscriptions' },
      { key: 'movement', label: 'New / churned' },
      { key: 'oneOff', label: 'One-off' },
    ]}
  >
    {rows.map((row, index) => {
      // `rows` is newest first, so the previous month is the next entry
      const previous = rows[index + 1]
      const momPercent =
        previous && previous.recognisedUsd > 0
          ? Math.round(
              ((row.recognisedUsd - previous.recognisedUsd) /
                previous.recognisedUsd) *
                1000,
            ) / 10
          : null

      return (
        <tr key={row.month}>
          <Td className='font-medium'>{monthLabel(row.month)}</Td>
          <Td className='tabular-nums'>{usd(row.recognisedUsd)}</Td>
          <Td>
            <PercentBadge percent={momPercent} size='sm' />
          </Td>
          <Td className='tabular-nums'>{usd(row.cashUsd)}</Td>
          <Td className='tabular-nums'>{nLocaleFormatter(row.activeSubs)}</Td>
          <Td className='tabular-nums'>
            <span className='inline-flex items-center gap-1.5'>
              <span
                className={cn(
                  row.newSubs > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-400 dark:text-gray-500',
                )}
              >
                +{row.newSubs}
              </span>
              <span className='text-gray-300 dark:text-gray-600'>/</span>
              <span
                className={cn(
                  row.churnedSubs > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-400 dark:text-gray-500',
                )}
              >
                −{row.churnedSubs}
              </span>
            </span>
          </Td>
          <Td className='text-gray-500 tabular-nums dark:text-gray-400'>
            {row.oneOffUsd > 0 ? usd(row.oneOffUsd) : '—'}
          </Td>
        </tr>
      )
    })}
  </AdminTable>
)

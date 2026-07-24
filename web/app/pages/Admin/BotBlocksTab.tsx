import { Link } from 'react-router'

import { Badge } from '~/ui/Badge'
import Select from '~/ui/Select'
import { Text } from '~/ui/Text'
import { nFormatter, nLocaleFormatter } from '~/utils/generic'

import { AdminChart, ADMIN_CHART_COLORS } from './AdminChart'
import { AdminTable, EmptyState, StatCard, Td } from './components'
import { adminLinkClassName } from './UsersTab'
import type { AdminBotBlocks } from './types'

const PERIODS = [
  { key: 7, label: 'Last 7 days' },
  { key: 30, label: 'Last 30 days' },
  { key: 90, label: 'Last 90 days' },
]

const REASON_COLORS = [
  ADMIN_CHART_COLORS.blue,
  ADMIN_CHART_COLORS.amber,
  ADMIN_CHART_COLORS.purple,
  ADMIN_CHART_COLORS.teal,
  ADMIN_CHART_COLORS.green,
  '#f43f5e',
  '#64748b',
]

const humanizeReason = (reason: string): string =>
  reason.replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase())

interface BotBlocksTabProps {
  botBlocks: AdminBotBlocks
  onDaysChange: (days: number) => void
}

export const BotBlocksTab = ({
  botBlocks,
  onDaysChange,
}: BotBlocksTabProps) => {
  const { days, totals, byReason, series, topProjects } = botBlocks

  const selectedPeriod = PERIODS.find(({ key }) => key === days) || PERIODS[0]

  // Pivot {date, reason, count} rows into one chart series per reason,
  // ordered by volume so colours stay stable across period switches
  const chartSeries = byReason.map(({ reason }, index) => ({
    id: reason,
    name: humanizeReason(reason),
    color: REASON_COLORS[index % REASON_COLORS.length],
    data: series
      .filter((point) => point.reason === reason)
      .map(({ date, count }) => ({ date, count })),
  }))

  const topReason = byReason[0]

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <Text as='h3' size='lg' weight='semibold'>
            Bot blocks
          </Text>
          <Text as='p' size='sm' colour='secondary' className='mt-0.5'>
            Events dropped by bot protection. A project blocking most of its
            traffic usually means a misconfigured proxy, not bots.
          </Text>
        </div>
        <Select
          label='Period'
          fieldLabelClassName='sr-only'
          title={selectedPeriod.label}
          items={PERIODS}
          labelExtractor={(item) => item.label}
          keyExtractor={(item) => item.key.toString()}
          selectedItem={selectedPeriod}
          onSelect={(item) => onDaysChange(item.key)}
          menuClassName='right-0 w-max min-w-full'
        />
      </div>

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
        <StatCard
          label={`Blocked (${days}d)`}
          value={nFormatter(totals.total, 1)}
          hint={nLocaleFormatter(totals.total)}
        />
        <StatCard label='Blocked (24h)' value={nFormatter(totals.last24h, 1)} />
        <StatCard
          label='Top reason'
          value={topReason ? humanizeReason(topReason.reason) : '—'}
          hint={
            topReason
              ? `${nLocaleFormatter(topReason.count)} blocks`
              : undefined
          }
        />
      </div>

      <div className='rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-900/25'>
        <Text as='h4' size='lg' weight='semibold' className='mb-4'>
          Blocks by reason
        </Text>
        {series.length === 0 ? (
          <EmptyState message='No blocks recorded in this period' />
        ) : (
          <AdminChart className='h-72' series={chartSeries} />
        )}
      </div>

      <section>
        <Text as='h4' size='lg' weight='semibold'>
          Most blocked projects
        </Text>
        <Text as='p' size='sm' colour='secondary' className='mt-0.5'>
          Block ratio = blocked / (blocked + accepted). Near 100% on an active
          project is the datacenter-IP-wipeout signature — check their proxy
          setup.
        </Text>
        <div className='mt-3'>
          {topProjects.length === 0 ? (
            <EmptyState message='No blocks recorded in this period' />
          ) : (
            <AdminTable
              columns={[
                { key: 'project', label: 'Project' },
                { key: 'owner', label: 'Owner' },
                { key: 'shield', label: 'Protection' },
                { key: 'blocked', label: 'Blocked' },
                { key: 'accepted', label: 'Accepted' },
                { key: 'ratio', label: 'Block ratio' },
                { key: 'reason', label: 'Top reason' },
              ]}
            >
              {topProjects.map((project) => (
                <tr key={project.id}>
                  <Td>
                    {project.name ? (
                      <Link
                        to={`/admin?tab=projects&project=${project.id}`}
                        className={adminLinkClassName}
                      >
                        {project.name}
                      </Link>
                    ) : (
                      <span className='text-gray-500 italic dark:text-gray-400'>
                        Deleted project
                      </span>
                    )}
                    <span className='ml-2 text-xs text-gray-500 dark:text-gray-400'>
                      {project.id}
                    </span>
                  </Td>
                  <Td>
                    {project.admin ? (
                      <Link
                        to={`/admin?tab=users&user=${project.admin.id}`}
                        className={adminLinkClassName}
                      >
                        {project.admin.email}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </Td>
                  <Td>
                    {project.botsProtectionLevel ? (
                      <Badge
                        colour={
                          project.botsProtectionLevel === 'strict'
                            ? 'yellow'
                            : 'slate'
                        }
                        label={project.botsProtectionLevel}
                        size='sm'
                      />
                    ) : (
                      '—'
                    )}
                  </Td>
                  <Td className='tabular-nums'>
                    {nLocaleFormatter(project.blocked)}
                  </Td>
                  <Td className='tabular-nums'>
                    {nLocaleFormatter(project.accepted)}
                  </Td>
                  <Td>
                    <Badge
                      colour={
                        project.blockRatio >= 80
                          ? 'red'
                          : project.blockRatio >= 40
                            ? 'yellow'
                            : 'slate'
                      }
                      label={`${project.blockRatio}%`}
                    />
                  </Td>
                  <Td>
                    {project.topReason
                      ? humanizeReason(project.topReason)
                      : '—'}
                  </Td>
                </tr>
              ))}
            </AdminTable>
          )}
        </div>
      </section>
    </div>
  )
}

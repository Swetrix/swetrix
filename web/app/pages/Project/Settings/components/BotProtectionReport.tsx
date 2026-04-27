import { ArrowSquareOutIcon } from '@phosphor-icons/react'
import cx from 'clsx'
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useBotProtectionStatsProxy } from '~/hooks/useAnalyticsProxy'
import type { BotProtectionPeriod, BotProtectionStats } from '~/api/api.server'
import Loader from '~/ui/Loader'
import { Text } from '~/ui/Text'
import { cn, nFormatter } from '~/utils/generic'

import CCRow from '../../View/components/CCRow'

interface BotProtectionReportProps {
  pid: string
}

const PERIODS: BotProtectionPeriod[] = ['7d', '30d', '90d']

const REASON_KEYS: Record<string, string> = {
  user_agent: 'project.settings.botProtectionReport.reasons.user_agent',
  headless_browser:
    'project.settings.botProtectionReport.reasons.headless_browser',
  suspicious_headers:
    'project.settings.botProtectionReport.reasons.suspicious_headers',
  probe_path: 'project.settings.botProtectionReport.reasons.probe_path',
  referrer_spam: 'project.settings.botProtectionReport.reasons.referrer_spam',
  datacenter_ip: 'project.settings.botProtectionReport.reasons.datacenter_ip',
}

const formatReason = (reason: string, t: (key: string) => string): string => {
  const key = REASON_KEYS[reason]
  if (key) return t(key)
  return reason
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const BotProtectionReport = ({ pid }: BotProtectionReportProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const { fetchBotProtectionStats } = useBotProtectionStatsProxy()
  const [period, setPeriod] = useState<BotProtectionPeriod>('30d')
  const [stats, setStats] = useState<BotProtectionStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await fetchBotProtectionStats(pid, period)
        if (cancelled) return
        setStats(data)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Unknown error')
        setStats(null)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [pid, period, fetchBotProtectionStats])

  const total = stats?.total ?? 0

  const formattedTotal = useMemo(() => nFormatter(total, 2), [total])

  const byReason = stats?.byReason ?? []
  const byCountry = stats?.byCountry ?? []

  const isInitialLoading = isLoading && !stats
  const showData = !error && !isInitialLoading && total > 0
  const showEmpty = !error && !isInitialLoading && stats !== null && total === 0

  return (
    <section className='overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-slate-800/60 dark:bg-slate-900/25'>
      <header className='flex flex-col gap-3 px-4 pt-4 pb-3 sm:flex-row sm:items-end sm:justify-between'>
        <div className='min-w-0'>
          <Text
            as='p'
            className='text-2xl leading-none font-semibold tracking-tight text-gray-900 tabular-nums dark:text-slate-50'
          >
            {isInitialLoading ? (
              <span className='text-gray-400 dark:text-slate-500'>—</span>
            ) : (
              formattedTotal
            )}
          </Text>
          <Text as='p' size='sm' colour='muted' className='mt-1'>
            {t('project.settings.botProtectionReport.subtitle', {
              count: total,
            })}
          </Text>
        </div>

        <div
          role='tablist'
          aria-label={t('project.settings.botProtectionReport.periodLabel')}
          className='inline-flex items-center gap-0.5 self-start rounded-md bg-gray-100 p-0.5 text-xs font-medium sm:self-auto dark:bg-slate-800/60'
        >
          {PERIODS.map((value) => {
            const active = value === period
            return (
              <button
                key={value}
                type='button'
                role='tab'
                aria-selected={active}
                onClick={() => setPeriod(value)}
                className={cx(
                  'rounded-[5px] px-2.5 py-1 transition-colors',
                  active
                    ? 'bg-white text-gray-900 shadow-xs dark:bg-slate-700/70 dark:text-slate-50'
                    : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100',
                )}
              >
                {t(`project.settings.botProtectionReport.periods.${value}`)}
              </button>
            )
          })}
        </div>
      </header>

      {error ? (
        <div className='border-t border-gray-200 px-4 py-4 text-sm text-red-600 dark:border-slate-800/60 dark:text-red-400'>
          {error}
        </div>
      ) : (
        <div className='min-h-[230px] border-t border-gray-200 dark:border-slate-800/60'>
          {isInitialLoading ? (
            <div className='flex min-h-[230px] items-center justify-center'>
              <Loader className='pt-0' />
            </div>
          ) : null}

          {showEmpty ? (
            <div
              className={cn(
                'flex min-h-[230px] items-center justify-center px-4 py-8 text-center transition-opacity duration-200',
                isLoading && 'opacity-60',
              )}
            >
              <Text as='p' size='sm' colour='muted'>
                {t('project.settings.botProtectionReport.empty')}
              </Text>
            </div>
          ) : null}

          {showData ? (
            <div
              className={cn(
                'grid grid-cols-1 transition-opacity duration-200 sm:grid-cols-2',
                isLoading && 'opacity-60',
              )}
            >
              <ReportColumn
                label={t('project.settings.botProtectionReport.classification')}
                isEmpty={byReason.length === 0}
                emptyText={t('project.settings.botProtectionReport.empty')}
              >
                {byReason.map((row) => (
                  <BarRow
                    key={row.reason}
                    label={
                      <Text as='span' size='sm' truncate>
                        {formatReason(row.reason, t)}
                      </Text>
                    }
                    count={row.count}
                    total={total}
                  />
                ))}
              </ReportColumn>

              <ReportColumn
                label={t('project.settings.botProtectionReport.topCountries')}
                isEmpty={byCountry.length === 0}
                emptyText={t('project.settings.botProtectionReport.empty')}
                className='border-t border-gray-200 sm:border-t-0 sm:border-l dark:border-slate-800/60'
              >
                {byCountry.map((row) => (
                  <BarRow
                    key={row.cc}
                    label={
                      <span className='inline-flex items-center truncate text-sm text-gray-900 dark:text-gray-50'>
                        <CCRow cc={row.cc} language={language} size={16} />
                      </span>
                    }
                    count={row.count}
                    total={total}
                  />
                ))}
              </ReportColumn>
            </div>
          ) : null}
        </div>
      )}

      {!error ? (
        <div className='flex justify-end border-t border-gray-200 px-4 py-2 dark:border-slate-800/60'>
          <a
            href='https://docs.swetrix.com/bot-protection'
            target='_blank'
            rel='noreferrer noopener'
            className='inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 underline-offset-2 hover:text-gray-900 hover:underline dark:text-slate-400 dark:hover:text-slate-100'
          >
            {t('project.settings.botProtectionReport.learnMore')}
            <ArrowSquareOutIcon className='size-3.5' weight='regular' />
          </a>
        </div>
      ) : null}
    </section>
  )
}

interface ReportColumnProps {
  label: string
  isEmpty: boolean
  emptyText: string
  children: React.ReactNode
  className?: string
}

const ReportColumn = ({
  label,
  isEmpty,
  emptyText,
  children,
  className,
}: ReportColumnProps) => (
  <div className={cn('px-4 py-3', className)}>
    <Text
      as='p'
      size='xs'
      weight='semibold'
      colour='muted'
      className='tracking-[0.08em] uppercase'
    >
      {label}
    </Text>
    {isEmpty ? (
      <Text as='p' size='sm' colour='muted' className='mt-3'>
        {emptyText}
      </Text>
    ) : (
      <ul className='mt-3 space-y-0.5'>{children}</ul>
    )}
  </div>
)

interface BarRowProps {
  label: React.ReactNode
  count: number
  total: number
}

const BarRow = ({ label, count, total }: BarRowProps) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <li className='group relative flex h-7 items-center justify-between rounded-sm px-1.5 hover:bg-gray-50 dark:hover:bg-slate-900/60'>
      <div
        aria-hidden='true'
        className='absolute inset-0 rounded-sm bg-blue-50 dark:bg-blue-900/30'
        style={{ width: `${pct}%` }}
      />
      <div className='relative z-10 flex min-w-0 flex-1 items-center gap-1.5'>
        {label}
      </div>
      <div className='relative z-10 flex min-w-fit items-center justify-end pl-2'>
        <Text
          size='xs'
          colour='inherit'
          className='mr-1.5 hidden tabular-nums group-hover:inline'
        >
          ({pct}%)
        </Text>
        <Text size='xs' weight='medium' className='tabular-nums'>
          {nFormatter(count, 1)}
        </Text>
      </div>
    </li>
  )
}

export default BotProtectionReport

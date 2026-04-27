import _isEmpty from 'lodash/isEmpty'
import _round from 'lodash/round'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { Entry } from '~/lib/models/Entry'
import { Text } from '~/ui/Text'
import { nFormatter } from '~/utils/generic'

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

export default CompactReferralPanel

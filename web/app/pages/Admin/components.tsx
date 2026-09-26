import { CaretDownIcon, CaretUpIcon } from '@phosphor-icons/react'
import dayjs from 'dayjs'
import { useState, type ReactNode } from 'react'

import { Badge } from '~/ui/Badge'
import { Text } from '~/ui/Text'
import { cn, nFormatter } from '~/utils/generic'

import type { SortState } from './types'

export const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  )

  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

export const formatDate = (date: string | null): string =>
  date ? dayjs(date).format('MMM D, YYYY') : '—'

export const formatDateTime = (date: string | null): string =>
  date ? dayjs(date).format('MMM D, YYYY HH:mm') : '—'

// Positive change is green (growth is good in every admin metric), negative is
// red, zero is neutral
export const ChangeBadge = ({
  change,
  formatter = (value: number) => nFormatter(Math.abs(value), 1),
}: {
  change: number | null | undefined
  formatter?: (value: number) => string
}) => {
  if (change === null || change === undefined || Number.isNaN(change)) {
    return null
  }

  if (change === 0) {
    return <Badge colour='slate' label='±0' />
  }

  return (
    <Badge
      colour={change > 0 ? 'green' : 'red'}
      label={`${change > 0 ? '+' : '-'}${formatter(change)}`}
    />
  )
}

export const StatCard = ({
  label,
  value,
  badge,
  hint,
  children,
}: {
  label: string
  value: ReactNode
  badge?: ReactNode
  hint?: ReactNode
  children?: ReactNode
}) => (
  <div className='rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-slate-800/60 dark:bg-slate-900/25'>
    <Text as='p' size='sm' colour='secondary'>
      {label}
    </Text>
    <div className='mt-1 flex items-center gap-2'>
      <Text as='p' size='2xl' weight='bold' className='tabular-nums'>
        {value}
      </Text>
      {badge}
    </div>
    {hint ? (
      <Text as='p' size='xs' colour='secondary' className='mt-1'>
        {hint}
      </Text>
    ) : null}
    {children}
  </div>
)

export interface AdminColumn {
  key: string
  label: ReactNode
  sortable?: boolean
}

// Shared sorting state for admin tables. Columns whose key is in `serverKeys`
// sort the whole dataset through the loader; everything else sorts the rows of
// the current page locally (the computed columns live in ClickHouse and can't
// be sorted by MySQL).
export const useAdminSort = <Row,>(
  serverKeys: string[],
  serverSort: SortState,
  onServerSort: (by: string, order: 'ASC' | 'DESC') => void,
  accessors: Record<string, (row: Row) => string | number | null>,
) => {
  const [clientSort, setClientSort] = useState<SortState | null>(null)

  const sort = clientSort ?? serverSort

  const onSort = (key: string) => {
    const nextOrder: 'ASC' | 'DESC' =
      sort.by === key && sort.order === 'DESC' ? 'ASC' : 'DESC'

    if (serverKeys.includes(key)) {
      setClientSort(null)
      onServerSort(key, nextOrder)
    } else {
      setClientSort({ by: key, order: nextOrder })
    }
  }

  const sortRows = (rows: Row[]): Row[] => {
    if (!clientSort) {
      return rows
    }

    const accessor = accessors[clientSort.by]

    if (!accessor) {
      return rows
    }

    const sorted = [...rows].sort((a, b) => {
      const aValue = accessor(a)
      const bValue = accessor(b)

      if (aValue === bValue) return 0
      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return aValue - bValue
      }

      return String(aValue).localeCompare(String(bValue))
    })

    return clientSort.order === 'DESC' ? sorted.reverse() : sorted
  }

  return { sort, onSort, sortRows }
}

export const AdminTable = ({
  columns,
  sort,
  onSort,
  children,
  className,
}: {
  columns: AdminColumn[]
  sort?: SortState
  onSort?: (key: string) => void
  children: ReactNode
  className?: string
}) => (
  <div
    className={cn(
      'overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-800/60',
      className,
    )}
  >
    <table className='min-w-full divide-y divide-gray-200 dark:divide-slate-800/60'>
      <thead className='bg-gray-50 dark:bg-slate-900/50'>
        <tr>
          {columns.map((column) => {
            const isSorted = sort?.by === column.key
            const isSortable = Boolean(column.sortable && onSort)

            return (
              <th
                key={column.key}
                scope='col'
                aria-sort={
                  isSorted
                    ? sort?.order === 'ASC'
                      ? 'ascending'
                      : 'descending'
                    : undefined
                }
                className='px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap text-gray-500 uppercase dark:text-gray-400'
              >
                {isSortable ? (
                  <button
                    type='button'
                    onClick={() => onSort?.(column.key)}
                    className='group inline-flex cursor-pointer items-center gap-1 uppercase hover:text-gray-900 dark:hover:text-gray-100'
                  >
                    {column.label}
                    <span
                      className={cn('transition-opacity', {
                        'opacity-0 group-hover:opacity-60': !isSorted,
                      })}
                    >
                      {isSorted && sort?.order === 'ASC' ? (
                        <CaretUpIcon weight='bold' className='size-3' />
                      ) : (
                        <CaretDownIcon weight='bold' className='size-3' />
                      )}
                    </span>
                  </button>
                ) : (
                  column.label
                )}
              </th>
            )
          })}
        </tr>
      </thead>
      <tbody className='divide-y divide-gray-200 bg-white dark:divide-slate-800/60 dark:bg-slate-950'>
        {children}
      </tbody>
    </table>
  </div>
)

export const Td = ({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) => (
  <td
    className={cn(
      'px-3 py-2.5 text-sm whitespace-nowrap text-gray-900 dark:text-gray-100',
      className,
    )}
  >
    {children}
  </td>
)

export const EmptyState = ({ message }: { message: string }) => (
  <div className='rounded-lg border border-dashed border-gray-300 px-4 py-12 text-center dark:border-slate-700'>
    <Text as='p' size='sm' colour='secondary'>
      {message}
    </Text>
  </div>
)

export const UsageBar = ({
  used,
  total,
  className,
}: {
  used: number
  total: number
  className?: string
}) => {
  const percentage = total > 0 ? Math.min((used / total) * 100, 100) : 0

  return (
    <div
      className={cn(
        'h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-800',
        className,
      )}
    >
      <div
        className={cn('h-full rounded-full', {
          'bg-emerald-500': percentage < 70,
          'bg-yellow-500': percentage >= 70 && percentage < 90,
          'bg-red-500': percentage >= 90,
        })}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

import dayjs from 'dayjs'
import type { ReactNode } from 'react'

import { Text } from '~/ui/Text'
import { cn } from '~/utils/generic'

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

export const StatCard = ({
  label,
  value,
  hint,
  children,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  children?: ReactNode
}) => (
  <div className='rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-slate-800/60 dark:bg-slate-900/25'>
    <Text as='p' size='sm' colour='secondary'>
      {label}
    </Text>
    <Text as='p' size='2xl' weight='bold' className='mt-1 tabular-nums'>
      {value}
    </Text>
    {hint ? (
      <Text as='p' size='xs' colour='secondary' className='mt-1'>
        {hint}
      </Text>
    ) : null}
    {children}
  </div>
)

export const AdminTable = ({
  headers,
  children,
  className,
}: {
  headers: ReactNode[]
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
          {headers.map((header, index) => (
            <th
              key={index}
              scope='col'
              className='px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap text-gray-500 uppercase dark:text-gray-400'
            >
              {header}
            </th>
          ))}
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

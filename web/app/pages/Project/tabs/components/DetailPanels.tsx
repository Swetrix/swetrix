import type { ReactNode } from 'react'

import { Text } from '~/ui/Text'
import { cn } from '~/utils/generic'

export const InfoRow = ({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: ReactNode
  valueClassName?: string
}) => (
  <div className='grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] items-center gap-3 border-b border-gray-100 py-1.5 last:border-0 dark:border-slate-800/80'>
    <Text size='sm' colour='secondary' className='min-w-0'>
      {label}
    </Text>
    <Text
      as='div'
      size='sm'
      weight='medium'
      colour='primary'
      className={cn(
        'flex min-w-0 items-center justify-end gap-1 text-right wrap-break-word',
        valueClassName,
      )}
    >
      {value}
    </Text>
  </div>
)

export const PanelSection = ({
  title,
  action,
  children,
}: {
  title: ReactNode
  action?: ReactNode
  children: ReactNode
}) => (
  <section className='border-t border-gray-100 pt-3 first:border-t-0 first:pt-0 dark:border-slate-800/80'>
    <div className='mb-1.5 flex items-center justify-between gap-3'>
      <Text
        as='h3'
        size='xs'
        weight='semibold'
        colour='primary'
        className='uppercase'
        tracking='wide'
      >
        {title}
      </Text>
      {action}
    </div>
    {children}
  </section>
)

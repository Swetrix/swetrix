import React from 'react'

import { cn } from '~/utils/generic'

export interface BadgeProps {
  label: React.ReactNode
  className?: string
  colour?: 'red' | 'yellow' | 'green' | 'indigo' | 'slate' | 'sky'
  size?: 'sm' | 'md'
}

const sizeClasses: Record<NonNullable<BadgeProps['size']>, string> = {
  sm: 'px-1.5 py-0.5 text-[11px]',
  md: 'px-2 py-1 text-xs',
}

export const Badge = ({
  label,
  className,
  colour,
  size = 'md',
}: BadgeProps) => (
  <span
    className={cn(
      'inline-flex items-center rounded-md font-medium ring-1 ring-inset',
      sizeClasses[size],
      {
        'bg-slate-50 text-slate-700 ring-slate-500/15 dark:bg-slate-400/10 dark:text-slate-300 dark:ring-slate-400/20':
          colour === 'slate',
        'bg-indigo-50 text-indigo-700 ring-indigo-700/15 dark:bg-indigo-400/10 dark:text-indigo-300 dark:ring-indigo-400/30':
          colour === 'indigo',
        'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20':
          colour === 'yellow',
        'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20':
          colour === 'green',
        'bg-red-50 text-red-700 ring-red-600/15 dark:bg-red-400/10 dark:text-red-300 dark:ring-red-400/20':
          colour === 'red',
        'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/20':
          colour === 'sky',
      },
      className,
    )}
  >
    {label}
  </span>
)

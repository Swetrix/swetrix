import React from 'react'
import cx from 'clsx'

interface IBadge {
  label: string,
  className?: string,
  colour?: 'red' | 'yellow' | 'green' | 'indigo' | 'slate',
}

const Badge = ({ label, className, colour }: IBadge): JSX.Element => (
  <span
    className={cx('inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset', className, {
      'ring-slate-500/10 text-slate-600 bg-slate-50 dark:bg-slate-400/10 dark:text-slate-400 dark:ring-slate-400/20': colour === 'slate',
      'bg-indigo-50 text-indigo-700 ring-indigo-700/10 dark:bg-indigo-400/10 dark:text-indigo-400 dark:ring-indigo-400/30': colour === 'indigo',
      'bg-yellow-50 text-yellow-800 ring-yellow-600/20 dark:bg-yellow-400/10 dark:text-yellow-500 dark:ring-yellow-400/20': colour === 'yellow',
      'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:ring-green-500/20': colour === 'green',
      'bg-red-50 text-red-700 ring-red-600/10 dark:bg-red-400/10 dark:text-red-400 dark:ring-red-400/20': colour === 'red',
    })}
  >
    {label}
  </span>
)

export {
  Badge,
}

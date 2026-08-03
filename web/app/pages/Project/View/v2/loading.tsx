import cx from 'clsx'

export const RefetchIndicator = ({ className }: { className?: string }) => (
  <div
    aria-hidden
    className={cx(
      'absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-700/70',
      className,
    )}
  >
    <div className='indeterminate-bar absolute inset-y-0 left-0 w-[42%] rounded-full bg-linear-to-r from-slate-400 via-slate-900 to-slate-400 will-change-transform dark:from-slate-500 dark:via-white dark:to-slate-500' />
  </div>
)

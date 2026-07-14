import cx from 'clsx'

export const RefetchIndicator = ({ className }: { className?: string }) => (
  <div
    aria-hidden
    className={cx(
      'absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden',
      className,
    )}
  >
    <div
      className='absolute h-full rounded-full bg-linear-to-r from-slate-400 via-slate-700 to-slate-900 dark:from-slate-500 dark:via-slate-200 dark:to-white'
      style={{
        animation:
          'indeterminate1 1.8s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite',
      }}
    />
    <div
      className='absolute h-full rounded-full bg-linear-to-r from-slate-700 to-slate-900 opacity-70 dark:from-slate-300 dark:to-white'
      style={{
        animation:
          'indeterminate2 1.8s cubic-bezier(0.165, 0.84, 0.44, 1) infinite',
        animationDelay: '1s',
      }}
    />
  </div>
)

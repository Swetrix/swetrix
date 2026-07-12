import cx from 'clsx'

// Subtle per-panel loading primitives for the v2 per-dimension dashboard.
// First load -> skeleton; refetch -> thin indeterminate bar + dimmed body
// (data stays visible via react-query's keepPreviousData).

/** Thin indeterminate progress bar pinned to the top edge of a card */
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

// Deterministic widths so SSR and client render identically
const SKELETON_ROW_WIDTHS = [
  '72%',
  '58%',
  '80%',
  '46%',
  '64%',
  '38%',
  '54%',
  '30%',
]

/** Pulse rows shaped like panel entries; rendered inside PanelContainer */
export const PanelSkeleton = ({ rows = 8 }: { rows?: number }) => (
  <div className='flex h-full flex-col justify-start gap-3 pt-2' aria-busy>
    {SKELETON_ROW_WIDTHS.slice(0, rows).map((width, i) => (
      <div key={i} className='flex animate-pulse items-center justify-between'>
        <div
          className='h-5 rounded-sm bg-gray-200 dark:bg-slate-800'
          style={{ width }}
        />
        <div className='h-5 w-10 rounded-sm bg-gray-200 dark:bg-slate-800' />
      </div>
    ))}
  </div>
)

/** Pulse block sized like the main chart */
export const ChartSkeleton = ({ className }: { className?: string }) => (
  <div
    aria-busy
    className={cx(
      'h-80 animate-pulse rounded-lg bg-gray-200 md:h-[420px] dark:bg-slate-800',
      className,
    )}
  />
)

export const MetricCardsSkeleton = ({ cards = 4 }: { cards?: number }) => (
  <div className='mb-4 flex flex-wrap justify-center gap-5 lg:justify-start'>
    {Array.from({ length: cards }).map((_, i) => (
      <div key={i} className='flex animate-pulse flex-col'>
        <div className='mb-2 h-4 w-24 rounded-sm bg-gray-200 dark:bg-slate-800' />
        <div className='h-8 w-16 rounded-sm bg-gray-200 dark:bg-slate-800' />
      </div>
    ))}
  </div>
)

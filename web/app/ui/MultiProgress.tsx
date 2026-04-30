import cx from 'clsx'
import _map from 'lodash/map'
import { memo } from 'react'

import { useTheme } from '~/providers/ThemeProvider'

interface Progress {
  value: number
  lightColour: string
  darkColour: string
}

interface MultiProgressProps {
  progress: Progress[]
  className?: string
  /**
   * Accessible label. When provided (along with valuenow / labelledby), the bar is
   * exposed as `role="progressbar"`. When omitted, the bar is purely decorative
   * and hidden from assistive technology.
   */
  'aria-label'?: string
  'aria-labelledby'?: string
  /**
   * Current value (defaults to the sum of `progress[].value`). Used only when the
   * bar is announced (i.e. when an accessible name is provided).
   */
  'aria-valuenow'?: number
  'aria-valuemin'?: number
  'aria-valuemax'?: number
}

const MultiProgress = ({
  progress,
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  'aria-valuenow': ariaValuenow,
  'aria-valuemin': ariaValuemin = 0,
  'aria-valuemax': ariaValuemax = 100,
}: MultiProgressProps) => {
  const { theme } = useTheme()

  const hasAccessibleName = Boolean(ariaLabel || ariaLabelledby)
  const valuenow =
    ariaValuenow ?? progress.reduce((sum, item) => sum + item.value, 0)

  const a11yProps = hasAccessibleName
    ? {
        role: 'progressbar' as const,
        'aria-label': ariaLabel,
        'aria-labelledby': ariaLabelledby,
        'aria-valuenow': valuenow,
        'aria-valuemin': ariaValuemin,
        'aria-valuemax': ariaValuemax,
      }
    : { 'aria-hidden': true as const }

  return (
    <div className='relative'>
      <div
        className={cx(
          'flex h-2.5 overflow-hidden rounded-full bg-gray-200 ring-1 ring-gray-200/40 ring-inset dark:bg-slate-800 dark:ring-slate-700/30',
          className,
        )}
        {...a11yProps}
      >
        {_map(progress, ({ value, lightColour, darkColour }) => (
          <div
            key={`${value}-${lightColour}-${darkColour}`}
            style={{
              width: `${value}%`,
              backgroundColor: theme === 'dark' ? darkColour : lightColour,
            }}
            className='h-full transition-[width] duration-300 ease-out'
          />
        ))}
      </div>
    </div>
  )
}

export default memo(MultiProgress)

import { memo, useMemo } from 'react'

import { cn } from '~/utils/generic'

type ColourThresholds = {
  green: number // >= this value is green
  amber: number // >= this value (and < green) is amber
  // < amber is red
}

interface ProgressRingProps {
  /** Value from 0 to 100 */
  value: number
  /** Size of the ring in pixels */
  size?: number
  /** Stroke width of the ring */
  strokeWidth?: number
  /** Custom class name */
  className?: string
  /** Whether to show the percentage text in the center */
  showValue?: boolean
  /** Custom thresholds for colour coding. Default: { green: 80, amber: 40 } */
  thresholds?: ColourThresholds
  /** Accessible label for screen readers */
  ariaLabel?: string
}

const DEFAULT_THRESHOLDS: ColourThresholds = {
  green: 80,
  amber: 40,
}

const getColourClasses = (value: number, thresholds: ColourThresholds) => {
  if (value >= thresholds.green) {
    return {
      stroke: 'stroke-emerald-500 dark:stroke-emerald-400',
      text: 'text-emerald-600 dark:text-emerald-400',
    }
  }

  if (value >= thresholds.amber) {
    return {
      stroke: 'stroke-amber-500 dark:stroke-amber-400',
      text: 'text-amber-600 dark:text-amber-400',
    }
  }

  return {
    stroke: 'stroke-red-500 dark:stroke-red-400',
    text: 'text-red-600 dark:text-red-400',
  }
}

const ProgressRing = ({
  value,
  size = 40,
  strokeWidth = 4,
  className,
  showValue = true,
  thresholds = DEFAULT_THRESHOLDS,
  ariaLabel,
}: ProgressRingProps) => {
  const normalizedValue = useMemo(() => {
    const safeValue = Number.isFinite(value) ? value : 0
    return Math.min(100, Math.max(0, safeValue))
  }, [value])

  const { radius, circumference, strokeDashoffset } = useMemo(() => {
    const r = (size - strokeWidth) / 2
    const c = 2 * Math.PI * r
    const offset = c - (normalizedValue / 100) * c

    return {
      radius: r,
      circumference: c,
      strokeDashoffset: offset,
    }
  }, [size, strokeWidth, normalizedValue])

  const colourClasses = useMemo(
    () => getColourClasses(normalizedValue, thresholds),
    [normalizedValue, thresholds],
  )

  const center = size / 2
  const displayValue = Math.floor(normalizedValue)

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center',
        className,
      )}
      role='progressbar'
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={displayValue}
      aria-label={ariaLabel ?? `Progress: ${displayValue}%`}
    >
      <svg width={size} height={size} className='-rotate-90' aria-hidden='true'>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill='none'
          strokeWidth={strokeWidth}
          className='stroke-gray-200 dark:stroke-slate-800'
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill='none'
          strokeWidth={strokeWidth}
          strokeLinecap='round'
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={cn(
            'transition-[stroke-dashoffset] duration-500 ease-out',
            colourClasses.stroke,
          )}
        />
      </svg>
      {showValue ? (
        <span
          className={cn(
            'absolute text-center font-semibold tabular-nums',
            colourClasses.text,
          )}
          style={{ fontSize: size * 0.22 }}
        >
          {displayValue}%
        </span>
      ) : null}
    </div>
  )
}

export default memo(ProgressRing)

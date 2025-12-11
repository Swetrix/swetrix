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
}

const DEFAULT_THRESHOLDS: ColourThresholds = {
  green: 80,
  amber: 40,
}

const getColourClasses = (value: number, thresholds: ColourThresholds) => {
  if (value >= thresholds.green) {
    return {
      stroke: 'stroke-green-500 dark:stroke-green-400',
      text: 'text-green-600 dark:text-green-400',
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
}: ProgressRingProps) => {
  const normalizedValue = useMemo(() => Math.min(100, Math.max(0, value)), [value])

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

  const colourClasses = useMemo(() => getColourClasses(normalizedValue, thresholds), [normalizedValue, thresholds])

  const center = size / 2

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className='-rotate-90'>
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill='none'
          strokeWidth={strokeWidth}
          className='stroke-gray-200 dark:stroke-slate-600'
        />
        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill='none'
          strokeWidth={strokeWidth}
          strokeLinecap='round'
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={cn('transition-all duration-300 ease-out', colourClasses.stroke)}
        />
      </svg>
      {showValue ? (
        <span
          className={cn('absolute text-center font-semibold', colourClasses.text)}
          style={{ fontSize: size * 0.22 }}
        >
          {Math.round(normalizedValue)}%
        </span>
      ) : null}
    </div>
  )
}

export default memo(ProgressRing)

import NumberFlow, { NumberFlowGroup } from '@number-flow/react'
import _round from 'lodash/round'
import { useEffect, useState } from 'react'

import {
  FLOW_TIMING,
  FLOW_VALUE_CLASS,
  useFlowValue,
} from '~/hooks/useFlowValue'
import {
  getStringFromTime,
  getTimeFromSeconds,
  nFormatterSeparated,
} from '~/utils/generic'

// NumberFlow renders nothing meaningful server-side, so every flow falls back to
// plain text until hydration and only then starts animating.
const useIsHydrated = () => {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  return isHydrated
}

const StaticCompactNumber = ({ value }: { value?: number }) => {
  const [num, symbol] = nFormatterSeparated(value, 1) as [number, string | null]

  return (
    <>
      {num}
      {symbol}
    </>
  )
}

const AnimatedCompactNumber = ({ value }: { value?: number }) => {
  const flowValue = useFlowValue(value)
  const [num, symbol] = nFormatterSeparated(flowValue, 1) as [
    number,
    string | null,
  ]

  return (
    <NumberFlow
      className={FLOW_VALUE_CLASS}
      {...FLOW_TIMING}
      value={num}
      suffix={symbol ?? undefined}
      format={{ maximumFractionDigits: 1 }}
      willChange
    />
  )
}

/** Counts, abbreviated past a thousand (1.2k, 3.4M). */
export const CompactNumberFlow = ({ value }: { value?: number }) => {
  const isHydrated = useIsHydrated()

  return isHydrated ? (
    <AnimatedCompactNumber value={value} />
  ) : (
    <StaticCompactNumber value={value} />
  )
}

const AnimatedPercent = ({ value }: { value: number }) => {
  const flowValue = useFlowValue(value)

  return (
    <NumberFlow
      className={FLOW_VALUE_CLASS}
      {...FLOW_TIMING}
      value={flowValue}
      suffix='%'
      format={{ maximumFractionDigits: 1 }}
      willChange
    />
  )
}

/** Percentages, rounded to a single decimal. */
export const PercentFlow = ({ value }: { value?: number }) => {
  const isHydrated = useIsHydrated()
  const sanitizedValue = Number.isFinite(value) ? _round(value as number, 1) : 0

  return isHydrated ? (
    <AnimatedPercent value={sanitizedValue} />
  ) : (
    <>{sanitizedValue}%</>
  )
}

const StaticDuration = ({
  value,
  showMs,
}: {
  value?: number
  showMs?: boolean
}) => (
  <>
    {getStringFromTime(
      getTimeFromSeconds(Number.isFinite(value) ? (value as number) : 0),
      showMs,
    )}
  </>
)

const AnimatedDuration = ({
  value,
  showMs,
}: {
  value?: number
  showMs?: boolean
}) => {
  const flowValue = useFlowValue(value)
  const time = getTimeFromSeconds(flowValue)
  const s = showMs ? _round(time.s + time.ms / 1000, 2) : time.s

  // Decide which units to render from the target value so the NumberFlow
  // elements mount once and roll from zero, instead of remounting mid-flight
  const target = getTimeFromSeconds(
    Number.isFinite(value) ? (value as number) : 0,
  )
  const targetS = showMs ? _round(target.s + target.ms / 1000, 2) : target.s
  const showH = target.h > 0
  const showM = target.m > 0
  const showS = targetS > 0 || (!showH && !showM)

  return (
    <NumberFlowGroup>
      <>
        {target.negative ? '-' : null}
        {showH ? (
          <NumberFlow
            className={FLOW_VALUE_CLASS}
            {...FLOW_TIMING}
            value={time.h}
            suffix='h'
            willChange
          />
        ) : null}
        {showH && (showM || showS) ? ' ' : null}
        {showM ? (
          <NumberFlow
            className={FLOW_VALUE_CLASS}
            {...FLOW_TIMING}
            value={time.m}
            suffix='m'
            willChange
          />
        ) : null}
        {showM && showS ? ' ' : null}
        {showS ? (
          <NumberFlow
            className={FLOW_VALUE_CLASS}
            {...FLOW_TIMING}
            value={s}
            suffix='s'
            format={{ maximumFractionDigits: 2 }}
            willChange
          />
        ) : null}
      </>
    </NumberFlowGroup>
  )
}

/** Durations given in seconds, rendered as h/m/s. */
export const DurationFlow = ({
  value,
  showMs,
}: {
  value?: number
  showMs?: boolean
}) => {
  const isHydrated = useIsHydrated()

  return isHydrated ? (
    <AnimatedDuration value={value} showMs={showMs} />
  ) : (
    <StaticDuration value={value} showMs={showMs} />
  )
}

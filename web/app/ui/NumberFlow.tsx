import _round from 'lodash/round'
import {
  getStringFromTime,
  getTimeFromSeconds,
  nFormatterSeparated,
} from '~/utils/generic'

const StaticCompactNumber = ({ value }: { value?: number }) => {
  const [num, symbol] = nFormatterSeparated(value, 1) as [number, string | null]

  return (
    <>
      {num}
      {symbol}
    </>
  )
}

/** Counts, abbreviated past a thousand (1.2k, 3.4M). */
export const CompactNumberFlow = ({ value }: { value?: number }) => (
  <StaticCompactNumber value={value} />
)

/** Percentages, rounded to a single decimal. */
export const PercentFlow = ({ value }: { value?: number }) => {
  const sanitizedValue = Number.isFinite(value) ? _round(value as number, 1) : 0

  return <>{sanitizedValue}%</>
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

/** Durations given in seconds, rendered as h/m/s. */
export const DurationFlow = ({
  value,
  showMs,
}: {
  value?: number
  showMs?: boolean
}) => <StaticDuration value={value} showMs={showMs} />

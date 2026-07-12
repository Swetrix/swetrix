interface V1SummaryPeriod {
  all: number
  unique: number
  users: number
  bounceRate: number
  sdur: number | null
}

export interface V1TrafficSummary {
  current: V1SummaryPeriod
  previous: V1SummaryPeriod
  change: number
  uniqueChange: number
  usersChange: number
  bounceRateChange: number
  sdurChange: number | null
}

export interface TrafficSummaryPeriod {
  visitors: number
  pageviews: number
  users: number
  bounce_rate: number
  session_duration: number | null
}

export interface TrafficSummaryData {
  current: TrafficSummaryPeriod
  previous: TrafficSummaryPeriod
  change: TrafficSummaryPeriod
}

const toNumber = (value: unknown): number => Number(value) || 0

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || typeof value === 'undefined') {
    return null
  }

  return Number(value) || 0
}

const mapPeriod = (period: V1SummaryPeriod): TrafficSummaryPeriod => ({
  visitors: toNumber(period.unique),
  pageviews: toNumber(period.all),
  users: toNumber(period.users),
  bounce_rate: toNumber(period.bounceRate),
  session_duration: toNullableNumber(period.sdur),
})

/**
 * Reshape a single project's v1 birdseye payload (getAnalyticsSummary) into
 * the v2 summary format with human-readable metric names.
 */
export const mapTrafficSummary = (
  v1Summary: V1TrafficSummary,
): TrafficSummaryData => ({
  current: mapPeriod(v1Summary.current),
  previous: mapPeriod(v1Summary.previous),
  change: {
    visitors: toNumber(v1Summary.uniqueChange),
    pageviews: toNumber(v1Summary.change),
    users: toNumber(v1Summary.usersChange),
    bounce_rate: toNumber(v1Summary.bounceRateChange),
    session_duration: toNullableNumber(v1Summary.sdurChange),
  },
})

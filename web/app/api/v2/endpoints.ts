import { fetchV2, V2QueryParams } from './client'
import {
  BreakdownRow,
  CaptchaSummaryData,
  CustomEventRow,
  DimensionValues,
  ErrorListItem,
  LiveVisitorsData,
  MetadataRow,
  MetricSums,
  PagePropertyRow,
  PerformanceSummaryData,
  SeoBrandedTrafficData,
  SeoPositionsData,
  SeoStatusData,
  SeoSummaryData,
  TimeseriesRow,
  TrafficSummaryData,
  V2CommonParams,
  V2DataType,
} from './types'

type Common = V2CommonParams & V2QueryParams

type SummaryData<T extends V2DataType> = T extends 'traffic'
  ? TrafficSummaryData
  : T extends 'performance'
    ? PerformanceSummaryData
    : T extends 'captcha'
      ? CaptchaSummaryData
      : T extends 'seo'
        ? SeoSummaryData
        : Record<string, unknown>

export const getSummary = <T extends V2DataType>(
  pid: string,
  dataType: T,
  params: Common & { measure?: string },
  signal?: AbortSignal,
) =>
  fetchV2<SummaryData<T>>(`projects/${pid}/${dataType}/summary`, params, signal)

export const getTimeseries = (
  pid: string,
  dataType: V2DataType,
  params: Common & {
    metrics?: string[]
    timeBucket?: string
    mode?: 'periodical' | 'cumulative'
    measure?: string
  },
  signal?: AbortSignal,
) =>
  fetchV2<TimeseriesRow[]>(
    `projects/${pid}/${dataType}/timeseries`,
    params,
    signal,
  )

export const getBreakdown = (
  pid: string,
  dataType: V2DataType,
  params: Common & {
    dimension: string
    metrics?: string[]
    limit?: number
    offset?: number
    sort?: string
    measure?: string
  },
  signal?: AbortSignal,
) =>
  fetchV2<BreakdownRow[]>(
    `projects/${pid}/${dataType}/breakdown`,
    params,
    signal,
  )

export const getSeoStatus = (pid: string, signal?: AbortSignal) =>
  fetchV2<SeoStatusData>(`projects/${pid}/seo/status`, {}, signal)

// Both of the below return `data: null` with `meta.skipped` when the range is
// too wide or Search Console did not answer within the deadline.
export const getSeoBrandedTraffic = (
  pid: string,
  params: Common,
  signal?: AbortSignal,
) =>
  fetchV2<SeoBrandedTrafficData | null>(
    `projects/${pid}/seo/branded-traffic`,
    params,
    signal,
  )

export const getSeoPositions = (
  pid: string,
  params: Common,
  signal?: AbortSignal,
) =>
  fetchV2<SeoPositionsData | null>(
    `projects/${pid}/seo/positions`,
    params,
    signal,
  )

export const getCustomEvents = (
  pid: string,
  params: Common & { limit?: number; offset?: number },
  signal?: AbortSignal,
) =>
  fetchV2<CustomEventRow[]>(
    `projects/${pid}/traffic/custom-events`,
    params,
    signal,
  )

export const getCustomEventsTimeseries = (
  pid: string,
  params: Common & { events: string[]; timeBucket?: string },
  signal?: AbortSignal,
) =>
  fetchV2<TimeseriesRow[]>(
    `projects/${pid}/traffic/custom-events/timeseries`,
    params,
    signal,
  )

export const getCustomEventsMetadata = (
  pid: string,
  params: Common & { event: string },
  signal?: AbortSignal,
) =>
  fetchV2<MetadataRow[]>(
    `projects/${pid}/traffic/custom-events/metadata`,
    params,
    signal,
  )

export const getCustomMetrics = (
  pid: string,
  params: Common & { metrics: string },
  signal?: AbortSignal,
) =>
  fetchV2<{ key: string; current: MetricSums; previous: MetricSums }[]>(
    `projects/${pid}/traffic/custom-metrics`,
    params,
    signal,
  )

export const getPageProperties = (
  pid: string,
  params: Common & { limit?: number; offset?: number },
  signal?: AbortSignal,
) =>
  fetchV2<PagePropertyRow[]>(
    `projects/${pid}/traffic/page-properties`,
    params,
    signal,
  )

export const getPagePropertiesMetadata = (
  pid: string,
  params: Common & { property: string },
  signal?: AbortSignal,
) =>
  fetchV2<MetadataRow[]>(
    `projects/${pid}/traffic/page-properties/metadata`,
    params,
    signal,
  )

export const getErrorsList = (
  pid: string,
  params: Common & { limit?: number; offset?: number; show_resolved?: boolean },
  signal?: AbortSignal,
) => fetchV2<ErrorListItem[]>(`projects/${pid}/errors`, params, signal)

export const getErrorsOverview = (
  pid: string,
  params: Common & { timeBucket?: string },
  signal?: AbortSignal,
) =>
  fetchV2<Record<string, any>>(
    `projects/${pid}/errors/overview`,
    params,
    signal,
  )

export const getErrorDetails = (
  pid: string,
  eid: string,
  params: Common & { timeBucket?: string },
  signal?: AbortSignal,
) =>
  fetchV2<Record<string, any>>(
    `projects/${pid}/errors/${encodeURIComponent(eid)}`,
    params,
    signal,
  )

export const getErrorSessions = (
  pid: string,
  eid: string,
  params: Common & { limit?: number; offset?: number },
  signal?: AbortSignal,
) =>
  fetchV2<any[]>(
    `projects/${pid}/errors/${encodeURIComponent(eid)}/sessions`,
    params,
    signal,
  )

export const getSessionsList = (
  pid: string,
  params: Common & {
    limit?: number
    offset?: number
    event_type?: 'traffic' | 'performance' | 'error'
  },
  signal?: AbortSignal,
) => fetchV2<any[]>(`projects/${pid}/sessions`, params, signal)

export const getSessionDetails = (
  pid: string,
  psid: string,
  params: { timezone?: string } & V2QueryParams,
  signal?: AbortSignal,
) =>
  fetchV2<Record<string, any>>(
    `projects/${pid}/sessions/${encodeURIComponent(psid)}`,
    params,
    signal,
  )

export const getProfilesList = (
  pid: string,
  params: Common & {
    limit?: number
    offset?: number
    profile_type?: 'all' | 'anonymous' | 'identified'
    search?: string
  },
  signal?: AbortSignal,
) => fetchV2<any[]>(`projects/${pid}/profiles`, params, signal)

export const getProfileDetails = (
  pid: string,
  profileId: string,
  params: { timezone?: string } & V2QueryParams,
  signal?: AbortSignal,
) =>
  fetchV2<Record<string, any>>(
    `projects/${pid}/profiles/${encodeURIComponent(profileId)}`,
    params,
    signal,
  )

export const getProfileSessions = (
  pid: string,
  profileId: string,
  params: Common & { limit?: number; offset?: number },
  signal?: AbortSignal,
) =>
  fetchV2<any[]>(
    `projects/${pid}/profiles/${encodeURIComponent(profileId)}/sessions`,
    params,
    signal,
  )

export const getFunnel = (
  pid: string,
  params: Common & { funnelId?: string; steps?: string[] },
  signal?: AbortSignal,
) => fetchV2<Record<string, any>>(`projects/${pid}/funnel`, params, signal)

export const getFunnelSessions = (
  pid: string,
  params: Common & {
    funnelId?: string
    steps?: string[]
    step: number
    dropoff?: boolean
    limit?: number
    offset?: number
  },
  signal?: AbortSignal,
) => fetchV2<any[]>(`projects/${pid}/funnel/sessions`, params, signal)

export const getLiveVisitors = (pid: string, signal?: AbortSignal) =>
  fetchV2<LiveVisitorsData>(`projects/${pid}/live-visitors`, {}, signal)

export const getDimensionValues = (
  pid: string,
  dimension: string,
  params: { type?: V2DataType } & V2QueryParams,
  signal?: AbortSignal,
) =>
  fetchV2<DimensionValues>(
    `projects/${pid}/dimensions/${encodeURIComponent(dimension)}/values`,
    params,
    signal,
  )

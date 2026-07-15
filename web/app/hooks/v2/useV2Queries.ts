import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router'

import * as v2 from '~/api/v2/endpoints'
import { V2CommonParams, V2DataType, V2Filter } from '~/api/v2/types'
import { VALID_DIMENSIONS_BY_TYPE } from '~/lib/v2Dimensions'
import { useViewProjectContext } from '~/pages/Project/View/ViewProject'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'

export const useV2CommonParams = (dataType: V2DataType) => {
  const { id: pid } = useCurrentProject()
  const { period, timezone, filters } = useViewProjectContext()
  const [searchParams] = useSearchParams()

  const from = searchParams.get('from') || undefined
  const to = searchParams.get('to') || undefined

  return useMemo(() => {
    const validDimensions = VALID_DIMENSIONS_BY_TYPE[dataType]
    const applicableFilters = filters.filter((filter) =>
      validDimensions.includes(filter.dimension),
    )

    const isCustomRange = period === 'custom' && from && to

    const common: V2CommonParams = {
      ...(isCustomRange ? { from, to } : { period }),
      timezone,
      filters: applicableFilters,
    }

    return { pid, common }
  }, [pid, dataType, period, from, to, timezone, filters])
}

const useCompareParams = () => {
  const { isActiveCompare } = useViewProjectContext()
  const [searchParams] = useSearchParams()

  const compareFrom = searchParams.get('compareFrom')
  const compareTo = searchParams.get('compareTo')

  if (!isActiveCompare || !compareFrom || !compareTo) {
    return null
  }

  return { from: compareFrom, to: compareTo }
}

const compareOverride = (
  common: V2CommonParams,
  compare: { from: string; to: string },
): V2CommonParams => {
  const { period: _period, ...rest } = common
  return { ...rest, from: compare.from, to: compare.to }
}

export const useSummaryQuery = <T extends V2DataType>(
  dataType: T,
  opts: { measure?: string; enabled?: boolean } = {},
) => {
  const { pid, common } = useV2CommonParams(dataType)
  const params = { ...common, measure: opts.measure }

  return useQuery({
    queryKey: ['v2', pid, dataType, 'summary', params],
    queryFn: ({ signal }) => v2.getSummary(pid, dataType, params, signal),
    placeholderData: keepPreviousData,
    enabled: opts.enabled,
  })
}

export const useCompareSummaryQuery = <T extends V2DataType>(
  dataType: T,
  opts: { measure?: string; enabled?: boolean } = {},
) => {
  const { pid, common } = useV2CommonParams(dataType)
  const compare = useCompareParams()
  const params = compare
    ? { ...compareOverride(common, compare), measure: opts.measure }
    : null

  return useQuery({
    queryKey: ['v2', pid, dataType, 'summary', params],
    queryFn: ({ signal }) => v2.getSummary(pid, dataType, params!, signal),
    placeholderData: keepPreviousData,
    enabled: Boolean(params) && opts.enabled !== false,
  })
}

interface TimeseriesOpts {
  metrics?: string[]
  mode?: 'periodical' | 'cumulative'
  measure?: string
  enabled?: boolean
  // Overrides the bucket from the URL, for tabs whose data source supports a
  // narrower set of buckets than the project view offers.
  timeBucket?: string
}

export const useTimeseriesQuery = (
  dataType: V2DataType,
  opts: TimeseriesOpts = {},
) => {
  const { pid, common } = useV2CommonParams(dataType)
  const { timeBucket } = useViewProjectContext()
  const params = {
    ...common,
    timeBucket: opts.timeBucket || timeBucket || undefined,
    metrics: opts.metrics,
    mode: opts.mode,
    measure: opts.measure,
  }

  return useQuery({
    queryKey: ['v2', pid, dataType, 'timeseries', params],
    queryFn: ({ signal }) => v2.getTimeseries(pid, dataType, params, signal),
    placeholderData: keepPreviousData,
    enabled: opts.enabled,
  })
}

export const useCompareTimeseriesQuery = (
  dataType: V2DataType,
  opts: TimeseriesOpts = {},
) => {
  const { pid, common } = useV2CommonParams(dataType)
  const { timeBucket } = useViewProjectContext()
  const compare = useCompareParams()
  const params = compare
    ? {
        ...compareOverride(common, compare),
        timeBucket: opts.timeBucket || timeBucket || undefined,
        metrics: opts.metrics,
        mode: opts.mode,
        measure: opts.measure,
      }
    : null

  return useQuery({
    queryKey: ['v2', pid, dataType, 'timeseries', params],
    queryFn: ({ signal }) => v2.getTimeseries(pid, dataType, params!, signal),
    placeholderData: keepPreviousData,
    enabled: Boolean(params) && opts.enabled !== false,
  })
}

interface BreakdownOpts {
  dimension: string
  metrics?: string[]
  limit?: number
  offset?: number
  sort?: string
  measure?: string
  extraFilters?: V2Filter[]
  enabled?: boolean
}

export const useBreakdownQuery = (
  dataType: V2DataType,
  opts: BreakdownOpts,
) => {
  const { pid, common } = useV2CommonParams(dataType)
  const params = {
    ...common,
    filters: opts.extraFilters
      ? [...(common.filters || []), ...opts.extraFilters]
      : common.filters,
    dimension: opts.dimension,
    metrics: opts.metrics,
    limit: opts.limit,
    offset: opts.offset,
    sort: opts.sort,
    measure: opts.measure,
  }

  return useQuery({
    queryKey: ['v2', pid, dataType, 'breakdown', params],
    queryFn: ({ signal }) => v2.getBreakdown(pid, dataType, params, signal),
    placeholderData: keepPreviousData,
    enabled: opts.enabled,
  })
}

const DETAILS_PAGE_SIZE = 100

export const useBreakdownDetailsQuery = (
  dataType: V2DataType,
  opts: Omit<BreakdownOpts, 'limit' | 'offset'>,
) => {
  const { pid, common } = useV2CommonParams(dataType)
  const params = {
    ...common,
    filters: opts.extraFilters
      ? [...(common.filters || []), ...opts.extraFilters]
      : common.filters,
    dimension: opts.dimension,
    metrics: opts.metrics,
    sort: opts.sort,
    measure: opts.measure,
  }

  return useInfiniteQuery({
    queryKey: ['v2', pid, dataType, 'breakdown-details', params],
    queryFn: ({ signal, pageParam }) =>
      v2.getBreakdown(
        pid,
        dataType,
        { ...params, limit: DETAILS_PAGE_SIZE, offset: pageParam },
        signal,
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      // An empty page cannot advance the offset, so honouring `total` here
      // would hand back the offset we just fetched and loop forever.
      if (lastPage.data.length === 0) {
        return undefined
      }

      const loaded = pages.reduce((acc, page) => acc + page.data.length, 0)
      const total = lastPage.meta.total

      // Search Console reports no row count, so fall back to treating a full
      // page as a hint that another one may follow.
      if (total === undefined || total === null) {
        return lastPage.data.length === DETAILS_PAGE_SIZE ? loaded : undefined
      }

      return loaded < total ? loaded : undefined
    },
    placeholderData: keepPreviousData,
    enabled: opts.enabled,
  })
}

export const useSeoStatusQuery = () => {
  const { id: pid } = useCurrentProject()

  return useQuery({
    queryKey: ['v2', pid, 'seo', 'status'],
    queryFn: ({ signal }) => v2.getSeoStatus(pid, signal),
    placeholderData: keepPreviousData,
  })
}

export const useSeoBrandedTrafficQuery = (opts: { enabled?: boolean } = {}) => {
  const { pid, common } = useV2CommonParams('seo')

  return useQuery({
    queryKey: ['v2', pid, 'seo', 'branded-traffic', common],
    queryFn: ({ signal }) => v2.getSeoBrandedTraffic(pid, common, signal),
    placeholderData: keepPreviousData,
    enabled: opts.enabled,
  })
}

/**
 * Impressions-by-position and organic positions come out of a single Search
 * Console rollup, so both panels share one query rather than paying for it
 * twice.
 */
export const useSeoPositionsQuery = (opts: { enabled?: boolean } = {}) => {
  const { pid, common } = useV2CommonParams('seo')

  return useQuery({
    queryKey: ['v2', pid, 'seo', 'positions', common],
    queryFn: ({ signal }) => v2.getSeoPositions(pid, common, signal),
    placeholderData: keepPreviousData,
    enabled: opts.enabled,
  })
}

export const useCustomEventsQuery = (
  opts: { limit?: number; enabled?: boolean } = {},
) => {
  const { pid, common } = useV2CommonParams('traffic')
  const params = { ...common, limit: opts.limit }

  return useQuery({
    queryKey: ['v2', pid, 'traffic', 'custom-events', params],
    queryFn: ({ signal }) => v2.getCustomEvents(pid, params, signal),
    placeholderData: keepPreviousData,
    enabled: opts.enabled,
  })
}

export const useCustomEventsTimeseriesQuery = (
  events: string[],
  opts: { enabled?: boolean } = {},
) => {
  const { pid, common } = useV2CommonParams('traffic')
  const { timeBucket } = useViewProjectContext()
  const params = { ...common, timeBucket: timeBucket || undefined, events }

  return useQuery({
    queryKey: ['v2', pid, 'traffic', 'custom-events-timeseries', params],
    queryFn: ({ signal }) => v2.getCustomEventsTimeseries(pid, params, signal),
    placeholderData: keepPreviousData,
    enabled: events.length > 0 && opts.enabled !== false,
  })
}

export const useCustomMetricsQuery = (
  customMetrics: unknown[],
  opts: { enabled?: boolean } = {},
) => {
  const { pid, common } = useV2CommonParams('traffic')
  const metrics = customMetrics.length ? JSON.stringify(customMetrics) : null
  const params = { ...common, metrics: metrics! }

  return useQuery({
    queryKey: ['v2', pid, 'traffic', 'custom-metrics', params],
    queryFn: ({ signal }) => v2.getCustomMetrics(pid, params, signal),
    placeholderData: keepPreviousData,
    enabled: Boolean(metrics) && opts.enabled !== false,
  })
}

export const usePagePropertiesQuery = (
  opts: { limit?: number; enabled?: boolean } = {},
) => {
  const { pid, common } = useV2CommonParams('traffic')
  const params = { ...common, limit: opts.limit }

  return useQuery({
    queryKey: ['v2', pid, 'traffic', 'page-properties', params],
    queryFn: ({ signal }) => v2.getPageProperties(pid, params, signal),
    placeholderData: keepPreviousData,
    enabled: opts.enabled,
  })
}

const LIST_PAGE_SIZE = 30

const listNextPageParam = (pageSize: number) => {
  return (lastPage: { data: unknown[] }, pages: { data: unknown[] }[]) =>
    lastPage.data.length === pageSize
      ? pages.reduce((acc, page) => acc + page.data.length, 0)
      : undefined
}

export const useErrorsListQuery = (
  opts: { showResolved?: boolean; enabled?: boolean } = {},
) => {
  const { pid, common } = useV2CommonParams('errors')
  const params = { ...common, show_resolved: opts.showResolved }

  return useInfiniteQuery({
    queryKey: ['v2', pid, 'errors', 'list', params],
    queryFn: ({ signal, pageParam }) =>
      v2.getErrorsList(
        pid,
        { ...params, limit: LIST_PAGE_SIZE, offset: pageParam },
        signal,
      ),
    initialPageParam: 0,
    getNextPageParam: listNextPageParam(LIST_PAGE_SIZE),
    placeholderData: keepPreviousData,
    enabled: opts.enabled,
  })
}

export const useErrorsOverviewQuery = (opts: { enabled?: boolean } = {}) => {
  const { pid, common } = useV2CommonParams('errors')
  const { timeBucket } = useViewProjectContext()
  const params = { ...common, timeBucket: timeBucket || undefined }

  return useQuery({
    queryKey: ['v2', pid, 'errors', 'overview', params],
    queryFn: ({ signal }) => v2.getErrorsOverview(pid, params, signal),
    placeholderData: keepPreviousData,
    enabled: opts.enabled,
  })
}

export const useErrorDetailsQuery = (
  eid: string | null,
  opts: { enabled?: boolean } = {},
) => {
  const { pid, common } = useV2CommonParams('errors')
  const { timeBucket } = useViewProjectContext()
  const params = { ...common, timeBucket: timeBucket || undefined }

  return useQuery({
    queryKey: ['v2', pid, 'errors', 'details', eid, params],
    queryFn: ({ signal }) => v2.getErrorDetails(pid, eid!, params, signal),
    placeholderData: keepPreviousData,
    enabled: Boolean(eid) && opts.enabled !== false,
  })
}

const ERROR_SESSIONS_PAGE_SIZE = 10

export const useErrorSessionsQuery = (
  eid: string | null,
  opts: { enabled?: boolean } = {},
) => {
  const { pid, common } = useV2CommonParams('errors')

  return useInfiniteQuery({
    queryKey: ['v2', pid, 'errors', 'sessions', eid, common],
    queryFn: ({ signal, pageParam }) =>
      v2.getErrorSessions(
        pid,
        eid!,
        { ...common, limit: ERROR_SESSIONS_PAGE_SIZE, offset: pageParam },
        signal,
      ),
    initialPageParam: 0,
    getNextPageParam: listNextPageParam(ERROR_SESSIONS_PAGE_SIZE),
    placeholderData: keepPreviousData,
    enabled: Boolean(eid) && opts.enabled !== false,
  })
}

export const useSessionsListQuery = (
  opts: {
    eventType?: 'traffic' | 'performance' | 'error'
    enabled?: boolean
  } = {},
) => {
  const { pid, common } = useV2CommonParams('traffic')
  const params = { ...common, event_type: opts.eventType }

  return useInfiniteQuery({
    queryKey: ['v2', pid, 'sessions', 'list', params],
    queryFn: ({ signal, pageParam }) =>
      v2.getSessionsList(
        pid,
        { ...params, limit: LIST_PAGE_SIZE, offset: pageParam },
        signal,
      ),
    initialPageParam: 0,
    getNextPageParam: listNextPageParam(LIST_PAGE_SIZE),
    placeholderData: keepPreviousData,
    enabled: opts.enabled,
  })
}

export const useSessionDetailsQuery = (
  psid: string | null,
  opts: { enabled?: boolean } = {},
) => {
  const { id: pid } = useCurrentProject()
  const { timezone } = useViewProjectContext()
  const params = { timezone }

  return useQuery({
    queryKey: ['v2', pid, 'sessions', 'details', psid, params],
    queryFn: ({ signal }) => v2.getSessionDetails(pid, psid!, params, signal),
    placeholderData: keepPreviousData,
    enabled: Boolean(psid) && opts.enabled !== false,
  })
}

export const useProfilesListQuery = (
  opts: {
    profileType?: 'all' | 'anonymous' | 'identified'
    search?: string
    enabled?: boolean
  } = {},
) => {
  const { pid, common } = useV2CommonParams('traffic')
  const params = {
    ...common,
    profile_type: opts.profileType,
    search: opts.search || undefined,
  }

  return useInfiniteQuery({
    queryKey: ['v2', pid, 'profiles', 'list', params],
    queryFn: ({ signal, pageParam }) =>
      v2.getProfilesList(
        pid,
        { ...params, limit: LIST_PAGE_SIZE, offset: pageParam },
        signal,
      ),
    initialPageParam: 0,
    getNextPageParam: listNextPageParam(LIST_PAGE_SIZE),
    placeholderData: keepPreviousData,
    enabled: opts.enabled,
  })
}

export const useProfileDetailsQuery = (
  profileId: string | null,
  opts: { enabled?: boolean } = {},
) => {
  const { id: pid } = useCurrentProject()
  const { timezone } = useViewProjectContext()
  const params = { timezone }

  return useQuery({
    queryKey: ['v2', pid, 'profiles', 'details', profileId, params],
    queryFn: ({ signal }) =>
      v2.getProfileDetails(pid, profileId!, params, signal),
    placeholderData: keepPreviousData,
    enabled: Boolean(profileId) && opts.enabled !== false,
  })
}

export const useProfileSessionsQuery = (
  profileId: string | null,
  opts: { enabled?: boolean } = {},
) => {
  const { pid, common } = useV2CommonParams('traffic')

  return useInfiniteQuery({
    queryKey: ['v2', pid, 'profiles', 'sessions', profileId, common],
    queryFn: ({ signal, pageParam }) =>
      v2.getProfileSessions(
        pid,
        profileId!,
        { ...common, limit: LIST_PAGE_SIZE, offset: pageParam },
        signal,
      ),
    initialPageParam: 0,
    getNextPageParam: listNextPageParam(LIST_PAGE_SIZE),
    placeholderData: keepPreviousData,
    enabled: Boolean(profileId) && opts.enabled !== false,
  })
}

export const useFunnelQuery = (
  funnelId: string | null,
  opts: { enabled?: boolean } = {},
) => {
  const { pid, common } = useV2CommonParams('traffic')
  const params = { ...common, funnelId: funnelId! }

  return useQuery({
    queryKey: ['v2', pid, 'funnel', params],
    queryFn: ({ signal }) => v2.getFunnel(pid, params, signal),
    placeholderData: keepPreviousData,
    enabled: Boolean(funnelId) && opts.enabled !== false,
  })
}

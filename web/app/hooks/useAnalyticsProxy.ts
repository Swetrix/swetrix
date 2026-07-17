import { useCallback, useRef, useState } from 'react'

import type {
  SessionReplaysResponse,
  SessionReplayResponse,
  DeleteSessionReplayResponse,
  SessionReplayExportResponse,
  FeatureFlagStats,
  FeatureFlagProfilesResponse,
  GoalStats,
  GoalChartData,
  ExperimentResults,
  Experiment,
  Goal,
  GoalsResponse,
  FeatureFlagsResponse,
  LiveStats,
  BotProtectionStats,
  BotProtectionPeriod,
  AdsDashboardResponse,
  AdsCampaign,
  AdsCampaignMapEntry,
  JourneysResponse,
  RevenueStatus,
  RevenueDataResponse,
  OverallObject,
  DataDeletionPreview,
  AnalyticsParams as ServerAnalyticsParams,
} from '~/api/api.server'
import type { V2Filter } from '~/api/v2/types'

type ClientAnalyticsParams = Partial<
  Omit<ServerAnalyticsParams, 'password'>
> & {
  take?: number
  skip?: number
  options?: Record<string, unknown>
  resultFilter?: string
  search?: string
}

interface ProxyResponse<T> {
  data: T | null
  error: string | null
}

async function postAnalytics<T>(payload: unknown): Promise<ProxyResponse<T>> {
  const response = await fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  let result: ProxyResponse<T>
  try {
    result = (await response.json()) as ProxyResponse<T>
  } catch {
    throw new Error(
      `Invalid JSON from /api/analytics (status ${response.status})`,
    )
  }

  if (!response.ok) {
    throw new Error(
      result.error || `Request failed (status ${response.status})`,
    )
  }
  return result
}

export function useSessionReplaysProxy() {
  const [data, setData] = useState<SessionReplaysResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchSessionReplays = useCallback(
    async (projectId: string, params: ClientAnalyticsParams) => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await postAnalytics<SessionReplaysResponse>({
          action: 'getSessionReplays',
          projectId,
          params,
        })
        setData(result.data)
        setError(result.error)
        return result.data
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  return { fetchSessionReplays, data, error, isLoading }
}

export function useSessionReplayProxy() {
  const [data, setData] = useState<SessionReplayResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchSessionReplay = useCallback(
    async (projectId: string, psid: string, replayId?: string) => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await postAnalytics<SessionReplayResponse>({
          action: 'getSessionReplay',
          projectId,
          psid,
          replayId,
          params: {},
        })
        setData(result.data)
        setError(result.error)
        return result.data
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setError(message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  return { fetchSessionReplay, data, error, isLoading }
}

export function useDeleteSessionReplayProxy() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const deleteSessionReplay = useCallback(
    async (projectId: string, psid: string, replayId?: string) => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await postAnalytics<DeleteSessionReplayResponse>({
          action: 'deleteSessionReplay',
          projectId,
          psid,
          replayId,
          params: {},
        })
        setError(result.error)
        return result.data
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setError(message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  return { deleteSessionReplay, error, isLoading }
}

async function parseExportProxyResponse(
  response: Response,
): Promise<SessionReplayExportResponse> {
  let result: ProxyResponse<SessionReplayExportResponse>
  try {
    result =
      (await response.json()) as ProxyResponse<SessionReplayExportResponse>
  } catch {
    throw new Error(
      `Invalid JSON from /api/session-replay-export (status ${response.status})`,
    )
  }

  if (!response.ok || !result.data) {
    throw new Error(
      result.error || `Request failed (status ${response.status})`,
    )
  }

  return result.data
}

export function useSessionReplayExportProxy() {
  const startSessionReplayExport = useCallback(
    async (
      projectId: string,
      psid: string,
      replayId?: string,
      signal?: AbortSignal,
    ) => {
      const response = await fetch('/api/session-replay-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({ projectId, psid, replayId }),
      })

      return parseExportProxyResponse(response)
    },
    [],
  )

  const getSessionReplayExportStatus = useCallback(
    async (projectId: string, exportId: string, signal?: AbortSignal) => {
      const query = new URLSearchParams({ projectId, exportId })
      const response = await fetch(`/api/session-replay-export?${query}`, {
        signal,
      })

      return parseExportProxyResponse(response)
    },
    [],
  )

  const getSessionReplayExportDownloadUrl = useCallback(
    (projectId: string, exportId: string) => {
      const query = new URLSearchParams({
        action: 'download',
        projectId,
        exportId,
      })

      return `/api/session-replay-export?${query}`
    },
    [],
  )

  return {
    startSessionReplayExport,
    getSessionReplayExportStatus,
    getSessionReplayExportDownloadUrl,
  }
}

export function useFeatureFlagStatsProxy() {
  const [data, setData] = useState<FeatureFlagStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchStats = useCallback(
    async (flagId: string, params: ClientAnalyticsParams) => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await postAnalytics<FeatureFlagStats>({
          action: 'getFeatureFlagStats',
          flagId,
          params,
        })
        setData(result.data)
        setError(result.error)
        return result.data
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  return { fetchStats, data, error, isLoading }
}

export function useFeatureFlagProfilesProxy() {
  const [data, setData] = useState<FeatureFlagProfilesResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchProfiles = useCallback(
    async (flagId: string, params: ClientAnalyticsParams) => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await postAnalytics<FeatureFlagProfilesResponse>({
          action: 'getFeatureFlagProfiles',
          flagId,
          params,
        })
        setData(result.data)
        setError(result.error)
        return result.data
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  return { fetchProfiles, data, error, isLoading }
}

export function useGoalStatsProxy() {
  const [data, setData] = useState<GoalStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchStats = useCallback(
    async (goalId: string, params: ClientAnalyticsParams) => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await postAnalytics<GoalStats>({
          action: 'getGoalStats',
          goalId,
          params,
        })
        setData(result.data)
        setError(result.error)
        return result.data
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  return { fetchStats, data, error, isLoading }
}

export function useGoalChartProxy() {
  const [data, setData] = useState<{ chart: GoalChartData } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchChart = useCallback(
    async (goalId: string, params: ClientAnalyticsParams) => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await postAnalytics<{ chart: GoalChartData }>({
          action: 'getGoalChart',
          goalId,
          params,
        })
        setData(result.data)
        setError(result.error)
        return result.data
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  return { fetchChart, data, error, isLoading }
}

export function useExperimentResultsProxy() {
  const [data, setData] = useState<ExperimentResults | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchResults = useCallback(
    async (experimentId: string, params: ClientAnalyticsParams) => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await postAnalytics<ExperimentResults>({
          action: 'getExperimentResults',
          experimentId,
          params,
        })
        setData(result.data)
        setError(result.error)
        return result.data
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  return { fetchResults, data, error, isLoading }
}

export function useExperimentProxy() {
  const [data, setData] = useState<Experiment | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchExperiment = useCallback(async (experimentId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await postAnalytics<Experiment>({
        action: 'getExperiment',
        experimentId,
        params: {},
      })
      setData(result.data)
      setError(result.error)
      return result.data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { fetchExperiment, data, error, isLoading }
}

export function useGoalProxy() {
  const [data, setData] = useState<Goal | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchGoal = useCallback(async (goalId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await postAnalytics<Goal>({
        action: 'getGoal',
        goalId,
        params: {},
      })
      setData(result.data)
      setError(result.error)
      return result.data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { fetchGoal, data, error, isLoading }
}

export function useProjectGoalsProxy() {
  const [data, setData] = useState<GoalsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchGoals = useCallback(
    async (projectId: string, params: ClientAnalyticsParams = {}) => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await postAnalytics<GoalsResponse>({
          action: 'getProjectGoals',
          projectId,
          params,
        })
        setData(result.data)
        setError(result.error)
        return result.data
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  return { fetchGoals, data, error, isLoading }
}

export function useProjectFeatureFlagsProxy() {
  const [data, setData] = useState<FeatureFlagsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchFeatureFlags = useCallback(
    async (projectId: string, params: ClientAnalyticsParams = {}) => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await postAnalytics<FeatureFlagsResponse>({
          action: 'getProjectFeatureFlags',
          projectId,
          params,
        })
        setData(result.data)
        setError(result.error)
        return result.data
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  return { fetchFeatureFlags, data, error, isLoading }
}

export function useFiltersProxy() {
  const fetchFilters = useCallback(
    async (projectId: string, filterType: string): Promise<string[] | null> => {
      try {
        const result = await postAnalytics<string[]>({
          action: 'getFilters',
          projectId,
          filterType,
          params: {},
        })
        return result.data
      } catch (err) {
        console.error('[useFiltersProxy] Error:', err)
        throw err
      }
    },
    [],
  )

  return { fetchFilters }
}

export function useDataDeletionPreviewProxy() {
  const fetchPreview = useCallback(
    async (
      projectId: string,
      options: {
        filters?: V2Filter[]
        from?: string
        to?: string
      },
    ): Promise<DataDeletionPreview | null> => {
      const result = await postAnalytics<DataDeletionPreview>({
        action: 'getDataDeletionPreview',
        projectId,
        params: {
          filters: options.filters,
          from: options.from,
          to: options.to,
        },
      })
      return result.data
    },
    [],
  )

  return { fetchPreview }
}

export function useLiveVisitorsProxy() {
  const fetchLiveVisitors = useCallback(
    async (pids: string[]): Promise<LiveStats | null> => {
      if (!pids || pids.length === 0) {
        return null
      }

      try {
        const result = await postAnalytics<LiveStats>({
          action: 'getLiveVisitors',
          pids,
          params: {},
        })
        return result.data
      } catch (err) {
        console.error('[useLiveVisitorsProxy] Error:', err)
        throw err
      }
    },
    [],
  )

  return { fetchLiveVisitors }
}

export function useBotProtectionStatsProxy() {
  const fetchBotProtectionStats = useCallback(
    async (
      projectId: string,
      period: BotProtectionPeriod = '30d',
    ): Promise<BotProtectionStats | null> => {
      try {
        const result = await postAnalytics<BotProtectionStats>({
          action: 'getBotProtectionStats',
          projectId,
          params: { period },
        })
        return result.data
      } catch (err) {
        console.error('[useBotProtectionStatsProxy] Error:', err)
        throw err
      }
    },
    [],
  )

  return { fetchBotProtectionStats }
}

export function useJourneysProxy() {
  const [data, setData] = useState<JourneysResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchJourneys = useCallback(
    async (
      projectId: string,
      params: ClientAnalyticsParams & {
        steps?: number
        journeys?: number
      } = {},
    ) => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await postAnalytics<JourneysResponse>({
          action: 'getJourneys',
          projectId,
          params,
        })
        setData(result.data)
        setError(result.error)
        return result.data
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  return { fetchJourneys, data, error, isLoading }
}

export function useAdsDashboardProxy() {
  const [data, setData] = useState<AdsDashboardResponse | null>(null)
  const [campaigns, setCampaigns] = useState<AdsCampaign[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const requestIdRef = useRef(0)

  const fetchDashboard = useCallback(
    async (projectId: string, params: ClientAnalyticsParams = {}) => {
      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId
      setIsLoading(true)
      setError(null)

      try {
        const [dashboardResult, campaignsResult] = await Promise.all([
          postAnalytics<AdsDashboardResponse>({
            action: 'getAdsDashboard',
            projectId,
            params,
          }),
          postAnalytics<{ campaigns: AdsCampaign[] }>({
            action: 'getAdsCampaigns',
            projectId,
            params,
          }),
        ])

        if (requestId !== requestIdRef.current) {
          return dashboardResult.data
        }

        if (dashboardResult.data) {
          setData(dashboardResult.data)
        }
        if (campaignsResult.data) {
          setCampaigns(campaignsResult.data.campaigns)
        }
        setError(dashboardResult.error || campaignsResult.error)
        return dashboardResult.data
      } catch (err) {
        if (requestId === requestIdRef.current) {
          setError(err instanceof Error ? err.message : 'Unknown error')
        }
        return null
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false)
        }
      }
    },
    [],
  )

  const resetData = useCallback(() => {
    requestIdRef.current += 1
    setData(null)
    setCampaigns(null)
    setError(null)
    setIsLoading(false)
  }, [])

  return { fetchDashboard, data, campaigns, error, isLoading, resetData }
}

export function useAdsCampaignMapProxy() {
  const [map, setMap] = useState<Record<string, AdsCampaignMapEntry> | null>(
    null,
  )
  const [currency, setCurrency] = useState<string>('USD')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const requestIdRef = useRef(0)

  const fetchCampaignMap = useCallback(
    async (projectId: string, params: ClientAnalyticsParams = {}) => {
      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId
      setIsLoading(true)
      setError(null)

      try {
        const result = await postAnalytics<{
          map: Record<string, AdsCampaignMapEntry>
          currency: string
        }>({
          action: 'getAdsCampaignMap',
          projectId,
          params,
        })

        if (requestId !== requestIdRef.current) {
          return result.data?.map || null
        }

        setMap(result.data?.map || null)
        setCurrency(result.data?.currency || 'USD')
        setError(result.error)
        return result.data?.map || null
      } catch (err) {
        if (requestId === requestIdRef.current) {
          setError(err instanceof Error ? err.message : 'Unknown error')
        }
        return null
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false)
        }
      }
    },
    [],
  )

  return { fetchCampaignMap, map, currency, error, isLoading }
}

export function useRevenueProxy() {
  const [statusData, setStatusData] = useState<RevenueStatus | null>(null)
  const [revenueData, setRevenueData] = useState<RevenueDataResponse | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchRevenueStatus = useCallback(
    async (projectId: string): Promise<RevenueStatus | null> => {
      try {
        const result = await postAnalytics<RevenueStatus>({
          action: 'getRevenueStatus',
          projectId,
          params: {},
        })
        setStatusData(result.data)
        return result.data
      } catch (err) {
        console.error('[useRevenueProxy] Error:', err)
        throw err
      }
    },
    [],
  )

  const fetchRevenueData = useCallback(
    async (projectId: string, params: ClientAnalyticsParams = {}) => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await postAnalytics<RevenueDataResponse>({
          action: 'getRevenueData',
          projectId,
          params,
        })
        setRevenueData(result.data)
        setError(result.error)
        return result.data
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  return {
    fetchRevenueStatus,
    fetchRevenueData,
    statusData,
    revenueData,
    error,
    isLoading,
  }
}

export function useOverallStatsProxy() {
  const fetchOverallStats = useCallback(
    async (
      pids: string[],
      params: ClientAnalyticsParams = {},
    ): Promise<Record<string, OverallObject> | null> => {
      try {
        const result = await postAnalytics<Record<string, OverallObject>>({
          action: 'getOverallStats',
          pids,
          params,
        })
        return result.data
      } catch (err) {
        console.error('[useOverallStatsProxy] Error:', err)
        return null
      }
    },
    [],
  )

  return { fetchOverallStats }
}

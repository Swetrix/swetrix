import { useCallback, useState } from 'react'

import type {
  SessionsResponse,
  ErrorsResponse,
  FeatureFlagStats,
  FeatureFlagProfilesResponse,
  GoalStats,
  GoalChartData,
  CaptchaDataResponse,
  ExperimentResults,
  Experiment,
  Goal,
  GoalsResponse,
  FeatureFlagsResponse,
  ProfilesResponse,
  ProfileDetailsResponse,
  ProfileSessionsResponse,
  VersionFilter,
  CustomEventsMetadataResponse,
  PropertyMetadataResponse,
  ErrorSessionsResponse,
  LiveStats,
  LiveVisitorInfo,
  ProjectDataCustomEventsResponse,
  UserFlowResponse,
  GSCKeywordsResponse,
  RevenueStatus,
  RevenueDataResponse,
  OverallObject,
  AnalyticsParams as ServerAnalyticsParams,
} from '~/api/api.server'

type ClientAnalyticsParams = Partial<Omit<ServerAnalyticsParams, 'password'>> & {
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
    throw new Error(`Invalid JSON from /api/analytics (status ${response.status})`)
  }

  if (!response.ok) {
    throw new Error(result.error || `Request failed (status ${response.status})`)
  }
  return result
}

export function useSessionsProxy() {
  const [data, setData] = useState<SessionsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchSessions = useCallback(async (projectId: string, params: ClientAnalyticsParams) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await postAnalytics<SessionsResponse>({ action: 'getSessions', projectId, params })
      setData(result.data)
      setError(result.error)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { fetchSessions, data, error, isLoading }
}

export function useErrorsProxy() {
  const [data, setData] = useState<ErrorsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchErrors = useCallback(async (projectId: string, params: ClientAnalyticsParams) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await postAnalytics<ErrorsResponse>({ action: 'getErrors', projectId, params })
      setData(result.data)
      setError(result.error)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { fetchErrors, data, error, isLoading }
}

export function useFeatureFlagStatsProxy() {
  const [data, setData] = useState<FeatureFlagStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchStats = useCallback(async (flagId: string, params: ClientAnalyticsParams) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await postAnalytics<FeatureFlagStats>({ action: 'getFeatureFlagStats', flagId, params })
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

  return { fetchStats, data, error, isLoading }
}

export function useFeatureFlagProfilesProxy() {
  const [data, setData] = useState<FeatureFlagProfilesResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchProfiles = useCallback(async (flagId: string, params: ClientAnalyticsParams) => {
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
  }, [])

  return { fetchProfiles, data, error, isLoading }
}

export function useGoalStatsProxy() {
  const [data, setData] = useState<GoalStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchStats = useCallback(async (goalId: string, params: ClientAnalyticsParams) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await postAnalytics<GoalStats>({ action: 'getGoalStats', goalId, params })
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

  return { fetchStats, data, error, isLoading }
}

export function useGoalChartProxy() {
  const [data, setData] = useState<{ chart: GoalChartData } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchChart = useCallback(async (goalId: string, params: ClientAnalyticsParams) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await postAnalytics<{ chart: GoalChartData }>({ action: 'getGoalChart', goalId, params })
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

  return { fetchChart, data, error, isLoading }
}

export function useCaptchaProxy() {
  const [data, setData] = useState<CaptchaDataResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchCaptcha = useCallback(async (projectId: string, params: ClientAnalyticsParams) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await postAnalytics<CaptchaDataResponse>({ action: 'getCaptchaData', projectId, params })
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

  return { fetchCaptcha, data, error, isLoading }
}

export function useExperimentResultsProxy() {
  const [data, setData] = useState<ExperimentResults | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchResults = useCallback(async (experimentId: string, params: ClientAnalyticsParams) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await postAnalytics<ExperimentResults>({ action: 'getExperimentResults', experimentId, params })
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
      const result = await postAnalytics<Experiment>({ action: 'getExperiment', experimentId, params: {} })
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
      const result = await postAnalytics<Goal>({ action: 'getGoal', goalId, params: {} })
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

  const fetchGoals = useCallback(async (projectId: string, params: ClientAnalyticsParams = {}) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await postAnalytics<GoalsResponse>({ action: 'getProjectGoals', projectId, params })
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

  return { fetchGoals, data, error, isLoading }
}

export function useProjectFeatureFlagsProxy() {
  const [data, setData] = useState<FeatureFlagsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchFeatureFlags = useCallback(async (projectId: string, params: ClientAnalyticsParams = {}) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await postAnalytics<FeatureFlagsResponse>({ action: 'getProjectFeatureFlags', projectId, params })
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

  return { fetchFeatureFlags, data, error, isLoading }
}

export function useProfilesProxy() {
  const [data, setData] = useState<ProfilesResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchProfiles = useCallback(
    async (
      projectId: string,
      params: ClientAnalyticsParams & { profileType?: 'all' | 'anonymous' | 'identified' } = {},
    ) => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await postAnalytics<ProfilesResponse>({ action: 'getProfiles', projectId, params })
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

export function useProfileProxy() {
  const [data, setData] = useState<ProfileDetailsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchProfile = useCallback(async (projectId: string, profileId: string, params: ClientAnalyticsParams = {}) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await postAnalytics<ProfileDetailsResponse>({ action: 'getProfile', projectId, profileId, params })
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

  return { fetchProfile, data, error, isLoading }
}

export function useProfileSessionsProxy() {
  const [data, setData] = useState<ProfileSessionsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchProfileSessions = useCallback(
    async (projectId: string, profileId: string, params: ClientAnalyticsParams = {}) => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await postAnalytics<ProfileSessionsResponse>({
          action: 'getProfileSessions',
          projectId,
          profileId,
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

  return { fetchProfileSessions, data, error, isLoading }
}

export function useFiltersProxy() {
  const fetchFilters = useCallback(async (projectId: string, filterType: string): Promise<string[] | null> => {
    try {
      const result = await postAnalytics<string[]>({ action: 'getFilters', projectId, filterType, params: {} })
      return result.data
    } catch (err) {
      console.error('[useFiltersProxy] Error:', err)
      throw err
    }
  }, [])

  const fetchErrorsFilters = useCallback(async (projectId: string, filterType: string): Promise<string[] | null> => {
    try {
      const result = await postAnalytics<string[]>({ action: 'getErrorsFilters', projectId, filterType, params: {} })
      return result.data
    } catch (err) {
      console.error('[useFiltersProxy] Error:', err)
      throw err
    }
  }, [])

  const fetchVersionFilters = useCallback(
    async (
      projectId: string,
      dataType: 'traffic' | 'errors',
      filterColumn: 'br' | 'os',
    ): Promise<VersionFilter[] | null> => {
      try {
        const result = await postAnalytics<VersionFilter[]>({
          action: 'getVersionFilters',
          projectId,
          dataType,
          filterColumn,
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

  return { fetchFilters, fetchErrorsFilters, fetchVersionFilters }
}

export function useCustomEventsMetadataProxy() {
  const fetchMetadata = useCallback(
    async (
      projectId: string,
      event: string,
      params: ClientAnalyticsParams = {},
    ): Promise<CustomEventsMetadataResponse | null> => {
      try {
        const result = await postAnalytics<CustomEventsMetadataResponse>({
          action: 'getCustomEventsMetadata',
          projectId,
          event,
          params,
        })
        return result.data
      } catch (err) {
        console.error('[useCustomEventsMetadataProxy] Error:', err)
        throw err
      }
    },
    [],
  )

  return { fetchMetadata }
}

export function usePropertyMetadataProxy() {
  const fetchMetadata = useCallback(
    async (
      projectId: string,
      property: string,
      params: ClientAnalyticsParams = {},
    ): Promise<PropertyMetadataResponse | null> => {
      try {
        const result = await postAnalytics<PropertyMetadataResponse>({
          action: 'getPropertyMetadata',
          projectId,
          property,
          params,
        })
        return result.data
      } catch (err) {
        console.error('[usePropertyMetadataProxy] Error:', err)
        throw err
      }
    },
    [],
  )

  return { fetchMetadata }
}

export function useErrorSessionsProxy() {
  const [data, setData] = useState<ErrorSessionsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchErrorSessions = useCallback(
    async (projectId: string, errorId: string, params: ClientAnalyticsParams = {}) => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await postAnalytics<ErrorSessionsResponse>({
          action: 'getErrorSessions',
          projectId,
          errorId,
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

  return { fetchErrorSessions, data, error, isLoading }
}

export function useLiveVisitorsProxy() {
  const fetchLiveVisitors = useCallback(async (pids: string[]): Promise<LiveStats | null> => {
    if (!pids || pids.length === 0) {
      return null
    }

    try {
      const result = await postAnalytics<LiveStats>({ action: 'getLiveVisitors', pids, params: {} })
      return result.data
    } catch (err) {
      console.error('[useLiveVisitorsProxy] Error:', err)
      throw err
    }
  }, [])

  const fetchLiveVisitorsInfo = useCallback(async (projectId: string): Promise<LiveVisitorInfo[] | null> => {
    try {
      const result = await postAnalytics<LiveVisitorInfo[]>({ action: 'getLiveVisitorsInfo', projectId, params: {} })
      return result.data
    } catch (err) {
      console.error('[useLiveVisitorsProxy] Error:', err)
      throw err
    }
  }, [])

  return { fetchLiveVisitors, fetchLiveVisitorsInfo }
}

export function useProjectDataCustomEventsProxy() {
  const fetchCustomEvents = useCallback(
    async (
      projectId: string,
      customEvents: string[],
      params: ClientAnalyticsParams = {},
    ): Promise<ProjectDataCustomEventsResponse | null> => {
      try {
        const result = await postAnalytics<ProjectDataCustomEventsResponse>({
          action: 'getProjectDataCustomEvents',
          projectId,
          customEvents,
          params,
        })
        return result.data
      } catch (err) {
        console.error('[useProjectDataCustomEventsProxy] Error:', err)
        throw err
      }
    },
    [],
  )

  return { fetchCustomEvents }
}

export function useUserFlowProxy() {
  const [data, setData] = useState<UserFlowResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchUserFlow = useCallback(async (projectId: string, params: ClientAnalyticsParams = {}) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await postAnalytics<UserFlowResponse>({ action: 'getUserFlow', projectId, params })
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

  return { fetchUserFlow, data, error, isLoading }
}

export function useGSCKeywordsProxy() {
  const [data, setData] = useState<GSCKeywordsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchKeywords = useCallback(async (projectId: string, params: ClientAnalyticsParams = {}) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await postAnalytics<GSCKeywordsResponse>({ action: 'getGSCKeywords', projectId, params })
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

  return { fetchKeywords, data, error, isLoading }
}

export function useRevenueProxy() {
  const [statusData, setStatusData] = useState<RevenueStatus | null>(null)
  const [revenueData, setRevenueData] = useState<RevenueDataResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchRevenueStatus = useCallback(async (projectId: string): Promise<RevenueStatus | null> => {
    try {
      const result = await postAnalytics<RevenueStatus>({ action: 'getRevenueStatus', projectId, params: {} })
      setStatusData(result.data)
      return result.data
    } catch (err) {
      console.error('[useRevenueProxy] Error:', err)
      throw err
    }
  }, [])

  const fetchRevenueData = useCallback(async (projectId: string, params: ClientAnalyticsParams = {}) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await postAnalytics<RevenueDataResponse>({ action: 'getRevenueData', projectId, params })
      setRevenueData(result.data)
      setError(result.error)
      return result.data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { fetchRevenueStatus, fetchRevenueData, statusData, revenueData, error, isLoading }
}

export function useOverallStatsProxy() {
  const fetchOverallStats = useCallback(
    async (pids: string[], params: ClientAnalyticsParams = {}): Promise<Record<string, OverallObject> | null> => {
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

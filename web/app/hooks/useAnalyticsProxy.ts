import { useCallback, useState } from 'react'

import type {
  SessionsResponse,
  ErrorsResponse,
  FeatureFlagStats,
  FeatureFlagProfilesResponse,
  GoalStats,
  GoalChartData,
  AnalyticsFilter,
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
} from '~/api/api.server'

interface AnalyticsParams {
  timeBucket?: string
  period?: string
  from?: string
  to?: string
  timezone?: string
  filters?: AnalyticsFilter[]
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

export function useSessionsProxy() {
  const [data, setData] = useState<SessionsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchSessions = useCallback(async (projectId: string, params: AnalyticsParams) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getSessions', projectId, params }),
      })
      const result = (await response.json()) as ProxyResponse<SessionsResponse>
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

  const fetchErrors = useCallback(async (projectId: string, params: AnalyticsParams) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getErrors', projectId, params }),
      })
      const result = (await response.json()) as ProxyResponse<ErrorsResponse>
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

  const fetchStats = useCallback(async (flagId: string, params: AnalyticsParams) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getFeatureFlagStats', projectId: '', flagId, params }),
      })
      const result = (await response.json()) as ProxyResponse<FeatureFlagStats>
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

  const fetchProfiles = useCallback(async (flagId: string, params: AnalyticsParams) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getFeatureFlagProfiles', projectId: '', flagId, params }),
      })
      const result = (await response.json()) as ProxyResponse<FeatureFlagProfilesResponse>
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

  const fetchStats = useCallback(async (goalId: string, params: AnalyticsParams) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getGoalStats', projectId: '', goalId, params }),
      })
      const result = (await response.json()) as ProxyResponse<GoalStats>
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

  const fetchChart = useCallback(async (goalId: string, params: AnalyticsParams) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getGoalChart', projectId: '', goalId, params }),
      })
      const result = (await response.json()) as ProxyResponse<{ chart: GoalChartData }>
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

  const fetchCaptcha = useCallback(async (projectId: string, params: AnalyticsParams) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getCaptchaData', projectId, params }),
      })
      const result = (await response.json()) as ProxyResponse<CaptchaDataResponse>
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

  const fetchResults = useCallback(async (experimentId: string, params: AnalyticsParams) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getExperimentResults', projectId: '', experimentId, params }),
      })
      const result = (await response.json()) as ProxyResponse<ExperimentResults>
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
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getExperiment', projectId: '', experimentId, params: {} }),
      })
      const result = (await response.json()) as ProxyResponse<Experiment>
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
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getGoal', projectId: '', goalId, params: {} }),
      })
      const result = (await response.json()) as ProxyResponse<Goal>
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

  const fetchGoals = useCallback(async (projectId: string, params: AnalyticsParams = {}) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getProjectGoals', projectId, params }),
      })
      const result = (await response.json()) as ProxyResponse<GoalsResponse>
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

  const fetchFeatureFlags = useCallback(async (projectId: string, params: AnalyticsParams = {}) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getProjectFeatureFlags', projectId, params }),
      })
      const result = (await response.json()) as ProxyResponse<FeatureFlagsResponse>
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
    async (projectId: string, params: AnalyticsParams & { profileType?: 'all' | 'anonymous' | 'identified' } = {}) => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getProfiles', projectId, params }),
        })
        const result = (await response.json()) as ProxyResponse<ProfilesResponse>
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

  const fetchProfile = useCallback(async (projectId: string, profileId: string, params: AnalyticsParams = {}) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getProfile', projectId, profileId, params }),
      })
      const result = (await response.json()) as ProxyResponse<ProfileDetailsResponse>
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
    async (projectId: string, profileId: string, params: AnalyticsParams = {}) => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getProfileSessions', projectId, profileId, params }),
        })
        const result = (await response.json()) as ProxyResponse<ProfileSessionsResponse>
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
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getFilters', projectId, filterType, params: {} }),
      })
      const result = (await response.json()) as ProxyResponse<string[]>
      if (result.error) throw new Error(result.error)
      return result.data
    } catch (err) {
      console.error('[useFiltersProxy] Error:', err)
      throw err
    }
  }, [])

  const fetchErrorsFilters = useCallback(async (projectId: string, filterType: string): Promise<string[] | null> => {
    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getErrorsFilters', projectId, filterType, params: {} }),
      })
      const result = (await response.json()) as ProxyResponse<string[]>
      if (result.error) throw new Error(result.error)
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
        const response = await fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getVersionFilters', projectId, dataType, filterColumn, params: {} }),
        })
        const result = (await response.json()) as ProxyResponse<VersionFilter[]>
        if (result.error) throw new Error(result.error)
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
      params: AnalyticsParams = {},
    ): Promise<CustomEventsMetadataResponse | null> => {
      try {
        const response = await fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getCustomEventsMetadata', projectId, event, params }),
        })
        const result = (await response.json()) as ProxyResponse<CustomEventsMetadataResponse>
        if (result.error) throw new Error(result.error)
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
      params: AnalyticsParams = {},
    ): Promise<PropertyMetadataResponse | null> => {
      try {
        const response = await fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getPropertyMetadata', projectId, property, params }),
        })
        const result = (await response.json()) as ProxyResponse<PropertyMetadataResponse>
        if (result.error) throw new Error(result.error)
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

  const fetchErrorSessions = useCallback(async (projectId: string, errorId: string, params: AnalyticsParams = {}) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getErrorSessions', projectId, errorId, params }),
      })
      const result = (await response.json()) as ProxyResponse<ErrorSessionsResponse>
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

  return { fetchErrorSessions, data, error, isLoading }
}

export function useLiveVisitorsProxy() {
  const fetchLiveVisitors = useCallback(async (pids: string[]): Promise<LiveStats | null> => {
    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getLiveVisitors', projectId: pids[0] || '', pids, params: {} }),
      })
      const result = (await response.json()) as ProxyResponse<LiveStats>
      if (result.error) throw new Error(result.error)
      return result.data
    } catch (err) {
      console.error('[useLiveVisitorsProxy] Error:', err)
      throw err
    }
  }, [])

  const fetchLiveVisitorsInfo = useCallback(async (projectId: string): Promise<LiveVisitorInfo[] | null> => {
    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getLiveVisitorsInfo', projectId, params: {} }),
      })
      const result = (await response.json()) as ProxyResponse<LiveVisitorInfo[]>
      if (result.error) throw new Error(result.error)
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
      params: AnalyticsParams = {},
    ): Promise<ProjectDataCustomEventsResponse | null> => {
      try {
        const response = await fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getProjectDataCustomEvents', projectId, customEvents, params }),
        })
        const result = (await response.json()) as ProxyResponse<ProjectDataCustomEventsResponse>
        if (result.error) throw new Error(result.error)
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

  const fetchUserFlow = useCallback(async (projectId: string, params: AnalyticsParams = {}) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getUserFlow', projectId, params }),
      })
      const result = (await response.json()) as ProxyResponse<UserFlowResponse>
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

  const fetchKeywords = useCallback(async (projectId: string, params: AnalyticsParams = {}) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getGSCKeywords', projectId, params }),
      })
      const result = (await response.json()) as ProxyResponse<GSCKeywordsResponse>
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
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getRevenueStatus', projectId, params: {} }),
      })
      const result = (await response.json()) as ProxyResponse<RevenueStatus>
      setStatusData(result.data)
      if (result.error) throw new Error(result.error)
      return result.data
    } catch (err) {
      console.error('[useRevenueProxy] Error:', err)
      throw err
    }
  }, [])

  const fetchRevenueData = useCallback(async (projectId: string, params: AnalyticsParams = {}) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getRevenueData', projectId, params }),
      })
      const result = (await response.json()) as ProxyResponse<RevenueDataResponse>
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
    async (pids: string[], params: AnalyticsParams = {}): Promise<Record<string, OverallObject> | null> => {
      try {
        const response = await fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getOverallStats', projectId: '', pids, params }),
        })
        const result = (await response.json()) as ProxyResponse<Record<string, OverallObject>>
        if (result.error) throw new Error(result.error)
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

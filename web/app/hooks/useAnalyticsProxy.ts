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

  const fetchProfileSessions = useCallback(async (projectId: string, profileId: string, params: AnalyticsParams = {}) => {
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
  }, [])

  return { fetchProfileSessions, data, error, isLoading }
}

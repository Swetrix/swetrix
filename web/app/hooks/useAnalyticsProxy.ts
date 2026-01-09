import { useCallback, useState } from 'react'

import type {
  SessionsResponse,
  ErrorsResponse,
  FeatureFlagStats,
  FeatureFlagProfilesResponse,
  GoalStats,
  GoalChartData,
  AnalyticsFilter,
} from '~/api/api.server'

interface AnalyticsParams {
  timeBucket?: string
  period: string
  from?: string
  to?: string
  timezone?: string
  filters?: AnalyticsFilter[]
  take?: number
  skip?: number
  options?: Record<string, unknown>
  resultFilter?: string
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

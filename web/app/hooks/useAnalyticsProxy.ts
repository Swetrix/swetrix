import { useCallback, useEffect, useState } from 'react'

import type { SessionsResponse, ErrorsResponse, AnalyticsFilter } from '~/api/api.server'

interface AnalyticsParams {
  timeBucket: string
  period: string
  from?: string
  to?: string
  timezone: string
  filters?: AnalyticsFilter[]
  take?: number
  skip?: number
  options?: Record<string, unknown>
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

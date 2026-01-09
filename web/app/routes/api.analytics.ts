import { type ActionFunctionArgs, type LoaderFunctionArgs, data } from 'react-router'

import {
  getSessionsServer,
  getErrorsServer,
  getFeatureFlagStatsServer,
  getFeatureFlagProfilesServer,
  getGoalStatsServer,
  getGoalChartServer,
  type AnalyticsParams,
  type SessionsResponse,
  type ErrorsResponse,
  type FeatureFlagStats,
  type FeatureFlagProfilesResponse,
  type GoalStats,
  type GoalChartData,
} from '~/api/api.server'
import { getProjectPasswordCookie } from '~/utils/session.server'

interface ProxyRequest {
  action:
    | 'getSessions'
    | 'getErrors'
    | 'getFeatureFlagStats'
    | 'getFeatureFlagProfiles'
    | 'getGoalStats'
    | 'getGoalChart'
  projectId: string
  flagId?: string
  goalId?: string
  params: {
    timeBucket?: string
    period: string
    from?: string
    to?: string
    timezone?: string
    filters?: AnalyticsParams['filters']
    take?: number
    skip?: number
    options?: Record<string, unknown>
    resultFilter?: string
  }
}

interface ProxyResponse<T> {
  data: T | null
  error: string | null
}

export async function action({ request }: ActionFunctionArgs) {
  const body = (await request.json()) as ProxyRequest

  const { action, projectId, params } = body

  const password = getProjectPasswordCookie(request, projectId)

  const analyticsParams: AnalyticsParams & { take?: number; skip?: number; options?: Record<string, unknown> } = {
    timeBucket: params.timeBucket || 'day',
    period: params.period,
    from: params.from,
    to: params.to,
    timezone: params.timezone || 'UTC',
    filters: params.filters || [],
    password: password || undefined,
    take: params.take,
    skip: params.skip,
  }

  try {
    switch (action) {
      case 'getSessions': {
        const result = await getSessionsServer(request, projectId, analyticsParams)
        return data<ProxyResponse<SessionsResponse>>({
          data: result.data,
          error: result.error ? (Array.isArray(result.error) ? result.error.join(', ') : result.error) : null,
        })
      }

      case 'getErrors': {
        const errorsParams = { ...analyticsParams, options: params.options }
        const result = await getErrorsServer(request, projectId, errorsParams)
        return data<ProxyResponse<ErrorsResponse>>({
          data: result.data,
          error: result.error ? (Array.isArray(result.error) ? result.error.join(', ') : result.error) : null,
        })
      }

      case 'getFeatureFlagStats': {
        if (!body.flagId) {
          return data<ProxyResponse<null>>({ data: null, error: 'flagId is required' }, { status: 400 })
        }
        const result = await getFeatureFlagStatsServer(
          request,
          body.flagId,
          params.period,
          params.from || '',
          params.to || '',
          params.timezone,
        )
        return data<ProxyResponse<FeatureFlagStats>>({
          data: result.data,
          error: result.error ? (Array.isArray(result.error) ? result.error.join(', ') : result.error) : null,
        })
      }

      case 'getFeatureFlagProfiles': {
        if (!body.flagId) {
          return data<ProxyResponse<null>>({ data: null, error: 'flagId is required' }, { status: 400 })
        }
        const result = await getFeatureFlagProfilesServer(
          request,
          body.flagId,
          params.period,
          params.from || '',
          params.to || '',
          params.timezone,
          params.take || 15,
          params.skip || 0,
          params.resultFilter,
        )
        return data<ProxyResponse<FeatureFlagProfilesResponse>>({
          data: result.data,
          error: result.error ? (Array.isArray(result.error) ? result.error.join(', ') : result.error) : null,
        })
      }

      case 'getGoalStats': {
        if (!body.goalId) {
          return data<ProxyResponse<null>>({ data: null, error: 'goalId is required' }, { status: 400 })
        }
        const result = await getGoalStatsServer(
          request,
          body.goalId,
          params.period,
          params.from || '',
          params.to || '',
          params.timezone,
        )
        return data<ProxyResponse<GoalStats>>({
          data: result.data,
          error: result.error ? (Array.isArray(result.error) ? result.error.join(', ') : result.error) : null,
        })
      }

      case 'getGoalChart': {
        if (!body.goalId) {
          return data<ProxyResponse<null>>({ data: null, error: 'goalId is required' }, { status: 400 })
        }
        const result = await getGoalChartServer(
          request,
          body.goalId,
          params.period,
          params.from || '',
          params.to || '',
          params.timeBucket || 'day',
          params.timezone,
        )
        return data<ProxyResponse<{ chart: GoalChartData }>>({
          data: result.data,
          error: result.error ? (Array.isArray(result.error) ? result.error.join(', ') : result.error) : null,
        })
      }

      default:
        return data<ProxyResponse<null>>({ data: null, error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (error) {
    console.error('[api.analytics] Proxy request failed:', error)
    return data<ProxyResponse<null>>(
      { data: null, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  return data({ error: 'Use POST method' }, { status: 405 })
}

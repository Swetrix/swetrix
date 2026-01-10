import { type ActionFunctionArgs, type LoaderFunctionArgs, data } from 'react-router'

import {
  getSessionsServer,
  getErrorsServer,
  getFeatureFlagStatsServer,
  getFeatureFlagProfilesServer,
  getGoalStatsServer,
  getGoalChartServer,
  getCaptchaDataServer,
  getExperimentResultsServer,
  getExperimentServer,
  getGoalServer,
  getProjectGoalsServer,
  getProjectFeatureFlagsServer,
  getProfilesServer,
  getProfileServer,
  getProfileSessionsServer,
  type AnalyticsParams,
  type AnalyticsFilter,
  type SessionsResponse,
  type ErrorsResponse,
  type FeatureFlagStats,
  type FeatureFlagProfilesResponse,
  type GoalStats,
  type GoalChartData,
  type CaptchaDataResponse,
  type ExperimentResults,
  type Experiment,
  type Goal,
  type GoalsResponse,
  type FeatureFlagsResponse,
  type ProfilesResponse,
  type ProfileDetailsResponse,
  type ProfileSessionsResponse,
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
    | 'getCaptchaData'
    | 'getExperimentResults'
    | 'getExperiment'
    | 'getGoal'
    | 'getProjectGoals'
    | 'getProjectFeatureFlags'
    | 'getProfiles'
    | 'getProfile'
    | 'getProfileSessions'
  projectId: string
  flagId?: string
  goalId?: string
  experimentId?: string
  profileId?: string
  params: {
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
    profileType?: 'all' | 'anonymous' | 'identified'
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
    period: params.period || '7d',
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
          params.period || '7d',
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
          params.period || '7d',
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
          params.period || '7d',
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
          params.period || '7d',
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

      case 'getCaptchaData': {
        const result = await getCaptchaDataServer(
          request,
          projectId,
          params.timeBucket || 'hour',
          params.period || '3d',
          params.filters || [],
          params.from || '',
          params.to || '',
          password || undefined,
        )
        return data<ProxyResponse<CaptchaDataResponse>>({
          data: result.data,
          error: result.error ? (Array.isArray(result.error) ? result.error.join(', ') : result.error) : null,
        })
      }

      case 'getExperimentResults': {
        if (!body.experimentId) {
          return data<ProxyResponse<null>>({ data: null, error: 'experimentId is required' }, { status: 400 })
        }
        const result = await getExperimentResultsServer(
          request,
          body.experimentId,
          params.period || '7d',
          params.timeBucket || 'day',
          params.from || '',
          params.to || '',
          params.timezone,
        )
        return data<ProxyResponse<ExperimentResults>>({
          data: result.data,
          error: result.error ? (Array.isArray(result.error) ? result.error.join(', ') : result.error) : null,
        })
      }

      case 'getExperiment': {
        if (!body.experimentId) {
          return data<ProxyResponse<null>>({ data: null, error: 'experimentId is required' }, { status: 400 })
        }
        const result = await getExperimentServer(request, body.experimentId)
        return data<ProxyResponse<Experiment>>({
          data: result.data,
          error: result.error ? (Array.isArray(result.error) ? result.error.join(', ') : result.error) : null,
        })
      }

      case 'getGoal': {
        if (!body.goalId) {
          return data<ProxyResponse<null>>({ data: null, error: 'goalId is required' }, { status: 400 })
        }
        const result = await getGoalServer(request, body.goalId)
        return data<ProxyResponse<Goal>>({
          data: result.data,
          error: result.error ? (Array.isArray(result.error) ? result.error.join(', ') : result.error) : null,
        })
      }

      case 'getProjectGoals': {
        const result = await getProjectGoalsServer(
          request,
          projectId,
          params.take || 100,
          params.skip || 0,
          params.search,
        )
        return data<ProxyResponse<GoalsResponse>>({
          data: result.data,
          error: result.error ? (Array.isArray(result.error) ? result.error.join(', ') : result.error) : null,
        })
      }

      case 'getProjectFeatureFlags': {
        const result = await getProjectFeatureFlagsServer(
          request,
          projectId,
          params.take || 100,
          params.skip || 0,
          params.search,
        )
        return data<ProxyResponse<FeatureFlagsResponse>>({
          data: result.data,
          error: result.error ? (Array.isArray(result.error) ? result.error.join(', ') : result.error) : null,
        })
      }

      case 'getProfiles': {
        const result = await getProfilesServer(
          request,
          projectId,
          params.period || '3d',
          params.filters || [],
          params.from || '',
          params.to || '',
          params.take || 30,
          params.skip || 0,
          params.timezone || '',
          params.profileType || 'all',
          password || undefined,
        )
        return data<ProxyResponse<ProfilesResponse>>({
          data: result.data,
          error: result.error ? (Array.isArray(result.error) ? result.error.join(', ') : result.error) : null,
        })
      }

      case 'getProfile': {
        if (!body.profileId) {
          return data<ProxyResponse<null>>({ data: null, error: 'profileId is required' }, { status: 400 })
        }
        const result = await getProfileServer(
          request,
          projectId,
          body.profileId,
          params.period || '7d',
          params.from || '',
          params.to || '',
          params.timezone || '',
          password || undefined,
        )
        return data<ProxyResponse<ProfileDetailsResponse>>({
          data: result.data,
          error: result.error ? (Array.isArray(result.error) ? result.error.join(', ') : result.error) : null,
        })
      }

      case 'getProfileSessions': {
        if (!body.profileId) {
          return data<ProxyResponse<null>>({ data: null, error: 'profileId is required' }, { status: 400 })
        }
        const result = await getProfileSessionsServer(
          request,
          projectId,
          body.profileId,
          params.period || '3d',
          params.filters || [],
          params.from || '',
          params.to || '',
          params.take || 30,
          params.skip || 0,
          params.timezone || '',
          password || undefined,
        )
        return data<ProxyResponse<ProfileSessionsResponse>>({
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

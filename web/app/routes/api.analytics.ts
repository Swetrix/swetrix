import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  data,
} from 'react-router'

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
  getProjectServer,
  getFiltersServer,
  getErrorsFiltersServer,
  getVersionFiltersServer,
  getCustomEventsMetadataServer,
  getPropertyMetadataServer,
  getErrorSessionsServer,
  getLiveVisitorsServer,
  getLiveVisitorsInfoServer,
  getProjectDataCustomEventsServer,
  getUserFlowServer,
  getGSCKeywordsServer,
  getRevenueStatusServer,
  getRevenueDataServer,
  getOverallStatsServer,
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
  type Project,
  type VersionFilter,
  type CustomEventsMetadataResponse,
  type PropertyMetadataResponse,
  type ErrorSessionsResponse,
  type LiveStats,
  type LiveVisitorInfo,
  type ProjectDataCustomEventsResponse,
  type UserFlowResponse,
  type GSCKeywordsResponse,
  type RevenueStatus,
  type RevenueDataResponse,
  type OverallObject,
} from '~/api/api.server'
import { getProjectPasswordCookie } from '~/utils/session.server'

function formatDateForBackend(dateStr: string | undefined): string | undefined {
  if (!dateStr) return undefined

  // If already in YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr
  }

  // Convert ISO 8601 or other formats to YYYY-MM-DD
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) {
    return dateStr
  }

  const yyyy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

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
    | 'getProject'
    | 'getFilters'
    | 'getErrorsFilters'
    | 'getVersionFilters'
    | 'getCustomEventsMetadata'
    | 'getPropertyMetadata'
    | 'getErrorSessions'
    | 'getLiveVisitors'
    | 'getLiveVisitorsInfo'
    | 'getProjectDataCustomEvents'
    | 'getUserFlow'
    | 'getGSCKeywords'
    | 'getRevenueStatus'
    | 'getRevenueData'
    | 'getOverallStats'
  projectId: string
  pids?: string[]
  flagId?: string
  goalId?: string
  experimentId?: string
  profileId?: string
  errorId?: string
  filterType?: string
  filterColumn?: 'br' | 'os'
  dataType?: 'traffic' | 'errors'
  event?: string
  property?: string
  customEvents?: string[]
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

  const { action, projectId, pids, params } = body

  const password = getProjectPasswordCookie(request, projectId)

  const analyticsParams: AnalyticsParams & {
    take?: number
    skip?: number
    options?: Record<string, unknown>
  } = {
    timeBucket: params.timeBucket || 'day',
    period: params.period || '7d',
    from: formatDateForBackend(params.from),
    to: formatDateForBackend(params.to),
    timezone: params.timezone || 'UTC',
    filters: params.filters || [],
    password: password || undefined,
    take: params.take,
    skip: params.skip,
  }

  try {
    switch (action) {
      case 'getSessions': {
        const result = await getSessionsServer(
          request,
          projectId,
          analyticsParams,
        )
        return data<ProxyResponse<SessionsResponse>>({
          data: result.data,
          error: result.error
            ? Array.isArray(result.error)
              ? result.error.join(', ')
              : result.error
            : null,
        })
      }

      case 'getErrors': {
        const errorsParams = { ...analyticsParams, options: params.options }
        const result = await getErrorsServer(request, projectId, errorsParams)
        return data<ProxyResponse<ErrorsResponse>>({
          data: result.data,
          error: result.error
            ? Array.isArray(result.error)
              ? result.error.join(', ')
              : result.error
            : null,
        })
      }

      case 'getFeatureFlagStats': {
        if (!body.flagId) {
          return data<ProxyResponse<null>>(
            { data: null, error: 'flagId is required' },
            { status: 400 },
          )
        }
        const result = await getFeatureFlagStatsServer(
          request,
          body.flagId,
          params.period || '7d',
          formatDateForBackend(params.from) || '',
          formatDateForBackend(params.to) || '',
          params.timezone,
        )
        return data<ProxyResponse<FeatureFlagStats>>({
          data: result.data,
          error: result.error
            ? Array.isArray(result.error)
              ? result.error.join(', ')
              : result.error
            : null,
        })
      }

      case 'getFeatureFlagProfiles': {
        if (!body.flagId) {
          return data<ProxyResponse<null>>(
            { data: null, error: 'flagId is required' },
            { status: 400 },
          )
        }
        const result = await getFeatureFlagProfilesServer(
          request,
          body.flagId,
          params.period || '7d',
          formatDateForBackend(params.from) || '',
          formatDateForBackend(params.to) || '',
          params.timezone,
          params.take || 15,
          params.skip || 0,
          params.resultFilter,
        )
        return data<ProxyResponse<FeatureFlagProfilesResponse>>({
          data: result.data,
          error: result.error
            ? Array.isArray(result.error)
              ? result.error.join(', ')
              : result.error
            : null,
        })
      }

      case 'getGoalStats': {
        if (!body.goalId) {
          return data<ProxyResponse<null>>(
            { data: null, error: 'goalId is required' },
            { status: 400 },
          )
        }
        const result = await getGoalStatsServer(
          request,
          body.goalId,
          params.period || '7d',
          formatDateForBackend(params.from) || '',
          formatDateForBackend(params.to) || '',
          params.timezone,
        )
        return data<ProxyResponse<GoalStats>>({
          data: result.data,
          error: result.error
            ? Array.isArray(result.error)
              ? result.error.join(', ')
              : result.error
            : null,
        })
      }

      case 'getGoalChart': {
        if (!body.goalId) {
          return data<ProxyResponse<null>>(
            { data: null, error: 'goalId is required' },
            { status: 400 },
          )
        }
        const result = await getGoalChartServer(
          request,
          body.goalId,
          params.period || '7d',
          formatDateForBackend(params.from) || '',
          formatDateForBackend(params.to) || '',
          params.timeBucket || 'day',
          params.timezone,
        )
        return data<ProxyResponse<{ chart: GoalChartData }>>({
          data: result.data,
          error: result.error
            ? Array.isArray(result.error)
              ? result.error.join(', ')
              : result.error
            : null,
        })
      }

      case 'getCaptchaData': {
        const result = await getCaptchaDataServer(
          request,
          projectId,
          params.timeBucket || 'hour',
          params.period || '3d',
          params.filters || [],
          formatDateForBackend(params.from) || '',
          formatDateForBackend(params.to) || '',
          password || undefined,
        )
        return data<ProxyResponse<CaptchaDataResponse>>({
          data: result.data,
          error: result.error
            ? Array.isArray(result.error)
              ? result.error.join(', ')
              : result.error
            : null,
        })
      }

      case 'getExperimentResults': {
        if (!body.experimentId) {
          return data<ProxyResponse<null>>(
            { data: null, error: 'experimentId is required' },
            { status: 400 },
          )
        }
        const result = await getExperimentResultsServer(
          request,
          body.experimentId,
          params.period || '7d',
          params.timeBucket || 'day',
          formatDateForBackend(params.from) || '',
          formatDateForBackend(params.to) || '',
          params.timezone,
        )
        return data<ProxyResponse<ExperimentResults>>({
          data: result.data,
          error: result.error
            ? Array.isArray(result.error)
              ? result.error.join(', ')
              : result.error
            : null,
        })
      }

      case 'getExperiment': {
        if (!body.experimentId) {
          return data<ProxyResponse<null>>(
            { data: null, error: 'experimentId is required' },
            { status: 400 },
          )
        }
        const result = await getExperimentServer(request, body.experimentId)
        return data<ProxyResponse<Experiment>>({
          data: result.data,
          error: result.error
            ? Array.isArray(result.error)
              ? result.error.join(', ')
              : result.error
            : null,
        })
      }

      case 'getGoal': {
        if (!body.goalId) {
          return data<ProxyResponse<null>>(
            { data: null, error: 'goalId is required' },
            { status: 400 },
          )
        }
        const result = await getGoalServer(request, body.goalId)
        return data<ProxyResponse<Goal>>({
          data: result.data,
          error: result.error
            ? Array.isArray(result.error)
              ? result.error.join(', ')
              : result.error
            : null,
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
          error: result.error
            ? Array.isArray(result.error)
              ? result.error.join(', ')
              : result.error
            : null,
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
          error: result.error
            ? Array.isArray(result.error)
              ? result.error.join(', ')
              : result.error
            : null,
        })
      }

      case 'getProfiles': {
        const result = await getProfilesServer(
          request,
          projectId,
          params.period || '3d',
          params.filters || [],
          formatDateForBackend(params.from) || '',
          formatDateForBackend(params.to) || '',
          params.take || 30,
          params.skip || 0,
          params.timezone || '',
          params.profileType || 'all',
          password || undefined,
        )
        return data<ProxyResponse<ProfilesResponse>>({
          data: result.data,
          error: result.error
            ? Array.isArray(result.error)
              ? result.error.join(', ')
              : result.error
            : null,
        })
      }

      case 'getProfile': {
        if (!body.profileId) {
          return data<ProxyResponse<null>>(
            { data: null, error: 'profileId is required' },
            { status: 400 },
          )
        }
        const result = await getProfileServer(
          request,
          projectId,
          body.profileId,
          params.period || '7d',
          formatDateForBackend(params.from) || '',
          formatDateForBackend(params.to) || '',
          params.timezone || '',
          password || undefined,
        )
        return data<ProxyResponse<ProfileDetailsResponse>>({
          data: result.data,
          error: result.error
            ? Array.isArray(result.error)
              ? result.error.join(', ')
              : result.error
            : null,
        })
      }

      case 'getProfileSessions': {
        if (!body.profileId) {
          return data<ProxyResponse<null>>(
            { data: null, error: 'profileId is required' },
            { status: 400 },
          )
        }
        const result = await getProfileSessionsServer(
          request,
          projectId,
          body.profileId,
          params.period || '3d',
          params.filters || [],
          formatDateForBackend(params.from) || '',
          formatDateForBackend(params.to) || '',
          params.take || 30,
          params.skip || 0,
          params.timezone || '',
          password || undefined,
        )
        return data<ProxyResponse<ProfileSessionsResponse>>({
          data: result.data,
          error: result.error
            ? Array.isArray(result.error)
              ? result.error.join(', ')
              : result.error
            : null,
        })
      }

      case 'getProject': {
        const result = await getProjectServer(
          request,
          projectId,
          password || undefined,
        )
        return data<ProxyResponse<Project>>({
          data: result.data,
          error: result.error
            ? Array.isArray(result.error)
              ? result.error.join(', ')
              : result.error
            : null,
        })
      }

      case 'getFilters': {
        if (!body.filterType) {
          return data<ProxyResponse<null>>(
            { data: null, error: 'filterType is required' },
            { status: 400 },
          )
        }
        const result = await getFiltersServer(
          request,
          projectId,
          body.filterType,
          password || undefined,
        )
        return data<ProxyResponse<string[]>>({
          data: result.data,
          error: result.error
            ? Array.isArray(result.error)
              ? result.error.join(', ')
              : result.error
            : null,
        })
      }

      case 'getErrorsFilters': {
        if (!body.filterType) {
          return data<ProxyResponse<null>>(
            { data: null, error: 'filterType is required' },
            { status: 400 },
          )
        }
        const result = await getErrorsFiltersServer(
          request,
          projectId,
          body.filterType,
          password || undefined,
        )
        return data<ProxyResponse<string[]>>({
          data: result.data,
          error: result.error
            ? Array.isArray(result.error)
              ? result.error.join(', ')
              : result.error
            : null,
        })
      }

      case 'getVersionFilters': {
        if (!body.filterColumn || !body.dataType) {
          return data<ProxyResponse<null>>(
            { data: null, error: 'filterColumn and dataType are required' },
            { status: 400 },
          )
        }
        const result = await getVersionFiltersServer(
          request,
          projectId,
          body.dataType,
          body.filterColumn,
          password || undefined,
        )
        return data<ProxyResponse<VersionFilter[]>>({
          data: result.data,
          error: result.error
            ? Array.isArray(result.error)
              ? result.error.join(', ')
              : result.error
            : null,
        })
      }

      case 'getCustomEventsMetadata': {
        if (!body.event) {
          return data<ProxyResponse<null>>(
            { data: null, error: 'event is required' },
            { status: 400 },
          )
        }
        const result = await getCustomEventsMetadataServer(
          request,
          projectId,
          body.event,
          {
            timeBucket: params.timeBucket,
            period: params.period,
            from: formatDateForBackend(params.from),
            to: formatDateForBackend(params.to),
            timezone: params.timezone,
            password: password || undefined,
          },
        )
        return data<ProxyResponse<CustomEventsMetadataResponse>>({
          data: result.data,
          error: result.error
            ? Array.isArray(result.error)
              ? result.error.join(', ')
              : result.error
            : null,
        })
      }

      case 'getPropertyMetadata': {
        if (!body.property) {
          return data<ProxyResponse<null>>(
            { data: null, error: 'property is required' },
            { status: 400 },
          )
        }
        const result = await getPropertyMetadataServer(
          request,
          projectId,
          body.property,
          {
            timeBucket: params.timeBucket,
            period: params.period,
            from: formatDateForBackend(params.from),
            to: formatDateForBackend(params.to),
            filters: params.filters,
            timezone: params.timezone,
            password: password || undefined,
          },
        )
        return data<ProxyResponse<PropertyMetadataResponse>>({
          data: result.data,
          error: result.error
            ? Array.isArray(result.error)
              ? result.error.join(', ')
              : result.error
            : null,
        })
      }

      case 'getErrorSessions': {
        if (!body.errorId) {
          return data<ProxyResponse<null>>(
            { data: null, error: 'errorId is required' },
            { status: 400 },
          )
        }
        const result = await getErrorSessionsServer(
          request,
          projectId,
          body.errorId,
          {
            timeBucket: params.timeBucket,
            period: params.period,
            from: formatDateForBackend(params.from),
            to: formatDateForBackend(params.to),
            take: params.take,
            skip: params.skip,
            password: password || undefined,
          },
        )
        return data<ProxyResponse<ErrorSessionsResponse>>({
          data: result.data,
          error: result.error
            ? Array.isArray(result.error)
              ? result.error.join(', ')
              : result.error
            : null,
        })
      }

      case 'getLiveVisitors': {
        const pids = body.pids || [projectId]
        const result = await getLiveVisitorsServer(
          request,
          pids,
          password || undefined,
        )
        return data<ProxyResponse<LiveStats>>({
          data: result.data,
          error: result.error
            ? Array.isArray(result.error)
              ? result.error.join(', ')
              : result.error
            : null,
        })
      }

      case 'getLiveVisitorsInfo': {
        const result = await getLiveVisitorsInfoServer(
          request,
          projectId,
          password || undefined,
        )
        return data<ProxyResponse<LiveVisitorInfo[]>>({
          data: result.data,
          error: result.error
            ? Array.isArray(result.error)
              ? result.error.join(', ')
              : result.error
            : null,
        })
      }

      case 'getProjectDataCustomEvents': {
        const result = await getProjectDataCustomEventsServer(
          request,
          projectId,
          {
            timeBucket: params.timeBucket,
            period: params.period,
            filters: params.filters,
            from: formatDateForBackend(params.from),
            to: formatDateForBackend(params.to),
            timezone: params.timezone,
            customEvents: body.customEvents,
            password: password || undefined,
          },
        )
        return data<ProxyResponse<ProjectDataCustomEventsResponse>>({
          data: result.data,
          error: result.error
            ? Array.isArray(result.error)
              ? result.error.join(', ')
              : result.error
            : null,
        })
      }

      case 'getUserFlow': {
        const result = await getUserFlowServer(request, projectId, {
          timeBucket: params.timeBucket,
          period: params.period,
          filters: params.filters,
          from: formatDateForBackend(params.from),
          to: formatDateForBackend(params.to),
          timezone: params.timezone,
          password: password || undefined,
        })
        return data<ProxyResponse<UserFlowResponse>>({
          data: result.data,
          error: result.error
            ? Array.isArray(result.error)
              ? result.error.join(', ')
              : result.error
            : null,
        })
      }

      case 'getGSCKeywords': {
        const result = await getGSCKeywordsServer(request, projectId, {
          period: params.period,
          from: formatDateForBackend(params.from),
          to: formatDateForBackend(params.to),
          timezone: params.timezone,
          password: password || undefined,
        })
        return data<ProxyResponse<GSCKeywordsResponse>>({
          data: result.data,
          error: result.error
            ? Array.isArray(result.error)
              ? result.error.join(', ')
              : result.error
            : null,
        })
      }

      case 'getRevenueStatus': {
        const result = await getRevenueStatusServer(request, projectId)
        return data<ProxyResponse<RevenueStatus>>({
          data: result.data,
          error: result.error
            ? Array.isArray(result.error)
              ? result.error.join(', ')
              : result.error
            : null,
        })
      }

      case 'getRevenueData': {
        const result = await getRevenueDataServer(request, projectId, {
          period: params.period || '7d',
          from: formatDateForBackend(params.from),
          to: formatDateForBackend(params.to),
          timezone: params.timezone,
          timeBucket: params.timeBucket,
        })
        return data<ProxyResponse<RevenueDataResponse>>({
          data: result.data,
          error: result.error
            ? Array.isArray(result.error)
              ? result.error.join(', ')
              : result.error
            : null,
        })
      }

      case 'getOverallStats': {
        if (!pids || pids.length === 0) {
          return data<ProxyResponse<null>>(
            { data: null, error: 'pids is required' },
            { status: 400 },
          )
        }
        const result = await getOverallStatsServer(request, pids, {
          timeBucket: params.timeBucket || 'day',
          period: params.period || '7d',
          from: formatDateForBackend(params.from),
          to: formatDateForBackend(params.to),
          timezone: params.timezone || 'UTC',
          filters: params.filters || [],
          includeChart: true,
        })
        return data<ProxyResponse<Record<string, OverallObject>>>({
          data: result.data,
          error: result.error
            ? Array.isArray(result.error)
              ? result.error.join(', ')
              : result.error
            : null,
        })
      }

      default:
        return data<ProxyResponse<null>>(
          { data: null, error: `Unknown action: ${action}` },
          { status: 400 },
        )
    }
  } catch (error) {
    console.error('[api.analytics] Proxy request failed:', error)
    return data<ProxyResponse<null>>(
      {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

export async function loader({ request: _request }: LoaderFunctionArgs) {
  return data({ error: 'Use POST method' }, { status: 405 })
}

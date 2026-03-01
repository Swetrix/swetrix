import _includes from 'lodash/includes'
import _some from 'lodash/some'
import _split from 'lodash/split'
import _startsWith from 'lodash/startsWith'
import { useTranslation } from 'react-i18next'
import {
  type ActionFunctionArgs,
  type LinksFunction,
  type LoaderFunctionArgs,
  type MetaFunction,
} from 'react-router'
import { data, redirect } from 'react-router'

import {
  serverFetch,
  getProjectDataServer,
  getOverallStatsServer,
  getCustomEventsDataServer,
  getPerfDataServer,
  getPerformanceOverallStatsServer,
  getSessionsServer,
  getSessionServer,
  getErrorsServer,
  getErrorServer,
  getErrorOverviewServer,
  getProjectFeatureFlagsServer,
  getProjectGoalsServer,
  getProjectAlertsServer,
  getFunnelDataServer,
  type TrafficLogResponse,
  type OverallObject,
  type PerformanceDataResponse,
  type PerformanceOverallObject,
  type SessionsResponse,
  type SessionDetailsResponse,
  type ErrorsResponse,
  type ErrorDetailsResponse,
  type ErrorOverviewResponse,
  type FeatureFlagsResponse,
  type GoalsResponse,
  type AlertsResponse,
  type FunnelDataResponse,
  type AnalyticsFilter,
} from '~/api/api.server'
import { useRequiredParams } from '~/hooks/useRequiredParams'
import {
  API_URL,
  DEFAULT_TIMEZONE,
  PROJECT_TABS,
  getValidTimeBucket,
  type Period,
} from '~/lib/constants'
import { Project } from '~/lib/models/Project'
import ViewProject from '~/pages/Project/View'
import { CurrentProjectProvider } from '~/providers/CurrentProjectProvider'
import ProjectViewStyle from '~/styles/ProjectViewStyle.css?url'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'
import {
  redirectIfNotAuthenticated,
  createHeadersWithCookies,
  getProjectPasswordCookie,
  createProjectPasswordCookie,
  hasAuthTokens,
} from '~/utils/session.server'

function formatDateForBackend(dateStr: string): string {
  if (!dateStr) return ''

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

function parseBooleanFormValue(
  value: FormDataEntryValue | null,
  fallback = false,
): boolean {
  if (value === null) {
    return fallback
  }

  const normalised = String(value).toLowerCase()
  return normalised === 'true' || normalised === 'on'
}

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: ProjectViewStyle },
]

export const meta: MetaFunction<typeof loader> = ({ data, location }) => {
  const currentDate = new Date()
  const cacheVersion = `${currentDate.getUTCFullYear()}${currentDate.getUTCMonth()}`

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { t } = useTranslation('common')
  const { pathname } = location
  const pid = _split(pathname, '/')[2]
  const previewURL = `${API_URL}project/ogimage/${pid}?cv=${cacheVersion}`
  if (data?.isPasswordRequired) {
    return [
      ...getTitle(t('titles.projectWithPassword')),
      ...getDescription(t('description.projectWithPassword')),
      ...getPreviewImage(previewURL),
    ]
  }

  const projectName = data?.project?.name || 'Untitled Project'
  const searchParams = new URLSearchParams(location.search)
  const tab = (searchParams.get('tab') || PROJECT_TABS.traffic) as
    | keyof typeof PROJECT_TABS
    | 'settings'
  const tabNames: Record<keyof typeof PROJECT_TABS | 'settings', string> = {
    [PROJECT_TABS.traffic]: t('dashboard.traffic'),
    [PROJECT_TABS.performance]: t('dashboard.performance'),
    [PROJECT_TABS.profiles]: t('dashboard.profiles'),
    [PROJECT_TABS.sessions]: t('dashboard.sessions'),
    [PROJECT_TABS.errors]: t('dashboard.errors'),
    [PROJECT_TABS.funnels]: t('dashboard.funnels'),
    [PROJECT_TABS.goals]: t('dashboard.goals'),
    [PROJECT_TABS.featureFlags]: t('dashboard.featureFlags'),
    [PROJECT_TABS.captcha]: t('common.captcha'),
    [PROJECT_TABS.ai]: t('dashboard.askAi'),
    [PROJECT_TABS.alerts]: t('dashboard.alerts'),
    [PROJECT_TABS.experiments]: t('dashboard.experiments'),
    settings: t('common.settings'),
  }
  const tabName = tabNames[tab] || tabNames[PROJECT_TABS.traffic]
  const title = `${tabName} > ${projectName}`

  return [
    ...getTitle(title),
    ...getDescription(
      t('description.project', {
        name: projectName,
      }),
    ),
    ...getPreviewImage(previewURL),
  ]
}

const validFilters = [
  'host',
  'cc',
  'rg',
  'ct',
  'pg',
  'entryPage',
  'exitPage',
  'lc',
  'ref',
  'refn',
  'dv',
  'br',
  'brv',
  'os',
  'osv',
  'so',
  'me',
  'ca',
  'te',
  'co',
  'ev',
  'tag:key',
  'tag:value',
  'ev:key',
  'ev:value',
]
const validDynamicFilters = ['ev:key:', 'tag:key:']

function isFilterValid(filter: string, checkDynamicFilters = false) {
  let normalised = filter
  if (
    _startsWith(normalised, '!') ||
    _startsWith(normalised, '~') ||
    _startsWith(normalised, '^')
  ) {
    normalised = normalised.substring(1)
  }

  if (_includes(validFilters, normalised)) {
    return true
  }

  if (
    checkDynamicFilters &&
    _some(validDynamicFilters, (prefix) => _startsWith(normalised, prefix))
  ) {
    return true
  }

  return false
}

function parseFiltersFromUrl(searchParams: URLSearchParams): AnalyticsFilter[] {
  const filters: AnalyticsFilter[] = []

  const entries = Array.from(searchParams.entries())

  for (const [key, value] of entries) {
    let actualColumn = key

    let isExclusive = false
    let isContains = false

    if (key.startsWith('!')) {
      isExclusive = true
      actualColumn = key.substring(1)
    } else if (key.startsWith('~')) {
      isContains = true
      actualColumn = key.substring(1)
    } else if (key.startsWith('^')) {
      isExclusive = true
      isContains = true
      actualColumn = key.substring(1)
    }

    if (!isFilterValid(actualColumn, true)) {
      continue
    }

    filters.push({
      column: actualColumn,
      filter: value,
      isExclusive: isExclusive,
      isContains,
    })
  }

  return filters
}

export interface ProjectLoaderData {
  project: Project | null
  isPasswordRequired: boolean
  error?: string
  // Traffic data
  trafficData?: Promise<TrafficLogResponse | null>
  overallStats?: Promise<Record<string, OverallObject> | null>
  trafficCompareData?: Promise<TrafficLogResponse | null>
  overallCompareStats?: Promise<Record<string, OverallObject> | null>
  customEventsData?: Promise<{
    chart?: { events?: Record<string, unknown> }
  } | null>
  // Performance data
  perfData?: Promise<PerformanceDataResponse | null>
  perfOverallStats?: Promise<Record<string, PerformanceOverallObject> | null>
  // Sessions data
  sessionsData?: Promise<SessionsResponse | null>
  sessionDetails?: Promise<SessionDetailsResponse | null>
  // Errors data
  errorsData?: Promise<ErrorsResponse | null>
  errorDetails?: Promise<ErrorDetailsResponse | null>
  errorOverview?: Promise<ErrorOverviewResponse | null>
  // Feature Flags data
  featureFlagsData?: Promise<FeatureFlagsResponse | null>
  // Goals data
  goalsData?: Promise<GoalsResponse | null>
  // Alerts data
  alertsData?: Promise<AlertsResponse | null>
  // Funnels data
  funnelData?: Promise<FunnelDataResponse | null>
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { id: projectId } = params
  const url = new URL(request.url)

  const passwordFromQuery = url.searchParams.get('password') || ''
  const passwordFromCookie = getProjectPasswordCookie(request, projectId || '')
  const password = passwordFromQuery || passwordFromCookie

  const result = await serverFetch<Project>(request, `project/${projectId}`, {
    method: 'GET',
    headers: password ? { 'x-password': password } : undefined,
  })

  if (result.error || !result.data) {
    if (result.status === 404 || result.status === 403) {
      return redirect('/dashboard')
    }

    return data<ProjectLoaderData>(
      {
        project: null,
        isPasswordRequired: false,
        error: result.error as string,
      },
      {
        status: result.status,
        headers: createHeadersWithCookies(result.cookies),
      },
    )
  }

  const project = result.data

  if (project.isPasswordProtected && !project.role && !password) {
    return data<ProjectLoaderData>(
      { project: null, isPasswordRequired: true },
      { headers: createHeadersWithCookies(result.cookies) },
    )
  }

  const cookies = [...result.cookies]
  if (password && passwordFromQuery && password !== passwordFromCookie) {
    cookies.push(createProjectPasswordCookie(projectId || '', password))
  }

  // Parse URL params for analytics data
  const tab =
    (url.searchParams.get('tab') as keyof typeof PROJECT_TABS) ||
    PROJECT_TABS.traffic
  const period = (url.searchParams.get('period') || '7d') as Period
  const urlTimeBucket = url.searchParams.get('timeBucket')
  const from = formatDateForBackend(url.searchParams.get('from') || '')
  const to = formatDateForBackend(url.searchParams.get('to') || '')
  const timezone = url.searchParams.get('timezone') || DEFAULT_TIMEZONE
  const filters = parseFiltersFromUrl(url.searchParams)

  // Ensure the time bucket is valid for the selected period and date range
  const timeBucket = getValidTimeBucket(period, urlTimeBucket, from, to)

  // Performance-specific params
  const measure = url.searchParams.get('measure') || 'median'
  const perfMetric = url.searchParams.get('perfMetric') || 'timing' // 'timing' or 'quantiles'

  // Traffic compare params
  const compareEnabled = url.searchParams.get('compare') === 'true'
  const compareFrom = formatDateForBackend(
    url.searchParams.get('compareFrom') || '',
  )
  const compareTo = formatDateForBackend(
    url.searchParams.get('compareTo') || '',
  )

  // Traffic custom events params
  const customEventsParam = url.searchParams.get('customEvents') || ''
  const customEvents = customEventsParam
    ? customEventsParam.split(',').filter(Boolean)
    : []

  const analyticsParams = {
    timeBucket,
    period,
    filters,
    from: from || undefined,
    to: to || undefined,
    timezone,
    password: password || undefined,
  }

  // Initialize deferred data promises
  let trafficData: Promise<TrafficLogResponse | null> | undefined
  let overallStats: Promise<Record<string, OverallObject> | null> | undefined
  let trafficCompareData: Promise<TrafficLogResponse | null> | undefined
  let overallCompareStats:
    | Promise<Record<string, OverallObject> | null>
    | undefined
  let customEventsData:
    | Promise<{ chart?: { events?: Record<string, unknown> } } | null>
    | undefined
  let perfData: Promise<PerformanceDataResponse | null> | undefined
  let perfOverallStats:
    | Promise<Record<string, PerformanceOverallObject> | null>
    | undefined
  let sessionsData: Promise<SessionsResponse | null> | undefined
  let sessionDetails: Promise<SessionDetailsResponse | null> | undefined
  let errorsData: Promise<ErrorsResponse | null> | undefined
  let errorDetails: Promise<ErrorDetailsResponse | null> | undefined
  let errorOverview: Promise<ErrorOverviewResponse | null> | undefined
  let featureFlagsData: Promise<FeatureFlagsResponse | null> | undefined
  let goalsData: Promise<GoalsResponse | null> | undefined
  let alertsData: Promise<AlertsResponse | null> | undefined
  let funnelData: Promise<FunnelDataResponse | null> | undefined

  // Only fetch data if project is valid and not locked
  if (project && !project.isLocked && projectId) {
    if (tab === PROJECT_TABS.traffic) {
      trafficData = getProjectDataServer(
        request,
        projectId,
        analyticsParams,
      ).then((res) => res.data)
      overallStats = getOverallStatsServer(
        request,
        [projectId],
        analyticsParams,
      ).then((res) => res.data)

      // Fetch compare data if enabled
      if (compareEnabled && compareFrom && compareTo) {
        const compareParams = {
          ...analyticsParams,
          period: 'custom' as const,
          from: compareFrom,
          to: compareTo,
        }
        trafficCompareData = getProjectDataServer(
          request,
          projectId,
          compareParams,
        ).then((res) => res.data)
        overallCompareStats = getOverallStatsServer(
          request,
          [projectId],
          compareParams,
        ).then((res) => res.data)
      }

      // Fetch custom events data if any custom events are selected
      if (customEvents.length > 0) {
        customEventsData = getCustomEventsDataServer(
          request,
          projectId,
          analyticsParams,
          customEvents,
        ).then((res) => res.data)
      }
    } else if (tab === PROJECT_TABS.performance) {
      // Use measure from URL, or 'quantiles' if perfMetric is quantiles
      const effectiveMeasure =
        perfMetric === 'quantiles' ? 'quantiles' : measure
      const perfParams = { ...analyticsParams, measure: effectiveMeasure }
      perfData = getPerfDataServer(request, projectId, perfParams).then(
        (res) => res.data,
      )
      perfOverallStats = getPerformanceOverallStatsServer(
        request,
        [projectId],
        perfParams,
      ).then((res) => res.data)
    } else if (tab === PROJECT_TABS.sessions) {
      sessionsData = getSessionsServer(
        request,
        projectId,
        analyticsParams,
      ).then((res) => res.data)
      // Fetch session details if psid is in URL
      const psid = url.searchParams.get('psid')
      if (psid) {
        sessionDetails = getSessionServer(
          request,
          projectId,
          psid,
          timezone,
          password || undefined,
        ).then((res) => res.data)
      }
    } else if (tab === PROJECT_TABS.errors) {
      errorsData = getErrorsServer(request, projectId, analyticsParams).then(
        (res) => res.data,
      )
      errorOverview = getErrorOverviewServer(
        request,
        projectId,
        analyticsParams,
      ).then((res) => res.data)
      // Fetch error details if eid is in URL
      const eid = url.searchParams.get('eid')
      if (eid) {
        errorDetails = getErrorServer(
          request,
          projectId,
          eid,
          analyticsParams,
        ).then((res) => res.data)
      }
    } else if (tab === PROJECT_TABS.featureFlags) {
      featureFlagsData = getProjectFeatureFlagsServer(request, projectId).then(
        (res) => res.data,
      )
    } else if (tab === PROJECT_TABS.goals) {
      goalsData = getProjectGoalsServer(request, projectId).then(
        (res) => res.data,
      )
    } else if (tab === PROJECT_TABS.alerts) {
      alertsData = getProjectAlertsServer(request, projectId).then(
        (res) => res.data,
      )
    } else if (tab === PROJECT_TABS.funnels) {
      // Fetch funnel data if funnelId is in URL
      const funnelId = url.searchParams.get('funnelId')
      if (funnelId) {
        const funnelFrom = from || ''
        const funnelTo = to || ''
        const funnelPeriod = period === 'custom' ? '' : period
        funnelData = getFunnelDataServer(
          request,
          projectId,
          funnelId,
          funnelPeriod,
          funnelFrom,
          funnelTo,
          timezone,
          password || undefined,
        ).then((res) => res.data)
      }
    }
  }

  return data<ProjectLoaderData>(
    {
      project,
      isPasswordRequired: false,
      trafficData,
      overallStats,
      trafficCompareData,
      overallCompareStats,
      customEventsData,
      perfData,
      perfOverallStats,
      sessionsData,
      sessionDetails,
      errorsData,
      errorDetails,
      errorOverview,
      featureFlagsData,
      goalsData,
      alertsData,
      funnelData,
    },
    { headers: createHeadersWithCookies(cookies) },
  )
}

export interface ProjectViewActionData {
  success?: boolean
  intent?: string
  error?: string
  data?: unknown
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { id: projectId } = params
  const formData = await request.formData()
  const intent = formData.get('intent')?.toString()

  const publicIntents = new Set([
    'get-project',
    'check-password',
    'get-project-views',
    'get-annotations',
    'get-funnels',
    'get-funnel-data',
    'get-project-goals',
    'get-goal',
    'get-goal-stats',
    'get-goal-chart',
    'get-project-alerts',
    'get-alert',
    'get-project-feature-flags',
    'get-feature-flag',
    'get-feature-flag-stats',
    'get-feature-flag-profiles',
    'get-project-experiments',
    'get-experiment',
    'get-experiment-results',
    'get-filters',
    'get-errors-filters',
    'get-version-filters',
    'get-recent-ai-chats',
    'get-all-ai-chats',
    'get-ai-chat',
    'create-ai-chat',
    'update-ai-chat',
    'delete-ai-chat',
  ])

  if (!intent || (!publicIntents.has(intent) && !hasAuthTokens(request))) {
    redirectIfNotAuthenticated(request)
  }

  switch (intent) {
    // Goals
    case 'create-goal': {
      const name = formData.get('name')?.toString() || ''
      const type = formData.get('type')?.toString() || 'pageview'
      const matchType = formData.get('matchType')?.toString() || 'exact'
      const value = formData.get('value')?.toString() || ''

      const result = await serverFetch(request, 'goal', {
        method: 'POST',
        body: { pid: projectId, name, type, matchType, value },
      })

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'update-goal': {
      const goalId = formData.get('goalId')?.toString()
      const name = formData.get('name')?.toString()
      const type = formData.get('type')?.toString()
      const matchType = formData.get('matchType')?.toString()
      const value = formData.get('value')?.toString()

      const result = await serverFetch(request, `goal/${goalId}`, {
        method: 'PUT',
        body: { name, type, matchType, value },
      })

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'delete-goal': {
      const goalId = formData.get('goalId')?.toString()

      const result = await serverFetch(request, `goal/${goalId}`, {
        method: 'DELETE',
      })

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    // Funnels
    case 'create-funnel': {
      const name = formData.get('name')?.toString() || ''
      const steps = JSON.parse(formData.get('steps')?.toString() || '[]')

      const result = await serverFetch(request, 'project/funnel', {
        method: 'POST',
        body: { pid: projectId, name, steps },
      })

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'update-funnel': {
      const funnelId = formData.get('funnelId')?.toString()
      const name = formData.get('name')?.toString() || ''
      const steps = JSON.parse(formData.get('steps')?.toString() || '[]')

      const result = await serverFetch(request, 'project/funnel', {
        method: 'PATCH',
        body: { id: funnelId, pid: projectId, name, steps },
      })

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'delete-funnel': {
      const funnelId = formData.get('funnelId')?.toString()

      const result = await serverFetch(
        request,
        `project/funnel/${funnelId}/${projectId}`,
        {
          method: 'DELETE',
        },
      )

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    // Alerts
    case 'create-alert': {
      const name = formData.get('name')?.toString() || ''
      const queryMetric =
        formData.get('queryMetric')?.toString() || 'page_views'
      const queryCondition = formData.get('queryCondition')?.toString() || null
      const queryValue = formData.get('queryValue')
        ? Number(formData.get('queryValue'))
        : null
      const queryTime = formData.get('queryTime')?.toString() || null
      const queryCustomEvent =
        formData.get('queryCustomEvent')?.toString() || null
      const active = parseBooleanFormValue(formData.get('active'), true)
      const alertOnNewErrorsOnly = parseBooleanFormValue(
        formData.get('alertOnNewErrorsOnly'),
        true,
      )
      const alertOnEveryCustomEvent = parseBooleanFormValue(
        formData.get('alertOnEveryCustomEvent'),
        false,
      )

      const result = await serverFetch(request, 'alert', {
        method: 'POST',
        body: {
          pid: projectId,
          name,
          queryMetric,
          queryCondition,
          queryValue,
          queryTime,
          queryCustomEvent,
          alertOnNewErrorsOnly,
          alertOnEveryCustomEvent,
          active,
        },
      })

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'update-alert': {
      const alertId = formData.get('alertId')?.toString()
      const name = formData.get('name')?.toString()
      const active = parseBooleanFormValue(formData.get('active'))
      const queryMetric = formData.get('queryMetric')?.toString()
      const queryCondition = formData.get('queryCondition')?.toString() || null
      const queryValue = formData.get('queryValue')
        ? Number(formData.get('queryValue'))
        : null
      const queryTime = formData.get('queryTime')?.toString() || null
      const queryCustomEvent =
        formData.get('queryCustomEvent')?.toString() || null
      const alertOnNewErrorsOnly = formData.has('alertOnNewErrorsOnly')
        ? parseBooleanFormValue(formData.get('alertOnNewErrorsOnly'))
        : undefined
      const alertOnEveryCustomEvent = formData.has('alertOnEveryCustomEvent')
        ? parseBooleanFormValue(formData.get('alertOnEveryCustomEvent'))
        : undefined

      const body: Record<string, unknown> = {}
      if (name !== undefined) body.name = name
      body.active = active
      if (queryMetric !== undefined) body.queryMetric = queryMetric
      body.queryCondition = queryCondition
      body.queryValue = queryValue
      body.queryTime = queryTime
      body.queryCustomEvent = queryCustomEvent
      if (alertOnNewErrorsOnly !== undefined)
        body.alertOnNewErrorsOnly = alertOnNewErrorsOnly
      if (alertOnEveryCustomEvent !== undefined)
        body.alertOnEveryCustomEvent = alertOnEveryCustomEvent

      const result = await serverFetch(request, `alert/${alertId}`, {
        method: 'PUT',
        body,
      })

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'delete-alert': {
      const alertId = formData.get('alertId')?.toString()

      const result = await serverFetch(request, `alert/${alertId}`, {
        method: 'DELETE',
      })

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    // Annotations
    case 'get-annotations': {
      const password = formData.get('password')?.toString() || ''

      const result = await serverFetch(
        request,
        `project/annotations/${projectId}`,
        {
          method: 'GET',
          headers: password ? { 'x-password': password } : undefined,
        },
      )

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'create-annotation': {
      const date = formData.get('date')?.toString() || ''
      const text = formData.get('text')?.toString() || ''

      const result = await serverFetch(request, 'project/annotation', {
        method: 'POST',
        body: { pid: projectId, date, text },
      })

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'update-annotation': {
      const annotationId = formData.get('annotationId')?.toString() || ''
      const date = formData.get('date')?.toString() || ''
      const text = formData.get('text')?.toString() || ''

      const result = await serverFetch(request, 'project/annotation', {
        method: 'PATCH',
        body: { id: annotationId, pid: projectId, date, text },
      })

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'delete-annotation': {
      const annotationId = formData.get('annotationId')?.toString()

      const result = await serverFetch(
        request,
        `project/annotation/${annotationId}/${projectId}`,
        {
          method: 'DELETE',
        },
      )

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    // Project Views
    case 'get-project-views': {
      const password = formData.get('password')?.toString() || ''

      const result = await serverFetch(request, `project/${projectId}/views`, {
        method: 'GET',
        headers: password ? { 'x-password': password } : undefined,
      })

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'create-project-view': {
      const name = formData.get('name')?.toString() || ''
      const type = formData.get('type')?.toString() || 'traffic'
      const filters = JSON.parse(formData.get('filters')?.toString() || '[]')
      const customEvents = JSON.parse(
        formData.get('customEvents')?.toString() || '[]',
      )

      const result = await serverFetch(request, `project/${projectId}/views`, {
        method: 'POST',
        body: { name, type, filters, customEvents },
      })

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'update-project-view': {
      const viewId = formData.get('viewId')?.toString()
      const name = formData.get('name')?.toString() || ''
      const filters = JSON.parse(formData.get('filters')?.toString() || '[]')
      const customEvents = JSON.parse(
        formData.get('customEvents')?.toString() || '[]',
      )

      const result = await serverFetch(
        request,
        `project/${projectId}/views/${viewId}`,
        {
          method: 'PATCH',
          body: { name, filters, customEvents },
        },
      )

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'delete-project-view': {
      const viewId = formData.get('viewId')?.toString()

      const result = await serverFetch(
        request,
        `project/${projectId}/views/${viewId}`,
        {
          method: 'DELETE',
        },
      )

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    // AI Chat
    case 'get-recent-ai-chats': {
      const limit = Number(formData.get('limit') || '5')

      const result = await serverFetch(
        request,
        `ai/${projectId}/chats?limit=${limit}`,
        {
          method: 'GET',
        },
      )

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'get-all-ai-chats': {
      const skip = Number(formData.get('skip') || '0')
      const take = Number(formData.get('take') || '20')

      const result = await serverFetch(
        request,
        `ai/${projectId}/chats/all?skip=${skip}&take=${take}`,
        {
          method: 'GET',
        },
      )

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'get-ai-chat': {
      const chatId = formData.get('chatId')?.toString()

      const result = await serverFetch(
        request,
        `ai/${projectId}/chats/${chatId}`,
        {
          method: 'GET',
        },
      )

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'create-ai-chat': {
      const messages = JSON.parse(formData.get('messages')?.toString() || '[]')
      const name = formData.get('name')?.toString()

      const result = await serverFetch(request, `ai/${projectId}/chats`, {
        method: 'POST',
        body: { messages, name },
      })

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'update-ai-chat': {
      const chatId = formData.get('chatId')?.toString()
      const messages = formData.get('messages')
        ? JSON.parse(formData.get('messages')!.toString())
        : undefined
      const name = formData.get('name')?.toString()

      const body: Record<string, unknown> = {}
      if (messages) body.messages = messages
      if (name !== undefined) body.name = name

      const result = await serverFetch(
        request,
        `ai/${projectId}/chats/${chatId}`,
        {
          method: 'POST',
          body,
        },
      )

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'delete-ai-chat': {
      const chatId = formData.get('chatId')?.toString()

      const result = await serverFetch(
        request,
        `ai/${projectId}/chats/${chatId}`,
        {
          method: 'DELETE',
        },
      )

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    // Feature Flags
    case 'get-project-feature-flags': {
      const take = Number(formData.get('take') || '20')
      const skip = Number(formData.get('skip') || '0')
      const search = formData.get('search')?.toString() || ''

      const params = new URLSearchParams({
        take: String(take),
        skip: String(skip),
      })
      if (search) params.append('search', search)

      const result = await serverFetch(
        request,
        `feature-flag/project/${projectId}?${params.toString()}`,
        {
          method: 'GET',
        },
      )

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'get-feature-flag': {
      const flagId = formData.get('flagId')?.toString()

      const result = await serverFetch(request, `feature-flag/${flagId}`, {
        method: 'GET',
      })

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'create-feature-flag': {
      const key = formData.get('key')?.toString() || ''
      const description = formData.get('description')?.toString() || ''
      const flagType = formData.get('flagType')?.toString() || 'boolean'
      const rolloutPercentage = Number(
        formData.get('rolloutPercentage') || '100',
      )
      const targetingRules = JSON.parse(
        formData.get('targetingRules')?.toString() || '[]',
      )
      const enabled = formData.get('enabled') === 'true'

      const result = await serverFetch(request, 'feature-flag', {
        method: 'POST',
        body: {
          pid: projectId,
          key,
          description,
          flagType,
          rolloutPercentage,
          targetingRules,
          enabled,
        },
      })

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'update-feature-flag': {
      const flagId = formData.get('flagId')?.toString()
      const key = formData.get('key')?.toString()
      const description = formData.get('description')?.toString()
      const flagType = formData.get('flagType')?.toString()
      const rolloutPercentage = formData.get('rolloutPercentage')
        ? Number(formData.get('rolloutPercentage'))
        : undefined
      const targetingRules = formData.get('targetingRules')
        ? JSON.parse(formData.get('targetingRules')!.toString())
        : undefined
      const enabled = formData.has('enabled')
        ? formData.get('enabled') === 'true'
        : undefined

      const body: Record<string, unknown> = {}
      if (key !== undefined) body.key = key
      if (description !== undefined) body.description = description
      if (flagType !== undefined) body.flagType = flagType
      if (rolloutPercentage !== undefined)
        body.rolloutPercentage = rolloutPercentage
      if (targetingRules !== undefined) body.targetingRules = targetingRules
      if (enabled !== undefined) body.enabled = enabled

      const result = await serverFetch(request, `feature-flag/${flagId}`, {
        method: 'PUT',
        body,
      })

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'delete-feature-flag': {
      const flagId = formData.get('flagId')?.toString()

      const result = await serverFetch(request, `feature-flag/${flagId}`, {
        method: 'DELETE',
      })

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'get-feature-flag-stats': {
      const flagId = formData.get('flagId')?.toString()
      const period = formData.get('period')?.toString() || '7d'
      const fromDate = formData.get('from')?.toString() || ''
      const toDate = formData.get('to')?.toString() || ''
      const tz = formData.get('timezone')?.toString() || ''

      const params = new URLSearchParams({ period })
      if (fromDate) params.append('from', fromDate)
      if (toDate) params.append('to', toDate)
      if (tz) params.append('timezone', tz)

      const result = await serverFetch(
        request,
        `feature-flag/${flagId}/stats?${params.toString()}`,
        {
          method: 'GET',
        },
      )

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: { flagId, stats: result.data } },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'get-feature-flag-profiles': {
      const flagId = formData.get('flagId')?.toString()
      const period = formData.get('period')?.toString() || '7d'
      const fromDate = formData.get('from')?.toString() || ''
      const toDate = formData.get('to')?.toString() || ''
      const tz = formData.get('timezone')?.toString() || ''
      const take = Number(formData.get('take') || '15')
      const skip = Number(formData.get('skip') || '0')
      const resultFilter = formData.get('result')?.toString() || ''

      const params = new URLSearchParams({
        period,
        take: String(take),
        skip: String(skip),
      })
      if (fromDate) params.append('from', fromDate)
      if (toDate) params.append('to', toDate)
      if (tz) params.append('timezone', tz)
      if (resultFilter && resultFilter !== 'all')
        params.append('result', resultFilter)

      const result = await serverFetch(
        request,
        `feature-flag/${flagId}/profiles?${params.toString()}`,
        {
          method: 'GET',
        },
      )

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      const profilesData = result.data as { profiles: unknown[]; total: number }
      return data<ProjectViewActionData>(
        {
          intent,
          success: true,
          data: {
            flagId,
            profiles: profilesData.profiles,
            total: profilesData.total,
          },
        },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    // Experiments
    case 'get-project-experiments': {
      const take = Number(formData.get('take') || '20')
      const skip = Number(formData.get('skip') || '0')
      const search = formData.get('search')?.toString() || ''

      const params = new URLSearchParams({
        take: String(take),
        skip: String(skip),
      })
      if (search) params.append('search', search)

      const result = await serverFetch(
        request,
        `experiment/project/${projectId}?${params.toString()}`,
        {
          method: 'GET',
        },
      )

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'get-experiment': {
      const experimentId = formData.get('experimentId')?.toString()

      const result = await serverFetch(request, `experiment/${experimentId}`, {
        method: 'GET',
      })

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'create-experiment': {
      const name = formData.get('name')?.toString() || ''
      const description = formData.get('description')?.toString() || ''
      const hypothesis = formData.get('hypothesis')?.toString() || ''
      const exposureTrigger =
        formData.get('exposureTrigger')?.toString() || 'feature_flag'
      const customEventName = formData.get('customEventName')?.toString() || ''
      const multipleVariantHandling =
        formData.get('multipleVariantHandling')?.toString() || 'exclude'
      const filterInternalUsers = formData.get('filterInternalUsers') === 'true'
      const featureFlagMode =
        formData.get('featureFlagMode')?.toString() || 'create'
      const featureFlagKey = formData.get('featureFlagKey')?.toString() || ''
      const existingFeatureFlagId =
        formData.get('existingFeatureFlagId')?.toString() || ''
      const goalId = formData.get('goalId')?.toString() || ''
      const variants = JSON.parse(formData.get('variants')?.toString() || '[]')

      const body: Record<string, unknown> = {
        pid: projectId,
        name,
        variants,
      }
      if (description) body.description = description
      if (hypothesis) body.hypothesis = hypothesis
      if (exposureTrigger) body.exposureTrigger = exposureTrigger
      if (customEventName) body.customEventName = customEventName
      if (multipleVariantHandling)
        body.multipleVariantHandling = multipleVariantHandling
      body.filterInternalUsers = filterInternalUsers
      if (featureFlagMode) body.featureFlagMode = featureFlagMode
      if (featureFlagKey) body.featureFlagKey = featureFlagKey
      if (existingFeatureFlagId)
        body.existingFeatureFlagId = existingFeatureFlagId
      if (goalId) body.goalId = goalId

      const result = await serverFetch(request, 'experiment', {
        method: 'POST',
        body,
      })

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'update-experiment': {
      const experimentId = formData.get('experimentId')?.toString()
      const name = formData.get('name')?.toString()
      const description = formData.get('description')?.toString()
      const hypothesis = formData.get('hypothesis')?.toString()
      const exposureTrigger = formData.get('exposureTrigger')?.toString()
      const customEventName = formData.get('customEventName')?.toString()
      const multipleVariantHandling = formData
        .get('multipleVariantHandling')
        ?.toString()
      const filterInternalUsers = formData.has('filterInternalUsers')
        ? formData.get('filterInternalUsers') === 'true'
        : undefined
      const featureFlagMode = formData.get('featureFlagMode')?.toString()
      const featureFlagKey = formData.get('featureFlagKey')?.toString()
      const existingFeatureFlagId = formData
        .get('existingFeatureFlagId')
        ?.toString()
      const goalId = formData.get('goalId')?.toString()
      const variants = formData.get('variants')
        ? JSON.parse(formData.get('variants')!.toString())
        : undefined

      const body: Record<string, unknown> = {}
      if (name !== undefined) body.name = name
      if (description !== undefined) body.description = description
      if (hypothesis !== undefined) body.hypothesis = hypothesis
      if (exposureTrigger !== undefined) body.exposureTrigger = exposureTrigger
      if (customEventName !== undefined) body.customEventName = customEventName
      if (multipleVariantHandling !== undefined)
        body.multipleVariantHandling = multipleVariantHandling
      if (filterInternalUsers !== undefined)
        body.filterInternalUsers = filterInternalUsers
      if (featureFlagMode !== undefined) body.featureFlagMode = featureFlagMode
      if (featureFlagKey !== undefined) body.featureFlagKey = featureFlagKey
      if (existingFeatureFlagId !== undefined)
        body.existingFeatureFlagId = existingFeatureFlagId
      if (goalId !== undefined) body.goalId = goalId
      if (variants !== undefined) body.variants = variants

      const result = await serverFetch(request, `experiment/${experimentId}`, {
        method: 'PUT',
        body,
      })

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'delete-experiment': {
      const experimentId = formData.get('experimentId')?.toString()

      const result = await serverFetch(request, `experiment/${experimentId}`, {
        method: 'DELETE',
      })

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'start-experiment': {
      const experimentId = formData.get('experimentId')?.toString()

      const result = await serverFetch(
        request,
        `experiment/${experimentId}/start`,
        {
          method: 'POST',
        },
      )

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'pause-experiment': {
      const experimentId = formData.get('experimentId')?.toString()

      const result = await serverFetch(
        request,
        `experiment/${experimentId}/pause`,
        {
          method: 'POST',
        },
      )

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'complete-experiment': {
      const experimentId = formData.get('experimentId')?.toString()

      const result = await serverFetch(
        request,
        `experiment/${experimentId}/complete`,
        {
          method: 'POST',
        },
      )

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'get-experiment-results': {
      const experimentId = formData.get('experimentId')?.toString()
      const period = formData.get('period')?.toString() || '7d'
      const timeBucket = formData.get('timeBucket')?.toString() || 'day'
      const fromDate = formData.get('from')?.toString() || ''
      const toDate = formData.get('to')?.toString() || ''
      const tz = formData.get('timezone')?.toString() || ''

      const params = new URLSearchParams({ period, timeBucket })
      if (fromDate) params.append('from', fromDate)
      if (toDate) params.append('to', toDate)
      if (tz) params.append('timezone', tz)

      const result = await serverFetch(
        request,
        `experiment/${experimentId}/results?${params.toString()}`,
        {
          method: 'GET',
        },
      )

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    // Goals (getters)
    case 'get-project-goals': {
      const take = Number(formData.get('take') || '20')
      const skip = Number(formData.get('skip') || '0')
      const search = formData.get('search')?.toString() || ''

      const params = new URLSearchParams({
        take: String(take),
        skip: String(skip),
      })
      if (search) params.append('search', search)

      const result = await serverFetch(
        request,
        `goal/project/${projectId}?${params.toString()}`,
        {
          method: 'GET',
        },
      )

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'get-goal': {
      const goalId = formData.get('goalId')?.toString()

      const result = await serverFetch(request, `goal/${goalId}`, {
        method: 'GET',
      })

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'get-goal-stats': {
      const goalId = formData.get('goalId')?.toString()
      const period = formData.get('period')?.toString() || '7d'
      const fromDate = formData.get('from')?.toString() || ''
      const toDate = formData.get('to')?.toString() || ''
      const tz = formData.get('timezone')?.toString() || ''

      const params = new URLSearchParams({ period })
      if (fromDate) params.append('from', fromDate)
      if (toDate) params.append('to', toDate)
      if (tz) params.append('timezone', tz)

      const result = await serverFetch(
        request,
        `goal/${goalId}/stats?${params.toString()}`,
        {
          method: 'GET',
        },
      )

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'get-goal-chart': {
      const goalId = formData.get('goalId')?.toString()
      const period = formData.get('period')?.toString() || '7d'
      const fromDate = formData.get('from')?.toString() || ''
      const toDate = formData.get('to')?.toString() || ''
      const timeBucket = formData.get('timeBucket')?.toString() || 'day'
      const tz = formData.get('timezone')?.toString() || ''

      const params = new URLSearchParams({ period, timeBucket })
      if (fromDate) params.append('from', fromDate)
      if (toDate) params.append('to', toDate)
      if (tz) params.append('timezone', tz)

      const result = await serverFetch(
        request,
        `goal/${goalId}/chart?${params.toString()}`,
        {
          method: 'GET',
        },
      )

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    // Funnels (getters)
    case 'get-funnels': {
      const password = formData.get('password')?.toString() || ''

      const result = await serverFetch(
        request,
        `project/funnels/${projectId}`,
        {
          method: 'GET',
          headers: password ? { 'x-password': password } : undefined,
        },
      )

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'get-funnel-data': {
      const period = formData.get('period')?.toString() || ''
      const fromDate = formData.get('from')?.toString() || ''
      const toDate = formData.get('to')?.toString() || ''
      const tz = formData.get('timezone')?.toString() || ''
      const funnelId = formData.get('funnelId')?.toString() || ''
      const password = formData.get('password')?.toString() || ''

      const params = new URLSearchParams({ pid: projectId || '' })
      if (period) params.append('period', period)
      if (fromDate) params.append('from', fromDate)
      if (toDate) params.append('to', toDate)
      if (tz) params.append('timezone', tz)
      if (funnelId) params.append('funnelId', funnelId)

      const result = await serverFetch(
        request,
        `log/funnel?${params.toString()}`,
        {
          method: 'GET',
          headers: password ? { 'x-password': password } : undefined,
        },
      )

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    // Alerts (getters)
    case 'get-project-alerts': {
      const take = Number(formData.get('take') || '25')
      const skip = Number(formData.get('skip') || '0')

      const result = await serverFetch(
        request,
        `alert/project/${projectId}?take=${take}&skip=${skip}`,
        {
          method: 'GET',
        },
      )

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'get-alert': {
      const alertId = formData.get('alertId')?.toString()

      const result = await serverFetch(request, `alert/${alertId}`, {
        method: 'GET',
      })

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    // Filters
    case 'get-filters': {
      const filterType = formData.get('type')?.toString() || ''
      const password = formData.get('password')?.toString() || ''

      const result = await serverFetch(
        request,
        `log/filters?pid=${projectId}&type=${filterType}`,
        {
          method: 'GET',
          headers: password ? { 'x-password': password } : undefined,
        },
      )

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'get-errors-filters': {
      const filterType = formData.get('type')?.toString() || ''
      const password = formData.get('password')?.toString() || ''

      const result = await serverFetch(
        request,
        `log/errors-filters?pid=${projectId}&type=${filterType}`,
        {
          method: 'GET',
          headers: password ? { 'x-password': password } : undefined,
        },
      )

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'get-version-filters': {
      const dataType = formData.get('dataType')?.toString() || 'traffic'
      const column = formData.get('column')?.toString() || 'br'
      const password = formData.get('password')?.toString() || ''

      const result = await serverFetch(
        request,
        `log/filters/versions?pid=${projectId}&type=${dataType}&column=${column}`,
        {
          method: 'GET',
          headers: password ? { 'x-password': password } : undefined,
        },
      )

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    // Error status update
    case 'update-error-status': {
      const eid = formData.get('eid')?.toString()
      const eids = formData.get('eids')
        ? JSON.parse(formData.get('eids')!.toString())
        : undefined
      const status = formData.get('status')?.toString() || 'active'

      const result = await serverFetch(request, 'log/error-status', {
        method: 'PATCH',
        body: { pid: projectId, eid, eids, status },
      })

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    // Project data
    case 'get-project': {
      const password = formData.get('password')?.toString() || ''

      const result = await serverFetch(request, `project/${projectId}`, {
        method: 'GET',
        headers: password ? { 'x-password': password } : undefined,
      })

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: result.status },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'check-password': {
      const password = formData.get('password')?.toString() || ''

      const result = await serverFetch<boolean>(
        request,
        `project/password/${projectId}`,
        {
          method: 'GET',
          headers: { 'x-password': password },
        },
      )

      if (result.error) {
        return data<ProjectViewActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    default:
      return data<ProjectViewActionData>(
        { error: 'Unknown action' },
        { status: 400 },
      )
  }
}

export default function Index() {
  const { id } = useRequiredParams<{ id: string }>()

  return (
    <CurrentProjectProvider id={id}>
      <ViewProject />
    </CurrentProjectProvider>
  )
}

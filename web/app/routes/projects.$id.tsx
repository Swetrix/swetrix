import _split from 'lodash/split'
import { type ActionFunctionArgs, type LinksFunction, type LoaderFunctionArgs, type MetaFunction } from 'react-router'
import { data } from 'react-router'

import { serverFetch } from '~/api/api.server'
import { useRequiredParams } from '~/hooks/useRequiredParams'
import { API_URL, MAIN_URL } from '~/lib/constants'
import ViewProject from '~/pages/Project/View'
import { CurrentProjectProvider } from '~/providers/CurrentProjectProvider'
import ProjectViewStyle from '~/styles/ProjectViewStyle.css?url'
import { redirectIfNotAuthenticated, createHeadersWithCookies } from '~/utils/session.server'

export const links: LinksFunction = () => [{ rel: 'stylesheet', href: ProjectViewStyle }]

export const meta: MetaFunction = ({ location }) => {
  const { pathname } = location
  const pid = _split(pathname, '/')[2]
  const previewURL = `${API_URL}project/ogimage/${pid}`
  const canonicalURL = `${MAIN_URL}/projects/${pid}`

  return [
    { property: 'og:image', content: previewURL },
    { property: 'twitter:image', content: previewURL },
    { tagName: 'link', rel: 'canonical', href: canonicalURL },
  ]
}

export async function loader({ request }: LoaderFunctionArgs) {
  redirectIfNotAuthenticated(request)
  return null
}

export interface ProjectViewActionData {
  success?: boolean
  intent?: string
  error?: string
  data?: unknown
}

export async function action({ request, params }: ActionFunctionArgs) {
  redirectIfNotAuthenticated(request)

  const { id: projectId } = params
  const formData = await request.formData()
  const intent = formData.get('intent')?.toString()

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
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
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
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
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
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
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
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
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
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'delete-funnel': {
      const funnelId = formData.get('funnelId')?.toString()

      const result = await serverFetch(request, `project/funnel/${funnelId}/${projectId}`, {
        method: 'DELETE',
      })

      if (result.error) {
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<ProjectViewActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    // Alerts
    case 'create-alert': {
      const name = formData.get('name')?.toString() || ''
      const queryMetric = formData.get('queryMetric')?.toString() || 'page_views'
      const queryCondition = formData.get('queryCondition')?.toString() || 'greater_than'
      const queryValue = Number(formData.get('queryValue')?.toString() || '0')
      const queryTime = Number(formData.get('queryTime')?.toString() || '1')

      const result = await serverFetch(request, 'alert', {
        method: 'POST',
        body: { pid: projectId, name, queryMetric, queryCondition, queryValue, queryTime, active: true },
      })

      if (result.error) {
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'update-alert': {
      const alertId = formData.get('alertId')?.toString()
      const name = formData.get('name')?.toString()
      const active = formData.get('active') === 'true'
      const queryMetric = formData.get('queryMetric')?.toString()
      const queryCondition = formData.get('queryCondition')?.toString()
      const queryValue = formData.get('queryValue') ? Number(formData.get('queryValue')) : undefined
      const queryTime = formData.get('queryTime') ? Number(formData.get('queryTime')) : undefined

      const body: Record<string, unknown> = {}
      if (name !== undefined) body.name = name
      body.active = active
      if (queryMetric !== undefined) body.queryMetric = queryMetric
      if (queryCondition !== undefined) body.queryCondition = queryCondition
      if (queryValue !== undefined) body.queryValue = queryValue
      if (queryTime !== undefined) body.queryTime = queryTime

      const result = await serverFetch(request, `alert/${alertId}`, {
        method: 'PUT',
        body,
      })

      if (result.error) {
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
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
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<ProjectViewActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    // Annotations
    case 'get-annotations': {
      const password = formData.get('password')?.toString() || ''

      const result = await serverFetch(request, `project/annotations/${projectId}`, {
        method: 'GET',
        headers: password ? { 'x-password': password } : undefined,
      })

      if (result.error) {
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
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
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
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
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'delete-annotation': {
      const annotationId = formData.get('annotationId')?.toString()

      const result = await serverFetch(request, `project/annotation/${annotationId}/${projectId}`, {
        method: 'DELETE',
      })

      if (result.error) {
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
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
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
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
      const customEvents = JSON.parse(formData.get('customEvents')?.toString() || '[]')

      const result = await serverFetch(request, `project/${projectId}/views`, {
        method: 'POST',
        body: { name, type, filters, customEvents },
      })

      if (result.error) {
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
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
      const customEvents = JSON.parse(formData.get('customEvents')?.toString() || '[]')

      const result = await serverFetch(request, `project/${projectId}/views/${viewId}`, {
        method: 'PATCH',
        body: { name, filters, customEvents },
      })

      if (result.error) {
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'delete-project-view': {
      const viewId = formData.get('viewId')?.toString()

      const result = await serverFetch(request, `project/${projectId}/views/${viewId}`, {
        method: 'DELETE',
      })

      if (result.error) {
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<ProjectViewActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    // AI Chat
    case 'get-recent-ai-chats': {
      const limit = Number(formData.get('limit') || '5')

      const result = await serverFetch(request, `ai/${projectId}/chats?limit=${limit}`, {
        method: 'GET',
      })

      if (result.error) {
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'get-all-ai-chats': {
      const skip = Number(formData.get('skip') || '0')
      const take = Number(formData.get('take') || '20')

      const result = await serverFetch(request, `ai/${projectId}/chats/all?skip=${skip}&take=${take}`, {
        method: 'GET',
      })

      if (result.error) {
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'get-ai-chat': {
      const chatId = formData.get('chatId')?.toString()

      const result = await serverFetch(request, `ai/${projectId}/chats/${chatId}`, {
        method: 'GET',
      })

      if (result.error) {
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
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
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'update-ai-chat': {
      const chatId = formData.get('chatId')?.toString()
      const messages = formData.get('messages') ? JSON.parse(formData.get('messages')!.toString()) : undefined
      const name = formData.get('name')?.toString()

      const body: Record<string, unknown> = {}
      if (messages) body.messages = messages
      if (name !== undefined) body.name = name

      const result = await serverFetch(request, `ai/${projectId}/chats/${chatId}`, {
        method: 'POST',
        body,
      })

      if (result.error) {
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'delete-ai-chat': {
      const chatId = formData.get('chatId')?.toString()

      const result = await serverFetch(request, `ai/${projectId}/chats/${chatId}`, {
        method: 'DELETE',
      })

      if (result.error) {
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
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

      const params = new URLSearchParams({ take: String(take), skip: String(skip) })
      if (search) params.append('search', search)

      const result = await serverFetch(request, `feature-flag/project/${projectId}?${params.toString()}`, {
        method: 'GET',
      })

      if (result.error) {
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
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
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
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
      const rolloutPercentage = Number(formData.get('rolloutPercentage') || '100')
      const targetingRules = JSON.parse(formData.get('targetingRules')?.toString() || '[]')
      const enabled = formData.get('enabled') === 'true'

      const result = await serverFetch(request, 'feature-flag', {
        method: 'POST',
        body: { pid: projectId, key, description, flagType, rolloutPercentage, targetingRules, enabled },
      })

      if (result.error) {
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
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
      const enabled = formData.has('enabled') ? formData.get('enabled') === 'true' : undefined

      const body: Record<string, unknown> = {}
      if (key !== undefined) body.key = key
      if (description !== undefined) body.description = description
      if (flagType !== undefined) body.flagType = flagType
      if (rolloutPercentage !== undefined) body.rolloutPercentage = rolloutPercentage
      if (targetingRules !== undefined) body.targetingRules = targetingRules
      if (enabled !== undefined) body.enabled = enabled

      const result = await serverFetch(request, `feature-flag/${flagId}`, {
        method: 'PUT',
        body,
      })

      if (result.error) {
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
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
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
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

      const result = await serverFetch(request, `feature-flag/${flagId}/stats?${params.toString()}`, {
        method: 'GET',
      })

      if (result.error) {
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
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

      const params = new URLSearchParams({ period, take: String(take), skip: String(skip) })
      if (fromDate) params.append('from', fromDate)
      if (toDate) params.append('to', toDate)
      if (tz) params.append('timezone', tz)
      if (resultFilter && resultFilter !== 'all') params.append('result', resultFilter)

      const result = await serverFetch(request, `feature-flag/${flagId}/profiles?${params.toString()}`, {
        method: 'GET',
      })

      if (result.error) {
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      const profilesData = result.data as { profiles: unknown[]; total: number }
      return data<ProjectViewActionData>(
        { intent, success: true, data: { flagId, profiles: profilesData.profiles, total: profilesData.total } },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    // Experiments
    case 'get-project-experiments': {
      const take = Number(formData.get('take') || '20')
      const skip = Number(formData.get('skip') || '0')
      const search = formData.get('search')?.toString() || ''

      const params = new URLSearchParams({ take: String(take), skip: String(skip) })
      if (search) params.append('search', search)

      const result = await serverFetch(request, `experiment/project/${projectId}?${params.toString()}`, {
        method: 'GET',
      })

      if (result.error) {
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
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
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
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
      const exposureTrigger = formData.get('exposureTrigger')?.toString() || 'feature_flag'
      const customEventName = formData.get('customEventName')?.toString() || ''
      const multipleVariantHandling = formData.get('multipleVariantHandling')?.toString() || 'exclude'
      const filterInternalUsers = formData.get('filterInternalUsers') === 'true'
      const featureFlagMode = formData.get('featureFlagMode')?.toString() || 'create'
      const featureFlagKey = formData.get('featureFlagKey')?.toString() || ''
      const existingFeatureFlagId = formData.get('existingFeatureFlagId')?.toString() || ''
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
      if (multipleVariantHandling) body.multipleVariantHandling = multipleVariantHandling
      body.filterInternalUsers = filterInternalUsers
      if (featureFlagMode) body.featureFlagMode = featureFlagMode
      if (featureFlagKey) body.featureFlagKey = featureFlagKey
      if (existingFeatureFlagId) body.existingFeatureFlagId = existingFeatureFlagId
      if (goalId) body.goalId = goalId

      const result = await serverFetch(request, 'experiment', {
        method: 'POST',
        body,
      })

      if (result.error) {
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
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
      const multipleVariantHandling = formData.get('multipleVariantHandling')?.toString()
      const filterInternalUsers = formData.has('filterInternalUsers')
        ? formData.get('filterInternalUsers') === 'true'
        : undefined
      const featureFlagMode = formData.get('featureFlagMode')?.toString()
      const featureFlagKey = formData.get('featureFlagKey')?.toString()
      const existingFeatureFlagId = formData.get('existingFeatureFlagId')?.toString()
      const goalId = formData.get('goalId')?.toString()
      const variants = formData.get('variants') ? JSON.parse(formData.get('variants')!.toString()) : undefined

      const body: Record<string, unknown> = {}
      if (name !== undefined) body.name = name
      if (description !== undefined) body.description = description
      if (hypothesis !== undefined) body.hypothesis = hypothesis
      if (exposureTrigger !== undefined) body.exposureTrigger = exposureTrigger
      if (customEventName !== undefined) body.customEventName = customEventName
      if (multipleVariantHandling !== undefined) body.multipleVariantHandling = multipleVariantHandling
      if (filterInternalUsers !== undefined) body.filterInternalUsers = filterInternalUsers
      if (featureFlagMode !== undefined) body.featureFlagMode = featureFlagMode
      if (featureFlagKey !== undefined) body.featureFlagKey = featureFlagKey
      if (existingFeatureFlagId !== undefined) body.existingFeatureFlagId = existingFeatureFlagId
      if (goalId !== undefined) body.goalId = goalId
      if (variants !== undefined) body.variants = variants

      const result = await serverFetch(request, `experiment/${experimentId}`, {
        method: 'PUT',
        body,
      })

      if (result.error) {
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
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
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<ProjectViewActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'start-experiment': {
      const experimentId = formData.get('experimentId')?.toString()

      const result = await serverFetch(request, `experiment/${experimentId}/start`, {
        method: 'POST',
      })

      if (result.error) {
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'pause-experiment': {
      const experimentId = formData.get('experimentId')?.toString()

      const result = await serverFetch(request, `experiment/${experimentId}/pause`, {
        method: 'POST',
      })

      if (result.error) {
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'complete-experiment': {
      const experimentId = formData.get('experimentId')?.toString()

      const result = await serverFetch(request, `experiment/${experimentId}/complete`, {
        method: 'POST',
      })

      if (result.error) {
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
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

      const result = await serverFetch(request, `experiment/${experimentId}/results?${params.toString()}`, {
        method: 'GET',
      })

      if (result.error) {
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
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

      const params = new URLSearchParams({ take: String(take), skip: String(skip) })
      if (search) params.append('search', search)

      const result = await serverFetch(request, `goal/project/${projectId}?${params.toString()}`, {
        method: 'GET',
      })

      if (result.error) {
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
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
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
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

      const result = await serverFetch(request, `goal/${goalId}/stats?${params.toString()}`, {
        method: 'GET',
      })

      if (result.error) {
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
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

      const result = await serverFetch(request, `goal/${goalId}/chart?${params.toString()}`, {
        method: 'GET',
      })

      if (result.error) {
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    // Funnels (getters)
    case 'get-funnels': {
      const password = formData.get('password')?.toString() || ''

      const result = await serverFetch(request, `project/funnels/${projectId}`, {
        method: 'GET',
        headers: password ? { 'x-password': password } : undefined,
      })

      if (result.error) {
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
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

      const result = await serverFetch(request, `log/funnel?${params.toString()}`, {
        method: 'GET',
        headers: password ? { 'x-password': password } : undefined,
      })

      if (result.error) {
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
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

      const result = await serverFetch(request, `alert/project/${projectId}?take=${take}&skip=${skip}`, {
        method: 'GET',
      })

      if (result.error) {
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
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
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
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

      const result = await serverFetch(request, `log/filters?pid=${projectId}&type=${filterType}`, {
        method: 'GET',
        headers: password ? { 'x-password': password } : undefined,
      })

      if (result.error) {
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'get-errors-filters': {
      const filterType = formData.get('type')?.toString() || ''
      const password = formData.get('password')?.toString() || ''

      const result = await serverFetch(request, `log/errors-filters?pid=${projectId}&type=${filterType}`, {
        method: 'GET',
        headers: password ? { 'x-password': password } : undefined,
      })

      if (result.error) {
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
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
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    // Error status update
    case 'update-error-status': {
      const eid = formData.get('eid')?.toString()
      const eids = formData.get('eids') ? JSON.parse(formData.get('eids')!.toString()) : undefined
      const status = formData.get('status')?.toString() || 'active'

      const result = await serverFetch(request, 'log/error-status', {
        method: 'PATCH',
        body: { pid: projectId, eid, eids, status },
      })

      if (result.error) {
        return data<ProjectViewActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<ProjectViewActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    default:
      return data<ProjectViewActionData>({ error: 'Unknown action' }, { status: 400 })
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

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
      const goalType = formData.get('goalType')?.toString() || 'custom'
      const goalValue = formData.get('goalValue')?.toString() || ''

      const result = await serverFetch(request, 'goal', {
        method: 'POST',
        body: { pid: projectId, name, goalType, goalValue },
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
      const goalValue = formData.get('goalValue')?.toString()

      const result = await serverFetch(request, `goal/${goalId}`, {
        method: 'PUT',
        body: { name, goalValue },
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

import { type ActionFunctionArgs, type LoaderFunctionArgs, data } from 'react-router'

import {
  getSessionsServer,
  getErrorsServer,
  type AnalyticsParams,
  type SessionsResponse,
  type ErrorsResponse,
} from '~/api/api.server'
import { getProjectPasswordCookie } from '~/utils/session.server'

interface ProxyRequest {
  action: 'getSessions' | 'getErrors'
  projectId: string
  params: {
    timeBucket: string
    period: string
    from?: string
    to?: string
    timezone: string
    filters?: AnalyticsParams['filters']
    take?: number
    skip?: number
    options?: Record<string, unknown>
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
    timeBucket: params.timeBucket,
    period: params.period,
    from: params.from,
    to: params.to,
    timezone: params.timezone,
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

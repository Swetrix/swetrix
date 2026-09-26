import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  data,
} from 'react-router'

import {
  serverFetch,
  streamingServerFetch,
  type SessionReplayExportResponse,
} from '~/api/api.server'
import { getProjectPasswordCookie } from '~/utils/session.server'

interface ProxyResponse<T> {
  data: T | null
  error: string | null
}

const getErrorMessage = (error: string | string[] | null) =>
  Array.isArray(error) ? error.join(', ') : error

const getCookieHeaders = (cookies: string[]) => {
  const headers = new Headers()
  cookies.forEach((cookie) => headers.append('Set-Cookie', cookie))
  return headers
}

export async function action({ request }: ActionFunctionArgs) {
  let body: {
    projectId?: string
    psid?: string
    replayId?: string
  }

  try {
    body = (await request.json()) as typeof body
  } catch {
    return data<ProxyResponse<SessionReplayExportResponse>>(
      { data: null, error: 'Invalid JSON body' },
      { status: 400 },
    )
  }

  if (!body.projectId || !body.psid) {
    return data<ProxyResponse<SessionReplayExportResponse>>(
      { data: null, error: 'projectId and psid are required' },
      { status: 400 },
    )
  }

  // Prefer the header: cookies are not sent in cross-site iframe embeds
  const password =
    request.headers.get('x-password') ||
    getProjectPasswordCookie(request, body.projectId)
  const headers: Record<string, string> = {}
  if (password) headers['x-password'] = password

  const result = await serverFetch<SessionReplayExportResponse>(
    request,
    'log/session-replay/export',
    {
      method: 'POST',
      body: {
        pid: body.projectId,
        psid: body.psid,
        replayId: body.replayId,
      },
      headers,
      timeoutMs: 30000,
    },
  )

  return data<ProxyResponse<SessionReplayExportResponse>>(
    {
      data: result.data,
      error: getErrorMessage(result.error),
    },
    {
      status: result.status,
      headers: getCookieHeaders(result.cookies),
    },
  )
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const action = url.searchParams.get('action')
  const projectId = url.searchParams.get('projectId')
  const exportId = url.searchParams.get('exportId')

  if (!projectId || !exportId) {
    return data<ProxyResponse<SessionReplayExportResponse>>(
      { data: null, error: 'projectId and exportId are required' },
      { status: 400 },
    )
  }

  const password =
    request.headers.get('x-password') ||
    getProjectPasswordCookie(request, projectId)
  const headers: Record<string, string> = {}
  if (password) headers['x-password'] = password

  if (action === 'download') {
    const response = await streamingServerFetch(
      request,
      `log/session-replay/export/${encodeURIComponent(exportId)}/download`,
      { headers },
    )

    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    })
  }

  const result = await serverFetch<SessionReplayExportResponse>(
    request,
    `log/session-replay/export/${encodeURIComponent(exportId)}`,
    {
      headers,
      timeoutMs: 30000,
    },
  )

  return data<ProxyResponse<SessionReplayExportResponse>>(
    {
      data: result.data,
      error: getErrorMessage(result.error),
    },
    {
      status: result.status,
      headers: getCookieHeaders(result.cookies),
    },
  )
}

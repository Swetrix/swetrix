import {
  data,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from 'react-router'
import { serverFetch } from '~/api/api.server'
import {
  createHeadersWithCookies,
  redirectIfNotAuthenticated,
} from '~/utils/session.server'

const respond = (result: Awaited<ReturnType<typeof serverFetch>>) => {
  const headers = createHeadersWithCookies(result.cookies)
  headers.set('Cache-Control', 'no-store')
  return data(result.error ? { error: result.error } : result.data, {
    status: result.status,
    headers,
  })
}

export async function loader({ request }: LoaderFunctionArgs) {
  redirectIfNotAuthenticated(request)
  const projectId = new URL(request.url).searchParams.get('projectId')
  return respond(
    await serverFetch(
      request,
      `user/api-keys${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`,
    ),
  )
}

export async function action({ request }: ActionFunctionArgs) {
  redirectIfNotAuthenticated(request)
  const origin = request.headers.get('origin')
  if (
    request.headers.get('sec-fetch-site') === 'cross-site' ||
    (origin && origin !== new URL(request.url).origin) ||
    !request.headers.get('content-type')?.startsWith('application/json')
  ) {
    return data(
      { error: 'Invalid request origin or content type' },
      { status: 403 },
    )
  }
  let body
  try {
    body = await request.json()
  } catch {
    return data({ error: 'Invalid request' }, { status: 400 })
  }
  const { operation, id, input } = body || {}
  if (
    !['create', 'update', 'reveal', 'rotate', 'delete'].includes(operation) ||
    (operation !== 'create' &&
      (typeof id !== 'string' || !/^(legacy|[0-9a-f-]{36})$/.test(id)))
  ) {
    return data({ error: 'Invalid request' }, { status: 400 })
  }
  const path =
    operation === 'create'
      ? ''
      : `/${id}${['reveal', 'rotate'].includes(operation) ? `/${operation}` : ''}`
  return respond(
    await serverFetch(request, `user/api-keys${path}`, {
      method:
        operation === 'delete'
          ? 'DELETE'
          : operation === 'update'
            ? 'PATCH'
            : 'POST',
      body: ['create', 'update'].includes(operation) ? input : undefined,
    }),
  )
}

import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  data,
} from 'react-router'

import { serverFetch } from '~/api/api.server'

function toResponse(result: Awaited<ReturnType<typeof serverFetch>>) {
  if (result.error) {
    return data({ error: result.error }, { status: result.status })
  }

  return data(result.data, {
    headers: result.cookies.length
      ? { 'Set-Cookie': result.cookies.join(', ') }
      : undefined,
  })
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const endpoint = url.searchParams.get('endpoint')

  if (!endpoint) {
    return data({ error: 'endpoint param is required' }, { status: 400 })
  }

  return toResponse(await serverFetch(request, endpoint))
}

export async function action({ request }: ActionFunctionArgs) {
  const url = new URL(request.url)
  const endpoint = url.searchParams.get('endpoint')

  if (!endpoint) {
    return data({ error: 'endpoint param is required' }, { status: 400 })
  }

  if (request.method === 'DELETE') {
    return toResponse(
      await serverFetch(request, endpoint, { method: 'DELETE' }),
    )
  }

  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()

    const proxyForm = new FormData()
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        proxyForm.append(key, value, value.name)
      } else {
        proxyForm.append(key, value)
      }
    }

    return toResponse(
      await serverFetch(request, endpoint, { method: 'POST', body: proxyForm }),
    )
  }

  return data({ error: 'Unsupported content type' }, { status: 400 })
}

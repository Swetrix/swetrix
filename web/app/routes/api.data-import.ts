import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  data,
} from 'react-router'

import { serverFetch } from '~/api/api.server'
import { createHeadersWithCookies } from '~/utils/session.server'

function validateEndpoint(raw: string | null): string | null {
  if (!raw) return null

  const trimmed = raw.replace(/^\/+/, '')

  if (
    trimmed !== 'data-import' &&
    !trimmed.startsWith('data-import/')
  ) {
    return null
  }

  if (trimmed.includes('..')) return null

  if (/^[a-z]+:\/\//i.test(trimmed)) return null

  return trimmed
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const raw = url.searchParams.get('endpoint')

  if (!raw) {
    return data({ error: 'endpoint param is required' }, { status: 400 })
  }

  const endpoint = validateEndpoint(raw)

  if (!endpoint) {
    return data({ error: 'Invalid endpoint' }, { status: 400 })
  }

  const result = await serverFetch(request, endpoint)

  if (result.error) {
    return data(
      { error: result.error },
      { status: result.status, headers: createHeadersWithCookies(result.cookies) },
    )
  }

  return data(result.data, {
    headers: createHeadersWithCookies(result.cookies),
  })
}

export async function action({ request }: ActionFunctionArgs) {
  const url = new URL(request.url)
  const raw = url.searchParams.get('endpoint')

  if (!raw) {
    return data({ error: 'endpoint param is required' }, { status: 400 })
  }

  const endpoint = validateEndpoint(raw)

  if (!endpoint) {
    return data({ error: 'Invalid endpoint' }, { status: 400 })
  }

  if (request.method === 'DELETE') {
    const result = await serverFetch(request, endpoint, { method: 'DELETE' })

    if (result.error) {
      return data(
        { error: result.error },
        { status: result.status, headers: createHeadersWithCookies(result.cookies) },
      )
    }

    return data(result.data, {
      headers: createHeadersWithCookies(result.cookies),
    })
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

    const result = await serverFetch(request, endpoint, {
      method: 'POST',
      body: proxyForm,
    })

    if (result.error) {
      return data(
        { error: result.error },
        { status: result.status, headers: createHeadersWithCookies(result.cookies) },
      )
    }

    return data(result.data, {
      headers: createHeadersWithCookies(result.cookies),
    })
  }

  return data({ error: 'Unsupported content type' }, { status: 400 })
}

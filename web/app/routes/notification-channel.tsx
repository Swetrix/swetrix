import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { data } from 'react-router'

import { serverFetch } from '~/api/api.server'
import type { NotificationChannel } from '~/lib/models/NotificationChannel'
import {
  createHeadersWithCookies,
  redirectIfNotAuthenticated,
} from '~/utils/session.server'

export interface NotificationChannelActionData {
  success?: boolean
  intent?: string
  error?: string
  data?: unknown
  channel?: NotificationChannel
  channels?: NotificationChannel[]
  publicKey?: string | null
}

export async function loader({ request }: LoaderFunctionArgs) {
  redirectIfNotAuthenticated(request)

  const url = new URL(request.url)
  const projectId = url.searchParams.get('projectId') || ''
  const organisationId = url.searchParams.get('organisationId') || ''
  const scope = url.searchParams.get('scope') || ''

  const params = new URLSearchParams()
  if (projectId) params.set('projectId', projectId)
  if (organisationId) params.set('organisationId', organisationId)
  if (scope) params.set('scope', scope)

  const qs = params.toString()
  const result = await serverFetch<NotificationChannel[]>(
    request,
    `notification-channel${qs ? `?${qs}` : ''}`,
  )

  if (result.error) {
    return data<NotificationChannelActionData>(
      { error: result.error as string, channels: [] },
      {
        status: result.status,
        headers: createHeadersWithCookies(result.cookies),
      },
    )
  }

  return data<NotificationChannelActionData>(
    { channels: result.data || [] },
    { headers: createHeadersWithCookies(result.cookies) },
  )
}

function parseConfig(raw: FormDataEntryValue | null): Record<string, unknown> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw.toString())
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

export async function action({ request }: ActionFunctionArgs) {
  redirectIfNotAuthenticated(request)

  const formData = await request.formData()
  const intent = formData.get('intent')?.toString()

  switch (intent) {
    case 'list-channels': {
      const projectId = formData.get('projectId')?.toString() || ''
      const organisationId = formData.get('organisationId')?.toString() || ''
      const scope = formData.get('scope')?.toString() || ''

      const params = new URLSearchParams()
      if (projectId) params.set('projectId', projectId)
      if (organisationId) params.set('organisationId', organisationId)
      if (scope) params.set('scope', scope)

      const qs = params.toString()
      const result = await serverFetch<NotificationChannel[]>(
        request,
        `notification-channel${qs ? `?${qs}` : ''}`,
      )

      if (result.error) {
        return data<NotificationChannelActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<NotificationChannelActionData>(
        { intent, success: true, channels: result.data || [] },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'create-channel': {
      const name = formData.get('name')?.toString() || ''
      const type = formData.get('type')?.toString() || 'email'
      const config = parseConfig(formData.get('config'))
      const projectId = formData.get('projectId')?.toString()
      const organisationId = formData.get('organisationId')?.toString()
      const userScoped = formData.get('userScoped')?.toString() === 'true'

      const body: Record<string, unknown> = { name, type, config }
      if (projectId) body.projectId = projectId
      if (organisationId) body.organisationId = organisationId
      if (userScoped) body.userScoped = true

      const result = await serverFetch<NotificationChannel>(
        request,
        'notification-channel',
        { method: 'POST', body },
      )

      if (result.error) {
        return data<NotificationChannelActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<NotificationChannelActionData>(
        { intent, success: true, channel: result.data || undefined },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'update-channel': {
      const channelId = formData.get('channelId')?.toString()
      const name = formData.get('name')?.toString()
      const config = formData.has('config')
        ? parseConfig(formData.get('config'))
        : undefined

      const body: Record<string, unknown> = {}
      if (name !== undefined) body.name = name
      if (config !== undefined) body.config = config

      const result = await serverFetch<NotificationChannel>(
        request,
        `notification-channel/${channelId}`,
        { method: 'PATCH', body },
      )

      if (result.error) {
        return data<NotificationChannelActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<NotificationChannelActionData>(
        { intent, success: true, channel: result.data || undefined },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'delete-channel': {
      const channelId = formData.get('channelId')?.toString()

      const result = await serverFetch(
        request,
        `notification-channel/${channelId}`,
        { method: 'DELETE' },
      )

      if (result.error) {
        return data<NotificationChannelActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<NotificationChannelActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'verify-channel': {
      const channelId = formData.get('channelId')?.toString()

      const result = await serverFetch(
        request,
        `notification-channel/${channelId}/verify`,
        { method: 'POST' },
      )

      if (result.error) {
        return data<NotificationChannelActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<NotificationChannelActionData>(
        { intent, success: true, data: result.data },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'test-channel': {
      const channelId = formData.get('channelId')?.toString()

      const result = await serverFetch(
        request,
        `notification-channel/${channelId}/test`,
        { method: 'POST' },
      )

      if (result.error) {
        return data<NotificationChannelActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<NotificationChannelActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'webpush-public-key': {
      const result = await serverFetch<{ publicKey: string | null }>(
        request,
        'notification-channel/webpush/public-key',
      )

      if (result.error) {
        return data<NotificationChannelActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<NotificationChannelActionData>(
        { intent, success: true, publicKey: result.data?.publicKey ?? null },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'webpush-subscribe': {
      const name = formData.get('name')?.toString() || 'Browser'
      const endpoint = formData.get('endpoint')?.toString() || ''
      const keysRaw = formData.get('keys')?.toString() || '{}'
      const userAgent = formData.get('userAgent')?.toString() || ''

      let keys: { p256dh: string; auth: string }
      try {
        keys = JSON.parse(keysRaw)
      } catch {
        return data<NotificationChannelActionData>(
          { intent, error: 'Malformed keys payload' },
          { status: 400 },
        )
      }

      const result = await serverFetch<NotificationChannel>(
        request,
        'notification-channel/webpush/subscribe',
        {
          method: 'POST',
          body: { name, endpoint, keys, userAgent },
        },
      )

      if (result.error) {
        return data<NotificationChannelActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<NotificationChannelActionData>(
        { intent, success: true, channel: result.data || undefined },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    default:
      return data<NotificationChannelActionData>(
        { error: 'Unknown action' },
        { status: 400 },
      )
  }
}

export default function NotificationChannelResource() {
  return null
}

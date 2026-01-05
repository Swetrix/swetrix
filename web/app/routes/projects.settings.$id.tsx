import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { data } from 'react-router'

import { serverFetch } from '~/api/api.server'
import { Project } from '~/lib/models/Project'
import { Subscriber } from '~/lib/models/Subscriber'
import ProjectSettings from '~/pages/Project/Settings'
import { redirectIfNotAuthenticated, createHeadersWithCookies } from '~/utils/session.server'

export async function loader({ request }: LoaderFunctionArgs) {
  redirectIfNotAuthenticated(request)
  return { requestOrigin: request.headers.get('origin') }
}

export interface ProjectSettingsActionData {
  success?: boolean
  intent?: string
  error?: string
  fieldErrors?: {
    name?: string
    origins?: string
    ipBlacklist?: string
    password?: string
    transferEmail?: string
  }
  project?: Project
  subscriber?: Subscriber
  subscribers?: Subscriber[]
  subscribersCount?: number
}

export async function action({ request, params }: ActionFunctionArgs) {
  redirectIfNotAuthenticated(request)

  const { id } = params
  const formData = await request.formData()
  const intent = formData.get('intent')?.toString()

  switch (intent) {
    case 'update-project': {
      const name = formData.get('name')?.toString()
      const isPublic = formData.get('public') === 'true'
      const isPasswordProtected = formData.get('isPasswordProtected') === 'true'
      const password = formData.get('password')?.toString()
      const origins = formData.get('origins')?.toString()
      const ipBlacklist = formData.get('ipBlacklist')?.toString()
      const botsProtectionLevel = formData.get('botsProtectionLevel')?.toString()
      const countryBlacklist = formData.get('countryBlacklist')?.toString()
      const websiteUrl = formData.get('websiteUrl')?.toString()
      const captchaDifficulty = formData.get('captchaDifficulty')?.toString()

      const fieldErrors: ProjectSettingsActionData['fieldErrors'] = {}

      if (name && name.length > 50) {
        fieldErrors.name = 'Project name must be 50 characters or less'
      }

      if (fieldErrors.name) {
        return data<ProjectSettingsActionData>({ intent, fieldErrors }, { status: 400 })
      }

      const updateData: Record<string, unknown> = {}
      if (name !== undefined) updateData.name = name
      updateData.public = isPublic
      updateData.isPasswordProtected = isPasswordProtected
      if (password !== undefined) updateData.password = password
      if (origins !== undefined) updateData.origins = origins ? origins.split(',').map((o) => o.trim()) : null
      if (ipBlacklist !== undefined)
        updateData.ipBlacklist = ipBlacklist ? ipBlacklist.split(',').map((ip) => ip.trim()) : null
      if (botsProtectionLevel !== undefined) updateData.botsProtectionLevel = botsProtectionLevel
      if (countryBlacklist !== undefined)
        updateData.countryBlacklist = countryBlacklist ? JSON.parse(countryBlacklist) : []
      if (websiteUrl !== undefined) updateData.websiteUrl = websiteUrl || null
      if (captchaDifficulty !== undefined) updateData.captchaDifficulty = Number(captchaDifficulty)

      const result = await serverFetch<Project>(request, `project/${id}`, {
        method: 'PUT',
        body: updateData,
      })

      if (result.error) {
        return data<ProjectSettingsActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<ProjectSettingsActionData>(
        { intent, success: true, project: result.data as Project },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'delete-project': {
      const result = await serverFetch(request, `project/${id}`, {
        method: 'DELETE',
      })

      if (result.error) {
        return data<ProjectSettingsActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<ProjectSettingsActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'reset-project': {
      const result = await serverFetch(request, `project/reset/${id}`, {
        method: 'DELETE',
      })

      if (result.error) {
        return data<ProjectSettingsActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<ProjectSettingsActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'delete-partially': {
      const from = formData.get('from')?.toString()
      const to = formData.get('to')?.toString()

      const result = await serverFetch(request, `project/partially/${id}`, {
        method: 'DELETE',
        body: { from, to },
      })

      if (result.error) {
        return data<ProjectSettingsActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<ProjectSettingsActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'reset-filters': {
      const type = formData.get('type')?.toString()
      const value = formData.get('value')?.toString()

      const result = await serverFetch(request, `project/reset-filters/${id}`, {
        method: 'DELETE',
        body: { type, value },
      })

      if (result.error) {
        return data<ProjectSettingsActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<ProjectSettingsActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'transfer-project': {
      const email = formData.get('email')?.toString() || ''

      if (!email || !email.includes('@')) {
        return data<ProjectSettingsActionData>(
          { intent, fieldErrors: { transferEmail: 'Please enter a valid email address' } },
          { status: 400 },
        )
      }

      const result = await serverFetch(request, 'project/transfer', {
        method: 'POST',
        body: { projectId: id, email },
      })

      if (result.error) {
        return data<ProjectSettingsActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<ProjectSettingsActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'assign-organisation': {
      const organisationId = formData.get('organisationId')?.toString()

      const result = await serverFetch(request, `project/${id}/organisation`, {
        method: 'PATCH',
        body: { organisationId: organisationId || null },
      })

      if (result.error) {
        return data<ProjectSettingsActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<ProjectSettingsActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'regenerate-captcha-key': {
      const result = await serverFetch<{ captchaSecretKey: string }>(request, `project/secret-gen/${id}`, {
        method: 'POST',
      })

      if (result.error) {
        return data<ProjectSettingsActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<ProjectSettingsActionData>(
        { intent, success: true, project: { captchaSecretKey: result.data?.captchaSecretKey } as Project },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'get-subscribers': {
      const offset = Number(formData.get('offset') || 0)
      const limit = Number(formData.get('limit') || 10)

      const result = await serverFetch<{ subscribers: Subscriber[]; count: number }>(
        request,
        `project/${id}/subscribers?offset=${offset}&limit=${limit}`,
      )

      if (result.error) {
        return data<ProjectSettingsActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<ProjectSettingsActionData>(
        { intent, success: true, subscribers: result.data?.subscribers, subscribersCount: result.data?.count },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'add-subscriber': {
      const email = formData.get('email')?.toString()
      const reportFrequency = formData.get('reportFrequency')?.toString()

      if (!email) {
        return data<ProjectSettingsActionData>({ intent, error: 'Email is required' }, { status: 400 })
      }

      const result = await serverFetch<Subscriber>(request, `project/${id}/subscribers`, {
        method: 'POST',
        body: { email, reportFrequency },
      })

      if (result.error) {
        return data<ProjectSettingsActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<ProjectSettingsActionData>(
        { intent, success: true, subscriber: result.data as Subscriber },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'update-subscriber': {
      const subscriberId = formData.get('subscriberId')?.toString()
      const reportFrequency = formData.get('reportFrequency')?.toString()

      if (!subscriberId) {
        return data<ProjectSettingsActionData>({ intent, error: 'Subscriber ID is required' }, { status: 400 })
      }

      const result = await serverFetch<Subscriber>(request, `project/${id}/subscribers/${subscriberId}`, {
        method: 'PUT',
        body: { reportFrequency },
      })

      if (result.error) {
        return data<ProjectSettingsActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<ProjectSettingsActionData>(
        { intent, success: true, subscriber: result.data as Subscriber },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'remove-subscriber': {
      const subscriberId = formData.get('subscriberId')?.toString()

      if (!subscriberId) {
        return data<ProjectSettingsActionData>({ intent, error: 'Subscriber ID is required' }, { status: 400 })
      }

      const result = await serverFetch(request, `project/${id}/subscribers/${subscriberId}`, {
        method: 'DELETE',
      })

      if (result.error) {
        return data<ProjectSettingsActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<ProjectSettingsActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    default:
      return data<ProjectSettingsActionData>({ error: 'Unknown action' }, { status: 400 })
  }
}

export default function Index() {
  return <ProjectSettings />
}

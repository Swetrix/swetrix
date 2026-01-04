import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { data, redirect } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { serverFetch } from '~/api/api.server'
import { isSelfhosted } from '~/lib/constants'
import { DetailedOrganisation } from '~/lib/models/Organisation'
import OrganisationSettings from '~/pages/Organisations/Settings'
import { redirectIfNotAuthenticated, createHeadersWithCookies } from '~/utils/session.server'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export interface OrganisationLoaderData {
  organisation: DetailedOrganisation | null
  error?: string
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  redirectIfNotAuthenticated(request)

  const { id } = params

  const result = await serverFetch<DetailedOrganisation>(request, `organisation/${id}`)

  if (result.error) {
    return data<OrganisationLoaderData>(
      { organisation: null, error: result.error as string },
      { status: result.status, headers: createHeadersWithCookies(result.cookies) },
    )
  }

  return data<OrganisationLoaderData>(
    { organisation: result.data },
    { headers: createHeadersWithCookies(result.cookies) },
  )
}

export interface OrganisationSettingsActionData {
  success?: boolean
  intent?: string
  error?: string
  fieldErrors?: {
    name?: string
    email?: string
  }
  organisation?: DetailedOrganisation
}

export async function action({ request, params }: ActionFunctionArgs) {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  redirectIfNotAuthenticated(request)

  const { id } = params
  const formData = await request.formData()
  const intent = formData.get('intent')?.toString()

  switch (intent) {
    case 'update-organisation': {
      const name = formData.get('name')?.toString() || ''

      if (!name.trim()) {
        return data<OrganisationSettingsActionData>(
          { intent, fieldErrors: { name: 'Organisation name is required' } },
          { status: 400 },
        )
      }

      if (name.length > 50) {
        return data<OrganisationSettingsActionData>(
          { intent, fieldErrors: { name: 'Organisation name must be 50 characters or less' } },
          { status: 400 },
        )
      }

      const result = await serverFetch<DetailedOrganisation>(request, `organisation/${id}`, {
        method: 'PATCH',
        body: { name: name.trim() },
      })

      if (result.error) {
        return data<OrganisationSettingsActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<OrganisationSettingsActionData>(
        { intent, success: true, organisation: result.data as DetailedOrganisation },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'delete-organisation': {
      const result = await serverFetch(request, `organisation/${id}`, {
        method: 'DELETE',
      })

      if (result.error) {
        return data<OrganisationSettingsActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<OrganisationSettingsActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'invite-member': {
      const email = formData.get('email')?.toString() || ''
      const role = formData.get('role')?.toString() || 'viewer'

      if (!email || !email.includes('@')) {
        return data<OrganisationSettingsActionData>(
          { intent, fieldErrors: { email: 'Please enter a valid email address' } },
          { status: 400 },
        )
      }

      const result = await serverFetch(request, `organisation/${id}/invite`, {
        method: 'POST',
        body: { email, role },
      })

      if (result.error) {
        return data<OrganisationSettingsActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<OrganisationSettingsActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'remove-member': {
      const memberId = formData.get('memberId')?.toString()

      const result = await serverFetch(request, `organisation/member/${memberId}`, {
        method: 'DELETE',
      })

      if (result.error) {
        return data<OrganisationSettingsActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<OrganisationSettingsActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'update-member-role': {
      const memberId = formData.get('memberId')?.toString()
      const role = formData.get('role')?.toString()

      const result = await serverFetch(request, `organisation/member/${memberId}`, {
        method: 'PATCH',
        body: { role },
      })

      if (result.error) {
        return data<OrganisationSettingsActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<OrganisationSettingsActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'add-project': {
      const projectId = formData.get('projectId')?.toString()

      if (!projectId) {
        return data<OrganisationSettingsActionData>({ intent, error: 'Project ID is required' }, { status: 400 })
      }

      const result = await serverFetch(request, `project/organisation/${id}`, {
        method: 'POST',
        body: { projectId },
      })

      if (result.error) {
        return data<OrganisationSettingsActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<OrganisationSettingsActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'remove-project': {
      const projectId = formData.get('projectId')?.toString()

      if (!projectId) {
        return data<OrganisationSettingsActionData>({ intent, error: 'Project ID is required' }, { status: 400 })
      }

      const result = await serverFetch(request, `project/organisation/${id}/${projectId}`, {
        method: 'DELETE',
      })

      if (result.error) {
        return data<OrganisationSettingsActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<OrganisationSettingsActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    default:
      return data<OrganisationSettingsActionData>({ error: 'Unknown action' }, { status: 400 })
  }
}

export default function Index() {
  return <OrganisationSettings />
}

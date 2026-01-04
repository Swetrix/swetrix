import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { redirect, data } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { serverFetch } from '~/api/api.server'
import { isSelfhosted } from '~/lib/constants'
import { DetailedOrganisation } from '~/lib/models/Organisation'
import Organisations from '~/pages/Organisations'
import { redirectIfNotAuthenticated, createHeadersWithCookies } from '~/utils/session.server'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export async function loader({ request }: LoaderFunctionArgs) {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  redirectIfNotAuthenticated(request)
  return null
}

export interface OrganisationsActionData {
  success?: boolean
  intent?: string
  error?: string
  fieldErrors?: {
    name?: string
  }
  organisation?: DetailedOrganisation
}

export async function action({ request }: ActionFunctionArgs) {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  redirectIfNotAuthenticated(request)

  const formData = await request.formData()
  const intent = formData.get('intent')?.toString()

  switch (intent) {
    case 'create-organisation': {
      const name = formData.get('name')?.toString() || ''

      if (!name.trim()) {
        return data<OrganisationsActionData>(
          { intent, fieldErrors: { name: 'Organisation name is required' } },
          { status: 400 },
        )
      }

      if (name.length > 50) {
        return data<OrganisationsActionData>(
          { intent, fieldErrors: { name: 'Organisation name must be 50 characters or less' } },
          { status: 400 },
        )
      }

      const result = await serverFetch<DetailedOrganisation>(request, 'organisation', {
        method: 'POST',
        body: { name: name.trim() },
      })

      if (result.error) {
        return data<OrganisationsActionData>({ intent, error: result.error as string }, { status: 400 })
      }

      return data<OrganisationsActionData>(
        { intent, success: true, organisation: result.data as DetailedOrganisation },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    default:
      return data<OrganisationsActionData>({ error: 'Unknown action' }, { status: 400 })
  }
}

export default function Index() {
  return <Organisations />
}

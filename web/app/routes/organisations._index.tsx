import { useTranslation } from 'react-i18next'
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from 'react-router'
import { redirect, data } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { serverFetch } from '~/api/api.server'
import { ENTRIES_PER_PAGE_DASHBOARD, isSelfhosted } from '~/lib/constants'
import { DetailedOrganisation } from '~/lib/models/Organisation'
import Organisations from '~/pages/Organisations'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'
import {
  redirectIfNotAuthenticated,
  createHeadersWithCookies,
} from '~/utils/session.server'

export const meta: MetaFunction = () => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { t } = useTranslation('common')

  return [
    ...getTitle(t('titles.organisations')),
    ...getDescription(t('description.default')),
    ...getPreviewImage(),
  ]
}

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

interface OrganisationsResponse {
  results: DetailedOrganisation[]
  total: number
}

export interface OrganisationsLoaderData {
  organisations: DetailedOrganisation[]
  total: number
  page: number
  search: string
  error?: string
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  redirectIfNotAuthenticated(request)

  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const search = url.searchParams.get('search') || ''
  const skip = (page - 1) * ENTRIES_PER_PAGE_DASHBOARD

  const result = await serverFetch<OrganisationsResponse>(
    request,
    `organisation?take=${ENTRIES_PER_PAGE_DASHBOARD}&skip=${skip}&search=${encodeURIComponent(search)}`,
  )

  if (result.error) {
    return data<OrganisationsLoaderData>(
      {
        organisations: [],
        total: 0,
        page,
        search,
        error: result.error as string,
      },
      { status: 400, headers: createHeadersWithCookies(result.cookies) },
    )
  }

  return data<OrganisationsLoaderData>(
    {
      organisations: result.data?.results || [],
      total: result.data?.total || 0,
      page,
      search,
    },
    { headers: createHeadersWithCookies(result.cookies) },
  )
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
          {
            intent,
            fieldErrors: {
              name: 'Organisation name must be 50 characters or less',
            },
          },
          { status: 400 },
        )
      }

      const result = await serverFetch<DetailedOrganisation>(
        request,
        'organisation',
        {
          method: 'POST',
          body: { name: name.trim() },
        },
      )

      if (result.error) {
        return data<OrganisationsActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<OrganisationsActionData>(
        {
          intent,
          success: true,
          organisation: result.data as DetailedOrganisation,
        },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'accept-invitation': {
      const membershipId = formData.get('membershipId')?.toString()

      if (!membershipId) {
        return data<OrganisationsActionData>(
          { intent, error: 'Membership ID is required' },
          { status: 400 },
        )
      }

      const result = await serverFetch(
        request,
        `user/organisation/${membershipId}`,
        {
          method: 'POST',
        },
      )

      if (result.error) {
        return data<OrganisationsActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<OrganisationsActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'reject-invitation': {
      const membershipId = formData.get('membershipId')?.toString()

      if (!membershipId) {
        return data<OrganisationsActionData>(
          { intent, error: 'Membership ID is required' },
          { status: 400 },
        )
      }

      const result = await serverFetch(
        request,
        `user/organisation/${membershipId}`,
        {
          method: 'DELETE',
        },
      )

      if (result.error) {
        return data<OrganisationsActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<OrganisationsActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    default:
      return data<OrganisationsActionData>(
        { error: 'Unknown action' },
        { status: 400 },
      )
  }
}

export default function Index() {
  return <Organisations />
}

import { useTranslation } from 'react-i18next'
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from 'react-router'
import { data, redirect } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { getAuthenticatedUser, serverFetch } from '~/api/api.server'
import { isSelfhosted } from '~/lib/constants'
import { Project } from '~/lib/models/Project'
import Dashboard from '~/pages/Dashboard'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'
import {
  redirectIfNotAuthenticated,
  createHeadersWithCookies,
} from '~/utils/session.server'

export const meta: MetaFunction = () => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { t } = useTranslation('common')

  return [
    ...getTitle(t('titles.dashboard')),
    ...getDescription(t('description.default')),
    ...getPreviewImage(),
  ]
}

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export interface DashboardLoaderData {
  viewMode: 'grid' | 'list'
  projects: {
    results: Project[]
    total: number
    page_total: number
  } | null
}

export interface DashboardActionData {
  success?: boolean
  intent?: string
  error?: string
  fieldErrors?: {
    name?: string
  }
  project?: Project
  isPinned?: boolean
}

export async function action({ request }: ActionFunctionArgs) {
  redirectIfNotAuthenticated(request)

  const formData = await request.formData()
  const intent = formData.get('intent')?.toString()

  switch (intent) {
    case 'create-project': {
      const name = formData.get('name')?.toString() || ''
      const organisationId = formData.get('organisationId')?.toString()

      if (!name.trim()) {
        return data<DashboardActionData>(
          { intent, fieldErrors: { name: 'Project name is required' } },
          { status: 400 },
        )
      }

      if (name.length > 50) {
        return data<DashboardActionData>(
          {
            intent,
            fieldErrors: { name: 'Project name must be 50 characters or less' },
          },
          { status: 400 },
        )
      }

      const body: { name: string; organisationId?: string } = {
        name: name.trim(),
      }
      if (organisationId) body.organisationId = organisationId

      const result = await serverFetch<Project>(request, 'project', {
        method: 'POST',
        body,
      })

      if (result.error) {
        return data<DashboardActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<DashboardActionData>(
        { intent, success: true, project: result.data as Project },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'pin-project': {
      const projectId = formData.get('projectId')?.toString()

      if (!projectId) {
        return data<DashboardActionData>(
          { intent, error: 'Project ID is required' },
          { status: 400 },
        )
      }

      const result = await serverFetch(request, `project/${projectId}/pin`, {
        method: 'POST',
      })

      if (result.error) {
        return data<DashboardActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<DashboardActionData>(
        { intent, success: true, isPinned: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'unpin-project': {
      const projectId = formData.get('projectId')?.toString()

      if (!projectId) {
        return data<DashboardActionData>(
          { intent, error: 'Project ID is required' },
          { status: 400 },
        )
      }

      const result = await serverFetch(request, `project/${projectId}/pin`, {
        method: 'DELETE',
      })

      if (result.error) {
        return data<DashboardActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<DashboardActionData>(
        { intent, success: true, isPinned: false },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    case 'accept-project-share': {
      const shareId = formData.get('shareId')?.toString()

      if (!shareId) {
        return data<DashboardActionData>(
          { intent, error: 'Share ID is required' },
          { status: 400 },
        )
      }

      const result = await serverFetch(request, `user/share/${shareId}`, {
        method: 'GET',
      })

      if (result.error) {
        return data<DashboardActionData>(
          { intent, error: result.error as string },
          { status: 400 },
        )
      }

      return data<DashboardActionData>(
        { intent, success: true },
        { headers: createHeadersWithCookies(result.cookies) },
      )
    }

    default:
      return data<DashboardActionData>(
        { error: 'Unknown action' },
        { status: 400 },
      )
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  redirectIfNotAuthenticated(request)

  const authResult = await getAuthenticatedUser(request)
  const authCookies = authResult?.cookies || []

  const user = authResult?.user?.user
  if (user && !user.hasCompletedOnboarding) {
    if (authCookies.length > 0) {
      return redirect('/onboarding', {
        headers: createHeadersWithCookies(authCookies),
      })
    }
    return redirect('/onboarding')
  }

  // If user is not subscribed (trial or real sub), and they're not past subscription (none tier, but have blocked dashboard), redirect to checkout
  if (
    !isSelfhosted &&
    user?.planCode === 'none' &&
    !user?.dashboardBlockReason
  ) {
    if (authCookies.length > 0) {
      return redirect('/subscribe', {
        headers: createHeadersWithCookies(authCookies),
      })
    }
    return redirect('/subscribe')
  }

  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const pageSize = parseInt(url.searchParams.get('pageSize') || '12', 10)
  const search = url.searchParams.get('search') || ''
  const period = url.searchParams.get('period') || '7d'
  const sort = url.searchParams.get('sort') || 'alpha_asc'

  const skip = (page - 1) * pageSize

  const cookieHeader = request.headers.get('Cookie')
  const viewMode =
    (cookieHeader?.match(/(?<=dashboard_view=)[^;]*/)?.[0] as
      | 'grid'
      | 'list') || 'grid'

  const projectsResult = await serverFetch<{
    results: Project[]
    total: number
    page_total: number
  }>(
    request,
    `/project?take=${pageSize}&skip=${skip}&search=${search}&period=${period}&sort=${sort}`,
  )

  const loaderData: DashboardLoaderData = {
    viewMode,
    projects: projectsResult.data,
  }

  const allCookies = [...authCookies, ...projectsResult.cookies]

  if (allCookies.length > 0) {
    return data(loaderData, {
      headers: createHeadersWithCookies(allCookies),
    })
  }

  return loaderData
}

export default function DashboardPage() {
  return <Dashboard />
}

import type { LoaderFunctionArgs } from 'react-router'
import { data } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { serverFetch } from '~/api/api.server'
import { Project } from '~/lib/models/Project'
import Dashboard from '~/pages/Dashboard'
import { redirectIfNotAuthenticated, createHeadersWithCookies } from '~/utils/session.server'

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

export async function loader({ request }: LoaderFunctionArgs) {
  redirectIfNotAuthenticated(request)

  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const pageSize = parseInt(url.searchParams.get('pageSize') || '12', 10)
  const search = url.searchParams.get('search') || ''
  const period = url.searchParams.get('period') || '7d'
  const sort = url.searchParams.get('sort') || 'alpha_asc'

  const skip = (page - 1) * pageSize

  const cookieHeader = request.headers.get('Cookie')
  const viewMode = (cookieHeader?.match(/(?<=dashboard_view=)[^;]*/)?.[0] as 'grid' | 'list') || 'grid'

  const projectsResult = await serverFetch<{
    results: Project[]
    total: number
    page_total: number
  }>(request, `/project?take=${pageSize}&skip=${skip}&search=${search}&period=${period}&sort=${sort}`)

  const loaderData: DashboardLoaderData = {
    viewMode,
    projects: projectsResult.data,
  }

  if (projectsResult.cookies.length > 0) {
    return data(loaderData, {
      headers: createHeadersWithCookies(projectsResult.cookies),
    })
  }

  return loaderData
}

export default function DashboardPage() {
  return <Dashboard />
}

import type { LoaderFunction } from 'react-router'
import Dashboard from '~/pages/Dashboard'
import type { SitemapFunction } from 'remix-sitemap'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export const loader: LoaderFunction = async ({ request }) => {
  const cookieHeader = request.headers.get('Cookie')
  const viewMode = (cookieHeader?.match(/(?<=dashboard_view=)[^;]*/)?.[0] as 'grid' | 'list') || 'grid'

  return { viewMode }
}

export default function DashboardPage() {
  return <Dashboard />
}

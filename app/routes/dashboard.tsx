import Dashboard from 'pages/Dashboard'
import type { SitemapFunction } from 'remix-sitemap'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export default function Index() {
  return <Dashboard />
}

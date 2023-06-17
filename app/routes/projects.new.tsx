import ProjectSettings from 'pages/Project/Settings'
import type { SitemapFunction } from 'remix-sitemap'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export default function Index() {
  return <ProjectSettings />
}

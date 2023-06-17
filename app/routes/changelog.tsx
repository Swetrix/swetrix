import Changelog from 'pages/Changelog'
import type { SitemapFunction } from 'remix-sitemap'

export const sitemap: SitemapFunction = () => ({
  priority: 0.9,
})

export default function Index() {
  return <Changelog />
}

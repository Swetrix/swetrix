import Imprint from 'pages/Imprint'
import type { SitemapFunction } from 'remix-sitemap'

export const sitemap: SitemapFunction = () => ({
  priority: 0.9,
  changefreq: 'monthly',
})

export default function Index() {
  return <Imprint />
}

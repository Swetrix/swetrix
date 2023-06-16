import Changelog from 'pages/Changelog'
import type { V2_MetaFunction } from '@remix-run/node'
import type { SitemapFunction } from 'remix-sitemap'

export const sitemap: SitemapFunction = () => ({
  priority: 0.9,
})

export const meta: V2_MetaFunction = () => {
  return [{ title: 'Changelog' }, { name: 'description', content: 'Changelog' }]
}

export default function Index() {
  return <Changelog />
}

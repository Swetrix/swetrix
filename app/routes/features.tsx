import Features from 'pages/Features'
import type { V2_MetaFunction } from '@remix-run/node'
import type { SitemapFunction } from 'remix-sitemap'

export const sitemap: SitemapFunction = () => ({
  priority: 0.9,
})

export const meta: V2_MetaFunction = () => {
  return [{ title: 'Features' }, { name: 'description', content: 'Features' }]
}

export default function Index() {
  return <Features />
}

import Privacy from 'pages/Privacy'
import type { V2_MetaFunction } from '@remix-run/node'
import type { SitemapFunction } from 'remix-sitemap'

export const sitemap: SitemapFunction = () => ({
  priority: 0.9,
  changefreq: 'monthly',
})

export const meta: V2_MetaFunction = () => {
  return [{ title: 'Privacy Policy' }, { name: 'description', content: 'Privacy' }]
}

export default function Index() {
  return <Privacy />
}

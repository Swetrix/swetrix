import Terms from 'pages/Terms'
import type { V2_MetaFunction } from '@remix-run/node'
import type { SitemapFunction } from 'remix-sitemap'

export const sitemap: SitemapFunction = () => ({
  priority: 0.9,
  changefreq: 'monthly',
})

export const meta: V2_MetaFunction = () => {
  return [{ title: 'Terms and Conditions' }, { name: 'description', content: 'Terms' }]
}

export default function Index() {
  return <Terms />
}

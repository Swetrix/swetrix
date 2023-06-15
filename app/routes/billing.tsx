import Billing from 'pages/Billing'
import type { V2_MetaFunction } from '@remix-run/node'
import type { SitemapFunction } from 'remix-sitemap'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export const meta: V2_MetaFunction = () => {
  return [{ title: 'Billing' }, { name: 'description', content: 'Billing' }]
}

export default function Index() {
  return <Billing />
}

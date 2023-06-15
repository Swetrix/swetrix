import Singup from 'pages/Auth/Signup'
import type { V2_MetaFunction } from '@remix-run/node'
import type { SitemapFunction } from 'remix-sitemap'

export const sitemap: SitemapFunction = () => ({
  priority: 0.9,
})

export const meta: V2_MetaFunction = () => {
  return [
    { title: 'Singup' },
    { name: 'description', content: 'Singup' },
  ]
}

export default function Index() {
  return <Singup />
}

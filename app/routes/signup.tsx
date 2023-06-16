import Singup from 'pages/Auth/Signup'
import type { SitemapFunction } from 'remix-sitemap'
import type { V2_MetaFunction, HeadersFunction } from '@remix-run/node'

export const headers: HeadersFunction = () => {
  return {
    'X-Frame-Options': 'DENY',
  }
}

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

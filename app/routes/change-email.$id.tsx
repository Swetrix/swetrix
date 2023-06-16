import VerifyEmail from 'pages/Auth/VerifyEmail'
import type { SitemapFunction } from 'remix-sitemap'
import type { V2_MetaFunction, HeadersFunction } from '@remix-run/node'

export const headers: HeadersFunction = () => {
  return {
    'X-Frame-Options': 'DENY',
  }
}

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export const meta: V2_MetaFunction = () => {
  return [
    { title: 'Change Email' },
    { name: 'description', content: 'Change Email' },
  ]
}

export default function Index() {
  return <VerifyEmail />
}

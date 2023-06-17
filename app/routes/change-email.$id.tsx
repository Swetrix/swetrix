import VerifyEmail from 'pages/Auth/VerifyEmail'
import type { SitemapFunction } from 'remix-sitemap'
import type { HeadersFunction } from '@remix-run/node'

export const headers: HeadersFunction = () => {
  return {
    'X-Frame-Options': 'DENY',
  }
}

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export default function Index() {
  return <VerifyEmail />
}

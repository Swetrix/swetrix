import VerifyEmail from 'pages/Auth/VerifyEmail'
import type { V2_MetaFunction } from '@remix-run/node'
import type { SitemapFunction } from 'remix-sitemap'

export const sitemap: SitemapFunction = () => ({
  exclude: true
})

export const meta: V2_MetaFunction = () => {
  return [
    { title: 'VerifyEmail' },
    { name: 'description', content: 'VerifyEmail' },
  ]
}

export default function Index() {
  return <VerifyEmail />
}

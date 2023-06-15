import VerifyEmail from 'pages/Auth/VerifyEmail'
import type { V2_MetaFunction } from '@remix-run/node'
import type { SitemapFunction } from 'remix-sitemap'

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

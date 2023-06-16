import CreateNewPassword from 'pages/Auth/CreateNewPassword'
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
    { title: 'Reset password' },
    {
      name: 'description',
      content: 'Reset your password',
    },
    {
      name: 'keywords',
      content: 'reset, password, forgot, forgot password',
    },
  ]
}

export default function Index() {
  return <CreateNewPassword />
}

import CreateNewPassword from 'pages/Auth/CreateNewPassword'
import type { V2_MetaFunction } from '@remix-run/node'
import type { SitemapFunction } from 'remix-sitemap'

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

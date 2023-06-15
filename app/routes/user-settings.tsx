import UserSettings from 'pages/UserSettings'
import type { V2_MetaFunction } from '@remix-run/node'
import type { SitemapFunction } from 'remix-sitemap'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export const meta: V2_MetaFunction = () => {
  return [
    {
      title: 'UserSettings',
      description: 'UserSettings',
    },
  ]
}

export default function Index() {
  return <UserSettings />
}

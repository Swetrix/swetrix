import type { SitemapFunction } from 'remix-sitemap'

import UserSettings from '~/pages/UserSettings'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export default function UserSettingsPage() {
  return <UserSettings />
}

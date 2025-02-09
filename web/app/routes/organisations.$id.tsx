import { redirect } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'
import OrganisationSettings from '~/pages/Organisations/Settings'
import { isSelfhosted } from '~/lib/constants'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export async function loader() {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  return null
}

export default function Index() {
  return <OrganisationSettings />
}

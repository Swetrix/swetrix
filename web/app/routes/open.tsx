import OpenStartup from '~/pages/OpenStartup'
import { redirect } from '@remix-run/node'
import type { LinksFunction } from '@remix-run/node'
import { isDisableMarketingPages, isSelfhosted } from '~/lib/constants'
import type { SitemapFunction } from 'remix-sitemap'
import Style from '~/styles/ProjectViewStyle.css?url'

export const links: LinksFunction = () => {
  return [{ rel: 'stylesheet', href: Style }]
}

export const sitemap: SitemapFunction = () => ({
  priority: 0.8,
  exclude: isSelfhosted || isDisableMarketingPages,
})

export async function loader() {
  if (isSelfhosted || isDisableMarketingPages) {
    return redirect('/login', 302)
  }

  return null
}

export default function Index() {
  return <OpenStartup />
}

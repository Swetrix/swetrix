import Imprint from '~/pages/Imprint'
import type { SitemapFunction } from 'remix-sitemap'
import { redirect } from '@remix-run/node'
import { isDisableMarketingPages, isSelfhosted } from '~/lib/constants'

export const sitemap: SitemapFunction = () => ({
  priority: 0.9,
  changefreq: 'monthly',
  exclude: isSelfhosted || isDisableMarketingPages,
})

export async function loader() {
  if (isSelfhosted || isDisableMarketingPages) {
    return redirect('/login', 302)
  }

  return null
}

export default function Index() {
  return <Imprint />
}

import { redirect } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { isDisableMarketingPages, isSelfhosted } from '~/lib/constants'
import Imprint from '~/pages/Imprint'

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

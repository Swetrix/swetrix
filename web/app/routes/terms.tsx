import { redirect } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { isSelfhosted } from '~/lib/constants'
import Terms from '~/pages/Terms'

export const sitemap: SitemapFunction = () => ({
  priority: 0.9,
  changefreq: 'monthly',
  exclude: isSelfhosted,
})

export async function loader() {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  return null
}

export default function TermsPage() {
  return <Terms />
}

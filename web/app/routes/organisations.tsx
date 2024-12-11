import { redirect } from '@remix-run/node'
import type { SitemapFunction } from 'remix-sitemap'
import Organisations from 'pages/Organisations'
import { isSelfhosted } from 'lib/constants'

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
  return <Organisations />
}

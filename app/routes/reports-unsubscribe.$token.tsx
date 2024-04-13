import type { SitemapFunction } from 'remix-sitemap'
import { redirect } from '@remix-run/node'
import { isSelfhosted } from 'redux/constants'
import Unsubscribe from 'pages/Unsubscribe'

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
  return <Unsubscribe type='user-reports' />
}

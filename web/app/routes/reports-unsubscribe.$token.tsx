import { redirect } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { isSelfhosted } from '~/lib/constants'
import Unsubscribe from '~/pages/Unsubscribe'

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

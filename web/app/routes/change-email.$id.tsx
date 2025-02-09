import type { HeadersFunction } from 'react-router'
import { redirect } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { isSelfhosted } from '~/lib/constants'
import ChangeEmail from '~/pages/Auth/ChangeEmail'

export const headers: HeadersFunction = ({ parentHeaders }) => {
  parentHeaders.set('X-Frame-Options', 'DENY')
  return parentHeaders
}

export async function loader() {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  return null
}

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export default function Index() {
  return <ChangeEmail />
}

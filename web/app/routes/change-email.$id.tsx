import VerifyEmail from 'pages/Auth/VerifyEmail'
import type { SitemapFunction } from 'remix-sitemap'
import type { HeadersFunction } from '@remix-run/node'
import { redirect } from '@remix-run/node'

import { isSelfhosted } from 'redux/constants'

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
  return <VerifyEmail />
}

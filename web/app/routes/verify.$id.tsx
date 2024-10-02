import VerifyEmail from 'pages/Auth/VerifyEmail'
import type { SitemapFunction } from 'remix-sitemap'
import { redirect } from '@remix-run/node'
import { isSelfhosted } from 'redux/constants'

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
  return <VerifyEmail />
}

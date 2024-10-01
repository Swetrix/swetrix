import Marketers from 'pages/Landings/Marketers'
import type { LoaderFunctionArgs } from '@remix-run/node'
import { json, redirect } from '@remix-run/node'
import type { SitemapFunction } from 'remix-sitemap'

import { detectTheme, isAuthenticated } from 'utils/server'
import { isSelfhosted } from 'redux/constants'

export const sitemap: SitemapFunction = () => ({
  priority: 0.9,
  exclude: isSelfhosted,
})

export async function loader({ request }: LoaderFunctionArgs) {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }
  const isAuth = isAuthenticated(request)
  const [theme] = detectTheme(request)

  return json({ theme, isAuth })
}

export default function Index() {
  return <Marketers />
}

import MainPage from 'pages/MainPage'
import type { LoaderArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { json, redirect } from '@remix-run/node'
import type { SitemapFunction } from 'remix-sitemap'

import { detectTheme, isAuthenticated } from 'utils/server'
import { isSelfhosted } from 'redux/constants'

export const sitemap: SitemapFunction = () => ({
  priority: 1,
  exclude: isSelfhosted,
})

export async function loader({ request }: LoaderArgs) {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  const [theme] = detectTheme(request)
  const isAuth = isAuthenticated(request)

  return json({ theme, isAuth })
}

export default function Index() {
  const {
    theme, isAuth,
  } = useLoaderData<typeof loader>()

  return <MainPage ssrTheme={theme} ssrAuthenticated={isAuth} />
}

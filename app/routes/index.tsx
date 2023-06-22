import MainPage from 'pages/MainPage'
import type { LoaderArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { json } from '@remix-run/node'
import type { SitemapFunction } from 'remix-sitemap'

import { detectTheme, isAuthenticated } from 'utils/server'

export const sitemap: SitemapFunction = () => ({
  priority: 1,
})

export async function loader({ request }: LoaderArgs) {
  const theme = detectTheme(request)
  const isAuth = isAuthenticated(request)

  return json({ theme, isAuth })
}

export default function Index() {
  const {
    theme, isAuth,
  } = useLoaderData<typeof loader>()

  return <MainPage ssrTheme={theme} ssrAuthenticated={isAuth} />
}

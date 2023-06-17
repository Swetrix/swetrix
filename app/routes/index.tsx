import MainPage from 'pages/MainPage'
import type { LoaderArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { json } from '@remix-run/node'
import type { SitemapFunction } from 'remix-sitemap'

import { detectTheme } from 'utils/server'

export const sitemap: SitemapFunction = () => ({
  priority: 1,
})

export async function loader({ request }: LoaderArgs) {
  const theme = detectTheme(request)

  return json({ theme })
}

export default function Index() {
  const {
    theme,
  } = useLoaderData<typeof loader>()

  return <MainPage ssrTheme={theme} />
}

import type { LoaderArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { json } from '@remix-run/node'
import type { SitemapFunction } from 'remix-sitemap'
import Billing from 'pages/Billing'
import { isAuthenticated } from 'utils/server'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export async function loader({ request }: LoaderArgs) {
  const isAuth = isAuthenticated(request)

  return json({ isAuth })
}

export default function Index() {
  const { isAuth } = useLoaderData<typeof loader>()

  return <Billing ssrAuthenticated={isAuth} />
}

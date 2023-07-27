import type { LoaderArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { json, redirect } from '@remix-run/node'
import type { SitemapFunction } from 'remix-sitemap'
import Billing from 'pages/Billing'

import { isSelfhosted } from 'redux/constants'
import { isAuthenticated } from 'utils/server'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export async function loader({ request }: LoaderArgs) {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  const isAuth = isAuthenticated(request)

  return json({ isAuth })
}

export default function Index() {
  const { isAuth } = useLoaderData<typeof loader>()

  return <Billing ssrAuthenticated={isAuth} />
}

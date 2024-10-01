import type { LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { json, redirect } from '@remix-run/node'
import type { SitemapFunction } from 'remix-sitemap'
import Billing from 'pages/Billing'

import { isSelfhosted } from 'redux/constants'
import { isAuthenticated, detectTheme } from 'utils/server'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export async function loader({ request }: LoaderFunctionArgs) {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  const [theme] = detectTheme(request)
  const isAuth = isAuthenticated(request)

  return json({ isAuth, theme })
}

export default function Index() {
  const { isAuth, theme } = useLoaderData<typeof loader>()

  return <Billing ssrAuthenticated={isAuth} ssrTheme={theme} />
}

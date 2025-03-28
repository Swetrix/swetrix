import type { LoaderFunctionArgs } from 'react-router'
import { useLoaderData, data, redirect } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { isSelfhosted } from '~/lib/constants'
import Billing from '~/pages/Billing'
import { isAuthenticated, detectTheme } from '~/utils/server'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export async function loader({ request }: LoaderFunctionArgs) {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  const [theme] = detectTheme(request)
  const isAuth = isAuthenticated(request)

  return data({ isAuth, theme })
}

export default function Index() {
  const { isAuth, theme } = useLoaderData<any>()

  return <Billing ssrAuthenticated={isAuth} ssrTheme={theme} />
}

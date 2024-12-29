import type { LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { redirect } from '@remix-run/node'
import type { SitemapFunction } from 'remix-sitemap'

import ErrorTracking from '~/pages/ErrorTracking'
import { detectTheme, isAuthenticated } from '~/utils/server'
import { isDisableMarketingPages, isSelfhosted } from '~/lib/constants'

export const sitemap: SitemapFunction = () => ({
  priority: 1,
  exclude: isSelfhosted || isDisableMarketingPages,
})

export async function loader({ request }: LoaderFunctionArgs) {
  if (isSelfhosted || isDisableMarketingPages) {
    return redirect('/login', 302)
  }

  const [theme] = detectTheme(request)
  const isAuth = isAuthenticated(request)

  return { theme, isAuth }
}

export default function Index() {
  const { theme, isAuth } = useLoaderData<typeof loader>()

  return <ErrorTracking ssrTheme={theme} ssrAuthenticated={isAuth} />
}

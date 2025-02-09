import type { LoaderFunctionArgs } from 'react-router'
import { useLoaderData, redirect } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { isDisableMarketingPages, isSelfhosted } from '~/lib/constants'
import Performance from '~/pages/Performance'
import { detectTheme, isAuthenticated } from '~/utils/server'

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

  return <Performance ssrTheme={theme} ssrAuthenticated={isAuth} />
}

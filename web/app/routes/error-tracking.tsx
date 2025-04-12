import type { LoaderFunctionArgs } from 'react-router'
import { useLoaderData, redirect } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { isDisableMarketingPages, isSelfhosted } from '~/lib/constants'
import ErrorTracking from '~/pages/ErrorTracking'
import { isAuthenticated } from '~/utils/server'

export const sitemap: SitemapFunction = () => ({
  priority: 1,
  exclude: isSelfhosted || isDisableMarketingPages,
})

export async function loader({ request }: LoaderFunctionArgs) {
  if (isSelfhosted || isDisableMarketingPages) {
    return redirect('/login', 302)
  }

  const isAuth = isAuthenticated(request)

  return { isAuth }
}

export default function Index() {
  const { isAuth } = useLoaderData<typeof loader>()

  return <ErrorTracking ssrAuthenticated={isAuth} />
}

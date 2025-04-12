import type { LoaderFunctionArgs } from 'react-router'
import { redirect } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { isDisableMarketingPages, isSelfhosted } from '~/lib/constants'
import Startups from '~/pages/Landings/Startups'
import { isAuthenticated } from '~/utils/server'

export const sitemap: SitemapFunction = () => ({
  priority: 0.9,
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
  return <Startups />
}

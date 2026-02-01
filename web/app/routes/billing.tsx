import { type LoaderFunctionArgs, redirect } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { isSelfhosted } from '~/lib/constants'
import { redirectIfNotAuthenticated } from '~/utils/session.server'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export async function loader({ request }: LoaderFunctionArgs) {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  redirectIfNotAuthenticated(request)

  return redirect('/user-settings?tab=billing', 302)
}

export default function BillingRoute() {
  return null
}

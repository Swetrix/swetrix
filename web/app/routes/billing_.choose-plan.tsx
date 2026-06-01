import { redirect } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import routes from '~/utils/routes'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export async function loader() {
  return redirect(routes.billing_choose_plan, 302)
}

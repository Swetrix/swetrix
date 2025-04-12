import type { LoaderFunctionArgs } from 'react-router'
import { useLoaderData, data, redirect } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { isSelfhosted } from '~/lib/constants'
import Billing from '~/pages/Billing'
import { isAuthenticated } from '~/utils/server'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export async function loader({ request }: LoaderFunctionArgs) {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  const isAuth = isAuthenticated(request)

  return data({ isAuth })
}

export default function Index() {
  const { isAuth } = useLoaderData<any>()

  return <Billing ssrAuthenticated={isAuth} />
}

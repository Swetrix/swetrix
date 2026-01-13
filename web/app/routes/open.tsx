import {
  redirect,
  type LoaderFunctionArgs,
  useLoaderData,
  LinksFunction,
} from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { getGeneralStats } from '~/api/api.server'
import { isDisableMarketingPages, isSelfhosted } from '~/lib/constants'
import OpenStartup from '~/pages/OpenStartup'
import Style from '~/styles/ProjectViewStyle.css?url'

export const links: LinksFunction = () => {
  return [{ rel: 'stylesheet', href: Style }]
}

export const sitemap: SitemapFunction = () => ({
  priority: 0.8,
  exclude: isSelfhosted || isDisableMarketingPages,
})

export async function loader({ request }: LoaderFunctionArgs) {
  if (isSelfhosted || isDisableMarketingPages) {
    return redirect('/login', 302)
  }

  const stats = await getGeneralStats(request)

  return { stats }
}

export default function Index() {
  const { stats } = useLoaderData<typeof loader>()

  return <OpenStartup stats={stats} />
}

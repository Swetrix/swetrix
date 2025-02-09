import type { LoaderFunction } from 'react-router'
import { data } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import NotFound from '~/pages/NotFound'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export const loader: LoaderFunction = () => {
  return data(null, { status: 404 })
}

export default function Index() {
  return <NotFound />
}

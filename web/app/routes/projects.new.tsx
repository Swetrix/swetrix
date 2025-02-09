import type { SitemapFunction } from 'remix-sitemap'

import NewProject from '~/pages/Project/New'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export default function Index() {
  return <NewProject />
}

import type { SitemapFunction } from 'remix-sitemap'

import Changelog from '~/pages/Changelog'

export const sitemap: SitemapFunction = () => ({
  priority: 0.9,
})

export default function Index() {
  return <Changelog />
}

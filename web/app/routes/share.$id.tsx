import type { SitemapFunction } from 'remix-sitemap'

import ConfirmShare from '~/pages/Project/ConfirmShare'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export default function Index() {
  return <ConfirmShare />
}

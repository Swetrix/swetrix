import type { SitemapFunction } from 'remix-sitemap'

import TransferProjectReject from '~/pages/Project/Settings/TransferProject/TransferProjectReject'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export default function Index() {
  return <TransferProjectReject />
}

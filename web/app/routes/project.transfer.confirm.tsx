import type { SitemapFunction } from 'remix-sitemap'

import TransferProjectConfirm from '~/pages/Project/Settings/TransferProject/TransferProjectConfirm'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export default function Index() {
  return <TransferProjectConfirm />
}

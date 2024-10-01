import TransferProjectConfirm from 'pages/Project/Settings/TransferProject/TransferProjectConfirm'
import type { SitemapFunction } from 'remix-sitemap'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export default function Index() {
  return <TransferProjectConfirm />
}

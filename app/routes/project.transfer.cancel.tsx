import TransferProjectReject from 'pages/Project/Settings/TransferProject/TransferProjectReject'
import type { SitemapFunction } from 'remix-sitemap'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export default function Index() {
  return <TransferProjectReject />
}

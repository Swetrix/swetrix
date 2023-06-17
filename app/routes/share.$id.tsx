import ConfirmShare from 'pages/Project/ConfirmShare'
import type { SitemapFunction } from 'remix-sitemap'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export default function Index() {
  return <ConfirmShare />
}
